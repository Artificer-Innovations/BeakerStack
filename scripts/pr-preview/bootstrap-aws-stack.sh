#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/infra/aws/pr-preview-stack.yml"
FUNCTION_SOURCE="${REPO_ROOT}/infra/aws/functions/PRPathRouter.js"
ERROR_PAGE_PATH="${REPO_ROOT}/infra/aws/error.html"
BUILD_DIR="${REPO_ROOT}/.aws-build"

DEFAULT_STACK_NAME="beakerstack-pr-preview"
DEFAULT_REGION="us-east-1"
DEFAULT_PREVIEW_PREFIX="pr-"
DEFAULT_S3_ENCRYPTION="true"

declare -a AWS_CLI=()

STACK_NAME="${DEFAULT_STACK_NAME}"
AWS_REGION="${DEFAULT_REGION}"
# Preserve inherited AWS_PROFILE until --aws-profile overrides in parse_args.
AWS_PROFILE="${AWS_PROFILE:-}"
DOMAIN_NAME=""
HOSTED_ZONE_ID=""
CERTIFICATE_ARN=""
PREVIEW_PREFIX="${DEFAULT_PREVIEW_PREFIX}"
LOGS_BUCKET_OVERRIDE=""
ENV_FILE=""
DRY_RUN=false
ENABLE_S3_ENCRYPTION="${DEFAULT_S3_ENCRYPTION}"
# deploy | refresh-outputs | fail
IF_STACK_EXISTS="deploy"
ALLOW_CONFLICTING_NAMED_BUCKETS=false
PRINT_PREFLIGHT_JSON=false
DELETE_FAILED_CHANGE_SETS=false
# When 1/true, finalize_stack_outputs skips publish_pr_path_router_function (CI uses this
# so a failed web build cannot publish edge code before assets exist).
SKIP_CLOUDFRONT_FUNCTION_PUBLISH=""

# Populated by preflight_collect_data()
PREFLIGHT_BUCKETS_PROD=""
PREFLIGHT_BUCKETS_STAGING=""
PREFLIGHT_BUCKETS_DEPLOY=""
PREFLIGHT_CF_CONFLICTS_JSON="[]"
PREFLIGHT_FAILED_CHANGESETS_JSON="[]"
PREFLIGHT_ORPHAN_BUCKETS=false
PREFLIGHT_ANY_BUCKET_SIGHT=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Deploys or validates the AWS infrastructure stack for PR preview environments.

Required:
  --domain DOMAIN                Apex domain (e.g. beakerstack.com)
  --hosted-zone-id ID            Route53 hosted zone ID managing the domain
  --certificate-arn ARN          ACM certificate ARN (in us-east-1) for the domain and wildcard

Optional:
  --stack-name NAME              CloudFormation stack name (default: ${DEFAULT_STACK_NAME})
  --region REGION                AWS region for the stack (default: ${DEFAULT_REGION})
  --aws-profile PROFILE          AWS CLI profile to use
  --preview-prefix PREFIX        Prefix for preview folders (default: ${DEFAULT_PREVIEW_PREFIX})
  --logs-bucket NAME             Override S3 bucket name for access logs
  --disable-s3-encryption        Disable SSE-S3 encryption on buckets (defaults to enabled)
  --env-file PATH                Write stack outputs as KEY=VALUE to the given file
  --dry-run                      Create a changeset without executing it
  --if-stack-exists MODE         When stack is healthy: deploy (default), refresh-outputs (skip deploy),
                                 or fail (exit; for strict CI)
  --allow-conflicting-named-buckets   Proceed with deploy even if apex-prod/staging/deploy buckets exist
                                 but the stack is missing (orphaned retained buckets; deploy will likely fail)
  --print-preflight-json         Print one JSON object to stdout (no other stdout); then exit 0. For setup tooling.
  --delete-failed-change-sets    Delete FAILED CloudFormation change sets for --stack-name; then exit 0.
  --skip-cloudfront-function-publish   Skip CloudFront PRPathRouter publish in finalize (stack outputs + error pages still run).
  --help                         Show this help message

Environment exports:
  If GITHUB_OUTPUT is set, exported values are appended for downstream workflow steps.
EOF
}

log() {
  local level="$1"
  local message="$2"
  printf '[%-5s] %s\n' "${level}" "${message}"
}

abort() {
  log "ERROR" "$1"
  exit "${2:-1}"
}

# Populates global AWS_CLI array: regional CLI for S3/CloudFormation in AWS_REGION.
build_aws_cli() {
  AWS_CLI=(aws --region "${AWS_REGION}")
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    AWS_CLI+=(--profile "${AWS_PROFILE}")
  fi
}

ensure_prereqs() {
  command -v aws >/dev/null 2>&1 || abort "aws CLI is required but not installed."

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 not found; skipping rendered CloudFront function output."
  fi

  [[ -f "${TEMPLATE_PATH}" ]] || abort "Missing CloudFormation template at ${TEMPLATE_PATH}"
  [[ -f "${ERROR_PAGE_PATH}" ]] || abort "Missing error page template at ${ERROR_PAGE_PATH}"
}

render_function_template() {
  mkdir -p "${BUILD_DIR}"
  local rendered_path="${BUILD_DIR}/PRPathRouter.rendered.js"

  if [[ ! -f "${FUNCTION_SOURCE}" ]]; then
    log "WARN" "CloudFront function source not found at ${FUNCTION_SOURCE}; skipping render."
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 unavailable; cannot render CloudFront function template."
    return 0
  fi

  local rendered
  rendered="$(python3 - "$FUNCTION_SOURCE" "$rendered_path" "$PREVIEW_PREFIX" <<'PYTHON'
import sys

source_path, dest_path, preview_prefix = sys.argv[1:]
with open(source_path, "r", encoding="utf-8") as fp:
    content = fp.read()

content = content.replace("%%PREVIEW_PREFIX%%", preview_prefix)

with open(dest_path, "w", encoding="utf-8") as fp:
    fp.write(content)

print(dest_path)
PYTHON
)"
  rendered="${rendered%$'\n'}"
  log "INFO" "Rendered CloudFront function source to ${rendered}"
}

publish_pr_path_router_function() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "DRY RUN: Would publish PRPathRouter function"
    return 0
  fi

  local rendered_path="${BUILD_DIR}/PRPathRouter.rendered.js"
  if [[ ! -f "${rendered_path}" ]]; then
    log "WARN" "Rendered function not found at ${rendered_path}; skipping function publish."
    return 0
  fi

  local function_name="${STACK_NAME}-PRPathRouter"

  log "INFO" "Publishing CloudFront function: ${function_name}"

  build_aws_cli

  # Get the function ARN from stack outputs
  local function_arn
  function_arn="$("${AWS_CLI[@]}" cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='PRPathRouterFunctionArn'].OutputValue" \
    --output text 2>/dev/null || echo '')"

  if [[ -z "${function_arn}" ]]; then
    log "WARN" "Could not find PRPathRouter function ARN in stack outputs. Function may need to be created first."
    return 0
  fi

  # ARN shape: arn:aws:cloudfront::ACCOUNT:function/NAME
  local function_id="${function_arn##*/}"
  function_id="${function_id%%/*}"

  local desc err update_json
  err="$(mktemp)"
  update_json="$(mktemp)"
  # Prefer DEVELOPMENT stage (where update-function applies).
  if ! desc="$("${AWS_CLI[@]}" cloudfront describe-function \
    --name "${function_id}" \
    --stage DEVELOPMENT \
    --output json 2>"${err}")"; then
    if ! desc="$("${AWS_CLI[@]}" cloudfront describe-function \
      --name "${function_id}" \
      --output json 2>"${err}")"; then
      log "WARN" "describe-function failed for ${function_id}; skipping publish. $(head -c 400 "${err}" 2>/dev/null | tr '\n' ' ')"
      rm -f "${err}" "${update_json}"
      return 0
    fi
  fi

  if ! RENDERED_PATH="${rendered_path}" FUNCTION_ID="${function_id}" python3 -c '
import json, os, sys

rendered_path = os.environ["RENDERED_PATH"]
function_id = os.environ["FUNCTION_ID"]
desc = json.loads(sys.stdin.read())

etag = (desc.get("ETag") or "").strip()
if not etag:
    print("missing ETag from describe-function", file=sys.stderr)
    sys.exit(1)
fs = desc.get("FunctionSummary") or {}
name = (fs.get("Name") or function_id).strip()
fc = dict(fs.get("FunctionConfig") or {})
if not fc.get("Runtime"):
    fc["Runtime"] = "cloudfront-js-2.0"
if "Comment" not in fc or fc.get("Comment") is None:
    fc["Comment"] = "PR path router"
kv = fc.get("KeyValueStoreAssociations")
if not kv or int(kv.get("Quantity") or 0) == 0:
    fc["KeyValueStoreAssociations"] = {"Quantity": 0}
else:
    fc["KeyValueStoreAssociations"] = kv

# Validate source before publish. Do NOT put raw JS in JSON as FunctionCode: AWS CLI
# blob parameters must use fileb:// (see AWS CLI User Guide "Binary / blob"). Inline
# strings are interpreted as base64 and corrupt the live function (binary gibberish).
with open(rendered_path, "r", encoding="utf-8") as fp:
    code = fp.read()
stripped = code.lstrip()
if not stripped.startswith("function"):
    print(
        "invalid rendered CloudFront function (expected UTF-8 JS starting with function)",
        file=sys.stderr,
    )
    sys.exit(1)

abs_src = os.path.abspath(rendered_path)
body = {
    "Name": name,
    "IfMatch": etag,
    "FunctionConfig": fc,
    "FunctionCode": "fileb://" + abs_src,
}
json.dump(body, sys.stdout, ensure_ascii=True)
' <<<"${desc}" >"${update_json}" 2>"${err}"; then
    log "WARN" "Could not build update-function payload for ${function_id}: $(tr '\n' ' ' <"${err}")"
    rm -f "${err}" "${update_json}"
    return 0
  fi

  if ! "${AWS_CLI[@]}" cloudfront update-function --cli-input-json "file://${update_json}" >/dev/null 2>"${err}"; then
    log "WARN" "cloudfront update-function failed for ${function_id}: $(head -c 500 "${err}" 2>/dev/null | tr '\n' ' ')"
    rm -f "${err}" "${update_json}"
    return 0
  fi

  local etag_pub
  etag_pub="$("${AWS_CLI[@]}" cloudfront describe-function \
    --name "${function_id}" \
    --stage DEVELOPMENT \
    --query 'ETag' \
    --output text 2>/dev/null)" || etag_pub=""

  if [[ -z "${etag_pub}" || "${etag_pub}" == "None" ]]; then
    etag_pub="$("${AWS_CLI[@]}" cloudfront describe-function \
      --name "${function_id}" \
      --query 'ETag' \
      --output text 2>/dev/null)" || etag_pub=""
  fi

  if [[ -z "${etag_pub}" || "${etag_pub}" == "None" ]]; then
    log "WARN" "Could not read ETag after update for ${function_id}; skipping publish-function."
    rm -f "${err}" "${update_json}"
    return 0
  fi

  if ! "${AWS_CLI[@]}" cloudfront publish-function \
    --name "${function_id}" \
    --if-match "${etag_pub}" >/dev/null 2>"${err}"; then
    log "WARN" "cloudfront publish-function failed for ${function_id}: $(head -c 500 "${err}" 2>/dev/null | tr '\n' ' ')"
    rm -f "${err}" "${update_json}"
    return 0
  fi

  rm -f "${err}" "${update_json}"
  log "INFO" "Successfully published CloudFront function: ${function_id}"
}

write_exports() {
  local key="$1"
  local value="$2"

  if [[ -n "${ENV_FILE}" ]]; then
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
  fi

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      printf '%s<<EOF\n' "${key}"
      printf '%s\n' "${value}"
      printf 'EOF\n'
    } >>"${GITHUB_OUTPUT}"
  fi
}

# Cached JSON from one list-buckets call per preflight (authoritative for same-account ownership).
S3_LIST_BUCKETS_JSON=""

# Full account bucket inventory as {"Buckets":[{"Name":...},...]} (all list-buckets pages).
preflight_refresh_s3_list_buckets_cache() {
  S3_LIST_BUCKETS_JSON=""
  local merged token page
  merged='[]'
  token=""
  while true; do
    if [[ -z "${token}" ]]; then
      page="$("${AWS_CLI[@]}" s3api list-buckets --output json 2>/dev/null)" || {
        S3_LIST_BUCKETS_JSON=""
        return 0
      }
    else
      page="$("${AWS_CLI[@]}" s3api list-buckets --continuation-token "${token}" --output json 2>/dev/null)" || {
        S3_LIST_BUCKETS_JSON=""
        return 0
      }
    fi
    merged="$(
      printf '%s' "${page}" | MERGED_SO_FAR="${merged}" python3 -c '
import json, os, sys

page = json.load(sys.stdin)
prev = json.loads(os.environ.get("MERGED_SO_FAR", "[]"))
prev.extend(b.get("Name", "") for b in (page.get("Buckets") or []) if b.get("Name"))
print(json.dumps(prev))
'
    )"
    token="$(
      printf '%s' "${page}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('NextContinuationToken') or '')" 2>/dev/null
    )"
    [[ -z "${token}" ]] && break
  done
  S3_LIST_BUCKETS_JSON="$(
    printf '%s' "${merged}" | python3 -c 'import json,sys; names=json.load(sys.stdin); print(json.dumps({"Buckets": [{"Name": n} for n in names]}))'
  )"
}

# head-bucket: prints one of exists|notfound|forbidden|error to stdout; exit 0 always.
s3_bucket_head_state() {
  local bucket="$1"
  local err ec
  err="$(mktemp)"
  # AWS CLI v2 may print JSON to stdout on success; suppress so callers only get our one-line state.
  if "${AWS_CLI[@]}" s3api head-bucket --bucket "${bucket}" >/dev/null 2>"${err}"; then
    rm -f "${err}"
    echo "exists"
    return 0
  fi
  ec=$?
  if grep -qE '404|Not Found|NoSuchBucket' "${err}" 2>/dev/null; then
    rm -f "${err}"
    echo "notfound"
    return 0
  fi
  if grep -qE '403|Forbidden|AccessDenied' "${err}" 2>/dev/null; then
    rm -f "${err}"
    echo "forbidden"
    return 0
  fi
  rm -f "${err}"
  echo "error:${ec}"
  return 0
}

# Preflight bucket state: prefer list-buckets (reliable in-account); fall back to head-bucket if list denied.
# Prints exists|notfound|forbidden|error:N (same vocabulary as head-only callers).
s3_bucket_preflight_state() {
  local bucket="$1"
  local listed head
  listed="unknown"
  if [[ -n "${S3_LIST_BUCKETS_JSON}" ]]; then
    listed="$(
      printf '%s' "${S3_LIST_BUCKETS_JSON}" | S3_PREFLIGHT_TARGET_BUCKET="${bucket}" python3 -c '
import json, os, sys

raw = sys.stdin.read()
target = os.environ.get("S3_PREFLIGHT_TARGET_BUCKET", "")
if not raw.strip() or not target:
    print("parse-error")
    raise SystemExit(0)
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    print("parse-error")
    raise SystemExit(0)
for b in data.get("Buckets") or []:
    if b.get("Name") == target:
        print("in-account")
        raise SystemExit(0)
print("absent")
' 2>/dev/null
    )" || listed="parse-error"
    [[ -z "${listed}" ]] && listed="parse-error"
  fi
  head="$(s3_bucket_head_state "${bucket}")"

  if [[ "${listed}" == "in-account" ]]; then
    echo "exists"
    return 0
  fi
  if [[ "${listed}" == "absent" ]]; then
    # Inventory says this account has no bucket with that global name.
    echo "${head}"
    return 0
  fi
  # list-buckets unavailable or parse-error — use HeadBucket only (IAM may differ between APIs).
  echo "${head}"
  return 0
}

# Sets CF_STACK_STATUS to text status or empty if stack does not exist.
fetch_stack_status() {
  CF_STACK_STATUS=""
  local out err
  out="$(mktemp)"
  err="$(mktemp)"
  if "${AWS_CLI[@]}" cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>"${err}" >"${out}"; then
    CF_STACK_STATUS="$(tr -d '\r\n' <"${out}")"
  fi
  rm -f "${out}" "${err}"
}

stack_allows_refresh_outputs() {
  case "${CF_STACK_STATUS}" in
    CREATE_COMPLETE | UPDATE_COMPLETE | UPDATE_ROLLBACK_COMPLETE) return 0 ;;
    *) return 1 ;;
  esac
}

stack_is_healthy_for_deploy_mode() {
  case "${CF_STACK_STATUS}" in
    CREATE_COMPLETE | UPDATE_COMPLETE) return 0 ;;
    *) return 1 ;;
  esac
}

# True when `aws cloudformation deploy` cannot apply to this stack name (must delete first).
cf_stack_status_blocks_deploy() {
  case "${CF_STACK_STATUS}" in
    ROLLBACK_COMPLETE | CREATE_FAILED | DELETE_FAILED | ROLLBACK_FAILED | IMPORT_ROLLBACK_FAILED)
      return 0 ;;
    *) return 1 ;;
  esac
}

print_early_validation_hint() {
  log "DIAG" "CloudFormation early validation (ResourceExistenceCheck) fails when a resource name is already in use."
  log "DIAG" "Common causes for this template: S3 buckets ${DOMAIN_NAME}-prod|staging|deploy retained after stack delete (DeletionPolicy: Retain), or another CloudFront distribution using the same custom aliases."
  log "DIAG" "Bucket names are derived from --domain only: another stack (different --stack-name) for the same apex still uses the same three bucket names and will block create."
  log "DIAG" "Docs: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/validate-stack-deployments.html"
}

ensure_minimal_for_preflight_tools() {
  command -v aws >/dev/null 2>&1 || abort "aws CLI is required but not installed."
  [[ -f "${TEMPLATE_PATH}" ]] || abort "Missing CloudFormation template at ${TEMPLATE_PATH}"
}

# JSON array of {distributionId, matchedAliases, comment, lastModifiedTime}
cloudfront_alias_conflicts_json() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "[]"
    return 0
  fi
  DOMAIN_NAME="${DOMAIN_NAME}" python3 <<'PY'
import json, os, subprocess, sys

domain = os.environ.get("DOMAIN_NAME", "").strip().lower().rstrip(".")
if not domain:
    print("[]")
    sys.exit(0)
want = {
    domain,
    f"www.{domain}",
    f"staging.{domain}",
    f"deploy.{domain}",
}


def main():
    items = []
    marker = None
    for _ in range(500):
        cli = ["aws", "cloudfront", "list-distributions", "--output", "json", "--max-items", "100"]
        if marker:
            cli.extend(["--starting-token", marker])
        try:
            raw = subprocess.check_output(cli, stderr=subprocess.DEVNULL, text=True, timeout=120)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            print("[]")
            return
        data = json.loads(raw or "{}")
        dl = data.get("DistributionList") or {}
        batch = dl.get("Items") or []
        items.extend(batch)
        marker = data.get("NextToken") or dl.get("NextMarker")
        if not marker:
            break

    hits = []
    for item in items:
        aliases = ((item.get("Aliases") or {}).get("Items")) or []
        matched = [a for a in aliases if a in want]
        if matched:
            hits.append(
                {
                    "distributionId": str(item.get("Id", "")),
                    "matchedAliases": matched,
                    "comment": (item.get("DistributionConfig") or {}).get("Comment", "") or "",
                    "lastModifiedTime": str(item.get("LastModifiedTime", "") or ""),
                }
            )
    print(json.dumps(hits))


main()
PY
}

list_failed_change_sets_json() {
  local raw
  if ! raw="$("${AWS_CLI[@]}" cloudformation list-change-sets \
    --stack-name "${STACK_NAME}" \
    --output json 2>/dev/null)"; then
    echo "[]"
    return 0
  fi
  printf '%s' "${raw}" | python3 <<'PY'
import json, sys

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError:
    print("[]")
    raise SystemExit(0)
rows = []
for x in data.get("Summaries") or []:
    if x.get("Status") == "FAILED":
        rows.append(
            {
                "name": x.get("ChangeSetName", ""),
                "status": x.get("Status", ""),
                "statusReason": (x.get("StatusReason") or "")[:2000],
            }
        )
print(json.dumps(rows))
PY
}

preflight_collect_data() {
  build_aws_cli
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    export AWS_PROFILE
  fi
  fetch_stack_status

  local prod_b="${DOMAIN_NAME}-prod"
  local staging_b="${DOMAIN_NAME}-staging"
  local deploy_b="${DOMAIN_NAME}-deploy"

  preflight_refresh_s3_list_buckets_cache
  PREFLIGHT_BUCKETS_PROD="$(s3_bucket_preflight_state "${prod_b}")"
  PREFLIGHT_BUCKETS_STAGING="$(s3_bucket_preflight_state "${staging_b}")"
  PREFLIGHT_BUCKETS_DEPLOY="$(s3_bucket_preflight_state "${deploy_b}")"

  PREFLIGHT_ANY_BUCKET_SIGHT=false
  [[ "${PREFLIGHT_BUCKETS_PROD}" == exists || "${PREFLIGHT_BUCKETS_PROD}" == forbidden ]] && PREFLIGHT_ANY_BUCKET_SIGHT=true
  [[ "${PREFLIGHT_BUCKETS_STAGING}" == exists || "${PREFLIGHT_BUCKETS_STAGING}" == forbidden ]] && PREFLIGHT_ANY_BUCKET_SIGHT=true
  [[ "${PREFLIGHT_BUCKETS_DEPLOY}" == exists || "${PREFLIGHT_BUCKETS_DEPLOY}" == forbidden ]] && PREFLIGHT_ANY_BUCKET_SIGHT=true

  PREFLIGHT_ORPHAN_BUCKETS=false
  if [[ -z "${CF_STACK_STATUS}" && "${PREFLIGHT_ANY_BUCKET_SIGHT}" == true ]]; then
    PREFLIGHT_ORPHAN_BUCKETS=true
  fi

  PREFLIGHT_CF_CONFLICTS_JSON="$(cloudfront_alias_conflicts_json || echo '[]')"
  PREFLIGHT_FAILED_CHANGESETS_JSON="$(list_failed_change_sets_json || echo '[]')"
}

print_preflight_json_to_stdout() {
  preflight_collect_data
  local prod_b="${DOMAIN_NAME}-prod"
  local staging_b="${DOMAIN_NAME}-staging"
  local deploy_b="${DOMAIN_NAME}-deploy"
  # Single JSON line to stdout only (stderr may be used by aws/python warnings).
  DOMAIN_NAME="${DOMAIN_NAME}" \
    STACK_NAME="${STACK_NAME}" \
    AWS_REGION="${AWS_REGION}" \
    CF_STACK_STATUS="${CF_STACK_STATUS:-}" \
    PREFLIGHT_BUCKETS_PROD="${PREFLIGHT_BUCKETS_PROD}" \
    PREFLIGHT_BUCKETS_STAGING="${PREFLIGHT_BUCKETS_STAGING}" \
    PREFLIGHT_BUCKETS_DEPLOY="${PREFLIGHT_BUCKETS_DEPLOY}" \
    PREFLIGHT_ORPHAN_BUCKETS="${PREFLIGHT_ORPHAN_BUCKETS}" \
    PREFLIGHT_CF_JSON="${PREFLIGHT_CF_CONFLICTS_JSON}" \
    PREFLIGHT_FAILED_JSON="${PREFLIGHT_FAILED_CHANGESETS_JSON}" \
    BUCKET_PROD_NAME="${prod_b}" \
    BUCKET_STAGING_NAME="${staging_b}" \
    BUCKET_DEPLOY_NAME="${deploy_b}" \
    python3 <<'PY'
import json, os

def b(x):
    return True if str(x).lower() == "true" else False

domain = os.environ["DOMAIN_NAME"]
stack = os.environ["STACK_NAME"]
region = os.environ["AWS_REGION"]
st = os.environ.get("CF_STACK_STATUS") or ""
cf = json.loads(os.environ.get("PREFLIGHT_CF_JSON") or "[]")
failed = json.loads(os.environ.get("PREFLIGHT_FAILED_JSON") or "[]")

terminal_stack = st in (
    "ROLLBACK_COMPLETE",
    "CREATE_FAILED",
    "DELETE_FAILED",
    "ROLLBACK_FAILED",
    "IMPORT_ROLLBACK_FAILED",
)

out = {
    "domain": domain,
    "stackName": stack,
    "region": region,
    "stackStatus": st or None,
    "buckets": {
        "prod": os.environ["PREFLIGHT_BUCKETS_PROD"],
        "staging": os.environ["PREFLIGHT_BUCKETS_STAGING"],
        "deploy": os.environ["PREFLIGHT_BUCKETS_DEPLOY"],
        "prodName": os.environ["BUCKET_PROD_NAME"],
        "stagingName": os.environ["BUCKET_STAGING_NAME"],
        "deployName": os.environ["BUCKET_DEPLOY_NAME"],
    },
    "orphanBuckets": b(os.environ["PREFLIGHT_ORPHAN_BUCKETS"]),
    "cloudFrontAliasConflicts": cf,
    "failedChangeSets": failed,
    "stuckReviewSuggestedFix": (st == "REVIEW_IN_PROGRESS" or len(failed) > 0),
    "stackStatusBlocksDeploy": terminal_stack,
    "deployLikelyFails": b(os.environ["PREFLIGHT_ORPHAN_BUCKETS"])
    or len(cf) > 0
    or st == "REVIEW_IN_PROGRESS"
    or len(failed) > 0
    or terminal_stack,
    "deployLikelyFailReasons": [],
}
if out["orphanBuckets"]:
    out["deployLikelyFailReasons"].append("orphan_named_buckets")
if len(cf) > 0:
    out["deployLikelyFailReasons"].append("cloudfront_alias_conflict")
if st == "REVIEW_IN_PROGRESS":
    out["deployLikelyFailReasons"].append("stack_review_in_progress")
if len(failed) > 0:
    out["deployLikelyFailReasons"].append("failed_change_sets_present")
if terminal_stack:
    out["deployLikelyFailReasons"].append("terminal_stack_status")

print(json.dumps(out, separators=(",", ":")))
PY
}

delete_failed_change_sets_for_stack() {
  build_aws_cli
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    export AWS_PROFILE
  fi
  local raw
  if ! raw="$("${AWS_CLI[@]}" cloudformation list-change-sets \
    --stack-name "${STACK_NAME}" \
    --output json 2>/dev/null)"; then
    log "WARN" "list-change-sets failed (stack may not exist): ${STACK_NAME}"
    return 0
  fi
  local names
  names="$(printf '%s' "${raw}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('\\n'.join(x.get('ChangeSetName','') for x in (d.get('Summaries')or[]) if x.get('Status')=='FAILED'))")"
  if [[ -z "${names}" ]]; then
    log "INFO" "No FAILED change sets on stack ${STACK_NAME}."
    return 0
  fi
  while IFS= read -r cs_name; do
    [[ -z "${cs_name}" ]] && continue
    log "INFO" "Deleting FAILED change set: ${cs_name}"
    "${AWS_CLI[@]}" cloudformation delete-change-set \
      --stack-name "${STACK_NAME}" \
      --change-set-name "${cs_name}" || log "WARN" "delete-change-set failed for ${cs_name}"
  done <<<"${names}"
}

run_resource_preflight() {
  preflight_collect_data

  local prod_b="${DOMAIN_NAME}-prod"
  local staging_b="${DOMAIN_NAME}-staging"
  local deploy_b="${DOMAIN_NAME}-deploy"

  log "INFO" "── Preflight (named resources for this template) ──"
  log "INFO" "Apex domain: ${DOMAIN_NAME}"
  log "INFO" "Expected S3 bucket names: ${prod_b}, ${staging_b}, ${deploy_b}"
  if [[ -n "${LOGS_BUCKET_OVERRIDE}" ]]; then
    log "INFO" "Logs bucket (override): ${LOGS_BUCKET_OVERRIDE}"
  else
    log "INFO" "Logs bucket: (auto) CloudFormation will assign a name unless you pass --logs-bucket"
  fi

  if [[ -n "${CF_STACK_STATUS}" ]]; then
    log "INFO" "CloudFormation stack ${STACK_NAME}: ${CF_STACK_STATUS}"
    if [[ "${CF_STACK_STATUS}" == REVIEW_IN_PROGRESS ]]; then
      log "WARN" "Stack is waiting on a change set (REVIEW_IN_PROGRESS). Further deploys often fail until that change set is executed or deleted."
      log "WARN" "Inspect: ${AWS_CLI[*]} cloudformation list-change-sets --stack-name ${STACK_NAME}"
      log "WARN" "Delete a stuck change set: ${AWS_CLI[*]} cloudformation delete-change-set --stack-name ${STACK_NAME} --change-set-name NAME"
    fi
  else
    log "INFO" "CloudFormation stack ${STACK_NAME}: not found (no stack in this account/region)"
  fi

  local s3_list_bucket_count=""
  if [[ -n "${S3_LIST_BUCKETS_JSON}" ]]; then
    s3_list_bucket_count="$(
      printf '%s' "${S3_LIST_BUCKETS_JSON}" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('Buckets')or[]))" 2>/dev/null || echo '?'
    )"
    log "INFO" "S3 list-buckets inventory: ${s3_list_bucket_count} bucket name(s) in this account (paginated)"
    log "INFO" "S3 bucket check ${prod_b}: ${PREFLIGHT_BUCKETS_PROD} (same-account inventory + HeadBucket fallback)"
    log "INFO" "S3 bucket check ${staging_b}: ${PREFLIGHT_BUCKETS_STAGING} (same-account inventory + HeadBucket fallback)"
    log "INFO" "S3 bucket check ${deploy_b}: ${PREFLIGHT_BUCKETS_DEPLOY} (same-account inventory + HeadBucket fallback)"
  else
    log "WARN" "S3 list-buckets unavailable (IAM or error); using HeadBucket only — preflight may miss buckets this principal cannot Head."
    log "INFO" "S3 bucket check ${prod_b}: ${PREFLIGHT_BUCKETS_PROD}"
    log "INFO" "S3 bucket check ${staging_b}: ${PREFLIGHT_BUCKETS_STAGING}"
    log "INFO" "S3 bucket check ${deploy_b}: ${PREFLIGHT_BUCKETS_DEPLOY}"
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN" "python3 not available; skipping CloudFront alias scan."
  elif [[ "${PREFLIGHT_CF_CONFLICTS_JSON}" != "[]" ]]; then
    log "INFO" "CloudFront alias scan (apex, www, staging, deploy):"
    while IFS= read -r line; do
      [[ -n "${line}" ]] && log "INFO" "  ${line}"
    done < <(echo "${PREFLIGHT_CF_CONFLICTS_JSON}" | python3 -c "import json,sys; hits=json.load(sys.stdin); [print(f\"id={h.get('distributionId')} modified={h.get('lastModifiedTime')} comment={repr(h.get('comment',''))} matched_aliases={h.get('matchedAliases')}\") for h in hits]")
  else
    log "INFO" "CloudFront alias scan: no distributions use apex/www/staging/deploy for this apex."
  fi

  if [[ "${PREFLIGHT_FAILED_CHANGESETS_JSON}" != "[]" ]]; then
    log "INFO" "FAILED change sets on this stack (delete with --delete-failed-change-sets or console):"
    while IFS= read -r line; do
      [[ -n "${line}" ]] && log "INFO" "  ${line}"
    done < <(echo "${PREFLIGHT_FAILED_CHANGESETS_JSON}" | python3 -c "import json,sys; a=json.load(sys.stdin); [print(x.get('name',''), '|', (x.get('statusReason') or '')[:160]) for x in a]")
  fi

  log "INFO" "── End preflight ──"

  if [[ "${IF_STACK_EXISTS}" == fail ]] && stack_is_healthy_for_deploy_mode; then
    abort "Stack ${STACK_NAME} is already ${CF_STACK_STATUS}. Use --if-stack-exists refresh-outputs to write outputs only, or delete the stack first. (--if-stack-exists fail)"
  fi

  if [[ "${IF_STACK_EXISTS}" == refresh-outputs ]]; then
    if ! stack_allows_refresh_outputs; then
      abort "Cannot refresh outputs: stack ${STACK_NAME} status is '${CF_STACK_STATUS:-MISSING}' (need CREATE_COMPLETE, UPDATE_COMPLETE, or UPDATE_ROLLBACK_COMPLETE)."
    fi
    log "INFO" "Skipping CloudFormation deploy (--if-stack-exists refresh-outputs)."
    return 2
  fi

  if [[ "${ALLOW_CONFLICTING_NAMED_BUCKETS}" != true ]]; then
    if [[ -z "${CF_STACK_STATUS}" && "${PREFLIGHT_ANY_BUCKET_SIGHT}" == true ]]; then
      print_early_validation_hint
      log "ERROR" "Named S3 buckets for this apex already exist in this account, but CloudFormation stack ${STACK_NAME} was not found."
      log "ERROR" "They may be DeletionPolicy-retained orphans, or still owned by another stack (same domain → same bucket names). Empty/delete buckets after removing the other stack, or pass --allow-conflicting-named-buckets to try deploy anyway."
      log "ERROR" "Hint: aws cloudformation list-stacks --output text | grep -i pr-preview   # find another stack still owning these bucket names"
      log "ERROR" "Console: https://s3.console.aws.amazon.com/s3/buckets?region=${AWS_REGION}"
      exit 1
    fi
  fi

  if [[ -n "${CF_STACK_STATUS}" ]] && cf_stack_status_blocks_deploy; then
    log "ERROR" "Stack ${STACK_NAME} is in ${CF_STACK_STATUS} — aws cloudformation deploy cannot create a change set for this stack name."
    log "ERROR" "Delete the stack (after resolving resources that block delete, e.g. buckets retained by another stack), then re-run bootstrap:"
    log "ERROR" "  ${AWS_CLI[*]} cloudformation delete-stack --stack-name ${STACK_NAME}"
    log "ERROR" "  ${AWS_CLI[*]} cloudformation wait stack-delete-complete --stack-name ${STACK_NAME}"
    log "ERROR" "If create failed because buckets already exist in another stack, remove or reuse that stack first (same --domain always maps to the same three bucket names)."
    exit 1
  fi

  return 0
}

print_deploy_diagnostics() {
  print_early_validation_hint
  build_aws_cli

  if [[ "${CF_STACK_STATUS:-}" == REVIEW_IN_PROGRESS ]]; then
    log "DIAG" "Stack is REVIEW_IN_PROGRESS — delete failed/pending change sets, or execute if valid: list with list-change-sets, then delete-change-set or execute-change-set."
  fi

  log "DIAG" "Recent CloudFormation stack events for ${STACK_NAME}:"
  if ! "${AWS_CLI[@]}" cloudformation describe-stack-events \
    --stack-name "${STACK_NAME}" \
    --max-items 25 \
    --query 'StackEvents[].{Time:Timestamp,Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
    --output table 2>/dev/null; then
    log "DIAG" "(describe-stack-events unavailable or stack unknown)"
  fi

  local cs_name
  cs_name="$("${AWS_CLI[@]}" cloudformation list-change-sets \
    --stack-name "${STACK_NAME}" \
    --query "sort_by(Summaries[?Status=='FAILED'], &CreationTime)[-1].ChangeSetName" \
    --output text 2>/dev/null || echo '')"
  cs_name="${cs_name//$'\t'/}"
  if [[ -n "${cs_name}" && "${cs_name}" != "None" && "${cs_name}" != "null" ]]; then
    log "DIAG" "Latest FAILED change set: ${cs_name}"
    "${AWS_CLI[@]}" cloudformation describe-change-set \
      --stack-name "${STACK_NAME}" \
      --change-set-name "${cs_name}" \
      --query '{Status:Status,StatusReason:StatusReason,ExecutionStatus:ExecutionStatus}' \
      --output table 2>/dev/null || true
  else
    log "DIAG" "No FAILED change set found in list-change-sets (failure may be outside change set records)."
  fi
}

run_cloudformation_deploy() {
  build_aws_cli
  local deploy_cmd=(
    "${AWS_CLI[@]}" cloudformation deploy
    --template-file "${TEMPLATE_PATH}"
    --stack-name "${STACK_NAME}"
    --capabilities CAPABILITY_NAMED_IAM
    --parameter-overrides "${PARAMETER_OVERRIDES[@]}"
  )

  if [[ "${DRY_RUN}" == true ]]; then
    deploy_cmd+=(--no-execute-changeset)
    log "INFO" "Running dry-run deployment for stack ${STACK_NAME}..."
  else
    log "INFO" "Deploying stack ${STACK_NAME}..."
  fi

  set +e
  "${deploy_cmd[@]}"
  local dcode=$?
  set -e
  if [[ "${dcode}" -ne 0 ]]; then
    log "WARN" "CloudFormation deploy failed (exit ${dcode})."
    print_deploy_diagnostics
    exit "${dcode}"
  fi
}

finalize_stack_outputs() {
  build_aws_cli

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run completed. No resources were updated."
    exit 0
  fi

  log "INFO" "Fetching stack outputs..."
  fetch_output() {
    local key="$1"
    "${AWS_CLI[@]}" cloudformation describe-stacks \
      --stack-name "${STACK_NAME}" \
      --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue" \
      --output text
  }

  local prod_bucket staging_bucket deploy_bucket logs_bucket
  local prod_dist_id staging_dist_id deploy_dist_id
  local prod_dist_domain staging_dist_domain deploy_dist_domain
  local function_arn preview_prefix_output

  prod_bucket="$(fetch_output "ProdBucketName")"
  staging_bucket="$(fetch_output "StagingBucketName")"
  deploy_bucket="$(fetch_output "DeployBucketName")"
  logs_bucket="$(fetch_output "LogsBucketName")"
  prod_dist_id="$(fetch_output "ProdDistributionId")"
  staging_dist_id="$(fetch_output "StagingDistributionId")"
  deploy_dist_id="$(fetch_output "DeployDistributionId")"
  prod_dist_domain="$(fetch_output "ProdDistributionDomainName")"
  staging_dist_domain="$(fetch_output "StagingDistributionDomainName")"
  deploy_dist_domain="$(fetch_output "DeployDistributionDomainName")"
  function_arn="$(fetch_output "PRPathRouterFunctionArn")"
  preview_prefix_output="$(fetch_output "PreviewPrefixOutput")"

  for bucket in "${prod_bucket}" "${staging_bucket}" "${deploy_bucket}"; do
    if [[ -n "${bucket}" && "${bucket}" != "None" ]]; then
      log "INFO" "Uploading error page to s3://${bucket}/error.html"
      "${AWS_CLI[@]}" s3 cp "${ERROR_PAGE_PATH}" "s3://${bucket}/error.html" \
        --content-type text/html || log "WARN" "Failed to upload error page to ${bucket}"
    fi
  done

  local skip_cf="${SKIP_CLOUDFRONT_FUNCTION_PUBLISH:-}"
  if [[ "${skip_cf}" == "1" || "${skip_cf}" == "true" || "${skip_cf}" == "TRUE" ]]; then
    log "INFO" "Skipping CloudFront function publish (--skip-cloudfront-function-publish or SKIP_CLOUDFRONT_FUNCTION_PUBLISH)."
  else
    publish_pr_path_router_function
  fi

  write_exports "PR_PREVIEW_WEBSITE_BUCKET" "${deploy_bucket}"
  write_exports "PR_PREVIEW_LOGS_BUCKET" "${logs_bucket}"
  write_exports "PR_PREVIEW_DISTRIBUTION_ID" "${deploy_dist_id}"
  write_exports "PR_PREVIEW_CLOUDFRONT_DOMAIN" "https://${deploy_dist_domain}"
  write_exports "PR_PREVIEW_FUNCTION_ARN" "${function_arn}"
  write_exports "PR_PREVIEW_PREFIX" "${preview_prefix_output}"

  write_exports "PROD_BUCKET_NAME" "${prod_bucket}"
  write_exports "STAGING_BUCKET_NAME" "${staging_bucket}"
  write_exports "DEPLOY_BUCKET_NAME" "${deploy_bucket}"
  write_exports "PROD_DISTRIBUTION_ID" "${prod_dist_id}"
  write_exports "STAGING_DISTRIBUTION_ID" "${staging_dist_id}"
  write_exports "DEPLOY_DISTRIBUTION_ID" "${deploy_dist_id}"

  log "INFO" "Stack deployment complete."
  log "INFO" "Production bucket: ${prod_bucket} (${prod_dist_domain})"
  log "INFO" "Staging bucket: ${staging_bucket} (${staging_dist_domain})"
  log "INFO" "Deploy/Preview bucket: ${deploy_bucket} (${deploy_dist_domain})"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain)
        DOMAIN_NAME="$2"
        shift 2
        ;;
      --hosted-zone-id)
        HOSTED_ZONE_ID="$2"
        shift 2
        ;;
      --certificate-arn)
        CERTIFICATE_ARN="$2"
        shift 2
        ;;
      --stack-name)
        STACK_NAME="$2"
        shift 2
        ;;
      --region)
        AWS_REGION="$2"
        shift 2
        ;;
      --aws-profile)
        AWS_PROFILE="$2"
        shift 2
        ;;
      --preview-prefix)
        PREVIEW_PREFIX="$2"
        shift 2
        ;;
      --logs-bucket)
        LOGS_BUCKET_OVERRIDE="$2"
        shift 2
        ;;
      --env-file)
        ENV_FILE="$2"
        mkdir -p "$(dirname "${ENV_FILE}")"
        : >"${ENV_FILE}"
        shift 2
        ;;
      --disable-s3-encryption)
        ENABLE_S3_ENCRYPTION="false"
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --if-stack-exists)
        IF_STACK_EXISTS="$2"
        shift 2
        ;;
      --allow-conflicting-named-buckets)
        ALLOW_CONFLICTING_NAMED_BUCKETS=true
        shift
        ;;
      --print-preflight-json)
        PRINT_PREFLIGHT_JSON=true
        shift
        ;;
      --delete-failed-change-sets)
        DELETE_FAILED_CHANGE_SETS=true
        shift
        ;;
      --skip-cloudfront-function-publish)
        SKIP_CLOUDFRONT_FUNCTION_PUBLISH=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        abort "Unknown argument: $1"
        ;;
    esac
  done

  [[ -n "${DOMAIN_NAME}" ]] || abort "--domain is required"
  [[ -n "${HOSTED_ZONE_ID}" ]] || abort "--hosted-zone-id is required"
  [[ -n "${CERTIFICATE_ARN}" ]] || abort "--certificate-arn is required"

  case "${IF_STACK_EXISTS}" in
    deploy | refresh-outputs | fail) ;;
    *) abort "--if-stack-exists must be deploy, refresh-outputs, or fail" ;;
  esac
}

build_parameter_overrides() {
  PARAMETER_OVERRIDES=(
    "DomainName=${DOMAIN_NAME}"
    "HostedZoneId=${HOSTED_ZONE_ID}"
    "CertificateArn=${CERTIFICATE_ARN}"
    "PreviewPrefix=${PREVIEW_PREFIX}"
    "EnableS3BucketEncryption=${ENABLE_S3_ENCRYPTION}"
  )

  if [[ -n "${LOGS_BUCKET_OVERRIDE}" ]]; then
    PARAMETER_OVERRIDES+=("LogsBucketName=${LOGS_BUCKET_OVERRIDE}")
  fi
}

# Empty AWS_PROFILE in the environment makes AWS CLI try profile "" ("config profile () could not be found").
# After unset, reassign a non-exported empty shell var so `set -u` never sees an unbound AWS_PROFILE.
normalize_aws_profile_env() {
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    export AWS_PROFILE
  else
    unset AWS_PROFILE 2>/dev/null || true
    AWS_PROFILE=""
  fi
}

main() {
  parse_args "$@"
  normalize_aws_profile_env

  if [[ "${DELETE_FAILED_CHANGE_SETS}" == true ]]; then
    ensure_minimal_for_preflight_tools
    delete_failed_change_sets_for_stack
    exit 0
  fi

  if [[ "${PRINT_PREFLIGHT_JSON}" == true ]]; then
    ensure_minimal_for_preflight_tools
    print_preflight_json_to_stdout
    exit 0
  fi

  ensure_prereqs
  render_function_template || true
  build_parameter_overrides

  build_aws_cli
  log "INFO" "Validating CloudFormation template..."
  "${AWS_CLI[@]}" cloudformation validate-template \
    --template-body "file://${TEMPLATE_PATH}" >/dev/null

  local pf
  pf=0
  run_resource_preflight || pf=$?
  if [[ "${pf}" -eq 2 ]]; then
    finalize_stack_outputs
    exit 0
  fi

  run_cloudformation_deploy
  finalize_stack_outputs
}

main "$@"

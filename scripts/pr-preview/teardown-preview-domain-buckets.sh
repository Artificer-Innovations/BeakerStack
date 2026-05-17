#!/usr/bin/env bash
# Destructively empty and delete <apex>-prod, <apex>-staging, <apex>-deploy S3 buckets.
# Refuses if CloudFront distributions use apex/www/staging/deploy for that apex unless
# --i-acknowledge-cloudfront-may-break is passed (breaks live traffic if distributions still use these origins).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DOMAIN_NAME=""
AWS_REGION="us-east-1"
AWS_PROFILE="${AWS_PROFILE:-}"
ACK_CLOUDFRONT_RISK=false
DRY_RUN=false
CONFIRM_PHRASE="PERMANENTLY DELETE BUCKETS"

usage() {
  cat <<EOF
Usage: $(basename "$0") --domain APEX [--region REGION] [--aws-profile NAME]
       [--i-acknowledge-cloudfront-may-break] [--dry-run]

Confirmation (pick one):
  • Set env BEAKER_DELETE_BUCKETS_CONFIRM to exactly: ${CONFIRM_PHRASE}
    (used by setup-full so the shell never prompts; avoids IDE TTY/readline freezes)
  • Or type the phrase when prompted (standalone terminal only; may freeze under IDE readline)

Refuses when CloudFront alias conflicts exist for this apex unless
--i-acknowledge-cloudfront-may-break is set (dangerous: origins may break mid-traffic).

If delete-bucket fails (MFA delete, policy), fix in AWS console and retry.
EOF
}

log() {
  printf '[%-5s] %s\n' "$1" "$2" >&2
}

abort() {
  log "ERROR" "$1"
  exit "${2:-1}"
}

build_aws() {
  AWS_CLI=(aws --region "${AWS_REGION}")
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    AWS_CLI+=(--profile "${AWS_PROFILE}")
  fi
}

# Prefix for `env VAR=val command` — never sets AWS_PROFILE to an empty string (breaks AWS CLI).
run_with_aws_env() {
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    env AWS_REGION="${AWS_REGION}" AWS_PROFILE="${AWS_PROFILE}" "$@"
  else
    env -u AWS_PROFILE AWS_REGION="${AWS_REGION}" "$@"
  fi
}

cloudfront_conflicts_for_domain() {
  run_with_aws_env \
    DOMAIN_NAME="${DOMAIN_NAME}" \
    python3 <<'PY'
import json, os, subprocess, sys, shutil

domain = os.environ.get("DOMAIN_NAME", "").strip().lower().rstrip(".")
if not domain:
    print("0")
    sys.exit(0)
want = {domain, f"www.{domain}", f"staging.{domain}", f"deploy.{domain}"}
aws = shutil.which("aws") or "aws"
region = os.environ.get("AWS_REGION", "us-east-1")
profile = (os.environ.get("AWS_PROFILE") or "").strip()
cmd_prefix = [aws, "--region", region]
if profile:
    cmd_prefix += ["--profile", profile]


def aws_env():
    env = os.environ.copy()
    if not profile:
        env.pop("AWS_PROFILE", None)
    return env


items = []
marker = None
for _ in range(500):
    cli = cmd_prefix + ["cloudfront", "list-distributions", "--output", "json", "--max-items", "100"]
    if marker:
        cli.extend(["--starting-token", marker])
    try:
        raw = subprocess.check_output(cli, stderr=subprocess.DEVNULL, text=True, timeout=120, env=aws_env())
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        print("0")
        sys.exit(0)
    data = json.loads(raw or "{}")
    dl = data.get("DistributionList") or {}
    items.extend(dl.get("Items") or [])
    marker = data.get("NextToken") or dl.get("NextMarker")
    if not marker:
        break
n = 0
for item in items:
    aliases = ((item.get("Aliases") or {}).get("Items")) or []
    if any(a in want for a in aliases):
        n += 1
print(n)
PY
}

purge_bucket() {
  local bucket="$1"
  if ! "${AWS_CLI[@]}" s3api head-bucket --bucket "${bucket}" >/dev/null 2>&1; then
    log "INFO" "Skip (not found / no access): ${bucket}"
    return 0
  fi
  log "WARN" "Purging bucket: ${bucket}"
  "${AWS_CLI[@]}" s3api put-bucket-logging --bucket "${bucket}" --bucket-logging-status '{}' 2>/dev/null || true
  "${AWS_CLI[@]}" s3 rm "s3://${bucket}/" --recursive >/dev/null 2>&1 || true

  run_with_aws_env BUCKET="${bucket}" python3 <<'PY'
import json, os, subprocess, sys, shutil, tempfile

bucket = os.environ["BUCKET"]
aws = shutil.which("aws") or "aws"
region = os.environ.get("AWS_REGION", "us-east-1")
profile = (os.environ.get("AWS_PROFILE") or "").strip()
cmd_prefix = [aws, "--region", region]
if profile:
    cmd_prefix += ["--profile", profile]


def aws_env():
    env = os.environ.copy()
    if not profile:
        env.pop("AWS_PROFILE", None)
    return env


def run(args):
    return subprocess.run(cmd_prefix + args, capture_output=True, text=True, env=aws_env())


def aws_json(args):
    r = run(args)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout or "{}")
    except json.JSONDecodeError:
        return None


key_m = ""
ver_m = ""
for _ in range(10000):
    args = ["s3api", "list-object-versions", "--bucket", bucket, "--max-keys", "1000"]
    if key_m:
        args += ["--key-marker", key_m]
    if ver_m:
        args += ["--version-id-marker", ver_m]
    data = aws_json(args)
    if not data:
        break
    objs = []
    for v in data.get("Versions") or []:
        objs.append({"Key": v["Key"], "VersionId": v["VersionId"]})
    for m in data.get("DeleteMarkers") or []:
        objs.append({"Key": m["Key"], "VersionId": m["VersionId"]})
    if objs:
        batch = objs[:1000]
        payload = {"Objects": [{"Key": o["Key"], "VersionId": o["VersionId"]} for o in batch], "Quiet": True}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fp:
            json.dump(payload, fp)
            path = fp.name
        r = run(["s3api", "delete-objects", "--bucket", bucket, "--delete", f"file://{path}"])
        os.unlink(path)
        if r.returncode != 0:
            print(r.stderr or "delete-objects failed", file=sys.stderr)
            sys.exit(1)
        key_m = ""
        ver_m = ""
        continue
    if data.get("IsTruncated"):
        key_m = data.get("NextKeyMarker") or ""
        ver_m = data.get("NextVersionIdMarker") or ""
        continue
    break

r = run(["s3api", "delete-bucket", "--bucket", bucket])
if r.returncode != 0:
    print(r.stderr or "delete-bucket failed", file=sys.stderr)
    sys.exit(1)
PY
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain)
        DOMAIN_NAME="$2"
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
      --i-acknowledge-cloudfront-may-break)
        ACK_CLOUDFRONT_RISK=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        abort "Unknown argument: $1"
        ;;
    esac
  done
  [[ -n "${DOMAIN_NAME}" ]] || abort "--domain is required"
}

main() {
  parse_args "$@"
  # Empty AWS_PROFILE breaks AWS CLI ("config profile () could not be found"); drop inherited empty values.
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    export AWS_PROFILE
  else
    unset AWS_PROFILE 2>/dev/null || true
    AWS_PROFILE=""
  fi
  export AWS_REGION
  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run: skipping aws/python purge (would delete ${DOMAIN_NAME}-prod, ${DOMAIN_NAME}-staging, ${DOMAIN_NAME}-deploy after confirmation)."
  else
    command -v aws >/dev/null 2>&1 || abort "aws CLI required"
    command -v python3 >/dev/null 2>&1 || abort "python3 required for versioned bucket purge"
  fi

  if [[ "${DRY_RUN}" != true ]]; then
    build_aws
    local cf_n
    cf_n="$(cloudfront_conflicts_for_domain | tr -d '\r\n')"
    if [[ "${cf_n}" != "0" && "${ACK_CLOUDFRONT_RISK}" != true ]]; then
      abort "CloudFront distributions use custom aliases for ${DOMAIN_NAME} (${cf_n} hit(s)). Remove aliases or disable distributions first, or pass --i-acknowledge-cloudfront-may-break (dangerous)."
    fi
    if [[ "${cf_n}" != "0" && "${ACK_CLOUDFRONT_RISK}" == true ]]; then
      log "WARN" "Proceeding with bucket deletion despite ${cf_n} CloudFront alias conflict(s) — origins may break."
    fi
  fi

  local line=""
  if [[ -n "${BEAKER_DELETE_BUCKETS_CONFIRM:-}" ]]; then
    line="${BEAKER_DELETE_BUCKETS_CONFIRM}"
    log "INFO" "Using confirmation from BEAKER_DELETE_BUCKETS_CONFIRM (no interactive read)."
  else
    # Avoid `read` when stdin may be shared with a parent readline (Cursor/IDE) — it often freezes with no echo.
    if [[ ! -t 0 ]]; then
      abort "Non-interactive stdin without BEAKER_DELETE_BUCKETS_CONFIRM. Export BEAKER_DELETE_BUCKETS_CONFIRM='${CONFIRM_PHRASE}' or run from a real terminal."
    fi
    IFS= read -r -p "Type '${CONFIRM_PHRASE}' to empty and delete ${DOMAIN_NAME}-prod, ${DOMAIN_NAME}-staging, ${DOMAIN_NAME}-deploy: " line || true
  fi
  if [[ "${line}" != "${CONFIRM_PHRASE}" ]]; then
    abort "Confirmation phrase did not match; no changes made."
  fi

  local prod staging deploy
  prod="${DOMAIN_NAME}-prod"
  staging="${DOMAIN_NAME}-staging"
  deploy="${DOMAIN_NAME}-deploy"

  if [[ "${DRY_RUN}" == true ]]; then
    log "INFO" "Dry-run OK (confirmation accepted). No S3 changes made."
    exit 0
  fi

  for b in "${prod}" "${staging}" "${deploy}"; do
    purge_bucket "${b}" || abort "Failed to purge ${b}"
  done
  log "INFO" "Done. Buckets removed (if they existed): ${prod}, ${staging}, ${deploy}"
}

main "$@"

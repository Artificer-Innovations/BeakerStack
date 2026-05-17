#!/usr/bin/env bash
# Extract the publishable "## CalVer release notes" section from a promotion PR body.
# Content above the first "---" line after that heading is copied to stdout.
# Maintainer-only sections below "---" are excluded.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-pr-body.md>" >&2
  exit 1
fi

BODY_FILE="$1"
if [[ ! -f "$BODY_FILE" ]]; then
  echo "File not found: $BODY_FILE" >&2
  exit 1
fi

python3 - "$BODY_FILE" <<'PY'
import sys
from pathlib import Path

body = Path(sys.argv[1]).read_text(encoding="utf-8")
heading = "## CalVer release notes"
idx = body.find(heading)
if idx == -1:
    print(
        "PR body is missing a '## CalVer release notes' section. "
        "Use the promote-develop-to-main pull request template.",
        file=sys.stderr,
    )
    sys.exit(1)

# Content after the heading line
after_heading = body[idx + len(heading) :]
line_end = after_heading.find("\n")
content = after_heading[line_end + 1 :] if line_end != -1 else ""

# Stop at maintainer separator (--- on its own line).
# Do not put a bare "---" inside CalVer prose — extraction ends at the first match.
lines = content.splitlines()
published: list[str] = []
for line in lines:
    if line.strip() == "---":
        break
    published.append(line)

text = "\n".join(published).strip()
if not text:
    print(
        "CalVer release notes section is empty. "
        "Fill in Summary, Highlights, and Adopter notes before merging.",
        file=sys.stderr,
    )
    sys.exit(1)

print(text)
PY

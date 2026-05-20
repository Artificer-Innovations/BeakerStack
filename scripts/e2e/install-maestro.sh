#!/usr/bin/env bash
# Install a pinned Maestro CLI release.
set -euo pipefail

MAESTRO_VERSION="${MAESTRO_VERSION:-1.39.0}"
INSTALL_DIR="${HOME}/.maestro"

if command -v maestro >/dev/null 2>&1; then
  current="$(maestro --version 2>/dev/null | head -1 || true)"
  if [[ "${current}" == *"${MAESTRO_VERSION}"* ]]; then
    echo "Maestro ${MAESTRO_VERSION} already installed"
    exit 0
  fi
fi

echo "Installing Maestro ${MAESTRO_VERSION}..."
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="${INSTALL_DIR}/bin:${PATH}"
if [[ -n "${GITHUB_PATH:-}" ]]; then
  echo "${INSTALL_DIR}/bin" >> "${GITHUB_PATH}"
fi
maestro --version

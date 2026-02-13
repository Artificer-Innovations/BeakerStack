#!/usr/bin/env bash
# Install script for local device builds
# Usage: ./install-local-device.sh <path-to-ipa>

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <path-to-ipa>"
  echo ""
  echo "Example:"
  echo "  $0 build-1234567890.ipa"
  echo "  $0 ~/Downloads/BeakerStack.ipa"
  exit 1
fi

IPA_PATH="$1"

if [ ! -f "${IPA_PATH}" ]; then
  echo "❌ Error: IPA file not found: ${IPA_PATH}"
  exit 1
fi

# Get the absolute path
IPA_PATH="$(cd "$(dirname "${IPA_PATH}")" && pwd)/$(basename "${IPA_PATH}")"

echo "📱 Installing ${IPA_PATH} on connected iPhone..."

# Find connected iPhone
DEVICE_ID=$(xcrun devicectl list devices 2>/dev/null | grep -i "iphone" | head -1 | awk '{print $1}' || echo "")

if [ -z "${DEVICE_ID}" ]; then
  echo "❌ Error: No iPhone found. Please connect your iPhone via USB."
  exit 1
fi

echo "   Found device: ${DEVICE_ID}"

# Install the app
xcrun devicectl device install app --device "${DEVICE_ID}" "${IPA_PATH}"

echo "✅ Installation complete!"
echo "   The app should now appear on your iPhone home screen."


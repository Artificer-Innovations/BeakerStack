#!/bin/bash
# Script to add an image file to Android emulator for testing
# Usage: ./scripts/add-image-to-android.sh /path/to/image.jpg

set -e

if [ $# -eq 0 ]; then
  echo "Usage: $0 <image-file-path>"
  echo "Example: $0 ~/Pictures/test-avatar.jpg"
  exit 1
fi

IMAGE_PATH="$1"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: File not found: $IMAGE_PATH"
  exit 1
fi

# Check if adb is available
if ! command -v adb &> /dev/null; then
  echo "Error: adb not found. Make sure Android SDK platform-tools are in your PATH."
  exit 1
fi

# Check if device is connected
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
  echo "Error: No Android device/emulator connected."
  echo "Please start your Android emulator first."
  exit 1
fi

# Get filename
FILENAME=$(basename "$IMAGE_PATH")

echo "📱 Adding image to Android emulator..."
echo "   File: $FILENAME"
echo "   Destination: /sdcard/Pictures/$FILENAME"

# Push to Pictures folder (will appear in Gallery)
adb push "$IMAGE_PATH" "/sdcard/Pictures/$FILENAME"

# Trigger media scan so it appears in Gallery immediately
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Pictures/$FILENAME"

echo "✅ Image added successfully!"
echo "   Open the Gallery/Photos app in your emulator to see it."


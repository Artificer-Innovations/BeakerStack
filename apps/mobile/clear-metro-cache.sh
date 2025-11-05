#!/bin/bash
# Aggressive Metro cache clearing

echo "🧹 Clearing ALL Metro caches..."

# Kill Metro
pkill -9 -f 'metro' 2>/dev/null || true
pkill -9 -f 'expo' 2>/dev/null || true

# Clear Metro caches
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf .metro 2>/dev/null || true
rm -rf ../../node_modules/.cache 2>/dev/null || true

# Clear Metro temp files
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

echo "✅ Metro cache cleared!"
echo ""
echo "Now start Metro with: npx expo start --clear"


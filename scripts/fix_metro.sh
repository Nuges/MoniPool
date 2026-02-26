#!/bin/bash
echo "🧹 Starting Deep Clean for MoniPool..."

# 1. Stop any running Metro processes (this is a best effort, might not work if not running in this shell)
echo "Stopping Metro..."
lsof -ti:8081 | xargs kill -9 2>/dev/null

# 2. Watchman (common culprit)
echo "Resetting Watchman..."
watchman watch-del-all 2>/dev/null

# 3. Clear Metro Cache blocks
echo "Deleting .expo and Metro cache..."
rm -rf .expo
rm -rf web-build
rm -rf .open-next
rm -rf node_modules/.cache/metro-bundler-store
rm -rf $TMPDIR/metro-cache
rm -rf $TMPDIR/haste-map-*

# 4. Clear Haste Map (React Native specific)
echo "Clearing Haste Map..."
rm -rf $TMPDIR/react-native-packager-cache-*

echo "✅ Clean complete."
echo "🚀 Starting Metro with reset-cache..."
npx expo start --clear

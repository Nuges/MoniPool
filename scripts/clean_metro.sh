#!/bin/bash
echo "🧹 Starting Deep Clean for MoniPool..."

# 1. Stop any running Metro processes
echo "Stopping Metro..."
lsof -ti:8081 | xargs kill -9 2>/dev/null

# 2. Watchman
echo "Resetting Watchman..."
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
else
    echo "Watchman not found, skipping."
fi

# 3. Clear Caches
echo "Deleting caches..."
rm -rf .expo
rm -rf web-build
rm -rf .open-next
rm -rf node_modules/.cache/metro-bundler-store
rm -rf "$TMPDIR/metro-cache"
# Use wildcards carefully
find "$TMPDIR" -name "haste-map-*" -exec rm -rf {} + 2>/dev/null
find "$TMPDIR" -name "react-native-packager-cache-*" -exec rm -rf {} + 2>/dev/null

echo "✅ Clean complete. Please run 'npx expo start --clear' to restart."

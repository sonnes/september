#!/bin/bash
set -euo pipefail

PRODUCT_NAME="September"
APP_NAME="September.app"
BUILD_DIR=".build/release"
APP_DIR="$BUILD_DIR/$APP_NAME"

# Dev mode: swift run (uses terminal's accessibility permission)
if [[ "${1:-}" == "dev" ]]; then
    echo "Running $PRODUCT_NAME in dev mode..."
    echo "Tip: Grant your terminal app Accessibility permission to avoid re-granting per build."
    swift run
    exit 0
fi

echo "Building $PRODUCT_NAME..."
swift build -c release

echo "Creating app bundle..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cp "$BUILD_DIR/$PRODUCT_NAME" "$APP_DIR/Contents/MacOS/$PRODUCT_NAME"
cp Resources/Info.plist "$APP_DIR/Contents/"
cp Resources/September.entitlements "$APP_DIR/Contents/Resources/"

echo "Signing app bundle..."
codesign --force --deep --options runtime --timestamp=none \
    --entitlements Resources/September.entitlements \
    --sign - "$APP_DIR"

echo ""
echo "Build complete: $APP_DIR"
echo "Run with: open \"$APP_DIR\""

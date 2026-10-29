#!/usr/bin/env bash
# Builds the iPad app and opens it in the iPad Simulator. No signing or SideStore needed.
set -euo pipefail
cd "$(dirname "$0")/.."
# Built outside the project: the Desktop (synced by iCloud) adds file metadata that code signing refuses.
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/RamiyasRecipes-cli"
DEVICE="${IOS_SIM_DEVICE:-iPad Pro 11-inch (M4)}"
bash scripts/ios-secrets.sh
(cd ios && xcodegen generate --quiet)
xcodebuild -project ios/RamiyasRecipes.xcodeproj -scheme RamiyasRecipes -configuration Debug \
  -sdk iphonesimulator -destination "platform=iOS Simulator,name=$DEVICE" -derivedDataPath "$DERIVED" \
  -quiet build
xcrun simctl boot "$DEVICE" 2>/dev/null || true # already booted is fine
open -a Simulator
xcrun simctl install "$DEVICE" "$DERIVED"/Build/Products/Debug-iphonesimulator/RamiyasRecipes.app
xcrun simctl launch "$DEVICE" com.jaylouissaint.ramiyasrecipes

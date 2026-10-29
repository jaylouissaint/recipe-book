#!/usr/bin/env bash
# Builds an unsigned .ipa of the iPad app for SideStore, which signs it with your signing Apple ID.
# Output: build/ios/RamiyasRecipes.ipa
set -euo pipefail
cd "$(dirname "$0")/.."
# Built outside the project: the Desktop (synced by iCloud) adds file metadata that code signing refuses.
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/RamiyasRecipes-cli"
bash scripts/ios-secrets.sh
(cd ios && xcodegen generate --quiet)
rm -rf build/ios
xcodebuild -project ios/RamiyasRecipes.xcodeproj -scheme RamiyasRecipes -configuration Release \
  -sdk iphoneos -destination "generic/platform=iOS" -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" -quiet build
mkdir -p build/ios/Payload
cp -R "$DERIVED"/Build/Products/Release-iphoneos/RamiyasRecipes.app build/ios/Payload/
(cd build/ios && zip -qry RamiyasRecipes.ipa Payload)
rm -rf build/ios/Payload
echo "Built build/ios/RamiyasRecipes.ipa"

#!/usr/bin/env bash
# Runs the iPad app's Swift tests in the iPad Simulator.
set -euo pipefail
cd "$(dirname "$0")/.."
DEVICE="${IOS_SIM_DEVICE:-iPad Pro 11-inch (M4)}"
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/RamiyasRecipes-cli" # see ios-sim.sh
bash scripts/ios-secrets.sh
(cd ios && xcodegen generate --quiet)
xcodebuild test -project ios/RamiyasRecipes.xcodeproj -scheme RamiyasRecipes \
  -destination "platform=iOS Simulator,name=$DEVICE" -derivedDataPath "$DERIVED" -quiet

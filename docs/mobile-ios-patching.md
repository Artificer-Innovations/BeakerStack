# Mobile iOS Patching Overview

We ship the mobile starter with a couple of `patch-package` fixes that keep clean iOS rebuilds working across Node workspaces and Expo upgrades.

## Patch Application Flow

- `apps/mobile/scripts/apply-patches.js` runs on `npm install`, `npm run ios:clean`, and `scripts/clean-rebuild.sh`.
- The script now detects workspaces that hoist dependencies to `../node_modules` or `../../node_modules`, then calls `npx patch-package --patch-dir apps/mobile/patches` from the monorepo root.
- If we add new patches, drop them in `apps/mobile/patches/` (e.g. `react-native+0.73.6.patch`) and they will be applied automatically the next time the script runs.

## Current Patches

- `expo-dev-menu+4.5.8.patch`  
  Replaces the deprecated `TARGET_IPHONE_SIMULATOR` macro with `#if targetEnvironment(simulator)` to keep the Expo dev menu compiling on modern Xcode.

- `react-native+0.73.6.patch`  
  Restores the generated `RCTThirdPartyFabricComponentsProvider` Objective‑C bridge and adds a C++ stub that returns an empty `ComponentDescriptorProviderRegistry`, which fixes clean Fabric builds when React Native is hoisted into the workspace root.

## Maintenance Tips

- After editing any file under `node_modules`, re-run `npx patch-package <package>` from the repo root and move the generated patch into `apps/mobile/patches/`.
- Always re-run `npm run ios:clean -- --verbose` to confirm a true clean build succeeds before committing patch updates.
- Document new patches here so downstream users of the starter understand why the fix exists and when it is safe to remove.

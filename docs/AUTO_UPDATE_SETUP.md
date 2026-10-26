# GPS-SMART MANAGEMENT — Windows automatic updates

The desktop updater uses Tauri's signed update protocol and the GitHub Release asset `latest.json`.

## Required one-time owner setup

1. On a trusted computer, generate the Tauri signing pair:
   `npm run tauri signer generate -- -w ~/.tauri/gps-smart-management.key`
2. Keep the private key and password in a password manager/offline backup. Never commit or share the private key.
3. In GitHub repository Settings → Secrets and variables → Actions → Variables, add `TAURI_UPDATER_PUBLIC_KEY` with the contents of the public-key file.
4. In the Secrets tab, add `TAURI_SIGNING_PRIVATE_KEY` with the private-key file contents. Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` only if the key has a password.
5. Keep the same key pair permanently. Existing installations trust the public key built into the app; rotating it requires a migration plan.

## Release process

- App version is currently `0.1.1` in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
- After the signing variable and secrets exist, run Actions → **Release GPS-SMART MANAGEMENT** → Run workflow, choose branch `main`, and enter `v0.1.1`. Or push that tag after the workflow is merged to main.
- The workflow stops safely when signing values are missing, validates matching versions, injects the public key, enables updater artifacts for this signed release build, and publishes a signed Windows NSIS installer plus `latest.json`.
- Startup update checks are compiled into signed release builds only. The updater asks the user before installing.
- This does not automatically update older `0.1.0` installations unless those installations already contain the updater code and matching public key. Those users must install the first updater-enabled release manually once.

## Android

Android APK builds and update distribution are separate from the Windows Tauri updater. A stable Android signing keystore is required for public APK releases and future in-place updates.

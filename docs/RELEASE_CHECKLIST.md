# GPS-SMART MANAGEMENT release checklist

This checklist is a release gate. Do not publish a public release until every required check passes.

## Current safe state

- The download page is served from the `feat/auto-update-foundation` Vercel Preview.
- The Windows Tauri updater is not registered or enabled.
- `bundle.createUpdaterArtifacts` must remain `false` until the updater signing key and updater implementation are ready.
- The download page points to future GitHub Release assets; those links are not expected to work before the first release.

## Before publishing Android APKs

Android upgrades must be signed with the same release keystore. Do not distribute APKs built with an ephemeral/debug signing key as the long-term public release.

1. Create a dedicated Android release keystore and store it securely outside the repository.
2. Add the keystore and its passwords/alias as encrypted GitHub Actions secrets.
3. Configure the Android release build to sign APKs consistently with that keystore.
4. Verify the APK installs on a clean device and that a later build upgrades the installed app without uninstalling or losing app data.
5. Keep an encrypted backup of the keystore and recovery credentials. Losing the key can prevent in-place updates.

Suggested secret names (never commit their values):
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Before enabling Windows auto-update

1. Add and test the official Tauri updater plugin in Rust and JavaScript.
2. Generate a dedicated Tauri updater signing keypair locally; do not generate or commit a private key in CI.
3. Store the private key and password in GitHub Actions secrets:
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
4. Put only the matching public key in Tauri configuration.
5. Configure a stable HTTPS update endpoint and signed updater artifacts.
6. Implement a UI that shows the available version and release notes, asks for explicit consent before download/install, and handles cancel/error/restart paths.
7. Test valid signatures, invalid signatures, no update, declined update, interrupted download, and successful update on a real Windows device.
8. Only then enable `bundle.createUpdaterArtifacts` and the signed updater release workflow.

Never put private signing keys, passwords, Supabase service-role keys, or other secrets in source control, logs, public build artifacts, or chat messages.

## Release publication gate

- [ ] PR reviewed and merged intentionally.
- [ ] Frontend build and Tauri configuration checks pass.
- [ ] Windows installer tested on a clean Windows machine.
- [ ] Android APK signed with the permanent release key and tested on a real device.
- [ ] Download filenames exactly match the links on the website.
- [ ] Release notes identify the version and known limitations.
- [ ] GitHub Release assets verified by downloading and checking their hashes.
- [ ] Production website deployment verified after approval.
- [ ] Auto-update remains disabled unless its separate signing and consent tests pass.

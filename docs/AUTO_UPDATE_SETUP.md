# GPS-SMART MANAGEMENT — Windows automatic updates

The desktop updater uses Tauri's signed updater protocol and the GitHub Releases asset
`latest.json`. Do not publish a release until the signing key and public key are paired.

## One-time owner setup

1. Generate a Tauri updater key pair on a trusted computer using the Tauri CLI:
   `npm run tauri signer generate -- -w ~/.tauri/gps-smart-management.key`
2. Keep the private key file and its password in a secure password manager or offline backup.
   Never commit the private key to the repository or paste it into issues or chat.
3. Add the **contents of the public key file** as a GitHub repository variable named
   `TAURI_UPDATER_PUBLIC_KEY` (Settings → Secrets and variables → Actions → Variables).
4. Add the **contents of the private key file** as a GitHub repository secret named
   `TAURI_SIGNING_PRIVATE_KEY` (same page, Secrets tab).
5. If the key has a password, add it as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. If no password
   was set, the secret can be left unset.
6. Keep a secure backup of the private key. Existing installations trust the configured
   public key; losing the matching private key prevents publishing trusted updates for them.

## Release process

- Test the preview and Windows installer first.
- Ensure the application version in `package.json`, `src-tauri/Cargo.toml`, and
  `src-tauri/tauri.conf.json` is increased for each release.
- Create and push a version tag such as `v0.1.1` only after the release is ready.
- The release workflow validates the signing configuration, injects the public key during
  the build, signs the updater artifacts, and publishes the GitHub release and updater JSON.
- Installed Windows desktop apps check for updates at startup and ask before installing them.

The web preview does not run the native updater. This updater currently targets Windows NSIS
desktop releases; Android distribution needs a separate signed Android release/update strategy.

# GPS-SMART MANAGEMENT update rollout

## Current state (audited on 2026-10-25)

- Website: Vercel deploys the web build; no Vercel configuration file is tracked in this repository. Production deploy settings are managed in the Vercel project.
- Windows: Tauri v2 is configured for an NSIS installer, but `bundle.createUpdaterArtifacts` is `false`, no updater plugin is registered in `src-tauri/src/lib.rs`, and no updater endpoint/public key is configured.
- Android: GitHub Actions builds an APK artifact. No Google Play publishing workflow or Play Console configuration is tracked.
- CI currently builds installers and uploads short-lived Actions artifacts; it does not publish a release.

## Safe rollout sequence

1. Keep this branch non-production. Run CI and review its results before merging anything.
2. Generate a Tauri updater signing keypair on a trusted machine. Keep the private key and its password out of Git; save them as repository Actions secrets named `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The public key can be committed to Tauri configuration after review. Back up the private key securely: losing it prevents signing updates for already-installed clients.
3. Add `tauri-plugin-updater` and its JavaScript API, register the plugin, configure the public key and HTTPS endpoint, enable updater artifacts, and grant the least-privilege updater capability. Add a UI flow that checks for an update, displays the version/release notes, and waits for explicit consent before downloading and installing.
4. Only after signing configuration is available, add a release workflow triggered manually or by a reviewed version tag. Build signed Windows update artifacts and a Tauri-compatible signed manifest. Do not publish from ordinary pushes. Use a draft GitHub Release for owner review before publishing.
5. Website: use Vercel Preview deployments and CI checks for pull requests. Keep production deployments behind the existing Vercel production branch/protection settings and require a human approval gate where the Vercel plan supports it. This repository has no tracked `vercel.json`; verify project settings in Vercel before changing deployment behavior.
6. Android: use Google Play Console internal testing first. Create/verify the developer account, app record, unique application ID, store listing, app signing setup, privacy/data-safety declarations, content rating, and upload a signed Android App Bundle (AAB). The current workflow creates an APK and is not a Play publishing pipeline. Do not upload or publish until the owner approves.
7. For personal Play Console developer accounts created after 2023-11-13, Google currently requires a closed test with at least 12 opted-in testers continuously for 14 days before applying for production access. Confirm the current requirement in Play Console.
8. Test update checks, no-update state, bad signature rejection, declined update, successful consented install, rollback/recovery, and version monotonicity on a clean Windows test machine. Test Android delivery using Play internal testing and verify updates through Play Store.

## Required owner actions before updater implementation can be completed

- Create and securely store Tauri updater signing private key and password in GitHub Actions secrets.
- Approve the public key being added to `tauri.conf.json`.
- Confirm the GitHub Releases channel and release approver.
- Confirm Vercel preview/prod branch and approval settings in the Vercel dashboard.
- Confirm Google Play Console developer account exists and identify who will manage app signing and store declarations.

## Safety constraints

- Never commit signing private keys, service-role credentials, Play service-account JSON, or other deployment secrets.
- Never publish a release or deploy production as part of ordinary CI.
- Build artifacts are not proof of device-level update correctness; test on actual Windows and Android devices.

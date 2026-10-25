# GPS-SMART MANAGEMENT — Launch readiness

Last reviewed: 2026-10-26 (latest preview and access-hardening follow-up)

## Current status

**Not ready for a broad public production launch yet.** The current branch is suitable for preview and controlled internal testing until the release gates below pass.

- The login UX branch includes show/hide password and opt-in email remembering. Passwords are never written to local storage by that feature.
- Latest frontend preview for the launch-readiness documentation commit reached Vercel `READY`; the latest branch deployment is linked below.
- The Supabase project `GPS-SMART-MANAGEMENT` is active and healthy. All 25 public tables have RLS enabled.
- The public service-tracking RPC was hardened on 2026-10-26: its `search_path` is pinned/empty, and it returns only intended public tracking fields. Anonymous execution is intentional for customer tracking links; direct `anon` access to `app_records`, `memberships`, and `tenants` has been revoked, and execution of the tracking RPC has been limited to `anon` (not `authenticated`). Tracking codes must remain high-entropy and must not reveal credentials or internal notes.
- On 2026-10-26, database DELETE permissions for `app_records` were restricted to active workspace owners and managers. Active technicians/cashiers no longer have permission to delete operational records. Read/insert/update policies still need a full per-role review.
- Windows automatic updates are **scaffolded, not release-ready**. A matching Tauri signing key pair and signed installer smoke test are still required.
- Android has no equivalent release/update process in this workflow.

## Release blockers

### 1. Security and access control

- Supabase Security Advisor reports leaked-password protection disabled. Enable the relevant Auth password protection in the Supabase Dashboard if supported by the project plan, then re-run Security Advisor. Supabase documents leaked-password protection as available on Pro and above.
- Security Advisor reports RLS-enabled admin tables with no direct policies. These tables are intended to be accessed through the authenticated `platform-admin` Edge Function; direct client grants to those tables are absent. Keep that boundary and verify the function is the only supported access path.
- `app_records` DELETE is now restricted to active owners/managers. However, SELECT, INSERT, and UPDATE still apply to all active tenant members. Implement and test the intended per-role permission matrix before inviting staff users; the UI alone is not a security boundary.
- Run automated cross-tenant isolation tests with at least two independent tenant users. Verify tenant A cannot read, modify, or delete tenant B's records, and that a non-member cannot invoke protected actions.
- Review handling and retention of sensitive repair data, including device PIN/pattern notes. Collect it only with customer permission, restrict access, and remove it when no longer required.

### 2. Business workflow and financial correctness

- The current UI uses the generic `app_records` store for multiple operational modules. Do not represent the current accounting/payment experience as a fully audited accounting system until workflows are reconciled against normalized tables and journal invariants.
- Test complete flows using test data: create customer, open repair ticket, update repair status, consume/return parts, complete sale, receive purchase, record expense, and reconcile totals.
- Verify all stock movements and sale/payment operations are atomic under concurrent use, and verify failed operations leave no partial records.
- Test backup/restore and data export before live customer data is entered.
- Keep real financial records out of production until those tests pass.

### 3. Windows release and auto-update

1. Generate the Tauri updater key pair on a trusted machine.
2. Store the public key in GitHub repository variable `TAURI_UPDATER_PUBLIC_KEY`.
3. Store the private key in GitHub repository secret `TAURI_SIGNING_PRIVATE_KEY`; set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if a password was configured.
4. Back up the private key securely. Never commit it or paste it into chat.
5. Build a signed Windows NSIS installer from the release workflow and install it on a clean Windows 10/11 test machine.
6. Publish a later signed test version and verify that the installed app detects, downloads, verifies, and installs the update. Test cancellation and offline/update-server failure behavior.
7. Only after that smoke test passes, publish a stable release tag. Do not tag a public release merely to test the workflow.

The first installed version must itself include the updater and final public key. Existing older installations without the updater need a one-time manual upgrade. Tauri requires signatures to verify updates; the private key must remain secret.

### 4. Android APK

- The current Tauri config targets Windows NSIS only; no APK can be claimed as built from this pipeline.
- Add Android target/toolchain, app identifier/signing configuration, and a separate CI build; test installation and Supabase auth on a real Android device before publishing an APK.

## Launch checklist

- [ ] Confirm product scope and supported platform (initially Windows desktop; web preview is not the native updater).
- [ ] Enable leaked-password protection where available and review all Security Advisor warnings.
- [ ] Implement and test role-based permissions for owner, manager, cashier, and technician.
- [ ] Pass cross-tenant isolation tests.
- [ ] Pass operational, inventory, sales, purchase, expense, and accounting reconciliation tests.
- [ ] Test email verification, password reset, sign-out, session expiry, and account invitation.
- [ ] Configure production environment values and verify the correct Supabase project is used.
- [ ] Test public service tracking using random codes and confirm no private fields are returned.
- [ ] Test backups and restore.
- [ ] Configure updater signing keys and pass Windows clean-install/update smoke tests.
- [ ] Review privacy notice, terms, support contact, pricing/trial behavior, and incident-response owner.
- [ ] Conduct a small controlled pilot before broad release.

## Useful links

- Latest preview deployment (READY, latest branch commit): https://smartrepair888-kamnmv992-junliu228-6860.vercel.app/
- Pull request: https://github.com/goldenphoneservice/smartrepair888/pull/3
- Updater setup: https://github.com/goldenphoneservice/smartrepair888/blob/feat/login-remember-show-password/docs/AUTO_UPDATE_SETUP.md

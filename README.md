# GPS-SMART MANAGEMENT — Desktop starter

Windows 10/11 desktop starter using Tauri 2 + React + TypeScript + Vite, online-first with Supabase Cloud. Target backend is **only** project `ljngcaylpmdcjhombntl` (`https://ljngcaylpmdcjhombntl.supabase.co`). This scaffold does not modify the legacy `WAVEID-GSM` project.

## Implemented in this starter

- React desktop shell with sidebar/navigation for Dashboard, Servis HP, Pelanggan, Inventori, Penjualan, Pembelian, Akuntansi, Pengeluaran, Tim & Akses, Langganan, and Pengaturan.
- Email/password sign-in and sign-up via Supabase Auth.
- Tenant bootstrap UI calling `create_tenant_for_current_user` (7-day trial behavior is handled by the existing backend RPC).
- Supabase client reads only public `VITE_` environment variables; no service-role key is used.
- Windows NSIS installer target configured in Tauri.
- Dashboard clearly labels operational figures as empty placeholders instead of inventing values.

**Not yet implemented:** CRUD screens for operational modules, automated journal creation for transactions, admin manual payment-verification console, complete tenant isolation tests, production signing/updater, and the compiled `.exe` installer. Do not use for live financial operations yet.

## Prerequisites (Windows 10/11)

1. Install Node.js LTS and npm.
2. Install Rust using `rustup` (stable MSVC toolchain).
3. Install Microsoft C++ Build Tools with the “Desktop development with C++” workload and the Windows 10/11 SDK.
4. Follow the Tauri 2 Windows prerequisites: https://v2.tauri.app/start/prerequisites/

## Configure Supabase

Copy `.env.example` to `.env` and set:

```dotenv
VITE_SUPABASE_URL=https://ljngcaylpmdcjhombntl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
```

Use the publishable key from the **GPS-SMART-MANAGEMENT** Supabase project only. Never put a `service_role` secret in frontend variables or the desktop binary. Supabase publishable keys are public by design; access must be protected by Auth and RLS.

## Run the web UI locally

```powershell
npm install
npm run dev
```

## Run as a desktop app

```powershell
npm run tauri:dev
```

## Build the Windows installer

```powershell
npm run tauri:build
```

The NSIS installer is normally written under `src-tauri/target/release/bundle/nsis/`. A real `.exe` is not included in this starter because a Windows/Rust build environment and dependency installation are required.

## Safety notes

- RLS is enabled on all 21 public tables in the target project, but RLS enablement alone does not prove policies are complete or correctly isolated. Run authenticated cross-tenant read/write tests before production.
- The onboarding RPC is a `SECURITY DEFINER` function. Review Supabase Security Advisor output and test authorization behavior.
- Tauri CSP allows network access only to the target Supabase host plus Google Fonts used by the stylesheet. For offline build deployments, consider self-hosting fonts.
- Auth confirmation settings in Supabase may require email verification before the first login.


## Build installer otomatis di cloud (tanpa memasang Rust di PC)

1. Buat repositori GitHub baru bernama `GPS-SMART-MANAGEMENT` dan unggah isi folder project ini (jangan unggah file `.env`).
2. Di repositori GitHub, buka **Settings → Secrets and variables → Actions → New repository secret**. Tambahkan:
   - `VITE_SUPABASE_URL` = `https://ljngcaylpmdcjhombntl.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = publishable key dari project GPS-SMART-MANAGEMENT (bukan `service_role`).
3. Buka tab **Actions → Build Windows installer → Run workflow**.
4. Tunggu workflow selesai dengan status hijau. Buka hasil run dan bagian **Artifacts**, lalu unduh `GPS-SMART-MANAGEMENT-Windows-Installer`.
5. Ekstrak ZIP artifact untuk mendapatkan installer `.exe`.

Workflow `.github/workflows/build-windows.yml` membangun installer NSIS di runner Windows cloud. Build belum dianggap berhasil sampai workflow selesai hijau dan artifact `.exe` muncul. Jangan pernah memasukkan kunci Supabase `service_role` ke source, GitHub secrets untuk frontend, atau aplikasi desktop.


## Asisten suara dan data PIN/pola servis

- Menu terpisah `PIN & Pola` dihapus. Jenis kunci, PIN opsional, dan gambar pola bernomor 1–9 berada pada formulir `Servis HP`.
- Informasi PIN/pola perangkat sangat sensitif. Catat hanya dengan izin pelanggan, batasi akses petugas, dan hapus setelah pekerjaan selesai. Versi ini menyimpan data servis pada `app_records`; jangan gunakan untuk menyimpan kredensial perangkat jika workspace tidak memiliki kontrol akses yang memadai.
- Menu `Asisten AI` mendukung perintah suara bahasa Indonesia pada browser yang mendukung Web Speech API, input teks, membuka menu, dan membaca ringkasan laporan dari Supabase.
- Asisten pada paket ini masih berbasis aturan/analisis data, bukan model AI generatif. Perintah penulisan/perubahan transaksi belum diaktifkan; perubahan data perlu tetap dilakukan dan dikonfirmasi melalui formulir masing-masing.
- Perintah contoh: “laporan hari ini”, “laporan transaksi hari ini”, “stok menipis”, “servis belum selesai”, “buka inventori”.


## Stabilisasi stok atomik (23 Oktober 2026)

Perubahan stok transaksi menggunakan RPC `apply_inventory_stock_movement` agar update stok dan insert Riwayat Stok berjalan dalam satu transaksi database dengan penguncian baris produk. Migrasi `202610230001_atomic_inventory_stock_movement.sql` sudah diterapkan ke proyek Supabase yang dipakai source ini. Lihat `CATATAN-STABILISASI-STOK-ATOMIK.txt` untuk hasil pemeriksaan dan checklist uji.

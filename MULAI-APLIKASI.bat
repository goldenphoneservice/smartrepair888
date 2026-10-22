@echo off
setlocal
cd /d "%~dp0"
title GPS-SMART MANAGEMENT
color 0B
echo ================================================
echo       GPS-SMART MANAGEMENT - SMART WORKSHOP
echo ================================================
echo.
if not exist node_modules (
  echo Menyiapkan komponen aplikasi untuk pertama kali...
  echo Pastikan internet aktif. Proses ini mungkin memerlukan beberapa menit.
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Instalasi gagal. Pastikan Node.js terpasang dan internet aktif.
    pause
    exit /b 1
  )
)
echo Menjalankan aplikasi. Jangan tutup jendela ini selama digunakan.
echo Setelah alamat Local muncul, buka alamat itu di browser.
echo Untuk berhenti, tekan Ctrl+C.
echo.
call npm.cmd run dev -- --host 127.0.0.1
pause

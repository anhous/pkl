@echo off
REM Start cepat Jurnal PKL setelah PC dinyalakan.
REM Prasyarat: MySQL XAMPP sudah Start (centang Service di XAMPP agar otomatis).
cd /d D:\WEBSITE\pklnew
start "PKL API :4000" cmd /k "npm start --workspace=apps/api"
start "PKL Web :3000" cmd /k "npm run dev --workspace=apps/web"
echo Tunggu ~20 detik, lalu buka http://localhost:3000/login
pause

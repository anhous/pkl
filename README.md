# Jurnal Digital PKL — SMKN 1 Kras

Sistem Informasi & Jurnal Digital PKL: pengisian jurnal harian + foto terkompresi,
presensi & kesehatan, penilaian guru, dashboard GIS, rekap analitik, dan
sinkronisasi dua arah dengan SDMS (`sdms.smkn1kras.sch.id`).

Monorepo: **Next.js 14** (frontend) + **Express** (REST API) + **Prisma** + **MariaDB**.

```
apps/api/        → Express REST API + Prisma + Auth JWT/RBAC + Sharp storage
apps/web/        → Next.js App Router + Tailwind + Chart.js + Google Maps GIS
packages/shared/ → RBAC matrix & konstanta (sumber kebenaran role)
deploy/          → PM2 ecosystem, Caddyfile, MariaDB tuning, skrip deploy/backup
```

## Fitur

- **Auth & RBAC**: SUPERADMIN, ADMIN_SEKOLAH, GURU, SISWA (Instruktur DUDI: Fase 2).
  JWT httpOnly cookie, Bcrypt, Helmet, rate-limit, XSS/CSRF guard.
- **Master & Penempatan**: jurusan, siswa, guru, DUDI, instruktur; relasi
  Siswa ↔ DUDI ↔ Guru dengan cek kuota & 1 penempatan aktif per siswa.
- **Jurnal**: deskripsi + jam + upload foto (Sharp resize 1280px q70, max 5MB,
  geotag opsional); terkunci setelah DIPERIKSA/DISETUJUI.
- **Presensi & kesehatan**: HADIR/IZIN/SAKIT/ALPHA + SEHAT/SAKIT_RINGAN/BUTUH_PENANGANAN.
- **Review guru**: nilai 1–100 + catatan + status verifikasi (scope bimbingan).
- **Dashboard**: metric cards, Bar/Doughnut Chart.js, peta GIS Google Maps
  (cluster + InfoWindow; fallback list tanpa API key).
- **Rekap Analitik**: kehadiran, DUDI terbaik, leaderboard nilai, terajin,
  early warning, feed teraktif + ekspor CSV (Excel) & cetak PDF.
- **Sync SDMS**: pull master (Bearer + X-API-Key), push jurnal via gateway,
  webhook HMAC real-time (`/api/webhooks/sdms`), cron pull/push, sync log.

## Jalan lokal (XAMPP)

Butuh: Node.js 20+, MySQL XAMPP jalan, database `pkl_db` dibuat.

```bash
cp apps/api/.env.example apps/api/.env   # isi DATABASE_URL, JWT_SECRET
npm install
npx --workspace=apps/api prisma migrate dev
npm run db:seed --workspace=apps/api     # superadmin@sekolah.id / Superadmin123!
```

Windows: dobel-klik `start-pkl.bat`, buka http://localhost:3000/login.
Manual: `npm start --workspace=apps/api` + `npm run dev --workspace=apps/web`.

## Deploy VPS (Ubuntu 24 + Caddy)

Lihat `deploy/README.md`: instalasi OS → MariaDB → `bash deploy/deploy.sh` →
PM2 cluster → tuning `mariadb-pkl.cnf` → backup cron. Alur update:
`git pull && bash deploy/deploy.sh`.

## Tes

```bash
npm run test --workspace=apps/api   # 6 smoke suite: auth, master, jurnal, analitik, SDMS, webhook
```

## Integrasi SDMS

1. Daftarkan app di SDMS → Application Hub (events `siswa.* guru.* jurusan.* bulk.sync`),
   simpan API Key + Secret.
2. Isi `SDMS_*` di `apps/api/.env`; webhook URL: `https://<domain>/api/webhooks/sdms`.
3. Halaman Sync → Test receiver → Pull jurusan/siswa/guru → Push jurnal.

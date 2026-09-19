# Deploy Jurnal PKL ke VPS Ubuntu 24 (Caddy sebagai front server)

## 1. Siapkan OS + keamanan

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban unattended-upgrades openssl
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

SSH: pakai key, matikan `PasswordAuthentication`, pertimbangkan ganti port default.

## 2. Node.js 22 + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 3. MariaDB + database + user khusus

```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE pkl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'pkl'@'localhost' IDENTIFIED BY '<password-kuat>'; GRANT ALL ON pkl_db.* TO 'pkl'@'localhost'; FLUSH PRIVILEGES;"
```

## 4. Salin kode + `.env` produksi

```bash
# contoh lokasi: /opt/pklnew (milik user deploy, BUKAN root langsung yg jalanin pm2)
cp deploy/pkl-api.env.example apps/api/.env
nano apps/api/.env   # isi: DATABASE_URL, JWT_SECRET=$(openssl rand -hex 32),
                     # CORS_ORIGIN=https://pkl.sekolah.id, COOKIE_SECURE=true, SDMS_*
```

`NEXT_PUBLIC_API_URL` (build-time, frontend): buat file `apps/web/.env.production`:

```
NEXT_PUBLIC_API_URL=https://pkl.sekolah.id/api
```

## 5. Deploy

```bash
bash deploy/deploy.sh
npm run db:seed --workspace=apps/api   # SEKALI saja, lalu ganti password admin
pm2 startup && pm2 save
curl -s http://localhost:4000/api/health
```

## 6. Caddy (di server Caddy)

Salin `deploy/Caddyfile`, ganti domain, `caddy reload`. Webhook SDMS yang
didaftarkan: `https://pkl.sekolah.id/api/webhooks/sdms`.

## 7. Backup harian (cron, sebagai root)

```
0 3 * * * DB_USER=pkl DB_PASS='<password>' bash /opt/pklnew/deploy/backup.sh >> /var/log/pkl-backup.log 2>&1
```

## 8. Operasional

- `pm2 list | pm2 logs pkl-api --lines 50`
- Update rutin: `git pull && bash deploy/deploy.sh`
- Jangan jalankan `next build` manual saat PM2/proses dev jalan (merusak cache `.next`).

## 9. Skala: cluster + tuning MariaDB

API sudah stateless & cluster-safe (`exec_mode: cluster`, scheduler SDMS
terkunci di instance 0 — `apps/api/src/server.js`).

```bash
# Terapkan tuning DB (pilih buffer pool sesuai RAM di dalam file):
sudo cp deploy/mariadb-pkl.cnf /etc/mysql/mariadb.conf.d/60-pkl.cnf
sudo systemctl restart mariadb

# Nyalakan ulang API dengan N worker (default 'max' = 1 per vCPU):
API_INSTANCES=2 pm2 reload deploy/ecosystem.config.js --update-env
pm2 save

# Verifikasi worker + hit ratio buffer pool:
pm2 list
sudo mysql -e "SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';"
```

Aturan:
- Frontend (`pkl-web`) tetap 1 instance — `next start` rebutan port bila dikluster.
- Uploads lokal aman untuk multi-instance **1 mesin**. Naik ke multi-mesin → wajib S3/Cloudinary.
- Beban tulis naik (PPDB/sync massal)? Naikkan `innodb_log_file_size` dan jadwalkan pull SDMS di jam sepi.

#!/usr/bin/env bash
# Deploy Jurnal PKL di VPS (Ubuntu 24). Jalankan dari repo root: bash deploy/deploy.sh
# Prasyarat: Node 22, MariaDB jalan, apps/api/.env produksi sudah diisi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/5] Install dependencies"
npm ci --no-audit --no-fund

echo "==> [2/5] Prisma generate + migrate deploy"
npx --workspace=apps/api prisma generate
npx --workspace=apps/api prisma migrate deploy

echo "==> [3/5] Build frontend"
npm run build --workspace=apps/web

echo "==> [4/5] (Opsional) Seed awal — JALANKAN MANUAL sekali saja:"
echo "    npm run db:seed --workspace=apps/api"

echo "==> [5/5] Start/reload PM2"
if pm2 list 2>/dev/null | grep -q "pkl-api"; then
  pm2 reload deploy/ecosystem.config.js --update-env
else
  pm2 start deploy/ecosystem.config.js
fi
pm2 save

echo "OK. Cek: pm2 list | curl -s http://localhost:4000/api/health"

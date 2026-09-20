// PM2 — dijalankan dari repo root: pm2 start deploy/ecosystem.config.js
// ENV produksi dibaca dari apps/api/.env (JANGAN commit file itu).
// API cluster-safe: stateless JWT, scheduler SDMS hanya jalan di instance 0
// (lihat server.js: isSchedulerOwner). Uploads di disk lokal yang sama → aman
// untuk multi-instance 1 mesin. Multi-MESIN wajib pindah ke S3/Cloudinary.
module.exports = {
  apps: [
    {
      name: 'pkl-api',
      script: 'src/server.js',
      cwd: 'apps/api',
      // 'max' = 1 worker per vCPU. VPS 1-2 vCPU kecil: isi angka, mis. 2.
      // Atur via ENV: INSTANCES=2 pm2 start deploy/ecosystem.config.js --update-env
      instances: process.env.API_INSTANCES || 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 4000 },
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      time: true,
    },
    {
      name: 'pkl-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: 'apps/web',
      // SENGAJA 1: `next start` tidak cluster-aware (rebutan port 3000).
      // Butuh 2+ frontend? jalankan port beda + load-balance di Caddy.
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3000 },
      max_memory_restart: '768M',
      min_uptime: '10s',
      max_restarts: 10,
      time: true,
    },
  ],
};

# Jurnal Digital PKL — Tahap 1

Monorepo: Next.js (frontend) + Express (backend API) + Prisma + MariaDB.

```
apps/api/   → Express REST API + Prisma + Auth RBAC + Local/Sharp storage adapter
apps/web/   → Next.js App Router + Tailwind (login, dashboard shell)
packages/shared/ → RBAC matrix, constants, validators (sumber kebenaran role)
```

## Quickstart Tahap 1

1. `cp apps/api/.env.example apps/api/.env` → isi `DATABASE_URL`, `JWT_SECRET`
2. `npm install`
3. `npm run prisma:generate --workspace=apps/api`
4. `npm run prisma:migrate --workspace=apps/api` (butuh MariaDB/MySQL jalan)
5. `npm run db:seed --workspace=apps/api` (seed roles + superadmin)
6. `npm run dev:api` → http://localhost:4000/api/health
7. `npm run dev:web` → http://localhost:3000

Storage: lokal `apps/api/uploads/` + Sharp compress. Adapter siap upgrade ke Cloudinary (lihat `src/config/storage/`).
Instruktur DUDI: tabel tersedia, role nonaktif sampai Fase 2.

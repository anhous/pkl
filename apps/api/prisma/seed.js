'use strict';
// Seed roles + superadmin awal. Jalankan: npm run db:seed --workspace=apps/api
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/utils/password');
const env = require('../src/config/env');

const prisma = new PrismaClient();

async function main() {
  for (const name of ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA', 'INSTRUKTUR']) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name === 'INSTRUKTUR' ? 'Fase 2 (nonaktif MVP)' : name },
    });
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPERADMIN' } });
  const email = env.seedAdminEmail;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: { email, passwordHash: await hashPassword(env.seedAdminPassword), roleId: role.id },
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] superadmin dibuat: ${email}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[seed] superadmin sudah ada: ${email}`);
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

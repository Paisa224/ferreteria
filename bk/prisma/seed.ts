import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin' },
  });

  const permissions = [
    'users.manage',
    'inventory.manage',
    'cash.manage',
    'cash.open',
    'cash.close',
    'cash.move',
    'cash.count',
    'pos.sell',
  ];

  for (const key of permissions) {
    const perm = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });

    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: perm.id,
        },
      },
      update: {},
      create: { role_id: adminRole.id, permission_id: perm.id },
    });
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 10);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      ci: '0000000',
      password_hash: passwordHash,
      is_active: true,
    },
  });

  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: user.id, role_id: adminRole.id } },
    update: {},
    create: { user_id: user.id, role_id: adminRole.id },
  });

  console.log('Seed OK: admin / Admin1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

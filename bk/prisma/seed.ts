import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensurePermissions(keys: string[]) {
  for (const key of keys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
}

async function setRolePermissions(roleName: string, permissionKeys: string[]) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  const perms = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true },
  });

  await prisma.rolePermission.deleteMany({ where: { role_id: role.id } });

  if (perms.length > 0) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ role_id: role.id, permission_id: p.id })),
      skipDuplicates: true,
    });
  }

  return role;
}

async function upsertUser(params: {
  name: string;
  username: string;
  ci: string;
  password: string;
  is_active?: boolean;
}) {
  const password_hash = await bcrypt.hash(params.password, 10);

  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      name: params.name,
      ci: params.ci,
      password_hash,
      is_active: params.is_active ?? true,
    },
    create: {
      name: params.name,
      username: params.username,
      ci: params.ci,
      password_hash,
      is_active: params.is_active ?? true,
    },
  });
}

async function setUserRole(userId: number, roleId: number) {
  await prisma.userRole.deleteMany({ where: { user_id: userId } });

  await prisma.userRole.create({
    data: { user_id: userId, role_id: roleId },
  });
}

async function main() {
  const allPermissions = [
    'users.manage',
    'inventory.manage',
    'cash.manage',
    'cash.open',
    'cash.close',
    'cash.move',
    'cash.count',
    'pos.sell',
    'pos.refund',
  ];

  await ensurePermissions(allPermissions);

  const superAdminRole = await setRolePermissions(
    'SUPER_ADMIN',
    allPermissions,
  );

  const vendedorPermissions = [
    'pos.sell',
    'cash.open',
    'cash.count',
    'cash.close',
    'cash.move',
  ];

  const vendedorRole = await setRolePermissions(
    'VENDEDOR',
    vendedorPermissions,
  );

  const admin = await upsertUser({
    name: 'Administrador',
    username: 'admin',
    ci: '0000000',
    password: 'Admin1234!',
    is_active: true,
  });

  const superadmin = await upsertUser({
    name: 'Super Administrador',
    username: 'superadmin',
    ci: '1111111',
    password: 'SuperAdmin1234!',
    is_active: true,
  });

  const vendedor = await upsertUser({
    name: 'Vendedor',
    username: 'vendedor',
    ci: '2222222',
    password: 'Vendedor1234!',
    is_active: true,
  });

  await setUserRole(admin.id, superAdminRole.id);
  await setUserRole(superadmin.id, superAdminRole.id);
  await setUserRole(vendedor.id, vendedorRole.id);

  console.log(
    'Seed OK: roles SUPER_ADMIN / VENDEDOR y usuarios admin, superadmin, vendedor',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

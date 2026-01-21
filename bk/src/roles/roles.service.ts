import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(name: string) {
    return this.prisma.role.create({ data: { name } });
  }

  async getRoleDetail(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        role_permissions: { include: { permission: true } },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return {
      id: role.id,
      name: role.name,
      permissions: role.role_permissions.map((rp) => rp.permission),
    };
  }

  async setPermissions(roleId: number, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    await this.prisma.rolePermission.deleteMany({ where: { role_id: roleId } });

    if (perms.length) {
      await this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({ role_id: roleId, permission_id: p.id })),
        skipDuplicates: true,
      });
    }

    return this.getRoleDetail(roleId);
  }
}

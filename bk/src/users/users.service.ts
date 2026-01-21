import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private mapUser(u: any) {
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      ci: u.ci,
      is_active: u.is_active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: (u.user_roles ?? []).map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        ci: true,
        is_active: true,
        createdAt: true,
        updatedAt: true,
        user_roles: { include: { role: true } },
      },
    });
    return users.map((u) => this.mapUser(u));
  }

  async getUser(id: number) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        ci: true,
        is_active: true,
        createdAt: true,
        updatedAt: true,
        user_roles: { include: { role: true } },
      },
    });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return this.mapUser(u);
  }

  async createUser(dto: CreateUserDto) {
    const password_hash = await bcrypt.hash(dto.password, 10);

    try {
      const created = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          username: dto.username.trim(),
          ci: dto.ci.trim(),
          password_hash,
          is_active: true,
        },
        select: { id: true },
      });

      if (Array.isArray(dto.roleIds) && dto.roleIds.length) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((rid) => ({
            user_id: created.id,
            role_id: rid,
          })),
          skipDuplicates: true,
        });
      }

      return this.getUser(created.id);
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new BadRequestException('Username o CI ya existe');
      throw e;
    }
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no encontrado');

    const { roleIds, password, ...rest } = dto as any;

    const data: any = {};
    if (typeof rest.name === 'string') data.name = rest.name.trim();
    if (typeof rest.username === 'string') data.username = rest.username.trim();
    if (typeof rest.ci === 'string') data.ci = rest.ci.trim();
    if (typeof rest.is_active === 'boolean') data.is_active = rest.is_active;

    if (typeof password === 'string' && password.trim()) {
      data.password_hash = await bcrypt.hash(password, 10);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (Object.keys(data).length) {
          await tx.user.update({ where: { id }, data });
        }

        if (Array.isArray(roleIds)) {
          await tx.userRole.deleteMany({ where: { user_id: id } });

          if (roleIds.length) {
            await tx.userRole.createMany({
              data: roleIds.map((rid: number) => ({
                user_id: id,
                role_id: rid,
              })),
              skipDuplicates: true,
            });
          }
        }
      });

      return this.getUser(id);
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new BadRequestException('Username o CI ya existe');
      throw e;
    }
  }
}

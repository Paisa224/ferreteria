import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { REQUIRE_PERMISSIONS_KEY } from './require-permissions.decorator';
import { REQUIRE_ANY_PERMISSIONS_KEY } from './require-any-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!required || required.length === 0) &&
      (!requiredAny || requiredAny.length === 0)
    )
      return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId?: number; username?: string };

    if (!user?.userId) throw new ForbiddenException('Sin usuario autenticado');

    const roles = await this.prisma.userRole.findMany({
      where: { user_id: user.userId },
      select: {
        role: {
          select: {
            role_permissions: {
              select: {
                permission: { select: { key: true } },
              },
            },
          },
        },
      },
    });

    const userPerms = new Set<string>();
    for (const ur of roles) {
      for (const rp of ur.role.role_permissions) {
        userPerms.add(rp.permission.key);
      }
    }

    if (required && required.length > 0) {
      const okAll = required.every((p) => userPerms.has(p));
      if (!okAll) throw new ForbiddenException('Permisos insuficientes');
    }

    if (requiredAny && requiredAny.length > 0) {
      const okAny = requiredAny.some((p) => userPerms.has(p));
      if (!okAny) throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}

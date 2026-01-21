import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

type JwtPayload = { sub: number; username: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private accessExpiresInSeconds(): number {
    const accessMinutes = Number(process.env.JWT_ACCESS_TTL_MINUTES ?? '30');
    return accessMinutes * 60;
  }

  private refreshExpiresInSeconds(): number {
    const refreshDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? '30');
    return refreshDays * 24 * 60 * 60;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async signAccessToken(payload: JwtPayload): Promise<string> {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET missing');
    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.accessExpiresInSeconds(),
    });
  }

  private async signRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET missing');
    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.refreshExpiresInSeconds(),
    });
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const ttlSeconds = this.refreshExpiresInSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: expiresAt,
      },
    });
  }

  private rotateEnabled(): boolean {
    return (
      String(process.env.JWT_REFRESH_ROTATE ?? 'true').toLowerCase() === 'true'
    );
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.is_active)
      throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = { sub: user.id, username: user.username };

    const access_token = await this.signAccessToken(payload);
    const refresh_token = await this.signRefreshToken(payload);

    await this.storeRefreshToken(user.id, refresh_token);

    return { access_token, refresh_token };
  }

  async refresh(refresh_token: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = this.hashToken(refresh_token);

    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        user_id: payload.sub,
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });

    if (!existing)
      throw new UnauthorizedException('Refresh token inválido o revocado');

    const newAccess = await this.signAccessToken({
      sub: payload.sub,
      username: payload.username,
    });

    if (this.rotateEnabled()) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revoked_at: new Date() },
      });

      const newRefresh = await this.signRefreshToken({
        sub: payload.sub,
        username: payload.username,
      });
      await this.storeRefreshToken(payload.sub, newRefresh);

      return { access_token: newAccess, refresh_token: newRefresh };
    }

    return { access_token: newAccess, refresh_token };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        is_active: true,
        user_roles: {
          select: {
            role: {
              select: {
                name: true,
                role_permissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    const roles = user.user_roles.map((ur) => ur.role.name);

    const permissions = Array.from(
      new Set(
        user.user_roles.flatMap((ur) =>
          ur.role.role_permissions.map((rp) => rp.permission.key),
        ),
      ),
    ).sort();

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      roles,
      permissions,
    };
  }

  async logout(refresh_token: string) {
    const tokenHash = this.hashToken(refresh_token);

    await this.prisma.refreshToken.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    return { ok: true };
  }
}

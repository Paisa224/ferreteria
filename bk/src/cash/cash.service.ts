import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType, CashSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  async createRegister(dto: CreateCashRegisterDto) {
    const name = dto.name.trim();

    try {
      return await this.prisma.cashRegister.create({
        data: { name },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe una caja con el nombre "${name}"`,
        );
      }
      throw e;
    }
  }

  async listRegisters() {
    return this.prisma.cashRegister.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async updateRegister(id: number, dto: UpdateCashRegisterDto) {
    const existing = await this.prisma.cashRegister.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Caja no encontrada');

    if (dto.is_active === false) {
      const open = await this.prisma.cashSession.findFirst({
        where: { cash_register_id: id, status: CashSessionStatus.OPEN },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException(
          'No se puede desactivar la caja porque tiene una sesión abierta.',
        );
      }
    }

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      },
    });
  }

  private async hasPermission(userId: number, key: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
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

    for (const ur of roles) {
      for (const rp of ur.role.role_permissions) {
        if (rp.permission.key === key) return true;
      }
    }
    return false;
  }

  private async assertSessionAccess(sessionId: number, userId: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    if (session.opened_by !== userId) {
      const isAdmin = await this.hasPermission(userId, 'cash.manage');
      if (!isAdmin) throw new ForbiddenException('No autorizado');
    }

    return session;
  }

  async getSessionById(sessionId: number, userId: number) {
    return this.assertSessionAccess(sessionId, userId);
  }

  async openSession(dto: OpenCashSessionDto, userId: number) {
    const userOpen = await this.prisma.cashSession.findFirst({
      where: {
        opened_by: userId,
        status: CashSessionStatus.OPEN,
      },
      select: {
        id: true,
        cash_register_id: true,
        opened_at: true,
      },
    });

    if (userOpen) {
      throw new ConflictException({
        message:
          'Ya existe una caja/sesión abierta para este usuario. Favor cerrar antes de abrir otra.',
        open_session_id: userOpen.id,
        cash_register_id: userOpen.cash_register_id,
        opened_at: userOpen.opened_at,
      });
    }

    const register = await this.prisma.cashRegister.findUnique({
      where: { id: dto.cash_register_id },
      select: { id: true, is_active: true, name: true },
    });
    if (!register || !register.is_active) {
      throw new NotFoundException('Caja no encontrada o inactiva');
    }

    const existingOpen = await this.prisma.cashSession.findFirst({
      where: {
        cash_register_id: dto.cash_register_id,
        status: CashSessionStatus.OPEN,
      },
      include: {
        openedByUser: { select: { id: true, username: true, name: true } },
        cashRegister: { select: { id: true, name: true } },
      },
    });

    if (existingOpen) {
      throw new ConflictException({
        message: 'Ya existe una sesión abierta para esta caja.',
        open_session_id: existingOpen.id,
        cash_register_id: existingOpen.cash_register_id,
        opened_at: existingOpen.opened_at,
        opened_by: existingOpen.openedByUser,
        cash_register: existingOpen.cashRegister,
      });
    }

    return this.prisma.cashSession.create({
      data: {
        cash_register_id: dto.cash_register_id,
        opened_by: userId,
        opening_amount: new Prisma.Decimal(dto.opening_amount),
        status: CashSessionStatus.OPEN,
      },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async currentOpenSessions() {
    return this.prisma.cashSession.findMany({
      where: { status: CashSessionStatus.OPEN },
      orderBy: { opened_at: 'desc' },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async myOpenSession(userId: number) {
    return this.prisma.cashSession.findFirst({
      where: { opened_by: userId, status: CashSessionStatus.OPEN },
      orderBy: { opened_at: 'desc' },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  private async computeExpectedCash(sessionId: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    const sums = await this.prisma.cashMovement.groupBy({
      by: ['type'],
      where: { cash_session_id: sessionId },
      _sum: { amount: true },
    });

    const sumIn =
      sums.find((s) => s.type === 'IN')?._sum.amount ?? new Prisma.Decimal(0);
    const sumOut =
      sums.find((s) => s.type === 'OUT')?._sum.amount ?? new Prisma.Decimal(0);

    const expected = session.opening_amount.plus(sumIn).minus(sumOut);

    return { session, sumIn, sumOut, expected };
  }

  async sessionSummary(sessionId: number) {
    const { session, sumIn, sumOut, expected } =
      await this.computeExpectedCash(sessionId);

    return {
      session_id: session.id,
      status: session.status,
      opening_amount: session.opening_amount,
      sum_in: sumIn,
      sum_out: sumOut,
      expected_cash: expected,
      opened_at: session.opened_at,
    };
  }

  async addMovement(sessionId: number, dto: any, userId: number) {
    const session = await this.assertSessionAccess(sessionId, userId);

    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('Sesión cerrada');
    }

    const concept = String(dto.concept ?? '').trim();
    if (concept.length < 3) {
      throw new BadRequestException(
        'El concepto debe tener al menos 3 caracteres',
      );
    }

    const amountNum = Number(dto.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const type =
      dto.type === 'OUT' ? CashMovementType.OUT : CashMovementType.IN;

    return this.prisma.cashMovement.create({
      data: {
        cash_session_id: sessionId,
        type,
        concept,
        amount: new Prisma.Decimal(amountNum),
        reference: dto.reference?.trim() || null,
        created_by: userId,
      },
      include: {
        createdByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async listMovements(sessionId: number, userId: number) {
    await this.assertSessionAccess(sessionId, userId);

    return this.prisma.cashMovement.findMany({
      where: { cash_session_id: sessionId },
      orderBy: { created_at: 'desc' },
      include: {
        createdByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async countCash(sessionId: number, dto: any, userId: number) {
    const session = await this.assertSessionAccess(sessionId, userId);

    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('Sesión cerrada');
    }

    const { expected } = await this.computeExpectedCash(sessionId);

    const denoms = Array.isArray(dto.denominations) ? dto.denominations : [];
    if (denoms.length === 0) {
      throw new BadRequestException('Ingresá al menos una denominación');
    }

    let total = new Prisma.Decimal(0);

    const items = denoms.map((d: any) => {
      const denomValue = Number(d.denom_value);
      const qty = Number(d.qty);

      if (Number.isNaN(denomValue) || denomValue <= 0) {
        throw new BadRequestException('Denominación inválida');
      }
      if (!Number.isInteger(qty) || qty < 0) {
        throw new BadRequestException(
          'Cantidad inválida (debe ser entera >= 0)',
        );
      }

      const denom = new Prisma.Decimal(denomValue);
      const subtotal = denom.mul(qty);
      total = total.plus(subtotal);

      return { denom_value: denom, qty, subtotal };
    });

    if (total.lte(0)) {
      throw new BadRequestException('El total contado debe ser mayor a 0');
    }

    const difference = total.minus(expected);

    return this.prisma.cashCount.create({
      data: {
        cash_session_id: sessionId,
        counted_by: userId,
        total_counted: total,
        expected_total: expected,
        difference,
        denominations: {
          create: items,
        },
      },
      include: {
        denominations: true,
      },
    });
  }

  async listCounts(sessionId: number, userId: number) {
    await this.assertSessionAccess(sessionId, userId);

    return this.prisma.cashCount.findMany({
      where: { cash_session_id: sessionId },
      orderBy: { counted_at: 'desc' },
      include: {
        denominations: true,
        countedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async closeSession(
    sessionId: number,
    dto: CloseCashSessionDto,
    userId: number,
  ) {
    const session = await this.assertSessionAccess(sessionId, userId);

    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La sesión ya está cerrada');
    }

    const lastCount = await this.prisma.cashCount.findFirst({
      where: { cash_session_id: sessionId },
      orderBy: { counted_at: 'desc' },
    });

    if (!lastCount) {
      throw new BadRequestException(
        'Se requiere un arqueo antes de cerrar la sesión',
      );
    }

    const closingAmount =
      dto.closing_amount !== undefined
        ? Number(dto.closing_amount)
        : lastCount.total_counted.toNumber();

    if (Number.isNaN(closingAmount) || closingAmount < 0) {
      throw new BadRequestException(
        'El monto de cierre debe ser válido (>= 0)',
      );
    }

    return this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.CLOSED,
        closed_by: userId,
        closed_at: new Date(),
        closing_amount: new Prisma.Decimal(closingAmount),
        closed_with_cash_count_id: lastCount.id,
      },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }
}

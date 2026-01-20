import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, CashSessionStatus, CashMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';

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
    });
    if (!register || !register.is_active) {
      throw new NotFoundException('Caja no encontrada o inactiva');
    }

    const existingOpen = await this.prisma.cashSession.findFirst({
      where: {
        cash_register_id: dto.cash_register_id,
        status: CashSessionStatus.OPEN,
      },
      select: { id: true },
    });
    if (existingOpen) {
      throw new BadRequestException(
        'Ya existe una sesión abierta para esta caja',
      );
    }

    return this.prisma.cashSession.create({
      data: {
        cash_register_id: dto.cash_register_id,
        opened_by: userId,
        opening_amount: new Prisma.Decimal(dto.opening_amount),
        status: CashSessionStatus.OPEN,
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

  async closeSession(
    sessionId: number,
    dto: CloseCashSessionDto,
    userId: number,
  ) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.status !== CashSessionStatus.OPEN)
      throw new BadRequestException('La sesión ya está cerrada');

    let closingAmount = dto.closing_amount;
    let closedWithCountId: number | undefined = undefined;

    if (closingAmount === undefined) {
      const lastCount = await this.prisma.cashCount.findFirst({
        where: { cash_session_id: sessionId },
        orderBy: { counted_at: 'desc' },
      });

      if (!lastCount) {
        throw new BadRequestException(
          'Se requiere un arqueo antes de cerrar la sesión',
        );
      }

      closingAmount = lastCount.total_counted.toNumber();
      closedWithCountId = lastCount.id;
    }

    return this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.CLOSED,
        closed_by: userId,
        closed_at: new Date(),
        closing_amount: new Prisma.Decimal(closingAmount ?? 0),
        closed_with_cash_count_id: closedWithCountId,
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

  async addMovement(sessionId: number, dto: any, userId: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.status !== CashSessionStatus.OPEN)
      throw new BadRequestException('Sesión cerrada');

    return this.prisma.cashMovement.create({
      data: {
        cash_session_id: sessionId,
        type: dto.type === 'IN' ? CashMovementType.IN : CashMovementType.OUT,
        concept: dto.concept.trim(),
        amount: new Prisma.Decimal(dto.amount),
        reference: dto.reference?.trim() || null,
        created_by: userId,
      },
    });
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

  async countCash(sessionId: number, dto: any, userId: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.status !== CashSessionStatus.OPEN)
      throw new BadRequestException('Sesión cerrada');

    const { expected } = await this.computeExpectedCash(sessionId);

    let total = new Prisma.Decimal(0);
    const items = dto.denominations.map((d: any) => {
      const denom = new Prisma.Decimal(d.denom_value);
      const qty = Number(d.qty);
      const subtotal = denom.mul(qty);
      total = total.plus(subtotal);
      return { denom_value: denom, qty, subtotal };
    });

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
      include: { denominations: true },
    });
  }

  async listMovements(sessionId: number) {
    return this.prisma.cashMovement.findMany({
      where: { cash_session_id: sessionId },
      orderBy: { created_at: 'desc' },
      include: {
        createdByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async listCounts(sessionId: number) {
    return this.prisma.cashCount.findMany({
      where: { cash_session_id: sessionId },
      orderBy: { counted_at: 'desc' },
      include: {
        denominations: true,
        countedByUser: { select: { id: true, username: true, name: true } },
      },
    });
  }

  async myOpenSession(userId: number) {
    return this.prisma.cashSession.findFirst({
      where: { opened_by: userId, status: CashSessionStatus.OPEN },
      include: {
        cashRegister: true,
      },
      orderBy: { opened_at: 'desc' },
    });
  }
}

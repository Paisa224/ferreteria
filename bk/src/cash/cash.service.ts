import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, CashSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  async createRegister(dto: CreateCashRegisterDto) {
    return this.prisma.cashRegister.create({
      data: {
        name: dto.name.trim(),
      },
    });
  }

  async listRegisters() {
    return this.prisma.cashRegister.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async openSession(dto: OpenCashSessionDto, userId: number) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id: dto.cash_register_id },
    });
    if (!register || !register.is_active)
      throw new NotFoundException('Caja no encontrada o inactiva');

    const existingOpen = await this.prisma.cashSession.findFirst({
      where: {
        cash_register_id: dto.cash_register_id,
        status: CashSessionStatus.OPEN,
      },
    });
    if (existingOpen)
      throw new BadRequestException(
        'Ya existe una sesión abierta para esta caja',
      );

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

    return this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.CLOSED,
        closed_by: userId,
        closed_at: new Date(),
        closing_amount:
          dto.closing_amount === undefined
            ? undefined
            : new Prisma.Decimal(dto.closing_amount),
      },
    });
  }
}

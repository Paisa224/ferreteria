import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMoveDto } from './dto/stock-move.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async computeCurrentStock(
    productId: number,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const sums = await client.stockMovement.groupBy({
      by: ['type'],
      where: { product_id: productId },
      _sum: { qty: true },
    });

    const sum = (t: any) =>
      sums.find((s) => s.type === t)?._sum.qty ?? new Prisma.Decimal(0);

    return sum('IN')
      .plus(sum('ADJUST'))
      .plus(sum('RETURN'))
      .minus(sum('OUT'))
      .minus(sum('SALE'));
  }

  private parseDate(value: string, endOfDay: boolean) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    if (endOfDay) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  async createStockMovement(dto: StockMoveDto, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.product_id },
      select: { id: true, is_active: true, track_stock: true },
    });

    if (!product || !product.is_active)
      throw new NotFoundException('Producto no encontrado o inactivo');
    if (!product.track_stock)
      throw new BadRequestException(
        'Este producto no maneja stock (track_stock=false)',
      );

    if ((dto.type === 'IN' || dto.type === 'OUT') && dto.qty <= 0) {
      throw new BadRequestException('qty debe ser > 0 para IN/OUT');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await this.computeCurrentStock(dto.product_id, tx);
      const qty = new Prisma.Decimal(dto.qty);

      if (dto.type === 'OUT' && current.lt(qty)) {
        throw new BadRequestException('Stock insuficiente');
      }

      let movement;
      if (dto.type === 'ADJUST') {
        const desired = qty;
        const delta = desired.minus(current);

        if (delta.eq(0)) {
          throw new BadRequestException(
            'El stock ya está en ese valor (delta = 0)',
          );
        }

        movement = await tx.stockMovement.create({
          data: {
            product_id: dto.product_id,
            type: StockMovementType.ADJUST,
            qty: delta,
            note: dto.note?.trim()
              ? `SET stock => ${desired.toString()} | ${dto.note.trim()}`
              : `SET stock => ${desired.toString()}`,
            created_by: userId,
          },
        });
      } else {
        const movementType =
          dto.type === 'IN' ? StockMovementType.IN : StockMovementType.OUT;

        movement = await tx.stockMovement.create({
          data: {
            product_id: dto.product_id,
            type: movementType,
            qty,
            note: dto.note?.trim() || null,
            created_by: userId,
          },
        });
      }

      const stock = await this.computeCurrentStock(dto.product_id, tx);
      return { movement, stock };
    });
  }

  async getProductStock(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, is_active: true, track_stock: true },
    });
    if (!product || !product.is_active)
      throw new NotFoundException('Producto no encontrado o inactivo');

    if (!product.track_stock) {
      return { product_id: product.id, track_stock: false, stock: null };
    }

    const stock = await this.computeCurrentStock(productId);
    return { product_id: product.id, track_stock: true, stock };
  }

  async listProductMovements(
    productId: number,
    from?: string,
    to?: string,
    limit = 100,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, is_active: true },
    });
    if (!product || !product.is_active) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }

    const take = Math.min(Math.max(limit || 100, 1), 200);
    const created_at: { gte?: Date; lte?: Date } = {};

    if (from) {
      const d = this.parseDate(from, false);
      if (!d) throw new BadRequestException('Formato de fecha inválido (from)');
      created_at.gte = d;
    }
    if (to) {
      const d = this.parseDate(to, true);
      if (!d) throw new BadRequestException('Formato de fecha inválido (to)');
      created_at.lte = d;
    }

    const where = {
      product_id: productId,
      ...(Object.keys(created_at).length ? { created_at } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        include: {
          createdByUser: {
            select: { username: true, name: true },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total };
  }
}

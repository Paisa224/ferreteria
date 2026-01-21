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

  private async computeCurrentStock(productId: number) {
    const sums = await this.prisma.stockMovement.groupBy({
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

    if (dto.type === 'ADJUST') {
      const desired = new Prisma.Decimal(dto.qty);
      const current = await this.computeCurrentStock(dto.product_id);
      const delta = desired.minus(current);

      if (delta.eq(0)) {
        throw new BadRequestException(
          'El stock ya está en ese valor (delta = 0)',
        );
      }

      return this.prisma.stockMovement.create({
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
    }

    const movementType =
      dto.type === 'IN' ? StockMovementType.IN : StockMovementType.OUT;

    return this.prisma.stockMovement.create({
      data: {
        product_id: dto.product_id,
        type: movementType,
        qty: new Prisma.Decimal(dto.qty),
        note: dto.note?.trim() || null,
        created_by: userId,
      },
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
      return { product_id: product.id, track_stock: false, stock: 'N/A' };
    }

    const stock = await this.computeCurrentStock(productId);
    return { product_id: product.id, track_stock: true, stock };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  Prisma,
  SaleStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sku: dto.sku?.trim() || null,
        barcode: dto.barcode?.trim() || null,
        name: dto.name.trim(),
        unit: dto.unit?.trim() || null,
        cost: new Prisma.Decimal(dto.cost),
        price: new Prisma.Decimal(dto.price),
        is_active: dto.is_active ?? true,
      },
    });
  }

  async listProducts(q?: string) {
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { sku: q },
            { barcode: q },
          ],
        }
      : {};

    return this.prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  private async getMyOpenCashSession(userId: number) {
    return this.prisma.cashSession.findFirst({
      where: { opened_by: userId, status: 'OPEN' },
      orderBy: { opened_at: 'desc' },
    });
  }

  async createSale(dto: CreateSaleDto, userId: number) {
    const cashSession = await this.getMyOpenCashSession(userId);
    if (!cashSession) {
      throw new BadRequestException(
        'No hay una sesión de caja abierta para este usuario',
      );
    }

    for (const p of dto.payments) {
      if (
        p.method !== 'CASH' &&
        (!p.reference || p.reference.trim().length === 0)
      ) {
        throw new BadRequestException(
          `El pago ${p.method} requiere reference (ticket/id)`,
        );
      }
    }

    const discount = new Prisma.Decimal(dto.discount ?? 0);

    let subtotal = new Prisma.Decimal(0);
    const items = dto.items.map((it) => {
      const qty = new Prisma.Decimal(it.qty);
      const price = new Prisma.Decimal(it.price);
      const line = qty.mul(price);
      subtotal = subtotal.plus(line);
      return {
        product_id: it.product_id,
        qty,
        price,
        subtotal: line,
      };
    });

    const total = subtotal.minus(discount);
    if (total.lte(0)) throw new BadRequestException('Total inválido');

    let paySum = new Prisma.Decimal(0);
    const payments = dto.payments.map((p) => {
      const amt = new Prisma.Decimal(p.amount);
      paySum = paySum.plus(amt);
      return {
        method: p.method as PaymentMethod,
        amount: amt,
        reference: p.method === 'CASH' ? null : p.reference!.trim(),
      };
    });

    if (!paySum.eq(total)) {
      throw new BadRequestException(
        `Suma de pagos (${paySum.toString()}) no coincide con total (${total.toString()})`,
      );
    }

    const productIds = [...new Set(dto.items.map((i) => i.product_id))];

    return this.prisma.$transaction(async (tx) => {
      const needByProduct = new Map<number, Prisma.Decimal>();
      for (const it of items) {
        needByProduct.set(
          it.product_id,
          (needByProduct.get(it.product_id) ?? new Prisma.Decimal(0)).plus(
            it.qty,
          ),
        );
      }

      const productsForStock = await tx.product.findMany({
        where: { id: { in: productIds }, is_active: true },
        select: { id: true, track_stock: true },
      });

      if (productsForStock.length !== productIds.length) {
        throw new NotFoundException(
          'Uno o más productos no existen o están inactivos',
        );
      }

      const trackedIds = productsForStock
        .filter((p) => p.track_stock)
        .map((p) => p.id);

      if (trackedIds.length > 0) {
        const sums = await tx.stockMovement.groupBy({
          by: ['product_id', 'type'],
          where: { product_id: { in: trackedIds } },
          _sum: { qty: true },
        });

        const getSum = (productId: number, type: any) => {
          const row = sums.find(
            (s) => s.product_id === productId && s.type === type,
          );
          return row?._sum.qty ?? new Prisma.Decimal(0);
        };

        for (const pid of trackedIds) {
          const stock = getSum(pid, 'IN')
            .plus(getSum(pid, 'ADJUST'))
            .plus(getSum(pid, 'RETURN'))
            .minus(getSum(pid, 'OUT'))
            .minus(getSum(pid, 'SALE'));

          const needed = needByProduct.get(pid) ?? new Prisma.Decimal(0);

          if (stock.lt(needed)) {
            throw new BadRequestException(
              `Stock insuficiente para product_id=${pid}. Disponible=${stock.toString()} Necesario=${needed.toString()}`,
            );
          }
        }
      }
      const sale = await tx.sale.create({
        data: {
          cash_session_id: cashSession.id,
          status: SaleStatus.PAID,
          customer_name: dto.customer_name?.trim() || null,
          note: dto.note?.trim() || null,
          subtotal,
          discount,
          total,
          created_by: userId,
          items: { create: items },
          payments: { create: payments },
        },
        include: { items: true, payments: true },
      });

      for (const it of items) {
        await tx.stockMovement.create({
          data: {
            product_id: it.product_id,
            type: StockMovementType.SALE,
            qty: it.qty,
            note: `Sale #${sale.id}`,
            sale_id: sale.id,
            created_by: userId,
          },
        });
      }

      return sale;
    });
  }

  async getSale(id: number) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: true,
        cashSession: true,
      },
    });
  }
}

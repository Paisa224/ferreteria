import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementType,
  PaymentMethod,
  Prisma,
  SaleStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
        track_stock: dto.track_stock ?? true,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async listProducts(q?: string) {
    const query = (q ?? '').trim();
    if (!query) {
      return this.prisma.product.findMany({
        orderBy: { id: 'asc' },
      });
    }

    const asInt = Number.parseInt(query, 10);
    const isInt = Number.isFinite(asInt) && String(asInt) === query;

    const or: Prisma.ProductWhereInput[] = [
      { name: { contains: query } },
      { sku: query },
      { barcode: query },
    ];

    if (isInt) or.push({ id: asInt });

    return this.prisma.product.findMany({
      where: { OR: or },
      orderBy: { id: 'asc' },
    });
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Producto no encontrado');

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.sku !== undefined) data.sku = dto.sku?.trim() || null;
    if (dto.barcode !== undefined) data.barcode = dto.barcode?.trim() || null;
    if (dto.unit !== undefined) data.unit = dto.unit?.trim() || null;
    if (dto.cost !== undefined) data.cost = new Prisma.Decimal(dto.cost);
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.track_stock !== undefined) data.track_stock = dto.track_stock;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.product.update({
      where: { id },
      data,
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
    let nonCashSum = new Prisma.Decimal(0);
    let hasCash = false;
    let cashTotal = new Prisma.Decimal(0);

    const payments = dto.payments.map((p) => {
      const amt = new Prisma.Decimal(p.amount);
      paySum = paySum.plus(amt);

      if (p.method === 'CASH') {
        hasCash = true;
        cashTotal = cashTotal.plus(amt);
      } else {
        nonCashSum = nonCashSum.plus(amt);
      }

      return {
        method: p.method as PaymentMethod,
        amount: amt,
        reference: p.method === 'CASH' ? null : p.reference?.trim() || null,
      };
    });

    if (paySum.lt(total)) {
      throw new BadRequestException(
        `Suma de pagos (${paySum.toString()}) no alcanza el total (${total.toString()})`,
      );
    }

    if (paySum.gt(total)) {
      if (!hasCash) {
        throw new BadRequestException(
          'Si hay vuelto, debe existir al menos un pago CASH',
        );
      }
      if (nonCashSum.gt(total)) {
        throw new BadRequestException(
          'El vuelto solo puede provenir de CASH (pagos no-CASH exceden el total)',
        );
      }
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
        include: {
          items: { include: { product: true } },
          payments: true,
          cashSession: { include: { cashRegister: true } },
          createdByUser: { select: { id: true, username: true, name: true } },
        },
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

      if (cashTotal.gt(0)) {
        await tx.cashMovement.create({
          data: {
            cash_session_id: cashSession.id,
            type: CashMovementType.IN,
            concept: `Venta #${sale.id}`,
            amount: cashTotal,
            reference: String(sale.id),
            created_by: userId,
          },
        });
      }

      return sale;
    });
  }

  async getSale(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: true,
        cashSession: true,
      },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }
}

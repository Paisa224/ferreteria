import { Injectable } from '@nestjs/common';
import { Prisma, CashSessionStatus, CashMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SummaryQuery = { from?: string; to?: string };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private parseRange(q: SummaryQuery) {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = q.from
      ? startOfDay(new Date(q.from))
      : startOfDay(defaultFrom);
    const to = q.to ? endOfDay(new Date(q.to)) : endOfDay(now);

    return { from, to };
  }

  async summary(q: SummaryQuery) {
    const { from, to } = this.parseRange(q);

    const salesAgg = await this.prisma.sale.aggregate({
      where: { created_at: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    });

    const sales_count = salesAgg._count?.id ?? 0;
    const sales_total = salesAgg._sum?.total ?? new Prisma.Decimal(0);
    const avg_ticket = salesAgg._avg?.total ?? new Prisma.Decimal(0);

    const cashSums = await this.prisma.cashMovement.groupBy({
      by: ['type'],
      where: { created_at: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const cash_in_total =
      cashSums.find((x) => x.type === CashMovementType.IN)?._sum.amount ??
      new Prisma.Decimal(0);

    const cash_out_total =
      cashSums.find((x) => x.type === CashMovementType.OUT)?._sum.amount ??
      new Prisma.Decimal(0);

    const net_total = cash_in_total.minus(cash_out_total);

    const openSessions = await this.prisma.cashSession.findMany({
      where: { status: CashSessionStatus.OPEN },
      orderBy: { opened_at: 'desc' },
      include: {
        cashRegister: true,
        openedByUser: { select: { id: true, username: true, name: true } },
      },
    });

    const openSessionIds = openSessions.map((s) => s.id);
    const openMovements =
      openSessionIds.length > 0
        ? await this.prisma.cashMovement.groupBy({
            by: ['cash_session_id', 'type'],
            where: { cash_session_id: { in: openSessionIds } },
            _sum: { amount: true },
          })
        : [];

    const lastCounts = await Promise.all(
      openSessions.map((s) =>
        this.prisma.cashCount.findFirst({
          where: { cash_session_id: s.id },
          orderBy: { counted_at: 'desc' },
        }),
      ),
    );

    const countsBySession = new Map(
      lastCounts.map((count, idx) => [openSessions[idx]?.id, count ?? null]),
    );

    const expectedBySession = new Map<number, Prisma.Decimal>();
    for (const session of openSessions) {
      const sumIn =
        openMovements.find(
          (m) =>
            m.cash_session_id === session.id && m.type === CashMovementType.IN,
        )?._sum.amount ?? new Prisma.Decimal(0);
      const sumOut =
        openMovements.find(
          (m) =>
            m.cash_session_id === session.id && m.type === CashMovementType.OUT,
        )?._sum.amount ?? new Prisma.Decimal(0);
      expectedBySession.set(
        session.id,
        session.opening_amount.plus(sumIn).minus(sumOut),
      );
    }

    const paymentsByMethod = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { created_at: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const LOW_STOCK_THRESHOLD = new Prisma.Decimal(5);

    const products = await this.prisma.product.findMany({
      where: { is_active: true, track_stock: true },
      select: { id: true, name: true, sku: true, barcode: true },
      take: 5000,
    });

    const pids = products.map((p) => p.id);

    let lowStock: Array<{
      id: number;
      name: string;
      sku: string | null;
      barcode: string | null;
      stock: Prisma.Decimal;
    }> = [];

    if (pids.length > 0) {
      const sums = await this.prisma.stockMovement.groupBy({
        by: ['product_id', 'type'],
        where: { product_id: { in: pids } },
        _sum: { qty: true },
      });

      const getSum = (pid: number, type: any) =>
        sums.find((s) => s.product_id === pid && s.type === type)?._sum.qty ??
        new Prisma.Decimal(0);

      lowStock = products
        .map((p) => {
          const stock = getSum(p.id, 'IN')
            .plus(getSum(p.id, 'ADJUST'))
            .plus(getSum(p.id, 'RETURN'))
            .minus(getSum(p.id, 'OUT'))
            .minus(getSum(p.id, 'SALE'));

          return {
            id: p.id,
            name: p.name,
            sku: p.sku ?? null,
            barcode: p.barcode ?? null,
            stock,
          };
        })
        .filter((p) => p.stock.lte(LOW_STOCK_THRESHOLD))
        .sort((a, b) => (a.stock.lt(b.stock) ? -1 : 1))
        .slice(0, 20);
    }

    const low_stock_count = lowStock.length;

    const sales_by_day = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint; total: string }>
    >(Prisma.sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM Sale
      WHERE created_at BETWEEN ${from} AND ${to}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const cash_in_out_by_day = await this.prisma.$queryRaw<
      Array<{ date: string; type: string; total: string }>
    >(Prisma.sql`
      SELECT
        DATE(created_at) as date,
        type as type,
        COALESCE(SUM(amount), 0) as total
      FROM CashMovement
      WHERE created_at BETWEEN ${from} AND ${to}
      GROUP BY DATE(created_at), type
      ORDER BY date ASC
    `);

    const recent_sales = await this.prisma.sale.findMany({
      where: { created_at: { gte: from, lte: to } },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        cashSession: { include: { cashRegister: true } },
        payments: true,
        createdByUser: { select: { id: true, username: true, name: true } },
      },
    });

    return {
      range: { from, to },
      kpis: {
        sales_count,
        sales_total: sales_total.toString(),
        avg_ticket: avg_ticket.toString(),
        cash_in_total: cash_in_total.toString(),
        cash_out_total: cash_out_total.toString(),
        net_total: net_total.toString(),
        open_cash_sessions: openSessions.length,
        low_stock_count,
        payments_by_method: paymentsByMethod.map((p) => ({
          method: p.method,
          total: (p._sum.amount ?? new Prisma.Decimal(0)).toString(),
        })),
      },
      charts: {
        sales_by_day: sales_by_day.map((r) => ({
          date: r.date,
          count: Number(r.count),
          total: r.total ?? '0',
        })),
        cash_in_out_by_day: cash_in_out_by_day.map((r) => ({
          date: r.date,
          type: r.type,
          total: r.total ?? '0',
        })),
      },
      tables: {
        open_cash_sessions: openSessions.map((s) => ({
          id: s.id,
          cash_register: s.cashRegister.name,
          opened_at: s.opened_at,
          opening_amount: s.opening_amount.toString(),
          opened_by: s.openedByUser,
          expected_cash: expectedBySession.get(s.id)?.toString() ?? '0',
          last_counted:
            countsBySession.get(s.id)?.total_counted?.toString() ?? null,
          difference: countsBySession.get(s.id)?.difference?.toString() ?? null,
        })),
        low_stock: lowStock.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          stock: p.stock.toString(),
        })),
        recent_sales: recent_sales.map((x) => ({
          id: x.id,
          created_at: x.created_at,
          total: x.total.toString(),
          cash_register: x.cashSession?.cashRegister?.name ?? null,
          created_by: x.createdByUser,
          payments: (x.payments ?? []).map((p) => ({
            method: p.method,
            amount: p.amount.toString(),
            reference: p.reference,
          })),
        })),
      },
    };
  }
}

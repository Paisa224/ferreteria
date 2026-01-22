import { useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../modules/dashboard/dashboard.api";
import { DashboardCharts } from "../modules/dashboard/DashboardCharts";
import { paymentMethodLabel } from "../modules/pos/pos.utils";
import s from "./DashboardPage.module.css";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function moneyPY(v: any) {
  const n = Number(String(v ?? "0"));
  return new Intl.NumberFormat("es-PY").format(n);
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<"7d" | "30d" | "month" | "custom">("7d");
  const [from, setFrom] = useState<string>(() =>
    toISODate(new Date(Date.now() - 6 * 86400000)),
  );
  const [to, setTo] = useState<string>(() => toISODate(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyPreset(p: typeof preset) {
    const now = new Date();
    if (p === "7d") {
      setFrom(toISODate(new Date(now.getTime() - 6 * 86400000)));
      setTo(toISODate(now));
    } else if (p === "30d") {
      setFrom(toISODate(new Date(now.getTime() - 29 * 86400000)));
      setTo(toISODate(now));
    } else if (p === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(toISODate(start));
      setTo(toISODate(now));
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await getDashboardSummary(from, to);
      setData(res);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (preset !== "custom") applyPreset(preset);
  }, [preset]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const salesByDay = useMemo(() => {
    const rows = (data?.charts?.sales_by_day ?? []) as Array<{
      date: string;
      count: number;
      total: string;
    }>;
    return rows.map((r) => ({
      date: r.date,
      count: Number(r.count ?? 0),
      total: Number(r.total ?? "0"),
    }));
  }, [data]);

  const cashByDay = useMemo(() => {
    const rows = (data?.charts?.cash_in_out_by_day ?? []) as Array<{
      date: string;
      type: string;
      total: string;
    }>;
    const map = new Map<string, { date: string; IN: number; OUT: number }>();

    for (const r of rows) {
      const x = map.get(r.date) ?? { date: r.date, IN: 0, OUT: 0 };
      if (r.type === "IN") x.IN = Number(r.total ?? "0");
      if (r.type === "OUT") x.OUT = Number(r.total ?? "0");
      map.set(r.date, x);
    }

    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [data]);

  function downloadCSV() {
    if (!data?.charts?.sales_by_day) return;

    const rows = data.charts.sales_by_day as Array<{
      date: string;
      count: number;
      total: string;
    }>;
    const header = ["date", "count", "total"].join(",");
    const body = rows
      .map((r) => [r.date, r.count, r.total].join(","))
      .join("\n");
    const csv = header + "\n" + body;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_sales_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const k = data?.kpis;

  const paymentsByMethod = (k?.payments_by_method ?? []) as Array<{
    method: string;
    total: string;
  }>;
  const paymentsTotal = paymentsByMethod.reduce(
    (acc, p) => acc + Number(p.total ?? "0"),
    0,
  );

  return (
    <div className={s.wrap}>
      <div className="card">
        <div className={s.row} style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="h1">Dashboard</h1>
            <div className="muted">Resumen operativo y financiero</div>
          </div>

          <div className={s.row}>
            <select
              className={s.select}
              value={preset}
              onChange={(e) => setPreset(e.target.value as any)}
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="month">Este mes</option>
              <option value="custom">Rango</option>
            </select>

            <input
              className={s.input}
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
            />
            <input
              className={s.input}
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
            />

            <button className="btn" onClick={load} disabled={loading}>
              Actualizar
            </button>

            <button
              className="btn primary"
              onClick={downloadCSV}
              disabled={!data}
            >
              Descargar CSV
            </button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "var(--danger)" }}>{err}</div>
        )}
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiTitle}>Ventas (cantidad)</div>
          <div className={s.kpiValue}>{k ? k.sales_count : "-"}</div>
          <div className={s.kpiSub}>
            Rango: {from} → {to}
          </div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Ingresos por ventas</div>
          <div className={s.kpiValue}>₲ {k ? moneyPY(k.sales_total) : "-"}</div>
          <div className={s.kpiSub}>
            Ticket promedio: ₲ {k ? moneyPY(k.avg_ticket) : "-"}
          </div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Ingresos de cajas</div>
          <div className={s.kpiValue}>
            ₲ {k ? moneyPY(k.cash_in_total) : "-"}
          </div>
          <div className={s.kpiSub}>Movimientos tipo de Ingresos</div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Egresos de cajas</div>
          <div className={s.kpiValue}>
            ₲ {k ? moneyPY(k.cash_out_total) : "-"}
          </div>
          <div className={s.kpiSub}>Movimientos tipo de Egresos</div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Neto (Ingresos - Egresos)</div>
          <div className={s.kpiValue}>₲ {k ? moneyPY(k.net_total) : "-"}</div>
          <div className={s.kpiSub}>Balance de caja</div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Cajas abiertas</div>
          <div className={s.kpiValue}>{k ? k.open_cash_sessions : "-"}</div>
          <div className={s.kpiSub}>
            Stock bajo (≤ 5): {k ? k.low_stock_count : "-"}
          </div>
        </div>

        <div className={s.kpi}>
          <div className={s.kpiTitle}>Pagos por método</div>
          <div className={s.kpiValue}>
            {paymentsByMethod.length > 0 ? `₲ ${moneyPY(paymentsTotal)}` : "-"}
          </div>
          <div className={s.kpiSub}>
            {paymentsByMethod.length === 0
              ? "Sin pagos"
              : paymentsByMethod
                  .map(
                    (p) =>
                      `${paymentMethodLabel(p.method)}: ₲ ${moneyPY(p.total)}`,
                  )
                  .join(" · ")}
          </div>
        </div>
      </div>

      {data && (
        <DashboardCharts salesByDay={salesByDay} cashByDay={cashByDay} />
      )}

      <div className={s.grid2}>
        <div className="card">
          <h2 className="h1">Cajas activas</h2>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Caja</th>
                <th>Usuario</th>
                <th>Apertura</th>
                <th>Monto apertura</th>
                <th>Esperado</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tables?.open_cash_sessions ?? []).map((x: any) => (
                <tr key={x.id}>
                  <td>{x.cash_register}</td>
                  <td>{x.opened_by?.username}</td>
                  <td>{new Date(x.opened_at).toLocaleString()}</td>
                  <td>₲ {moneyPY(x.opening_amount)}</td>
                  <td>₲ {moneyPY(x.expected_cash)}</td>
                  <td>
                    {x.difference !== null ? `₲ ${moneyPY(x.difference)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="h1">Stock bajo (≤ 5)</h2>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tables?.low_stock ?? []).map((x: any) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td>{x.sku ?? "-"}</td>
                  <td>{x.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="h1">Últimas ventas</h2>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Caja</th>
              <th>Total</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {(data?.tables?.recent_sales ?? []).map((x: any) => (
              <tr key={x.id}>
                <td>{new Date(x.created_at).toLocaleString()}</td>
                <td>{x.cash_register ?? "-"}</td>
                <td>₲ {moneyPY(x.total)}</td>
                <td>
                  {(x.payments ?? [])
                    .map(
                      (p: any) =>
                        `${paymentMethodLabel(p.method)}:${moneyPY(p.amount)}`,
                    )
                    .join(" | ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

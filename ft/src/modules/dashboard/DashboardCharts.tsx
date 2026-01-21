import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

function moneyPY(v: any) {
  const n = Number(String(v ?? "0"));
  return new Intl.NumberFormat("es-PY").format(n);
}

function xTick(date: string) {
  const parts = date.split("-");
  const m = parts[1];
  const d = parts[2];
  return `${d}/${m}`;
}

export function DashboardCharts({
  salesByDay,
  cashByDay,
}: {
  salesByDay: Array<{ date: string; count: number; total: number }>;
  cashByDay: Array<{ date: string; IN: number; OUT: number }>;
}) {
  return (
    <div className="grid2">
      <div className="card">
        <h2 className="h1">Ventas por día</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          Total diario (₲) y cantidad de ventas
        </div>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={xTick} />
              <YAxis tickFormatter={(v) => moneyPY(v)} />
              <Tooltip
                formatter={(value: any, name: any) =>
                  name === "total"
                    ? [`₲ ${moneyPY(value)}`, "Total"]
                    : [value, "Ventas"]
                }
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend />
              <Area dataKey="total" name="Total ₲" />
              <Line dataKey="count" name="Cantidad" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="h1">Ingresos vs Egresos</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          Movimientos diarios de caja
        </div>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={cashByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={xTick} />
              <YAxis tickFormatter={(v) => moneyPY(v)} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `₲ ${moneyPY(value)}`,
                  name,
                ]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend />
              <Line dataKey="IN" name="Ingresos" />
              <Line dataKey="OUT" name="Egresos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

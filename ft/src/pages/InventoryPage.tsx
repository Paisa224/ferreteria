import { useEffect, useMemo, useState } from "react";
import {
  createStockMovement,
  getProductMovements,
  getProductStock,
  listProducts,
} from "../modules/inventory/inventory.api";
import type {
  Product,
  StockMovementResponse,
  StockResponse,
} from "../modules/inventory/types";
import s from "./InventoryPage.module.css";

const movementLabels = {
  IN: "Ingreso",
  OUT: "Salida",
  ADJUST: "Ajuste",
  SALE: "Venta",
  RETURN: "Devolución",
} as const;

type MovementType = keyof typeof movementLabels;

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatNumber(value: string | number | undefined | null) {
  if (value === undefined || value === null) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 3,
  }).format(n);
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockResponse | null>(null);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [movementTotal, setMovementTotal] = useState(0);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [stockErr, setStockErr] = useState<string | null>(null);
  const [movementErr, setMovementErr] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">(
    "IN",
  );
  const [qty, setQty] = useState("1");

  const [from, setFrom] = useState(() =>
    toISODate(new Date(Date.now() - 6 * 86400000)),
  );
  const [to, setTo] = useState(() => toISODate(new Date()));

  const selectedStockLabel = useMemo(() => {
    if (!stock) return "-";
    if (!stock.track_stock) return "No aplica";
    return formatNumber(stock.stock);
  }, [stock]);

  const stockNumber = useMemo(() => {
    if (!stock?.track_stock || stock.stock === null) return null;
    const value = Number(stock.stock);
    if (Number.isNaN(value)) return null;
    return value;
  }, [stock]);

  const outOfStockWarning = useMemo(() => {
    if (movementType !== "OUT") return null;
    if (stockNumber === null) return null;
    const requested = Number(qty);
    if (Number.isNaN(requested)) return null;
    if (requested > stockNumber) {
      return `Stock insuficiente (disponible: ${formatNumber(stockNumber)})`;
    }
    return null;
  }, [movementType, qty, stockNumber]);

  async function loadProducts(nextQuery = query) {
    setLoadingProducts(true);
    setErr(null);
    try {
      const data = await listProducts(nextQuery.trim() || undefined);
      setProducts(data);
      if (data.length === 0) {
        setSelected(null);
        setStock(null);
        setMovements([]);
        setMovementTotal(0);
      } else if (!selected || !data.find((p) => p.id === selected.id)) {
        setSelected(data[0]);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error cargando productos");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadStock(productId: number) {
    setLoadingStock(true);
    setStockErr(null);
    try {
      const data = await getProductStock(productId);
      setStock(data);
    } catch (e: any) {
      setStockErr(e?.response?.data?.message ?? "Error cargando stock");
      setStock(null);
    } finally {
      setLoadingStock(false);
    }
  }

  async function loadMovements(productId: number) {
    setLoadingMovements(true);
    setMovementErr(null);
    try {
      const data = await getProductMovements(productId, from, to, 100);
      setMovements(data.items ?? []);
      setMovementTotal(data.total ?? 0);
    } catch (e: any) {
      setMovementErr(
        e?.response?.data?.message ?? "Error cargando movimientos",
      );
      setMovements([]);
      setMovementTotal(0);
    } finally {
      setLoadingMovements(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadStock(selected.id);
    loadMovements(selected.id);
  }, [selected]);

  async function onSubmitMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (outOfStockWarning) return;
    setSubmitting(true);
    setStockErr(null);
    setMovementErr(null);
    try {
      await createStockMovement({
        product_id: selected.id,
        type: movementType,
        qty: Number(qty),
        note: note.trim() ? note.trim() : undefined,
      });
      setNote("");
      setQty("1");
      await Promise.all([loadStock(selected.id), loadMovements(selected.id)]);
    } catch (e: any) {
      setMovementErr(
        e?.response?.data?.message ?? "Error registrando movimiento",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div className={s.toolbar}>
          <div>
            <h1 className="h1">Inventario</h1>
            <div className="muted">
              Consulta de stock, movimientos y ajustes manuales por producto
            </div>
          </div>

          <div className={s.searchRow}>
            <input
              className={s.searchInput}
              placeholder="Buscar por nombre, SKU o código de barras"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn primary"
              onClick={() => loadProducts()}
              disabled={loadingProducts}
            >
              {loadingProducts ? "Buscando…" : "Buscar"}
            </button>
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                loadProducts("");
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
        {err && <div style={{ color: "var(--danger)" }}>{err}</div>}
      </div>

      <div className={s.grid}>
        <div className="card">
          <h2 className="h1">Productos</h2>
          {products.length === 0 && !loadingProducts ? (
            <div className={s.emptyState}>No hay productos para mostrar.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className={s.productName}>{p.name}</div>
                      {p.barcode && (
                        <div className="muted">Barcode: {p.barcode}</div>
                      )}
                    </td>
                    <td>{p.sku ?? "-"}</td>
                    <td>{p.track_stock ? "Controla" : "No aplica"}</td>
                    <td>
                      <span
                        className={`${s.statusBadge} ${
                          p.is_active ? s.statusActive : s.statusInactive
                        }`}
                      >
                        {p.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn ${
                          selected?.id === p.id ? "primary" : ""
                        }`}
                        onClick={() => setSelected(p)}
                      >
                        {selected?.id === p.id ? "Seleccionado" : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={s.detailStack}>
          <div className="card">
            <div className={s.detailHeader}>
              <h2 className="h1">Detalle</h2>
              <div className="muted">
                Seleccioná un producto para revisar el stock actual.
              </div>
            </div>

            {!selected ? (
              <div className={s.emptyState}>No hay producto seleccionado.</div>
            ) : (
              <>
                <div className={s.detailMeta}>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>Producto</div>
                    <div className={s.metaValue}>{selected.name}</div>
                  </div>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>SKU</div>
                    <div className={s.metaValue}>{selected.sku ?? "-"}</div>
                  </div>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>Barcode</div>
                    <div className={s.metaValue}>{selected.barcode ?? "-"}</div>
                  </div>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>Precio</div>
                    <div className={s.metaValue}>
                      ₲ {formatNumber(selected.price)}
                    </div>
                  </div>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>Controla stock</div>
                    <div className={s.metaValue}>
                      {selected.track_stock ? "Sí" : "No"}
                    </div>
                  </div>
                  <div className={s.metaItem}>
                    <div className={s.metaLabel}>Estado</div>
                    <div className={s.metaValue}>
                      {selected.is_active ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                </div>

                <div className={s.stockHighlight}>
                  <div className={s.metaLabel}>Stock actual</div>
                  <div className={s.stockValue}>
                    {loadingStock ? "Consultando…" : selectedStockLabel}
                  </div>
                </div>
                {stockErr && (
                  <div style={{ color: "var(--danger)" }}>{stockErr}</div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className={s.detailHeader}>
              <h2 className="h1">Movimiento manual</h2>
              <div className="muted">Registrar ingreso, salida o ajuste.</div>
            </div>

            {!selected ? (
              <div className={s.emptyState}>No hay producto seleccionado.</div>
            ) : (
              <form className={s.form} onSubmit={onSubmitMovement}>
                <div className={s.formRow}>
                  <select
                    value={movementType}
                    onChange={(e) =>
                      setMovementType(e.target.value as "IN" | "OUT" | "ADJUST")
                    }
                  >
                    <option value="IN">{movementLabels.IN}</option>
                    <option value="OUT">{movementLabels.OUT}</option>
                    <option value="ADJUST">{movementLabels.ADJUST}</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder={
                      movementType === "ADJUST" ? "Dejar stock en" : "Cantidad"
                    }
                  />
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota o comentario (opcional)"
                />
                <div className={s.formHint}>
                  {movementType === "ADJUST"
                    ? "Ajuste: la cantidad indica el stock final deseado."
                    : "Ingresos y salidas impactan directamente en el stock actual."}
                </div>
                {outOfStockWarning && (
                  <div style={{ color: "var(--danger)" }}>
                    {outOfStockWarning}
                  </div>
                )}

                <div className={s.formRow}>
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={
                      submitting || !selected.track_stock || !!outOfStockWarning
                    }
                  >
                    {submitting ? "Guardando…" : "Registrar movimiento"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      loadStock(selected.id);
                      loadMovements(selected.id);
                    }}
                    disabled={loadingStock || loadingMovements}
                  >
                    {loadingStock || loadingMovements
                      ? "Actualizando…"
                      : "Refrescar"}
                  </button>
                </div>
                {!selected.track_stock && (
                  <div className={s.formHint}>
                    Este producto no maneja stock (track_stock=false).
                  </div>
                )}
                {movementErr && (
                  <div style={{ color: "var(--danger)" }}>{movementErr}</div>
                )}
              </form>
            )}
          </div>

          <div className="card">
            <div className={s.kardexHeader}>
              <div>
                <h2 className="h1">Kardex / Movimientos</h2>
                <div className="muted">
                  Últimos {movementTotal} registros dentro del rango.
                </div>
              </div>
              <div className={s.kardexFilters}>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
                <button
                  className="btn"
                  onClick={() => selected && loadMovements(selected.id)}
                  disabled={!selected || loadingMovements}
                >
                  {loadingMovements ? "Cargando…" : "Filtrar"}
                </button>
              </div>
            </div>

            {!selected ? (
              <div className={s.emptyState}>No hay producto seleccionado.</div>
            ) : movements.length === 0 && !loadingMovements ? (
              <div className={s.emptyState}>
                No hay movimientos en el rango.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Nota</th>
                    <th>Usuario</th>
                    <th>Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDateTime(m.created_at)}</td>
                      <td>
                        <span
                          className={`${s.typeBadge} ${
                            s[`type${m.type}` as keyof typeof s] ?? ""
                          }`}
                        >
                          {movementLabels[m.type as MovementType] ?? m.type}
                        </span>
                      </td>
                      <td>{formatNumber(m.qty)}</td>
                      <td>{m.note ?? "-"}</td>
                      <td>
                        {m.createdByUser
                          ? `${m.createdByUser.name} (${m.createdByUser.username})`
                          : m.created_by}
                      </td>
                      <td>{m.sale_id ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {movementErr && (
              <div style={{ color: "var(--danger)" }}>{movementErr}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

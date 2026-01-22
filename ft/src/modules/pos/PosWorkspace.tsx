import { useEffect, useMemo, useState } from "react";
import {
  createSale,
  getProductStock,
  listPosProducts,
  listRecentSales,
} from "./pos.api";
import type {
  CartItem,
  PaymentLine,
  PosProduct,
  SaleResponse,
} from "./pos.types";
import {
  formatMoney,
  formatQty,
  parseError,
  parseMoney,
  paymentMethodLabel,
  qtyStep,
  roundQty,
} from "./pos.utils";
import { ProductSearch } from "./ProductSearch";
import { Cart } from "./Cart";
import { PosSummaryCard } from "./PosSummaryCard";
import { myOpenSession } from "../cash/cash.api";
import { useAuthStore } from "../../auth/auth.store";
import {
  buildReceiptHtml,
  getReceiptSettings,
  openReceiptWindow,
} from "./receipt";
import s from "./PosWorkspace.module.css";

const EPS = 0;

type Props = {
  className?: string;
  showHeader?: boolean;
};

export function PosWorkspace({ className, showHeader = true }: Props) {
  const [sessionOpen, setSessionOpen] = useState<boolean | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);
  const [lastCashMeta, setLastCashMeta] = useState<{
    received: number;
    change: number;
  } | null>(null);
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentLine["method"]>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const canOverridePrice = useAuthStore((s) => s.hasPerm("pos.price_override"));
  const cashier = useAuthStore((s) => s.me);

  useEffect(() => {
    myOpenSession()
      .then((session) => setSessionOpen(!!session))
      .catch(() => setSessionOpen(false));
  }, []);

  useEffect(() => {
    searchProducts("");
  }, []);

  useEffect(() => {
    refreshRecentSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty * item.price, 0),
    [cart],
  );
  const subtotalRounded = useMemo(() => Math.round(subtotal), [subtotal]);

  const discountClamped = useMemo(() => {
    if (Number.isNaN(discount)) return 0;
    return Math.min(Math.max(discount, 0), subtotalRounded);
  }, [discount, subtotalRounded]);

  const total = useMemo(
    () => Math.max(subtotalRounded - discountClamped, 0),
    [subtotalRounded, discountClamped],
  );

  const received = useMemo(
    () => parseMoney(cashReceived) || 0,
    [cashReceived],
  );

  const change = useMemo(() => {
    if (paymentMethod !== "CASH") return 0;
    return received > total ? received - total : 0;
  }, [paymentMethod, received, total]);

  const canConfirm = useMemo(() => {
    if (!sessionOpen) return false;
    if (cart.length === 0) return false;
    if (total <= 0) return false;
    if (paymentMethod === "CASH") {
      return received + EPS >= total;
    }
    return true;
  }, [sessionOpen, cart, total, paymentMethod, received]);

  async function searchProducts(q: string, opts?: { autoAdd?: boolean }) {
    setLoadingProducts(true);
    setErr(null);
    try {
      const data = await listPosProducts(q.trim() || undefined);
      setProducts(data);
      if (opts?.autoAdd && data.length > 0) {
        await addToCart(data[0]);
      }
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function addToCart(product: PosProduct) {
    if (!product.is_active) return;

    const existing = cart.find((c) => c.product.id === product.id);
    let stockValue: number | null = null;
    const step = qtyStep(product.unit);

    if (product.track_stock) {
      try {
        const res = await getProductStock(product.id);
        stockValue = res.stock === null ? null : Number(res.stock);
      } catch {
        stockValue = null;
      }
    }

    if (existing) {
      const nextQty = roundQty(existing.qty + step, product.unit);
      if (product.track_stock && stockValue !== null && nextQty > stockValue) {
        setErr(
          `Stock insuficiente para ${product.name}. Disponible: ${formatMoney(stockValue)}`,
        );
        return;
      }
      setCart((prev) =>
        prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: nextQty } : c,
        ),
      );
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        product,
        qty: step,
        price: Number(product.price),
        stock: stockValue,
      },
    ]);
  }

  function changeQty(id: number, qty: number) {
    const item = cart.find((c) => c.product.id === id);
    const unit = item?.product.unit;
    const minQty = qtyStep(unit);
    const value = roundQty(qty, unit);
    if (Number.isNaN(value) || value < minQty) return;

    setCart((prev) =>
      prev.map((c) => {
        if (c.product.id !== id) return c;
        if (
          c.product.track_stock &&
          c.stock !== null &&
          c.stock !== undefined
        ) {
          if (value > c.stock) return c;
        }
        return { ...c, qty: value };
      }),
    );
  }

  function changePrice(id: number, price: number) {
    if (!canOverridePrice) return;
    if (Number.isNaN(price) || price < 0) return;
    setCart((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, price } : c)),
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }

  function resetSale(clearMessages = true) {
    setCart([]);
    setDiscount(0);
    setCustomerName("");
    setNote("");
    setCashReceived("");
    setPaymentReference("");
    setErr(null);
    if (clearMessages) {
      setSuccess(null);
      setLastSale(null);
      setLastCashMeta(null);
      setSelectedSaleId(null);
    }
  }

  function updateRecentSales(sale: SaleResponse) {
    setRecentSales((prev) => {
      const filtered = prev.filter((s) => s.id !== sale.id);
      return [sale, ...filtered].slice(0, 50);
    });
  }

  async function refreshRecentSales() {
    try {
      const res = await listRecentSales(30);
      setRecentSales(res);
      if (res.length > 0 && selectedSaleId === null) {
        setSelectedSaleId(res[0].id);
      }
    } catch (e) {
      console.warn("No se pudieron cargar ventas recientes", e);
    }
  }

  async function confirmSale() {
    if (!canConfirm) return;

    setLoadingSale(true);
    setErr(null);
    setSuccess(null);

    try {
      const payload = {
        customer_name: customerName.trim() || null,
        note: note.trim() || null,
        discount: discountClamped,
        items: cart.map((item) => ({
          product_id: item.product.id,
          qty: item.qty,
          price: item.price,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: total,
            reference:
              paymentMethod === "CASH" ? null : paymentReference.trim() || null,
          },
        ],
      };

      const res = await createSale(payload);
      if (paymentMethod === "CASH") {
        setLastCashMeta({ received, change });
      } else {
        setLastCashMeta(null);
      }
      resetSale(false);
      setLastSale(res);
      setSelectedSaleId(res.id);
      updateRecentSales(res);
      refreshRecentSales();
      setSuccess(`Venta OK #${res.id}`);
    } catch (e: any) {
      const message = parseError(e);
      setErr(message);
      if (message.toLowerCase().includes("sesión")) {
        const session = await myOpenSession().catch(() => null);
        setSessionOpen(!!session);
      }
    } finally {
      setLoadingSale(false);
    }
  }

  function handlePrintSale(sale: SaleResponse, includeCashMeta?: boolean) {
    const settings = getReceiptSettings();
    const html = buildReceiptHtml(
      sale,
      settings,
      cashier,
      includeCashMeta ? lastCashMeta ?? undefined : undefined,
    );
    openReceiptWindow(html);
  }

  const selectedSale = useMemo(() => {
    if (lastSale && lastSale.id === selectedSaleId) return lastSale;
    return recentSales.find((s) => s.id === selectedSaleId) ?? lastSale;
  }, [lastSale, recentSales, selectedSaleId]);

  return (
    <div className={`${s.root} ${className ?? ""}`}>
      {showHeader && (
        <div className="card">
          <div className={s.header}>
            <div>
              <h1 className="h1">POS Ventas</h1>
              <div className="muted">
                Ventas rápidas con búsqueda por nombre, SKU o código de barras.
              </div>
            </div>
            <div className={s.sessionStatus}>
              <div className={s.sessionLabel}>Caja</div>
              <div className={s.sessionValue}>
                {sessionOpen ? "Sesión abierta" : "Sin sesión"}
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionOpen === false && (
        <div className={`card ${s.notice}`}>
          No hay caja abierta. Abrí una sesión para vender.
          <div style={{ marginTop: 8 }}>
            <a className="btn primary" href="/cash/open">
              Ir a Caja
            </a>
          </div>
        </div>
      )}

      {err && <div className={`card ${s.error}`}>{err}</div>}

      <div className={s.body}>
        <section className={`${s.column} ${s.scroll}`}>
          <div className="card">
            <ProductSearch
              products={products}
              onSearch={searchProducts}
              onAdd={addToCart}
              loading={loadingProducts}
              cartItems={cart}
            />
          </div>
        </section>

        <section className={s.column}>
          <div className={`${s.stack} ${s.scroll}`}>
            <div className="card">
              <h2 className="h1">Carrito</h2>
              <Cart
                items={cart}
                onChangeQty={changeQty}
                onChangePrice={changePrice}
                canOverridePrice={canOverridePrice}
                onRemove={removeItem}
              />
            </div>
          </div>
        </section>

        <section className={s.column}>
          <div className={`${s.stack} ${s.scroll}`}>
            <div className="card">
              <h2 className="h1">Post-venta</h2>
              <div className="muted">
                Última venta, impresión y reimpresiones rápidas.
              </div>

              <div className={s.postSection}>
                <div className={s.sectionTitle}>Última venta</div>
                {lastSale ? (
                  <div className={s.lastSaleSummary}>
                    <div>
                      <div className={s.saleTitle}>
                        Venta #{lastSale.id}
                      </div>
                      <div className="muted">
                        {new Date(lastSale.created_at).toLocaleString()} · ₲{" "}
                        {formatMoney(lastSale.total)}
                      </div>
                      <div className="muted">
                        {paymentMethodLabel(
                          lastSale.payments?.[0]?.method ?? "CASH",
                        )}
                        {lastSale.createdByUser?.username
                          ? ` · ${lastSale.createdByUser.username}`
                          : ""}
                      </div>
                      {success && <div className="muted">{success}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="muted">Sin ventas registradas todavía.</div>
                )}

                <div className={s.actionRow}>
                  <button
                    className="btn primary"
                    onClick={() =>
                      lastSale && handlePrintSale(lastSale, true)
                    }
                    disabled={!lastSale}
                  >
                    Imprimir ticket
                  </button>
                  <button
                    className="btn"
                    onClick={() => setShowSaleDetail((prev) => !prev)}
                    disabled={!selectedSale}
                  >
                    {showSaleDetail ? "Ocultar detalle" : "Ver detalle"}
                  </button>
                  <button className="btn" onClick={() => resetSale(true)}>
                    Nueva venta
                  </button>
                </div>
              </div>

              <div className={s.postSection}>
                <div className={s.sectionTitle}>Histórico</div>
                {recentSales.length === 0 ? (
                  <div className="muted">Sin ventas recientes.</div>
                ) : (
                  <div className={s.saleList}>
                    {recentSales.map((sale) => {
                      const active = sale.id === selectedSale?.id;
                      const payment = sale.payments?.[0]?.method ?? "CASH";
                      return (
                        <div
                          key={sale.id}
                          className={`${s.saleItem} ${active ? s.saleItemActive : ""}`}
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setShowSaleDetail(true);
                          }}
                          role="button"
                        >
                          <div>
                            <div className={s.saleTitle}>
                              #{sale.id} ·{" "}
                              {new Date(sale.created_at).toLocaleString()}
                            </div>
                            <div className="muted">
                              ₲ {formatMoney(sale.total)} ·{" "}
                              {paymentMethodLabel(payment)}
                              {sale.createdByUser?.username
                                ? ` · ${sale.createdByUser.username}`
                                : ""}
                            </div>
                          </div>
                          <div className={s.saleActions}>
                            <button
                              className="btn"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintSale(sale);
                              }}
                            >
                              Reimprimir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {showSaleDetail && selectedSale && (
                <div className={s.detailCard}>
                  <div className={s.sectionTitle}>
                    Detalle #{selectedSale.id}
                  </div>
                  <div className="muted">
                    {new Date(selectedSale.created_at).toLocaleString()} · ₲{" "}
                    {formatMoney(selectedSale.total)}
                  </div>
                  <div className={s.detailMeta}>
                    {(selectedSale.payments ?? []).map((p) => (
                      <div key={p.id}>
                        {paymentMethodLabel(p.method)}: ₲{" "}
                        {formatMoney(p.amount)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </div>
                    ))}
                  </div>

                  <table className={s.detailTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSale.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.product?.name ?? item.product_id}</td>
                          <td>
                            {formatQty(
                              Number(item.qty),
                              item.product?.unit ?? null,
                            )}
                          </td>
                          <td>₲ {formatMoney(item.price)}</td>
                          <td>₲ {formatMoney(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={s.actionRow}>
                    <button
                      className="btn"
                      onClick={() => handlePrintSale(selectedSale)}
                    >
                      Imprimir ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className={s.footer}>
        <div className="card">
          <PosSummaryCard
            subtotal={subtotalRounded}
            discount={discountClamped}
            total={total}
            onDiscountChange={setDiscount}
          />
          <div className={s.notes}>
            <label>
              Cliente
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label>
              Nota
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
        </div>

        <div className="card">
          <div>
            <h2 className="h1">Pago</h2>
            <div className="muted">Seleccioná el método y confirmá.</div>
          </div>

          <div className={s.paymentGrid}>
            <label>
              Método
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentLine["method"])
                }
              >
                <option value="CASH">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TRANSFER">Transferencia bancaria</option>
              </select>
            </label>

            {paymentMethod === "CASH" ? (
              <label>
                Recibido
                <input
                  type="text"
                  inputMode="numeric"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  onBlur={() =>
                    setCashReceived(formatMoney(parseMoney(cashReceived)))
                  }
                />
              </label>
            ) : (
              <label>
                Referencia (opcional)
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Nro de operación"
                />
              </label>
            )}
          </div>

          <div className={s.paymentSummary}>
            <div>
              <div className={s.label}>Total</div>
              <div className={s.value}>₲ {formatMoney(total)}</div>
            </div>
            {paymentMethod === "CASH" && (
              <div>
                <div className={s.label}>Vuelto</div>
                <div className={s.value}>₲ {formatMoney(change)}</div>
              </div>
            )}
          </div>

          <div className={s.actions}>
            <button
              className="btn primary"
              onClick={confirmSale}
              disabled={!canConfirm || loadingSale}
            >
              {loadingSale ? "Confirmando…" : "Cobrar"}
            </button>
            <button
              className="btn"
              onClick={() => resetSale(true)}
              disabled={loadingSale}
            >
              Limpiar
            </button>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            {paymentMethod === "CASH" ? (
              <>
                Recibido: ₲ {formatMoney(received)} · Cambio: ₲{" "}
                {formatMoney(change)}
              </>
            ) : (
              <>Método seleccionado: {paymentMethodLabel(paymentMethod)}</>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

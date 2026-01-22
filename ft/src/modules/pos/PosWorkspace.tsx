import { useEffect, useMemo, useState } from "react";
import { listPosProducts, createSale, getProductStock } from "./pos.api";
import type {
  CartItem,
  PaymentLine,
  PosProduct,
  SaleResponse,
} from "./pos.types";
import {
  formatMoney,
  parseError,
  paymentMethodLabel,
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

const MIN_QTY = 0.001;
const EPS = 0.01;

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

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty * item.price, 0),
    [cart],
  );

  const discountClamped = useMemo(() => {
    if (Number.isNaN(discount)) return 0;
    return Math.min(Math.max(discount, 0), subtotal);
  }, [discount, subtotal]);

  const total = useMemo(
    () => subtotal - discountClamped,
    [subtotal, discountClamped],
  );

  const received = useMemo(() => Number(cashReceived) || 0, [cashReceived]);

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

    if (product.track_stock) {
      try {
        const res = await getProductStock(product.id);
        stockValue = res.stock === null ? null : Number(res.stock);
      } catch {
        stockValue = null;
      }
    }

    if (existing) {
      const nextQty = roundQty(existing.qty + MIN_QTY);
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
        qty: MIN_QTY,
        price: Number(product.price),
        stock: stockValue,
      },
    ]);
  }

  function changeQty(id: number, qty: number) {
    const value = roundQty(qty);
    if (Number.isNaN(value) || value < MIN_QTY) return;

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

  function handlePrint() {
    if (!lastSale) return;
    const settings = getReceiptSettings();
    const html = buildReceiptHtml(
      lastSale,
      settings,
      cashier,
      lastCashMeta ?? undefined,
    );
    openReceiptWindow(html);
  }

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

      {success && lastSale && (
        <div className="card">
          <div className={s.successRow}>
            <div>
              <div className="h1">Venta confirmada</div>
              <div className="muted">{success}</div>
            </div>
            <div className={s.successActions}>
              <button className="btn primary" onClick={handlePrint}>
                Imprimir ticket
              </button>
              <button className="btn" onClick={() => resetSale(true)}>
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}

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
      </div>

      <footer className={s.footer}>
        <div className="card">
          <PosSummaryCard
            subtotal={subtotal}
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
                  type="number"
                  min={0}
                  step={0.01}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
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

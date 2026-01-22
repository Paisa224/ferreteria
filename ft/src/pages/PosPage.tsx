import { useEffect, useMemo, useState } from "react";
import {
  listPosProducts,
  createSale,
  getProductStock,
} from "../modules/pos/pos.api";
import type {
  CartItem,
  PaymentLine,
  PosProduct,
} from "../modules/pos/pos.types";
import { formatMoney, parseError, roundQty } from "../modules/pos/pos.utils";
import { ProductSearch } from "../modules/pos/ProductSearch";
import { Cart } from "../modules/pos/Cart";
import { PaymentsForm } from "../modules/pos/PaymentsForm";
import { PosSummaryCard } from "../modules/pos/PosSummaryCard";
import { myOpenSession } from "../modules/cash/cash.api";
import s from "./PosPage.module.css";

const MIN_QTY = 0.001;
const EPS = 0.01;

export default function PosPage() {
  const [sessionOpen, setSessionOpen] = useState<boolean | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentLine[]>([
    { method: "CASH", amount: 0, reference: null },
  ]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    myOpenSession()
      .then((session) => setSessionOpen(!!session))
      .catch(() => setSessionOpen(false));
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

  const paid = useMemo(
    () => payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
    [payments],
  );

  const hasCash = useMemo(
    () => payments.some((p) => p.method === "CASH"),
    [payments],
  );

  const canConfirm = useMemo(() => {
    if (!sessionOpen) return false;
    if (cart.length === 0) return false;
    if (total <= 0) return false;
    if (payments.some((p) => !p.amount || p.amount <= 0)) return false;

    if (paid + EPS < total) return false;

    const overpay = paid - total;
    if (overpay > EPS && !hasCash) return false;

    return true;
  }, [sessionOpen, cart, total, payments, paid, hasCash]);

  async function searchProducts(q: string) {
    setLoadingProducts(true);
    setErr(null);
    try {
      const data = await listPosProducts(q.trim() || undefined);
      setProducts(data);
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

  function removeItem(id: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }

  function resetSale(clearMessages = true) {
    setCart([]);
    setPayments([{ method: "CASH", amount: 0, reference: null }]);
    setDiscount(0);
    setCustomerName("");
    setNote("");
    setErr(null);
    if (clearMessages) setSuccess(null);
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
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference?.trim() || null,
        })),
      };

      const res = await createSale(payload);
      resetSale(false);
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

  return (
    <div className={s.wrap}>
      <div className="card">
        <h1 className="h1">POS Ventas</h1>
        <div className="muted">
          Ventas rápidas con múltiples métodos de pago.
        </div>
      </div>

      {sessionOpen === false && (
        <div className={`card ${s.notice}`}>
          No hay caja abierta. Abrí una sesión para vender.
          <div style={{ marginTop: 8 }}>
            <a className="btn primary" href="/cash">
              Ir a Caja
            </a>
          </div>
        </div>
      )}

      {err && <div className={`card ${s.error}`}>{err}</div>}
      {success && <div className="card">{success}</div>}

      <div className={s.grid}>
        <div className={s.stack}>
          <div className="card">
            <ProductSearch
              products={products}
              onSearch={searchProducts}
              onAdd={addToCart}
              loading={loadingProducts}
              cartItems={cart}
            />
          </div>
        </div>

        <div className={s.stack}>
          <div className="card">
            <h2 className="h1">Carrito</h2>
            <Cart items={cart} onChangeQty={changeQty} onRemove={removeItem} />
          </div>

          <div className="card">
            <PosSummaryCard
              subtotal={subtotal}
              discount={discountClamped}
              total={total}
              onDiscountChange={setDiscount}
            />
            <div style={{ marginTop: 10 }}>
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
            <PaymentsForm
              payments={payments}
              total={total}
              onChange={setPayments}
            />
          </div>

          <div className="card">
            <button
              className="btn primary"
              onClick={confirmSale}
              disabled={!canConfirm || loadingSale}
            >
              {loadingSale ? "Confirmando…" : "Confirmar venta"}
            </button>
            <button
              className="btn"
              onClick={() => resetSale(true)}
              disabled={loadingSale}
            >
              Nueva venta
            </button>
            <div className="muted" style={{ marginTop: 8 }}>
              Pagado: ₲ {formatMoney(paid)} · Total: ₲ {formatMoney(total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

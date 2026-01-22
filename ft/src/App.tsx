import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

type CashSession = { id: number; status: "OPEN" | "CLOSED" } | null;

type Product = {
  id: number;
  name: string;
  price: string;
  barcode?: string | null;
  sku?: string | null;
};

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  );
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234!");
  const [cashSession, setCashSession] = useState<CashSession>(null);

  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<
    { product: Product; qty: number; price: number }[]
  >([]);
  const total = useMemo(
    () => cart.reduce((acc, it) => acc + it.qty * it.price, 0),
    [cart],
  );

  async function login() {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("access_token", res.data.access_token);
    setToken(res.data.access_token);
  }

  async function loadMyOpenCash() {
    const res = await api.get("/cash/sessions/my-open");
    setCashSession(res.data ?? null);
  }

  async function openCash() {
    const res = await api.post("/cash/sessions/open", {
      cash_register_id: 1,
      opening_amount: 0,
    });
    setCashSession(res.data);
  }

  async function searchProducts() {
    const res = await api.get("/products", { params: { q } });
    setProducts(res.data);
  }

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((x) => x.product.id === p.id);
      const price = Number(p.price);
      if (found)
        return prev.map((x) =>
          x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x,
        );
      return [...prev, { product: p, qty: 1, price }];
    });
  }

  async function payCash() {
    if (!cashSession || cashSession.status !== "OPEN") {
      alert("No hay caja abierta");
      return;
    }
    if (cart.length === 0) return;

    const payload = {
      items: cart.map((it) => ({
        product_id: it.product.id,
        qty: it.qty,
        price: it.price,
      })),
      payments: [{ method: "CASH", amount: total }],
      customer_name: "Mostrador",
    };

    const res = await api.post("/pos/sales", payload);
    alert(`Venta OK. ID: ${res.data.id}`);
    setCart([]);
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setCashSession(null);
  }

  useEffect(() => {
    if (token) loadMyOpenCash().catch(() => setCashSession(null));
  }, [token]);

  if (!token) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 420 }}>
        <h2>Login</h2>
        <div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
          />
        </div>
        <button style={{ marginTop: 12 }} onClick={login}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>POS</h2>
        <button onClick={logout}>Salir</button>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div>
          <b>Caja:</b>{" "}
          {cashSession?.status === "OPEN"
            ? `ABIERTA (session ${cashSession.id})`
            : "CERRADA"}
        </div>
        {(!cashSession || cashSession.status !== "OPEN") && (
          <button style={{ marginTop: 8 }} onClick={openCash}>
            Abrir Caja (Caja 1)
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>Buscar productos</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="nombre / sku / barcode"
            />
            <button onClick={searchProducts}>Buscar</button>
          </div>

          <ul>
            {products.map((p) => (
              <li key={p.id} style={{ marginTop: 8 }}>
                <b>{p.name}</b> — ₲{p.price}
                <button style={{ marginLeft: 8 }} onClick={() => addToCart(p)}>
                  Agregar
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>Carrito</h3>
          {cart.length === 0 ? (
            <div>Vacío</div>
          ) : (
            <ul>
              {cart.map((it) => (
                <li key={it.product.id}>
                  {it.product.name} — x{it.qty} — ₲{it.qty * it.price}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 12 }}>
            <b>Total:</b> ₲{total}
          </div>
          <button
            style={{ marginTop: 12 }}
            onClick={payCash}
            disabled={
              total <= 0 || !cashSession || cashSession.status !== "OPEN"
            }
          >
            Cobrar EFECTIVO
          </button>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import type { CartItem, PosProduct } from "./pos.types";
import { formatMoney } from "./pos.utils";
import s from "./ProductSearch.module.css";

type Props = {
  products: PosProduct[];
  onSearch: (q: string) => void;
  onAdd: (product: PosProduct) => void;
  loading?: boolean;
  cartItems: CartItem[];
};

export function ProductSearch({
  products,
  onSearch,
  onAdd,
  loading,
  cartItems,
}: Props) {
  const [query, setQuery] = useState("");

  const cartIds = useMemo(
    () => new Set(cartItems.map((c) => c.product.id)),
    [cartItems],
  );

  return (
    <div className={s.wrap}>
      <div>
        <h2 className="h1">Productos</h2>
        <div className="muted">Buscá por nombre, SKU o código de barras.</div>
      </div>

      <div className={s.searchRow}>
        <input
          className={s.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos"
        />
        <button
          className="btn primary"
          onClick={() => onSearch(query)}
          disabled={loading}
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
        <button
          className="btn"
          onClick={() => {
            setQuery("");
            onSearch("");
          }}
        >
          Limpiar
        </button>
      </div>

      {products.length === 0 ? (
        <div className={s.empty}>No hay productos para mostrar.</div>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const disabled = !p.is_active;
              return (
                <tr key={p.id}>
                  <td>
                    <div className={s.name}>{p.name}</div>
                    <div className="muted">
                      {p.sku ?? "-"} · {p.barcode ?? "-"}
                    </div>
                  </td>
                  <td>₲ {formatMoney(p.price)}</td>
                  <td>
                    <span
                      className={`${s.badge} ${p.is_active ? s.badgeActive : s.badgeInactive}`}
                    >
                      {p.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${cartIds.has(p.id) ? "" : "primary"}`}
                      onClick={() => onAdd(p)}
                      disabled={disabled}
                    >
                      {cartIds.has(p.id) ? "Agregar otra" : "Agregar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

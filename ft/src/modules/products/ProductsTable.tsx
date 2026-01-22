import type { Product } from "./types";
import s from "./ProductsTable.module.css";

type Props = {
  products: Product[];
  selectedId?: number | null;
  onSelect: (product: Product) => void;
  onToggleActive: (product: Product) => void;
};

function formatNumber(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function ProductsTable({
  products,
  selectedId,
  onSelect,
  onToggleActive,
}: Props) {
  if (products.length === 0) {
    return <div className={s.empty}>No hay productos para mostrar.</div>;
  }

  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>SKU</th>
          <th>Código barras</th>
          <th>Precio</th>
          <th>Costo</th>
          <th>Stock</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>
              <div className={s.name}>{p.name}</div>
              {p.unit && <div className="muted">Unidad: {p.unit}</div>}
            </td>
            <td>{p.sku ?? "-"}</td>
            <td>{p.barcode ?? "-"}</td>
            <td>₲ {formatNumber(p.price)}</td>
            <td>₲ {formatNumber(p.cost)}</td>
            <td>{p.track_stock ? "Sí" : "No"}</td>
            <td>
              <span
                className={`${s.badge} ${
                  p.is_active ? s.badgeActive : s.badgeInactive
                }`}
              >
                {p.is_active ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td className={s.actions}>
              <button
                className={`btn ${selectedId === p.id ? "primary" : ""}`}
                onClick={() => onSelect(p)}
              >
                Editar
              </button>
              <button
                className={`btn ${p.is_active ? "danger" : "primary"}`}
                onClick={() => onToggleActive(p)}
              >
                {p.is_active ? "Desactivar" : "Activar"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

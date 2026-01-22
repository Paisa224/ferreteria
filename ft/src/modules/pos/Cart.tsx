import type { CartItem } from "./pos.types";
import { formatMoney, roundQty } from "./pos.utils";
import s from "./Cart.module.css";

type Props = {
  items: CartItem[];
  onChangeQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
};

export function Cart({ items, onChangeQty, onRemove }: Props) {
  if (items.length === 0) {
    return <div className={s.empty}>No hay productos en el carrito.</div>;
  }

  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Precio</th>
          <th>Cant.</th>
          <th>Subtotal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const subtotal = item.qty * item.price;
          return (
            <tr key={item.product.id}>
              <td>
                <div className={s.name}>{item.product.name}</div>
                {item.product.unit && (
                  <div className="muted">Unidad: {item.product.unit}</div>
                )}
                {item.product.track_stock && item.stock !== undefined && (
                  <div className="muted">Stock: {item.stock ?? "N/A"}</div>
                )}
              </td>
              <td>₲ {formatMoney(item.price)}</td>
              <td className={s.qtyCell}>
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    onChangeQty(item.product.id, roundQty(item.qty - 0.001))
                  }
                >
                  -
                </button>
                <input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={item.qty}
                  onChange={(e) =>
                    onChangeQty(item.product.id, Number(e.target.value))
                  }
                />
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    onChangeQty(item.product.id, roundQty(item.qty + 0.001))
                  }
                >
                  +
                </button>
              </td>
              <td>₲ {formatMoney(subtotal)}</td>
              <td>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => onRemove(item.product.id)}
                >
                  Quitar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

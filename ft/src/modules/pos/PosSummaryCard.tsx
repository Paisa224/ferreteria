import { formatMoney } from "./pos.utils";
import s from "./PosSummaryCard.module.css";

type Props = {
  subtotal: number;
  discount: number;
  total: number;
  onDiscountChange: (value: number) => void;
};

export function PosSummaryCard({
  subtotal,
  discount,
  total,
  onDiscountChange,
}: Props) {
  return (
    <div className={s.card}>
      <div>
        <div className={s.label}>Subtotal</div>
        <div className={s.value}>₲ {formatMoney(subtotal)}</div>
      </div>
      <div>
        <div className={s.label}>Descuento</div>
        <input
          type="number"
          min={0}
          step={0.01}
          value={discount}
          onChange={(e) => onDiscountChange(Number(e.target.value))}
        />
      </div>
      <div>
        <div className={s.label}>Total</div>
        <div className={s.value}>₲ {formatMoney(total)}</div>
      </div>
    </div>
  );
}

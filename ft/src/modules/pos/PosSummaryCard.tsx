import { formatMoney, parseMoney } from "./pos.utils";
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
          type="text"
          inputMode="numeric"
          value={formatMoney(discount)}
          onChange={(e) => onDiscountChange(parseMoney(e.target.value))}
          onBlur={(e) => onDiscountChange(parseMoney(e.currentTarget.value))}
        />
      </div>
      <div>
        <div className={s.label}>Total</div>
        <div className={s.value}>₲ {formatMoney(total)}</div>
      </div>
    </div>
  );
}

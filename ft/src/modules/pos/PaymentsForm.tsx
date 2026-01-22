import { useEffect, useMemo, useState } from "react";
import type { PaymentLine } from "./pos.types";
import { formatMoney, paymentMethodLabel } from "./pos.utils";
import s from "./PaymentsForm.module.css";

type Props = {
  payments: PaymentLine[];
  total: number;
  onChange: (payments: PaymentLine[]) => void;
};

const methods: PaymentLine["method"][] = ["CASH", "QR", "TRANSFER"];

export function PaymentsForm({ payments, total, onChange }: Props) {
  const [localError, setLocalError] = useState<string | null>(null);

  const paid = useMemo(
    () => payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
    [payments],
  );

  const remaining = total - paid;
  const change = remaining < 0 ? Math.abs(remaining) : 0;

  function updateLine(index: number, patch: Partial<PaymentLine>) {
    const next = payments.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  }

  function removeLine(index: number) {
    onChange(payments.filter((_, i) => i !== index));
  }

  function addLine() {
    onChange([...payments, { method: "CASH", amount: 0, reference: null }]);
  }

  useEffect(() => {
    const invalid = payments.some((p) => !p.amount || Number(p.amount) <= 0);
    setLocalError(invalid ? "Todos los pagos deben ser mayores a 0." : null);
  }, [payments]);

  return (
    <div className={s.wrap}>
      <div>
        <h2 className="h1">Pagos</h2>
        <div className="muted">Agregá uno o más métodos de pago.</div>
      </div>

      <div className={s.lines}>
        {payments.map((p, idx) => (
          <div key={`${p.method}-${idx}`} className={s.line}>
            <select
              value={p.method}
              onChange={(e) =>
                updateLine(idx, {
                  method: e.target.value as PaymentLine["method"],
                })
              }
            >
              {methods.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              step={0.01}
              value={p.amount}
              onChange={(e) =>
                updateLine(idx, { amount: Number(e.target.value) })
              }
            />

            <input
              placeholder="Referencia"
              value={p.reference ?? ""}
              onChange={(e) => updateLine(idx, { reference: e.target.value })}
            />

            <button
              className="btn danger"
              type="button"
              onClick={() => removeLine(idx)}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button className="btn" type="button" onClick={addLine}>
        Agregar pago
      </button>

      <div className={s.summary}>
        <div>
          <div className={s.label}>Pagado</div>
          <div className={s.value}>₲ {formatMoney(paid)}</div>
        </div>
        <div>
          <div className={s.label}>Falta</div>
          <div className={s.value}>
            ₲ {formatMoney(remaining > 0 ? remaining : 0)}
          </div>
        </div>
        <div>
          <div className={s.label}>Vuelto</div>
          <div className={s.value}>₲ {formatMoney(change)}</div>
        </div>
      </div>

      {localError && <div className={s.error}>{localError}</div>}
    </div>
  );
}

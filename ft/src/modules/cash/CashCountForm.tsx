import { useMemo, useState } from "react";
import type { CashCount, CashCountDto } from "./cash.types";
import { formatMoney } from "./cash.utils";
import s from "./CashCountForm.module.css";

type Props = {
  denominations: number[];
  onCount: (dto: CashCountDto) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  lastCount?: CashCount | null;
};

export function CashCountForm({
  denominations,
  onCount,
  loading,
  error,
  lastCount,
}: Props) {
  const [qtyMap, setQtyMap] = useState<Record<number, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  const sortedDenoms = useMemo(
    () => [...denominations].sort((a, b) => b - a),
    [denominations],
  );

  const total = useMemo(() => {
    return sortedDenoms.reduce((acc, denom) => {
      const qty = Number(qtyMap[denom] ?? 0);
      if (Number.isNaN(qty)) return acc;
      return acc + denom * qty;
    }, 0);
  }, [sortedDenoms, qtyMap]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const items = sortedDenoms
      .map((denom) => {
        const qty = Number(qtyMap[denom] ?? 0);
        return { denom_value: denom, qty };
      })
      .filter((d) => d.qty > 0);

    if (items.length === 0) {
      setLocalError("Ingresá al menos una denominación con cantidad.");
      return;
    }

    if (items.some((d) => d.denom_value <= 0 || d.qty < 0)) {
      setLocalError("Las denominaciones y cantidades deben ser válidas.");
      return;
    }

    if (items.some((d) => !Number.isInteger(d.qty))) {
      setLocalError("Las cantidades deben ser enteras.");
      return;
    }

    await onCount({ denominations: items });
  }

  return (
    <div className={s.wrap}>
      <div>
        <h2 className="h1">Arqueo</h2>
        <div className="muted">Ingresá las denominaciones contadas.</div>
      </div>

      <form className={s.wrap} onSubmit={handleSubmit}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Denominación</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sortedDenoms.map((denom) => {
              const qty = Number(qtyMap[denom] ?? 0);
              const subtotal = Number.isNaN(qty) ? 0 : qty * denom;
              return (
                <tr key={denom}>
                  <td>₲ {formatMoney(denom)}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={qtyMap[denom] ?? ""}
                      onChange={(e) =>
                        setQtyMap((prev) => ({
                          ...prev,
                          [denom]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>₲ {formatMoney(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={s.total}>
          <span>Total contado</span>
          <span>₲ {formatMoney(total)}</span>
        </div>

        {(localError || error) && (
          <div className={s.error}>{localError ?? error}</div>
        )}

        {lastCount && (
          <div className="muted">
            Último arqueo: ₲ {formatMoney(lastCount.total_counted)} (dif.{" "}
            {formatMoney(lastCount.difference)})
          </div>
        )}

        <div className={s.actions}>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar arqueo"}
          </button>
        </div>
      </form>
    </div>
  );
}

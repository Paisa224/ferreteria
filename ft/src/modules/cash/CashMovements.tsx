import { useMemo, useState } from "react";
import type { CashMovement, CashMovementDto } from "./cash.types";
import { formatDateTime, formatMoney } from "./cash.utils";
import { formatMoneyGs, parseMoneyGs } from "../../utils/money";
import s from "./CashMovements.module.css";

type Props = {
  movements: CashMovement[];
  onAdd: (dto: CashMovementDto) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export function CashMovements({ movements, onAdd, loading, error }: Props) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("0");
  const [reference, setReference] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const totalMovements = useMemo(() => movements.length, [movements]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (concept.trim().length < 3) {
      setLocalError("El concepto debe tener al menos 3 caracteres.");
      return;
    }
    const value = parseMoneyGs(amount);
    if (Number.isNaN(value) || value <= 0) {
      setLocalError("El monto debe ser mayor a 0.");
      return;
    }

    await onAdd({
      type,
      concept: concept.trim(),
      amount: value,
      reference: reference.trim() ? reference.trim() : null,
    });

    setConcept("");
    setAmount("0");
    setReference("");
  }

  return (
    <div className={s.wrap}>
      <div>
        <h2 className="h1">Movimientos</h2>
        <div className="muted">Registrá ingresos y egresos.</div>
      </div>

      <form className={s.wrap} onSubmit={handleSubmit}>
        <div className={s.formRow}>
          <label>
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "IN" | "OUT")}
            >
              <option value="IN">Ingreso</option>
              <option value="OUT">Salida</option>
            </select>
          </label>
          <label>
            Concepto
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Pago de proveedor"
            />
          </label>
          <label>
            Monto
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setAmount(formatMoneyGs(parseMoneyGs(amount)))}
            />
          </label>
          <label>
            Referencia
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>

        {(localError || error) && (
          <div className={s.error}>{localError ?? error}</div>
        )}

        <div className={s.actions}>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Registrar movimiento"}
          </button>
        </div>
      </form>

      <div>
        <div className="muted">Últimos movimientos ({totalMovements})</div>
        {movements.length === 0 ? (
          <div className={s.empty}>No hay movimientos registrados.</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Usuario</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td>
                    <span
                      className={`${s.typeBadge} ${m.type === "IN" ? s.typeIN : s.typeOUT}`}
                    >
                      {m.type === "IN" ? "Ingreso" : "Salida"}
                    </span>
                  </td>
                  <td>{m.concept}</td>
                  <td>₲ {formatMoney(m.amount)}</td>
                  <td>
                    {m.createdByUser
                      ? `${m.createdByUser.name} (${m.createdByUser.username})`
                      : m.created_by}
                  </td>
                  <td>{m.reference ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

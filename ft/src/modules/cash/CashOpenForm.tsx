import { useMemo, useState } from "react";
import type { CashRegister, OpenSessionDto } from "./cash.types";
import { formatMoneyGs, parseMoneyGs } from "../../utils/money";
import s from "./CashOpenForm.module.css";

type Props = {
  registers: CashRegister[];
  onOpen: (dto: OpenSessionDto) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export function CashOpenForm({ registers, onOpen, loading, error }: Props) {
  const [registerId, setRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [localError, setLocalError] = useState<string | null>(null);

  const activeRegisters = useMemo(
    () => registers.filter((r) => r.is_active),
    [registers],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const register = Number(registerId);
    const amount = parseMoneyGs(openingAmount);

    if (!registerId || Number.isNaN(register)) {
      setLocalError("Seleccioná una caja válida.");
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setLocalError("El monto de apertura debe ser mayor o igual a 0.");
      return;
    }

    await onOpen({ cash_register_id: register, opening_amount: amount });
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div>
        <h2 className="h1">Abrir Caja</h2>
        <div className="muted">Seleccioná la caja y el monto inicial.</div>
      </div>

      <div className={s.row}>
        <label>
          Caja
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {activeRegisters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Monto de apertura
          <input
            type="text"
            inputMode="numeric"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            onBlur={() =>
              setOpeningAmount(formatMoneyGs(parseMoneyGs(openingAmount)))
            }
          />
        </label>
      </div>

      {(localError || error) && (
        <div className={s.error}>{localError ?? error}</div>
      )}

      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Abriendo…" : "Abrir caja"}
      </button>
    </form>
  );
}

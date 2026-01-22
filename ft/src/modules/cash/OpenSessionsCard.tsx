import type { CashSession } from "./cash.types";
import { formatDateTime, formatMoney } from "./cash.utils";
import s from "./OpenSessionsCard.module.css";

type Props = {
  sessions: CashSession[];
};

export function OpenSessionsCard({ sessions }: Props) {
  return (
    <div className={s.wrap}>
      <div>
        <h2 className="h1">Cajas abiertas</h2>
        <div className="muted">Sesiones abiertas actualmente.</div>
      </div>

      {sessions.length === 0 ? (
        <div className={s.empty}>No hay sesiones abiertas.</div>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Caja</th>
              <th>Usuario</th>
              <th>Apertura</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((ss) => (
              <tr key={ss.id}>
                <td>
                  {ss.cashRegister?.name ?? `Caja #${ss.cash_register_id}`}
                </td>
                <td>
                  {ss.openedByUser
                    ? `${ss.openedByUser.name} (${ss.openedByUser.username})`
                    : "-"}
                </td>
                <td>{formatDateTime(ss.opened_at)}</td>
                <td>₲ {formatMoney(ss.opening_amount)}</td>
                <td>
                  <span className={`${s.badge} ${s.badgeOpen}`}>OPEN</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

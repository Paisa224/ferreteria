import type { CashSummary } from "./cash.types";
import { formatDateTime, formatMoney } from "./cash.utils";
import s from "./CashSummaryCard.module.css";

type Props = {
  summary: CashSummary | null;
};

export function CashSummaryCard({ summary }: Props) {
  if (!summary) {
    return (
      <div className={s.empty}>No hay resumen disponible para esta sesión.</div>
    );
  }

  return (
    <div className={s.card}>
      <div>
        <div className={s.label}>Apertura</div>
        <div className={s.value}>₲ {formatMoney(summary.opening_amount)}</div>
        <div className="muted">{formatDateTime(summary.opened_at)}</div>
      </div>
      <div>
        <div className={s.label}>Ingresos</div>
        <div className={s.value}>₲ {formatMoney(summary.sum_in)}</div>
      </div>
      <div>
        <div className={s.label}>Egresos</div>
        <div className={s.value}>₲ {formatMoney(summary.sum_out)}</div>
      </div>
      <div>
        <div className={s.label}>Esperado</div>
        <div className={s.value}>₲ {formatMoney(summary.expected_cash)}</div>
      </div>
    </div>
  );
}

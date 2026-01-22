import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCashSession,
  getCashSummary,
  listCashCounts,
} from "../modules/cash/cash.api";
import type {
  CashCount,
  CashSession,
  CashSummary,
} from "../modules/cash/cash.types";
import { formatDateTime, formatMoney } from "../modules/cash/cash.utils";
import s from "./CashSessionClosedPage.module.css";

function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error. Intentá nuevamente.";
}

export default function CashSessionClosedPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();

  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [lastCount, setLastCount] = useState<CashCount | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || Number.isNaN(sessionId)) {
      setErr("Sesión inválida.");
      return;
    }

    async function load() {
      try {
        const [sess, sum, counts] = await Promise.all([
          getCashSession(sessionId),
          getCashSummary(sessionId),
          listCashCounts(sessionId),
        ]);
        setSession(sess);
        setSummary(sum);
        setLastCount(counts[0] ?? null);
        if (sess.status === "OPEN") {
          navigate(`/cash/session/${sessionId}`, { replace: true });
        }
      } catch (e: any) {
        setErr(parseError(e));
      }
    }
    load();
  }, [sessionId, navigate]);

  if (err) {
    return <div className={s.wrap}>{err}</div>;
  }

  if (!session) {
    return <div className={s.wrap}>Cargando cierre…</div>;
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <h1 className="h1">Caja cerrada</h1>
        <div className="muted">Sesión #{session.id}</div>
      </div>

      <div className="card">
        <div className={s.meta}>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Caja</div>
            <div className={s.metaValue}>
              {session.cashRegister?.name ??
                `Caja #${session.cash_register_id}`}
            </div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Apertura</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(session.opening_amount)}
            </div>
            <div className="muted">{formatDateTime(session.opened_at)}</div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Cierre</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(session.closing_amount)}
            </div>
            <div className="muted">
              {formatDateTime(session.closed_at ?? "")}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className={s.meta}>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Esperado</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(summary?.expected_cash)}
            </div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Contado</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(lastCount?.total_counted)}
            </div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Diferencia</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(lastCount?.difference)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <a className="btn primary" href="/cash/open">
            Salir
          </a>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addCashMovement,
  closeCashSession,
  countCash,
  getCashSession,
  getCashSummary,
  listCashCounts,
  listCashMovements,
  listDenominations,
} from "../modules/cash/cash.api";
import type {
  CashCount,
  CashMovement,
  CashSession,
  CashSummary,
} from "../modules/cash/cash.types";
import { CashMovements } from "../modules/cash/CashMovements";
import { CashCountForm } from "../modules/cash/CashCountForm";
import { CashSummaryCard } from "../modules/cash/CashSummaryCard";
import { formatDateTime, formatMoney } from "../modules/cash/cash.utils";
import s from "./CashSessionPage.module.css";

function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error. Intentá nuevamente.";
}

export default function CashSessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();

  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [counts, setCounts] = useState<CashCount[]>([]);
  const [denoms, setDenoms] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [moveErr, setMoveErr] = useState<string | null>(null);
  const [countErr, setCountErr] = useState<string | null>(null);
  const [closeErr, setCloseErr] = useState<string | null>(null);
  const [busyMove, setBusyMove] = useState(false);
  const [busyCount, setBusyCount] = useState(false);
  const [busyClose, setBusyClose] = useState(false);

  const lastCount = useMemo(() => counts[0] ?? null, [counts]);

  useEffect(() => {
    if (session?.status !== "OPEN") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session?.status]);

  async function loadAll() {
    if (!sessionId || Number.isNaN(sessionId)) {
      setErr("Sesión inválida.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [sess, sum, movs, countsData, denomsData] = await Promise.all([
        getCashSession(sessionId),
        getCashSummary(sessionId),
        listCashMovements(sessionId),
        listCashCounts(sessionId),
        listDenominations(),
      ]);
      setSession(sess);
      setSummary(sum);
      setMovements(movs);
      setCounts(countsData);
      setDenoms(denomsData);
      if (sess.status === "CLOSED") {
        navigate(`/cash/session/${sessionId}/closed`, { replace: true });
      }
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  async function handleMovement(dto: {
    type: "IN" | "OUT";
    concept: string;
    amount: number;
    reference?: string | null;
  }) {
    if (!session) return;
    setBusyMove(true);
    setMoveErr(null);
    try {
      await addCashMovement(session.id, dto);
      const [sum, movs] = await Promise.all([
        getCashSummary(session.id),
        listCashMovements(session.id),
      ]);
      setSummary(sum);
      setMovements(movs);
    } catch (e: any) {
      setMoveErr(parseError(e));
    } finally {
      setBusyMove(false);
    }
  }

  async function handleCount(dto: {
    denominations: { denom_value: number; qty: number }[];
  }) {
    if (!session) return;
    setBusyCount(true);
    setCountErr(null);
    try {
      const data = await countCash(session.id, dto);
      const sum = await getCashSummary(session.id);
      setSummary(sum);
      setCounts((prev) => [data, ...prev]);
    } catch (e: any) {
      setCountErr(parseError(e));
    } finally {
      setBusyCount(false);
    }
  }

  async function handleClose() {
    if (!session) return;
    setCloseErr(null);
    if (!lastCount) {
      setCloseErr("Primero hacé un arqueo final para cerrar la sesión.");
      return;
    }
    const ok = window.confirm("¿Cerrar la sesión de caja?");
    if (!ok) return;

    setBusyClose(true);
    try {
      await closeCashSession(session.id);
      navigate(`/cash/session/${session.id}/closed`, { replace: true });
    } catch (e: any) {
      setCloseErr(parseError(e));
    } finally {
      setBusyClose(false);
    }
  }

  if (loading) {
    return <div className={s.wrap}>Cargando sesión…</div>;
  }

  if (!session) {
    return (
      <div className={s.wrap}>
        <div className="card">{err ?? "Sesión no encontrada."}</div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div className={s.header}>
          <div>
            <h1 className="h1">Caja en Operación</h1>
            <div className="muted">Sesión #{session.id}</div>
          </div>
          <span className={s.badge}>OPEN</span>
        </div>
        <div className={s.meta}>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Caja</div>
            <div className={s.metaValue}>
              {session.cashRegister?.name ??
                `Caja #${session.cash_register_id}`}
            </div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Usuario</div>
            <div className={s.metaValue}>
              {session.openedByUser
                ? `${session.openedByUser.name} (${session.openedByUser.username})`
                : session.opened_by}
            </div>
          </div>
          <div className={s.metaItem}>
            <div className={s.metaLabel}>Apertura</div>
            <div className={s.metaValue}>
              ₲ {formatMoney(session.opening_amount)}
            </div>
            <div className="muted">{formatDateTime(session.opened_at)}</div>
          </div>
        </div>
      </div>

      {err && <div className={`card ${s.error}`}>{err}</div>}

      <div className={s.grid}>
        <div className={s.stack}>
          <div className="card">
            <CashSummaryCard summary={summary} />
          </div>
          <div className="card">
            <CashMovements
              movements={movements}
              onAdd={handleMovement}
              loading={busyMove}
              error={moveErr}
            />
          </div>
          <div className={`card ${s.notice}`}>
            ¿Necesitás vender? Abrí el POS en una pestaña dedicada.
            <div style={{ marginTop: 8 }}>
              <a
                className="btn primary"
                href="/pos"
                target="_blank"
                rel="noreferrer"
              >
                Abrir POS
              </a>
            </div>
          </div>
        </div>
        <div className={s.stack}>
          <div className="card">
            <CashCountForm
              denominations={denoms}
              onCount={handleCount}
              loading={busyCount}
              error={countErr}
              lastCount={lastCount}
            />
          </div>
          <div className="card">
            <div>
              <h2 className="h1">Cierre</h2>
              <div className="muted">
                El cierre requiere un arqueo final. Se usa el último arqueo.
              </div>
            </div>
            {closeErr && <div className={s.error}>{closeErr}</div>}
            <button
              className="btn danger"
              onClick={handleClose}
              disabled={busyClose}
            >
              {busyClose ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

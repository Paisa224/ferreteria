import { useEffect, useMemo, useState } from "react";
import {
  addCashMovement,
  closeCashSession,
  countCash,
  getCashSummary,
  listCashMovements,
  listCashRegisters,
  listDenominations,
  myOpenSession,
  openCashSession,
} from "../modules/cash/cash.api";
import type {
  CashCount,
  CashMovement,
  CashRegister,
  CashSession,
  CashSummary,
} from "../modules/cash/cash.types";
import { CashOpenForm } from "../modules/cash/CashOpenForm";
import { CashMovements } from "../modules/cash/CashMovements";
import { CashCountForm } from "../modules/cash/CashCountForm";
import { CashSummaryCard } from "../modules/cash/CashSummaryCard";
import { formatDateTime, formatMoney } from "../modules/cash/cash.utils";
import s from "./CashPage.module.css";

function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  if (err?.response?.status === 409) {
    return "Ya existe una sesión abierta. Favor cerrar antes de abrir otra.";
  }
  return "Ocurrió un error. Intentá nuevamente.";
}

export default function CashPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [lastCount, setLastCount] = useState<CashCount | null>(null);
  const [denoms, setDenoms] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [busyOpen, setBusyOpen] = useState(false);
  const [busyMove, setBusyMove] = useState(false);
  const [busyCount, setBusyCount] = useState(false);
  const [busyClose, setBusyClose] = useState(false);

  const [moveErr, setMoveErr] = useState<string | null>(null);
  const [countErr, setCountErr] = useState<string | null>(null);
  const [closeErr, setCloseErr] = useState<string | null>(null);

  const registerLabel = useMemo(() => {
    if (!session) return "-";
    return session.cashRegister?.name ?? `Caja #${session.cash_register_id}`;
  }, [session]);

  async function bootstrap() {
    setLoading(true);
    setErr(null);
    try {
      const [registerData, sessionData, denomData] = await Promise.all([
        listCashRegisters().catch(() => []),
        myOpenSession(),
        listDenominations().catch(() => [
          1000, 2000, 5000, 10000, 20000, 50000, 100000,
        ]),
      ]);
      setRegisters(registerData);
      setSession(sessionData);
      setDenoms(denomData);
      if (sessionData && (sessionData as any).id != null) {
        const sessionId = Number((sessionData as any).id);
        if (sessionId && !Number.isNaN(sessionId)) {
          const [sum, movs] = await Promise.all([
            getCashSummary(sessionId),
            listCashMovements(sessionId),
          ]);
          setSummary(sum);
          setMovements(movs);
        } else {
          setSummary(null);
          setMovements([]);
          setLastCount(null);
        }
      } else {
        setSummary(null);
        setMovements([]);
        setLastCount(null);
      }
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function handleOpen(dto: {
    cash_register_id: number;
    opening_amount: number;
  }) {
    setBusyOpen(true);
    setErr(null);
    try {
      const data = await openCashSession(dto);

      const sessionId = Number((data as any)?.id);
      if (!sessionId || Number.isNaN(sessionId)) {
        setErr("El backend no devolvió un id de sesión válido al abrir caja.");
        return;
      }

      setSession(data);

      const [sum, movs] = await Promise.all([
        getCashSummary(sessionId),
        listCashMovements(sessionId),
      ]);
      setSummary(sum);
      setMovements(movs);
      setLastCount(null);
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setBusyOpen(false);
    }
  }

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
      setLastCount(data);
      const sum = await getCashSummary(session.id);
      setSummary(sum);
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
      setCloseErr("Primero hacé un arqueo para cerrar la sesión.");
      return;
    }
    const ok = window.confirm("¿Cerrar la sesión de caja?");
    if (!ok) return;

    setBusyClose(true);
    try {
      await closeCashSession(session.id);
      setSession(null);
      setSummary(null);
      setMovements([]);
      setLastCount(null);
    } catch (e: any) {
      setCloseErr(parseError(e));
    } finally {
      setBusyClose(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <h1 className="h1">Caja</h1>
            <div className="muted">Apertura, movimientos, arqueo y cierre.</div>
          </div>
        </div>
        {err && <div className={s.error}>{err}</div>}
      </div>

      {loading ? (
        <div className="card">Cargando…</div>
      ) : !session ? (
        <div className="card">
          <CashOpenForm
            registers={registers}
            onOpen={handleOpen}
            loading={busyOpen}
            error={err}
          />
        </div>
      ) : (
        <div className={s.grid}>
          <div className={s.stack}>
            <div className="card">
              <div className={s.headerMeta}>
                <div className={s.metaItem}>
                  <div className={s.metaLabel}>Caja</div>
                  <div className={s.metaValue}>{registerLabel}</div>
                </div>
                <div className={s.metaItem}>
                  <div className={s.metaLabel}>Estado</div>
                  <div className={s.metaValue}>{session.status}</div>
                </div>
                <div className={s.metaItem}>
                  <div className={s.metaLabel}>Apertura</div>
                  <div className={s.metaValue}>
                    ₲ {formatMoney(session.opening_amount)}
                  </div>
                  <div className="muted">
                    {formatDateTime(session.opened_at)}
                  </div>
                </div>
              </div>
            </div>

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
                <h2 className="h1">Cerrar sesión</h2>
                <div className="muted">
                  Para cerrar se requiere arqueo. Se usa el último arqueo.
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
      )}
    </div>
  );
}

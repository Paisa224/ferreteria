import { useEffect, useState } from "react";
import {
  listCashRegisters,
  myOpenSession,
  openCashSession,
} from "../modules/cash/cash.api";
import type { CashRegister, CashSession } from "../modules/cash/cash.types";
import { CashOpenForm } from "../modules/cash/CashOpenForm";
import s from "./CashOpenPage.module.css";

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

export default function CashOpenPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [regs, mySession] = await Promise.all([
        listCashRegisters(),
        myOpenSession(),
      ]);
      setRegisters(regs);
      setSession(mySession);
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(dto: {
    cash_register_id: number;
    opening_amount: number;
  }) {
    setLoading(true);
    setErr(null);
    try {
      const data = await openCashSession(dto);

      const sid = Number((data as any)?.id);
      if (!sid || Number.isNaN(sid)) {
        setErr("El backend no devolvió un id de sesión válido al abrir caja.");
        return;
      }

      setSession(data);
      window.open(`/cash/session/${sid}`, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <h1 className="h1">Apertura de Caja</h1>
        <div className="muted">
          Seleccioná una caja activa para iniciar la sesión.
        </div>
        {err && <div className={s.error}>{err}</div>}
      </div>

      {session ? (
        <div className={`card ${s.notice}`}>
          Tenés una sesión abierta. Continuá en la caja activa.
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <a className="btn primary" href={`/cash/session/${session.id}`}>
              Ir a mi sesión
            </a>
            <button
              className="btn"
              onClick={() =>
                window.open(
                  `/cash/session/${session.id}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Abrir en nueva pestaña
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <CashOpenForm
            registers={registers}
            onOpen={handleOpen}
            loading={loading}
            error={err}
          />
        </div>
      )}
    </div>
  );
}

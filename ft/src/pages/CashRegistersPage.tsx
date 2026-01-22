import { useEffect, useState } from "react";
import {
  createCashRegister,
  listCashRegisters,
  updateCashRegister,
} from "../modules/cash/cash.api";
import type { CashRegister } from "../modules/cash/cash.types";
import s from "./CashRegistersPage.module.css";

function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error. Intentá nuevamente.";
}

export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listCashRegisters();
      setRegisters(data);
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setErr("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await createCashRegister(name.trim());
      setName("");
      await load();
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(register: CashRegister) {
    setLoading(true);
    setErr(null);
    try {
      await updateCashRegister(register.id, { is_active: !register.is_active });
      await load();
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div>
          <h1 className="h1">Administración de Cajas</h1>
          <div className="muted">Crear y activar/desactivar cajas.</div>
        </div>
        <div className={s.form}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de caja"
          />
          <button
            className="btn primary"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Guardando…" : "Crear caja"}
          </button>
        </div>
        {err && <div className={s.error}>{err}</div>}
      </div>

      <div className="card">
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {registers.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>
                  <span
                    className={`${s.badge} ${
                      r.is_active ? s.badgeActive : s.badgeInactive
                    }`}
                  >
                    {r.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td>
                  <button className="btn" onClick={() => handleToggle(r)}>
                    {r.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

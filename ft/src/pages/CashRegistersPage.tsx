import { useEffect, useMemo, useState } from "react";
import {
  createCashRegister,
  listCashRegisters,
} from "../modules/cash/cash.api";
import type { CashRegister } from "../modules/cash/cash.types";

function parseError(err: any) {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  if (msg?.message) return msg.message;
  return "Ocurrió un error.";
}

export default function CashRegistersPage() {
  const [items, setItems] = useState<CashRegister[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeCount = useMemo(
    () => items.filter((x) => x.is_active).length,
    [items],
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listCashRegisters();
      setItems(data);
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const clean = name.trim();
    if (clean.length < 2) {
      setErr("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setSaving(true);
    try {
      await createCashRegister({ name: clean });
      setName("");
      await load();
    } catch (e: any) {
      setErr(parseError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card">
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <h1 className="h1">Cajas</h1>
            <div className="muted">Creación y administración de cajas.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted">Activas</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {activeCount}/{items.length}
            </div>
          </div>
        </div>
        {err && (
          <div style={{ color: "var(--danger)", marginTop: 10 }}>{err}</div>
        )}
      </div>

      <div className="card">
        <form
          onSubmit={onCreate}
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <label style={{ flex: "1 1 260px" }}>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Caja Principal"'
            />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear caja"}
          </button>

          <button
            className="btn"
            type="button"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div>Cargando…</div>
        ) : items.length === 0 ? (
          <div className="muted">No hay cajas creadas.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td style={{ fontWeight: 800 }}>{r.name}</td>
                  <td>{r.is_active ? "Activa" : "Inactiva"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

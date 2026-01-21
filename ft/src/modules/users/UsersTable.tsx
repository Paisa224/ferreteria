// ft/src/modules/users/UsersTable.tsx
// Reemplazá el archivo completo por este (mantiene la UI "Nuevo usuario" igual,
// pero cambia "Roles" por "Editar" y dentro editás TODO: nombre, username, CI, pass, estado y roles)
import { useMemo, useState } from "react";
import type { Role, UpdateUserDto, UserListItem } from "./types";
import s from "./UsersPage.module.css";

function roleNames(u: UserListItem) {
  return (u.roles ?? []).map((r) => r.name).join(", ");
}

export function UsersTable({
  users,
  roles,
  onCreate,
  onToggleActive,
  onSetRoles,
  onUpdateFields,
}: {
  users: UserListItem[];
  roles: Role[];
  onCreate: (x: {
    name: string;
    username: string;
    ci: string;
    password: string;
    roleIds: number[];
  }) => Promise<void>;
  onToggleActive: (u: UserListItem) => Promise<void>;
  onSetRoles: (u: UserListItem, roleIds: number[]) => Promise<void>;
  onUpdateFields: (u: UserListItem, dto: UpdateUserDto) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [ci, setCi] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<UserListItem | null>(null);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return users;
    return users.filter((u) => {
      return (
        u.name.toLowerCase().includes(x) ||
        u.username.toLowerCase().includes(x) ||
        u.ci.toLowerCase().includes(x) ||
        roleNames(u).toLowerCase().includes(x)
      );
    });
  }, [users, q]);

  function toggleRoleSelected(id: number) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submitCreate() {
    setErr(null);
    try {
      if (!name.trim() || !username.trim() || !ci.trim() || !password.trim()) {
        setErr("Completa nombre, username, CI y contraseña");
        return;
      }
      await onCreate({
        name: name.trim(),
        username: username.trim(),
        ci: ci.trim(),
        password,
        roleIds,
      });
      setCreating(false);
      setName("");
      setUsername("");
      setCi("");
      setPassword("");
      setRoleIds([]);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error creando usuario");
    }
  }

  return (
    <div className="card">
      <div className={s.headerRow}>
        <div>
          <h2 className="h1">Usuarios</h2>
          <div className="muted">Alta, roles y activación</div>
        </div>

        <div className={s.headerActions}>
          <input
            className={s.input}
            placeholder="Buscar por nombre, username, CI o rol…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Cerrar" : "Nuevo usuario"}
          </button>
        </div>
      </div>

      {creating && (
        <div className={s.createBox}>
          <div className={s.formGrid}>
            <input
              className={s.input}
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={s.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className={s.input}
              placeholder="CI"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
            />
            <input
              className={s.input}
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={s.rolesBox}>
            <div className="muted" style={{ marginBottom: 8 }}>
              Roles
            </div>
            <div className={s.rolesGrid}>
              {roles.map((r) => (
                <label key={r.id} className={s.check}>
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={() => toggleRoleSelected(r.id)}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={s.footerRow}>
            <button className="btn" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={submitCreate}>
              Crear
            </button>
          </div>

          {err && (
            <div style={{ marginTop: 10, color: "var(--danger)" }}>{err}</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Username</th>
              <th>CI</th>
              <th>Roles</th>
              <th>Estado</th>
              <th style={{ width: 240 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                roles={roles}
                onToggleActive={onToggleActive}
                onSetRoles={onSetRoles}
                onEdit={() => setEditing(u)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="muted" style={{ marginTop: 12 }}>
            No hay usuarios para mostrar.
          </div>
        )}
      </div>

      {editing && (
        <EditUserModal
          u={editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSave={async (dto) => {
            await onUpdateFields(editing, dto);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function UserRow({
  u,
  roles,
  onToggleActive,
  onSetRoles,
  onEdit,
}: {
  u: UserListItem;
  roles: Role[];
  onToggleActive: (u: UserListItem) => Promise<void>;
  onSetRoles: (u: UserListItem, roleIds: number[]) => Promise<void>;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(() =>
    (u.roles ?? []).map((r) => r.id),
  );

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function saveRoles() {
    await onSetRoles(u, selected);
    setOpen(false);
  }

  return (
    <tr>
      <td>{u.id}</td>
      <td>{u.name}</td>
      <td>{u.username}</td>
      <td>{u.ci}</td>
      <td className={u.roles?.length ? "" : "muted"}>
        {u.roles?.length ? roleNames(u) : "-"}
      </td>
      <td>
        <span className={u.is_active ? s.badgeOk : s.badgeOff}>
          {u.is_active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td>
        <div className={s.rowBtns}>
          <button className="btn primary" onClick={onEdit}>
            Editar
          </button>
          <button
            className={`btn ${u.is_active ? "danger" : "primary"}`}
            onClick={() => onToggleActive(u)}
          >
            {u.is_active ? "Desactivar" : "Activar"}
          </button>
          <button className="btn" onClick={() => setOpen((v) => !v)}>
            Roles
          </button>

          {open && (
            <div className={s.pop}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Asignar roles
              </div>
              <div className={s.rolesGrid}>
                {roles.map((r) => (
                  <label key={r.id} className={s.check}>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
              <div className={s.footerRow} style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => setOpen(false)}>
                  Cerrar
                </button>
                <button className="btn primary" onClick={saveRoles}>
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditUserModal({
  u,
  roles,
  onClose,
  onSave,
}: {
  u: UserListItem;
  roles: Role[];
  onClose: () => void;
  onSave: (dto: UpdateUserDto) => Promise<void>;
}) {
  const [name, setName] = useState(u.name);
  const [username, setUsername] = useState(u.username);
  const [ci, setCi] = useState(u.ci);
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(u.is_active);
  const [selected, setSelected] = useState<number[]>(
    (u.roles ?? []).map((r) => r.id),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const dto: UpdateUserDto = {
        name: name.trim(),
        username: username.trim(),
        ci: ci.trim(),
        is_active: isActive,
        roleIds: selected,
      };
      if (password.trim()) dto.password = password;
      await onSave(dto);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error guardando usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 12, 16, 0.92)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
      onMouseDown={onClose}
    >
      <div
        className="card"
        style={{
          width: 760,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={s.headerRow}>
          <div>
            <h2 className="h1">Editar usuario</h2>
            <div className="muted">ID #{u.id}</div>
          </div>
          <div className={s.headerActions}>
            <button className="btn" onClick={onClose} disabled={saving}>
              Cerrar
            </button>
            <button className="btn primary" onClick={submit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "var(--danger)" }}>{err}</div>
        )}

        <div style={{ marginTop: 12 }} className={s.formGrid}>
          <input
            className={s.input}
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={s.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className={s.input}
            placeholder="CI"
            value={ci}
            onChange={(e) => setCi(e.target.value)}
          />
          <input
            className={s.input}
            placeholder="Nueva contraseña (opcional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Estado
          </div>
          <button
            className={`btn ${isActive ? "primary" : "danger"}`}
            onClick={() => setIsActive((v) => !v)}
            disabled={saving}
          >
            {isActive ? "Activo" : "Inactivo"}
          </button>
        </div>

        <div className={s.rolesBox} style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Roles
          </div>
          <div className={s.rolesGrid}>
            {roles.map((r) => (
              <label key={r.id} className={s.check}>
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <span>{r.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import type { Permission, Role, RoleWithPerms } from "./types";
import s from "./UsersPage.module.css";

const PERM_LABELS: Record<string, string> = {
  "users.manage": "Administrar usuarios y roles",

  "inventory.manage": "Administrar inventario",

  "cash.manage": "Administrar caja",
  "cash.open": "Abrir caja",
  "cash.close": "Cerrar caja",
  "cash.move": "Registrar movimientos de caja",
  "cash.count": "Arqueo / conteo de caja",

  "pos.sell": "Vender",
  "pos.refund": "Anular / devolución",
};

const GROUP_LABELS: Record<string, string> = {
  users: "Usuarios",
  inventory: "Inventario",
  cash: "Caja",
  pos: "Punto de venta",
  otros: "Otros",
};

function permLabel(key: string) {
  return PERM_LABELS[key] ?? key;
}

function groupLabel(prefix: string) {
  return GROUP_LABELS[prefix] ?? prefix;
}

function groupByPrefix(perms: Permission[]) {
  const map = new Map<string, Permission[]>();
  for (const p of perms) {
    const prefix = p.key.includes(".") ? p.key.split(".")[0] : "otros";
    const arr = map.get(prefix) ?? [];
    arr.push(p);
    map.set(prefix, arr);
  }

  return Array.from(map.entries())
    .map(
      ([prefix, arr]) =>
        [
          prefix,
          arr
            .slice()
            .sort((a, b) => permLabel(a.key).localeCompare(permLabel(b.key))),
        ] as const,
    )
    .sort((a, b) => groupLabel(a[0]).localeCompare(groupLabel(b[0])));
}

export function RolesEditor({
  roles,
  permissions,
  roleDetail,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  onSavePerms,
}: {
  roles: Role[];
  permissions: Permission[];
  roleDetail: RoleWithPerms | null;
  selectedRoleId: number | null;
  onSelectRole: (id: number) => void;
  onCreateRole: (name: string) => Promise<void>;
  onSavePerms: (roleId: number, keys: string[]) => Promise<void>;
}) {
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => groupByPrefix(permissions), [permissions]);

  const selectedKeys = useMemo(() => {
    return new Set((roleDetail?.permissions ?? []).map((p) => p.key));
  }, [roleDetail]);

  const [localKeys, setLocalKeys] = useState<string[]>([]);

  useMemo(() => {
    setLocalKeys(Array.from(selectedKeys));
  }, [selectedRoleId, roleDetail]);

  function toggleKey(k: string) {
    setLocalKeys((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  async function create() {
    if (!newRole.trim()) return;
    await onCreateRole(newRole.trim());
    setNewRole("");
  }

  async function save() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await onSavePerms(selectedRoleId, localKeys);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className={s.headerRow}>
        <div>
          <h2 className="h1">Roles y permisos</h2>
          <div className="muted">Control total del RBAC</div>
        </div>

        <div className={s.headerActions}>
          <input
            className={s.input}
            placeholder="Nuevo rol (ej: vendedor)"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <button className="btn primary" onClick={create}>
            Crear rol
          </button>
        </div>
      </div>

      <div className={s.rolesLayout}>
        <div className={s.rolesList}>
          {roles.map((r) => (
            <button
              key={r.id}
              className={`${s.roleBtn} ${selectedRoleId === r.id ? s.roleBtnActive : ""}`}
              onClick={() => onSelectRole(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div className={s.permsPanel}>
          {!selectedRoleId ? (
            <div className="muted">Seleccioná un rol para editar permisos.</div>
          ) : !roleDetail ? (
            <div className="muted">Cargando permisos del rol…</div>
          ) : (
            <>
              <div className={s.permsHeader}>
                <div>
                  <div className="h1" style={{ margin: 0 }}>
                    {roleDetail.name}
                  </div>
                  <div className="muted">Marcá los permisos permitidos</div>
                </div>
                <button
                  className="btn primary"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar permisos"}
                </button>
              </div>

              <div className={s.permsGroups}>
                {groups.map(([prefix, arr]) => (
                  <div key={prefix} className={s.permGroup}>
                    <div className={s.permGroupTitle}>{groupLabel(prefix)}</div>
                    <div className={s.rolesGrid}>
                      {arr.map((p) => (
                        <label key={p.id} className={s.check}>
                          <input
                            type="checkbox"
                            checked={localKeys.includes(p.key)}
                            onChange={() => toggleKey(p.key)}
                          />
                          <span>{permLabel(p.key)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

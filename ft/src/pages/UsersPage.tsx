import { useEffect, useState } from "react";
import s from "../modules/users/UsersPage.module.css";
import type {
  Permission,
  Role,
  RoleWithPerms,
  UserListItem,
} from "../modules/users/types";
import {
  createRole,
  createUser,
  getRole,
  listPermissions,
  listRoles,
  listUsers,
  setRolePermissions,
  updateUser,
} from "../modules/users/users.api";
import { UsersTable } from "../modules/users/UsersTable";
import { RolesEditor } from "../modules/users/RolesEditor";

export default function UsersPage() {
  const [tab, setTab] = useState<"users" | "roles">("users");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleDetail, setRoleDetail] = useState<RoleWithPerms | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [u, r, p] = await Promise.all([
        listUsers(),
        listRoles(),
        listPermissions(),
      ]);
      setUsers(u);
      setRoles(r);
      setPerms(p);
      if (!selectedRoleId && r.length) setSelectedRoleId(r[0].id);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error cargando usuarios/roles");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoleDetail(id: number) {
    setRoleDetail(null);
    try {
      const d = await getRole(id);
      setRoleDetail(d);
    } catch {}
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedRoleId) loadRoleDetail(selectedRoleId);
  }, [selectedRoleId]);

  async function onCreateUser(x: {
    name: string;
    username: string;
    ci: string;
    password: string;
    roleIds: number[];
  }) {
    await createUser(x);
    await loadAll();
  }

  async function onToggleActive(u: UserListItem) {
    await updateUser(u.id, { is_active: !u.is_active });
    await loadAll();
  }

  async function onSetRoles(u: UserListItem, roleIds: number[]) {
    await updateUser(u.id, { roleIds });
    await loadAll();
  }

  async function onCreateRole(name: string) {
    await createRole(name);
    await loadAll();
  }

  async function onSavePerms(roleId: number, keys: string[]) {
    await setRolePermissions(roleId, keys);
    await loadRoleDetail(roleId);
  }

  return (
    <div className={s.wrap}>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="h1">Usuarios y Roles</h1>
            <div className="muted">Administración de accesos (RBAC)</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className={`btn ${tab === "users" ? "primary" : ""}`}
              onClick={() => setTab("users")}
            >
              Usuarios
            </button>
            <button
              className={`btn ${tab === "roles" ? "primary" : ""}`}
              onClick={() => setTab("roles")}
            >
              Roles y permisos
            </button>
            <button className="btn" onClick={loadAll} disabled={loading}>
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "var(--danger)" }}>{err}</div>
        )}
      </div>

      {tab === "users" ? (
        <UsersTable
          users={users}
          roles={roles}
          onCreate={onCreateUser}
          onToggleActive={onToggleActive}
          onSetRoles={onSetRoles}
          onUpdateFields={async (u, dto) => {
            await updateUser(u.id, dto);
            await loadAll();
          }}
        />
      ) : (
        <RolesEditor
          roles={roles}
          permissions={perms}
          roleDetail={roleDetail}
          selectedRoleId={selectedRoleId}
          onSelectRole={setSelectedRoleId}
          onCreateRole={onCreateRole}
          onSavePerms={onSavePerms}
        />
      )}
    </div>
  );
}

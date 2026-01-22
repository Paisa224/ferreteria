import { NavLink } from "react-router-dom";
import { useAuthStore } from "../auth/auth.store";

function LinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
      end={to === "/"}
    >
      <span className="dot">•</span>
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const me = useAuthStore((s) => s.me);

  const perms = me?.permissions ?? [];
  const can = (perm: string) => perms.includes(perm);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">F</div>
        <div className="brand-meta">
          <div className="brand-title">Ferretería</div>
          <div className="brand-sub">{me?.username ?? "Cargando..."}</div>
        </div>
      </div>

      <nav className="nav">
        <LinkItem to="/" label="Dashboard" />

        {can("pos.sell") && <LinkItem to="/pos" label="POS Ventas" />}

        {(can("cash.open") || can("cash.count") || can("cash.close")) && (
          <LinkItem to="/cash" label="Apertura de Caja" />
        )}

        {can("cash.manage") && (
          <LinkItem to="/cash/registers" label="Creacion de Cajas" />
        )}

        {can("inventory.manage") && (
          <>
            <LinkItem to="/products" label="Productos" />
            <LinkItem to="/inventory" label="Inventario" />
          </>
        )}

        {can("users.manage") && (
          <LinkItem to="/users" label="Usuarios y Roles" />
        )}
      </nav>
    </aside>
  );
}

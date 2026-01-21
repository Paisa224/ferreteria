import { NavLink } from "react-router-dom";
import { useAuthStore } from "../auth/auth.store";

function LinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "active" : "")}
      end={to === "/"}
    >
      <span>•</span>
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const me = useAuthStore((s) => s.me)!;

  const can = (perm: string) => me.permissions.includes(perm);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">F</div>
        <div className="brand-meta">
          <div className="brand-title">Ferretería</div>
          <div className="brand-sub">{me.username}</div>
        </div>
      </div>

      <nav className="nav">
        <LinkItem to="/" label="Dashboard" />
        {can("pos.sell") && <LinkItem to="/pos" label="POS Ventas" />}
        {(can("cash.open") || can("cash.count") || can("cash.close")) && (
          <LinkItem to="/cash" label="Caja" />
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

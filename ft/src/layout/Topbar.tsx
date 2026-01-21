import { useAuthStore } from "../auth/auth.store";

export function Topbar() {
  const logout = useAuthStore((s) => s.logout);
  const me = useAuthStore((s) => s.me);

  return (
    <header className="topbar">
      <div className="muted">Sesión: {me?.username}</div>
      <button className="btn danger" onClick={logout}>
        Salir
      </button>
    </header>
  );
}

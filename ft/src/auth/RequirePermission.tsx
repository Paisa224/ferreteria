import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./auth.store";
import { hasPerm, hasAnyPerm } from "./perm";

export function RequirePermission({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const me = useAuthStore((s) => s.me);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading && !me) {
    return (
      <div className="card">
        <div className="h1">Cargando…</div>
        <div className="muted">Validando permisos</div>
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasPerm(me, perm)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function RequireAnyPermission({
  perms,
  children,
}: {
  perms: string[];
  children: React.ReactNode;
}) {
  const me = useAuthStore((s) => s.me);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading && !me) {
    return (
      <div className="card">
        <div className="h1">Cargando…</div>
        <div className="muted">Validando permisos</div>
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAnyPerm(me, perms)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

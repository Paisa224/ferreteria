import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../auth/auth.store";

export function ProtectedRoute({
  children,
  requiredAny,
}: {
  children: React.ReactNode;
  requiredAny?: string[];
}) {
  const location = useLocation();

  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.me);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!me) {
    return (
      <div className="card">
        <div className="h1">Cargando…</div>
        <div className="muted">Validando sesión</div>
      </div>
    );
  }

  if (requiredAny && requiredAny.length > 0) {
    const perms = me.permissions ?? [];
    const ok = requiredAny.some((p) => perms.includes(p));
    if (!ok) return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

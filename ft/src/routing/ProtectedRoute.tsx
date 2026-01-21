import { Navigate } from "react-router-dom";
import { useAuthStore } from "../auth/auth.store";

export function ProtectedRoute({
  children,
  requiredAny,
}: {
  children: React.ReactNode;
  requiredAny?: string[];
}) {
  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.me);

  if (!token) return <Navigate to="/login" replace />;

  if (!me) return <div style={{ padding: 24 }}>Cargando...</div>;

  if (requiredAny && requiredAny.length > 0) {
    const ok = requiredAny.some((p) => me.permissions?.includes(p));
    if (!ok) return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

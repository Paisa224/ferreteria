import { Navigate } from "react-router-dom";
import { useAuthStore } from "../auth/auth.store";

export function HomeRedirect() {
  const me = useAuthStore((s) => s.me);
  const perms = me?.permissions ?? [];
  const has = (perm: string) => perms.includes(perm);

  if (has("dashboard.view") || has("users.manage")) {
    return <Navigate to="/dashboard" replace />;
  }
  if (has("pos.sell")) {
    return <Navigate to="/pos" replace />;
  }
  if (has("cash.open") || has("cash.count") || has("cash.close")) {
    return <Navigate to="/cash/open" replace />;
  }
  if (has("inventory.manage")) {
    return <Navigate to="/inventory" replace />;
  }
  if (has("users.manage")) {
    return <Navigate to="/users" replace />;
  }

  return <Navigate to="/forbidden" replace />;
}

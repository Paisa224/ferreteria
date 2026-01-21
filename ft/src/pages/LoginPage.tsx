import { useState } from "react";
import { useAuthStore } from "../auth/auth.store";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234!");
  const [err, setErr] = useState<string | null>(null);

  async function onLogin() {
    setErr(null);
    try {
      await login(username, password);
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error de login");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, fontFamily: "sans-serif" }}>
      <h2>Login</h2>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
      />
      <div style={{ height: 8 }} />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
      />
      <div style={{ height: 12 }} />
      <button onClick={onLogin} disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
    </div>
  );
}

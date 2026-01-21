import { useMemo, useState } from "react";
import { useAuthStore } from "../auth/auth.store";
import s from "./LoginPage.module.css";

export default function LoginPage() {
  const login = useAuthStore((x) => x.login);
  const isLoading = useAuthStore((x) => x.isLoading);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234!");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !isLoading;
  }, [username, password, isLoading]);

  async function onLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);

    try {
      await login(username.trim(), password);
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Usuario o contraseña incorrectos");
    }
  }

  return (
    <div className={s.page}>
      <div className={s.bg} />

      <div className={s.card}>
        <div className={s.header}>
          <div className={s.brand}>
            <div className={s.logo}>F</div>
            <div>
              <div className={s.title}>FerreSistem</div>
              <div className={s.subtitle}>Acceso al sistema</div>
            </div>
          </div>
        </div>

        <form className={s.form} onSubmit={onLogin}>
          <div className={s.field}>
            <label className={s.label}>Usuario</label>
            <input
              className={s.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Contraseña</label>

            <div className={s.passWrap}>
              <input
                className={s.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
              />

              <button
                type="button"
                className={s.passBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {err && (
            <div className={s.errorBox} role="alert">
              <div className={s.errorTitle}>No se pudo iniciar sesión</div>
              <div className={s.errorMsg}>{err}</div>
            </div>
          )}

          <button className={s.submit} disabled={!canSubmit} type="submit">
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <div className={s.footer}>© {new Date().getFullYear()} Ferretería</div>
    </div>
  );
}

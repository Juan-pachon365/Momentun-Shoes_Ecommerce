import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { safeNext } from "@/lib/safeRedirect";
import { Seo } from "@/components/Seo";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "@/styles/Auth.module.scss";

export default function Ingresar() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const next = safeNext(router.query.next, "/cuenta");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await signIn(form.email.trim(), form.password);
      router.replace(next);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const nextQuery = router.query.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className={styles.wrap}>
      <Seo title="Ingresar" />
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Ingresar</h1>
        <p className={styles.subtitle}>Accede para guardar favoritos y comprar.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <Link href="/recuperar" className={styles.forgot}>
            ¿Olvidaste tu contraseña?
          </Link>
          <button className="btn btn-primary btn-block" disabled={sending}>
            {sending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className={styles.foot}>
          ¿No tienes cuenta? <Link href={`/registro${nextQuery}`}>Crea una</Link>
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { safeNext } from "@/lib/safeRedirect";
import { Seo } from "@/components/Seo";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "@/styles/Auth.module.scss";

export default function Registro() {
  const router = useRouter();
  const { signUp, user, loading } = useAuth();
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const next = safeNext(router.query.next, "/cuenta");

  useEffect(() => {
    if (!loading && user && !done) router.replace(next);
  }, [loading, user, next, router, done]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");

    setSending(true);
    try {
      const { needsConfirmation } = await signUp({
        email: form.email.trim(),
        password: form.password,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
      });
      if (needsConfirmation) {
        setDone(true);
        setSending(false);
      } else {
        router.replace(next);
      }
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className={styles.wrap}>
        <Seo title="Confirma tu correo" />
        <div className={`card ${styles.box}`}>
          <h1 className={styles.title}>Revisa tu correo</h1>
          <p className={styles.subtitle}>
            Te enviamos un enlace a <strong>{form.email}</strong> para confirmar tu cuenta. Después podrás ingresar.
          </p>
          <Link href="/ingresar" className="btn btn-primary btn-block">
            Ir a ingresar
          </Link>
        </div>
      </div>
    );
  }

  const nextQuery = router.query.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className={styles.wrap}>
      <Seo title="Crear cuenta" />
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Regístrate para comprar y guardar tus favoritos.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="firstname">Nombre</label>
              <input id="firstname" autoComplete="given-name" required value={form.firstname} onChange={set("firstname")} />
            </div>
            <div className="field">
              <label htmlFor="lastname">Apellido</label>
              <input id="lastname" autoComplete="family-name" required value={form.lastname} onChange={set("lastname")} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <PasswordInput id="password" autoComplete="new-password" required value={form.password} onChange={set("password")} />
            <span className="hint">Mínimo 6 caracteres</span>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <PasswordInput id="confirm" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} />
          </div>
          <button className="btn btn-primary btn-block" disabled={sending}>
            {sending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className={styles.foot}>
          ¿Ya tienes cuenta? <Link href={`/ingresar${nextQuery}`}>Ingresa</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Seo } from "@/components/Seo";
import styles from "@/styles/Auth.module.scss";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    });
    setSending(false);
    if (err) setError("No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
    else setSent(true);
  };

  return (
    <div className={styles.wrap}>
      <Seo title="Recuperar contraseña" />
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Recuperar contraseña</h1>
        <p className={styles.subtitle}>Te enviaremos un enlace para crear una nueva contraseña.</p>
        {error && <div className="form-error">{error}</div>}
        {sent ? (
          <div className="form-success">Si existe una cuenta con {email}, recibirás el enlace en tu correo.</div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" disabled={sending}>
              {sending ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}
        <p className={styles.foot}>
          <Link href="/ingresar">Volver a ingresar</Link>
        </p>
      </div>
    </div>
  );
}

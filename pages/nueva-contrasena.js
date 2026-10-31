import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Seo } from "@/components/Seo";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "@/styles/Auth.module.scss";

export default function NuevaContrasena() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    setSending(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSending(false);
    if (err) setError("No se pudo actualizar la contraseña. Solicita un nuevo enlace.");
    else router.replace("/cuenta");
  };

  return (
    <div className={styles.wrap}>
      <Seo title="Nueva contraseña" />
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Nueva contraseña</h1>
        {!loading && !user ? (
          <p className={styles.subtitle}>El enlace no es válido o ya expiró. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.</p>
        ) : (
          <>
            <p className={styles.subtitle}>Escribe tu nueva contraseña.</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="password">Nueva contraseña</label>
                <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={sending || loading}>
                {sending ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/Icons";
import styles from "./PasswordInput.module.scss";

// Campo de contraseña con botón para mostrar u ocultar lo que se escribe.
// Acepta las mismas props que un <input> (id, value, onChange, autoComplete, required...).
export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.wrap}>
      <input {...props} type={visible ? "text" : "password"} className={styles.input} />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

import { useState } from "react";

const EMPTY = {
  title: "",
  name: "",
  address: "",
  house_apartment: "",
  locality: "",
  city: "Bogotá D.C.",
  postal_code: "",
  phone: "",
};

export function AddressForm({ initial, onSubmit, onCancel, submitLabel = "Guardar dirección" }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[0-9+\s-]{7,15}$/.test(form.phone.trim())) {
      setError("Escribe un teléfono válido (solo números, 7 a 15 dígitos)");
      return;
    }
    setSending(true);
    try {
      const values = Object.fromEntries(
        Object.keys(EMPTY).map((k) => [k, (form[k] || "").toString().trim()])
      );
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field-row">
        <div className="field">
          <label htmlFor="a-title">Nombre de la dirección</label>
          <input id="a-title" placeholder="Casa, Oficina..." required value={form.title} onChange={set("title")} />
        </div>
        <div className="field">
          <label htmlFor="a-name">Quién recibe</label>
          <input id="a-name" autoComplete="name" required value={form.name} onChange={set("name")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="a-address">Dirección</label>
        <input id="a-address" autoComplete="address-line1" placeholder="Calle 123 # 45-67" required value={form.address} onChange={set("address")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="a-house">Apto, casa, torre (opcional)</label>
          <input id="a-house" autoComplete="address-line2" value={form.house_apartment} onChange={set("house_apartment")} />
        </div>
        <div className="field">
          <label htmlFor="a-locality">Barrio o localidad</label>
          <input id="a-locality" required value={form.locality} onChange={set("locality")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="a-city">Ciudad</label>
          <input id="a-city" autoComplete="address-level2" required value={form.city} onChange={set("city")} />
        </div>
        <div className="field">
          <label htmlFor="a-postal">Código postal (opcional)</label>
          <input id="a-postal" autoComplete="postal-code" inputMode="numeric" value={form.postal_code} onChange={set("postal_code")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="a-phone">Teléfono</label>
        <input id="a-phone" type="tel" autoComplete="tel" inputMode="tel" required value={form.phone} onChange={set("phone")} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={sending}>
          {sending ? "Guardando..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

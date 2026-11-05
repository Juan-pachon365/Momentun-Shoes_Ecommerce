import { useCiudades } from "@/hooks/useCiudades";

/** Lista de ciudades con envío. onChange recibe la ciudad completa ({ dane_code, name, department }) */
export function CiudadSelect({ id = "a-city", value, onChange, required = true }) {
  const ciudades = useCiudades();
  const principales = (ciudades || []).filter((c) => c.position < 100);
  const otras = (ciudades || []).filter((c) => c.position >= 100).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <select
      id={id}
      required={required}
      value={value || ""}
      disabled={!ciudades}
      onChange={(e) => onChange(ciudades.find((c) => c.dane_code === e.target.value) || null)}
    >
      <option value="" disabled>
        {ciudades ? "Elige tu ciudad" : "Cargando ciudades..."}
      </option>
      <optgroup label="Ciudades principales">
        {principales.map((c) => (
          <option key={c.dane_code} value={c.dane_code}>
            {c.name}
            {c.name !== c.department ? ` · ${c.department}` : ""}
          </option>
        ))}
      </optgroup>
      {otras.length > 0 && (
        <optgroup label="Otros municipios">
          {otras.map((c) => (
            <option key={c.dane_code} value={c.dane_code}>
              {c.name} · {c.department}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

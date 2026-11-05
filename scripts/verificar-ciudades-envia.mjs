// Revisa que Envia.com cotice a cada ciudad de la tabla shipping_cities.
// Uso:  node scripts/verificar-ciudades-envia.mjs
// Necesita en .env.local: ENVIA_API_KEY, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
// No imprime llaves: puedes pegar la salida en el chat.
import { cargarEnv, clienteSupabase } from "./_comun.mjs";

cargarEnv(["ENVIA_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const API = (process.env.ENVIA_API_URL || "https://api.envia.com").replace(/\/$/, "");
const QUERIES = (process.env.ENVIA_QUERIES_URL || "https://queries.envia.com").replace(/\/$/, "");
const headers = { Authorization: `Bearer ${process.env.ENVIA_API_KEY}`, "Content-Type": "application/json" };

// 1) Códigos de departamento que usa Envia para Colombia
try {
  const r = await fetch(`${QUERIES}/state?country_code=CO`, { headers });
  const j = await r.json();
  const lista = (j.data || j || []).map((s) => `${s.code_2_digits || s.code || s.abbreviation || "?"}=${s.name}`);
  console.log(`Departamentos según Envia (${lista.length}):\n${lista.join(" | ")}\n`);
} catch (e) {
  console.log("No pude leer los departamentos de Envia:", e.message, "\n");
}

// 2) Cotizar a cada ciudad con Interrapidísimo y Servientrega
const db = clienteSupabase();
const { data: ciudades, error } = await db.from("shipping_cities").select("*").order("position").order("name");
if (error) throw error;

const dir = (city, state, extra = {}) => ({
  name: "Prueba", company: "Momentum Shoes", email: "pruebas@momentumshoes.co", phone: "3000000000",
  street: "Calle 10", number: "1-1", district: "Centro", city, state, country: "CO", ...extra,
});

async function cotizar(c, carrier) {
  const res = await fetch(`${API}/ship/rate/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin: dir("11001000", "DC", { postalCode: "110111" }),
      destination: dir(c.dane_code, c.state_code, { postalCode: c.postal_code }),
      packages: [{ content: "Zapatos", amount: 1, type: "box", weight: 1, weightUnit: "KG", lengthUnit: "CM",
        insurance: 0, declaredValue: 200000, dimensions: { length: 33, width: 22, height: 12 } }],
      shipment: { type: 1, carrier },
      settings: { currency: "COP" },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (j.meta === "rate" && j.data?.length) return `$${Math.min(...j.data.map((d) => d.totalPrice)).toLocaleString("es-CO")}`;
  return `ERROR ${j.error?.message || res.status}`.slice(0, 90);
}

let fallas = 0;
for (const c of ciudades) {
  const [inter, servi] = await Promise.all([cotizar(c, "interrapidisimo"), cotizar(c, "servientrega")]);
  if (inter.startsWith("ERROR") && servi.startsWith("ERROR")) fallas++;
  console.log(`${c.name.padEnd(24)} ${c.state_code.padEnd(3)} ${c.postal_code} Inter: ${inter.padEnd(14)} Servi: ${servi}`);
}
console.log(`\nListo: ${ciudades.length} ciudades, ${fallas} sin ninguna cotización. Copia todo y pégalo en el chat.`);

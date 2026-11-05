// Prueba la API de Envia.com (modo pruebas) y muestra qué responde para Colombia.
// Uso (desde la carpeta del proyecto):  node scripts/probar-envia.mjs
// Necesita en .env.local:  ENVIA_API_KEY=...   (la llave del panel de pruebas de Envia)
// No imprime tu llave: puedes copiar y pegar la salida en el chat sin problema.
import { cargarEnv } from "./_comun.mjs";

cargarEnv(["ENVIA_API_KEY"]);
const KEY = process.env.ENVIA_API_KEY;
const API = process.env.ENVIA_API_URL || "https://api-test.envia.com";
const QUERIES = process.env.ENVIA_QUERIES_URL || "https://queries-test.envia.com";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function llamar(nombre, url, opciones = {}) {
  try {
    const res = await fetch(url, { headers, ...opciones });
    const texto = await res.text();
    let cuerpo;
    try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto; }
    console.log(`\n=== ${nombre} → HTTP ${res.status}`);
    console.log(JSON.stringify(cuerpo, null, 1).slice(0, 2500));
    return cuerpo;
  } catch (e) {
    console.log(`\n=== ${nombre} → ERROR DE CONEXIÓN: ${e.message}`);
  }
}

// 1) Transportadoras disponibles en Colombia
await llamar("Transportadoras en Colombia", `${QUERIES}/carrier?country_code=CO`);

// 2) Cotización Bogotá → Medellín de una caja de zapatos
const direccion = (city, state, postalCode, cityName) => ({
  name: "Prueba Momentum",
  company: "Momentum Shoes",
  email: "pruebas@momentum.test",
  phone: "3000000000",
  street: "Calle 10",
  number: "20-30",
  district: "Centro",
  city,
  state,
  country: "CO",
  postalCode,
  reference: cityName,
});

const base = {
  origin: direccion("11001000", "DC", "110111", "Bogotá"),
  destination: direccion("05001000", "AN", "050001", "Medellín"),
  packages: [
    {
      content: "Zapatos",
      amount: 1,
      type: "box",
      weight: 1,
      weightUnit: "KG",
      lengthUnit: "CM",
      insurance: 0,
      declaredValue: 200000,
      dimensions: { length: 35, width: 25, height: 13 },
    },
  ],
  shipment: { type: 1 },
  settings: { currency: "COP" },
};

await llamar("Cotización sin elegir transportadora", `${API}/ship/rate/`, { method: "POST", body: JSON.stringify(base) });

for (const carrier of ["interrapidisimo", "servientrega", "coordinadora", "tcc", "deprisa", "envia"]) {
  await llamar(`Cotización con ${carrier}`, `${API}/ship/rate/`, {
    method: "POST",
    body: JSON.stringify({ ...base, shipment: { type: 1, carrier } }),
  });
}

console.log("\nListo. Copia todo lo de arriba y pégalo en el chat.");

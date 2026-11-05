// Cotización de envíos con Envia.com (solo en el servidor: usa ENVIA_API_KEY).
// Cotizar no tiene costo; las guías las generas tú en el panel de Envia al despachar.

const API = (process.env.ENVIA_API_URL || "https://api.envia.com").replace(/\/$/, "");

// Transportadoras que se cotizan (nombre que entiende la API de Envia → nombre para el cliente)
export const TRANSPORTADORAS = {
  interrapidisimo: "Interrapidísimo",
  servientrega: "Servientrega",
  coordinadora: "Coordinadora",
  tcc: "TCC",
};

// Medidas de una caja de zapatos (cm y kg). Se pueden cambiar con ENVIA_CAJA="largo x ancho x alto x peso"
function caja() {
  const [l, w, h, kg] = String(process.env.ENVIA_CAJA || "33x22x12x1")
    .split("x")
    .map(Number);
  return { length: l || 33, width: w || 22, height: h || 12, weight: kg || 1 };
}

// Desde dónde despachas (los datos de calle solo se usan para cotizar)
function origen() {
  const e = process.env;
  return {
    name: e.ENVIA_ORIGEN_NOMBRE || "Momentum Shoes",
    company: "Momentum Shoes",
    email: e.ENVIA_ORIGEN_CORREO || "ventas@momentumshoes.co",
    phone: e.ENVIA_ORIGEN_TELEFONO || "3000000000",
    street: e.ENVIA_ORIGEN_DIRECCION || "Calle 10",
    number: e.ENVIA_ORIGEN_NUMERO || "1-1",
    district: e.ENVIA_ORIGEN_BARRIO || "Centro",
    city: e.ENVIA_ORIGEN_CIUDAD || "11001000",
    state: e.ENVIA_ORIGEN_DEPARTAMENTO || "DC",
    country: "CO",
    postalCode: e.ENVIA_ORIGEN_POSTAL || "110111",
  };
}

const cache = new Map(); // las cotizaciones se reutilizan 10 minutos (el pago vuelve a cotizar)
const DURACION = 10 * 60 * 1000;

async function cotizarCon(carrier, cuerpo) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${API}/ship/rate/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.ENVIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...cuerpo, shipment: { type: 1, carrier } }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!json || json.meta !== "rate" || !Array.isArray(json.data) || !json.data.length) return null;
    // De cada transportadora se ofrece su servicio más barato
    const mejor = json.data
      .filter((r) => Number(r.totalPrice) > 0)
      .sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice))[0];
    if (!mejor) return null;
    return {
      id: `${carrier}:${mejor.service}`,
      carrier,
      carrierName: TRANSPORTADORAS[carrier] || mejor.carrierDescription,
      service: mejor.service,
      serviceName: mejor.serviceDescription,
      price: Math.ceil(Number(mejor.totalPrice)),
      estimate: mejor.deliveryEstimate || "",
      date: mejor.deliveryDate?.date || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cotiza el envío de `pares` cajas de zapatos a una dirección.
 * destino: { cityCode, stateCode, postalCode, name, phone, address, locality }
 * Devuelve las opciones ordenadas por precio: [{ id, carrier, carrierName, service, serviceName, price, estimate, date }]
 */
export async function cotizarEnvio({ destino, pares, valor }) {
  if (!process.env.ENVIA_API_KEY) throw new Error("Falta ENVIA_API_KEY");
  const unidades = Math.max(1, Math.min(20, Math.round(pares)));
  const declarado = Math.round(valor / unidades);
  const llave = `${destino.cityCode}|${destino.postalCode || ""}|${unidades}|${Math.round(declarado / 10000)}`;
  const guardado = cache.get(llave);
  if (guardado && Date.now() - guardado.t < DURACION) return guardado.opciones;

  const b = caja();
  const cuerpo = {
    origin: origen(),
    destination: {
      name: destino.name || "Cliente",
      email: "cliente@momentumshoes.co",
      phone: String(destino.phone || "3000000000").replace(/\D/g, "").slice(-10),
      street: destino.address || "Calle 1",
      number: "1",
      district: destino.locality || "Centro",
      city: destino.cityCode,
      state: destino.stateCode || "",
      country: "CO",
      postalCode: destino.postalCode,
    },
    packages: [
      {
        content: "Zapatos",
        amount: unidades,
        type: "box",
        weight: b.weight,
        weightUnit: "KG",
        lengthUnit: "CM",
        insurance: 0,
        declaredValue: declarado,
        dimensions: { length: b.length, width: b.width, height: b.height },
      },
    ],
    settings: { currency: "COP" },
  };

  const resultados = await Promise.all(Object.keys(TRANSPORTADORAS).map((c) => cotizarCon(c, cuerpo)));
  const opciones = resultados.filter(Boolean).sort((a, b) => a.price - b.price);
  if (opciones.length) cache.set(llave, { t: Date.now(), opciones });
  return opciones;
}

/** Datos de destino a partir de una fila de addresses + su ciudad */
export async function destinoDeDireccion(admin, address) {
  if (!address?.city_code) return null;
  const { data: ciudad } = await admin
    .from("shipping_cities")
    .select("dane_code, state_code, postal_code, active")
    .eq("dane_code", address.city_code)
    .maybeSingle();
  if (!ciudad?.active) return null;
  return {
    cityCode: ciudad.dane_code,
    stateCode: ciudad.state_code,
    // Envia exige código postal; se usa el de la ciudad (verificado) para que un código mal escrito no bloquee la compra
    postalCode: ciudad.postal_code,
    name: address.name,
    phone: address.phone,
    address: address.address,
    locality: address.locality,
  };
}

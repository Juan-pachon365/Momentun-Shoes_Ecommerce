// ───────────────────────────────────────────────────────────────
// Datos de contacto y preguntas frecuentes de la tienda.
// Edita este archivo para cambiar lo que ven los clientes en el
// carrito ("¿Tienes dudas con tu pedido?") y en el chat de ayuda.
// Un campo vacío ("") simplemente no se muestra.
// ───────────────────────────────────────────────────────────────

export const CONTACTO = {
  asesor: "Juan David Pachón",
  cargo: "Asesor de ventas",
  // WhatsApp con indicativo de Colombia, solo números. Ej: "573001234567"
  whatsapp: "",
  correo: "",
  horario: "Lunes a sábado, 8:00 a. m. – 6:00 p. m.",
  instagram: "", // usuario sin @, ej: "momentumshoes"
};

export const BIENVENIDA =
  "¡Hola! Soy el asistente de Momentum Shoes 👟 Elige una pregunta o escríbeme tu duda.";

export const SIN_RESPUESTA =
  "No tengo una respuesta para eso todavía. Un asesor puede ayudarte directamente:";

// `claves`: palabras que ayudan a reconocer la pregunta cuando el cliente la escribe a su manera.
export const PREGUNTAS = [
  {
    pregunta: "¿Cuándo sale la nueva colección?",
    respuesta: "Cada semana está saliendo una nueva colección de zapatos, de todas las marcas y modelos.",
    claves: ["coleccion", "nuevo", "nueva", "lanzamiento", "sale", "salen", "llegan", "novedades"],
  },
  {
    pregunta: "¿El pago es contraentrega?",
    respuesta:
      "No. Los pagos se hacen mediante la página y el envío se cobra aparte una vez el pago sea aprobado. Uno de nuestros asesores se contactará contigo.",
    claves: ["contraentrega", "contra entrega", "pago", "pagar", "efectivo", "wompi", "tarjeta", "nequi", "pse"],
  },
  {
    pregunta: "¿El envío viene incluido en el precio?",
    respuesta:
      "El envío se paga aparte, al recibir el producto. Cuando tu pedido aparezca como «Enviado» en la página, nos contactaremos contigo para calcular el valor del envío según la cantidad de tenis que compraste.",
    claves: ["envio", "enviar", "domicilio", "precio del envio", "incluido", "flete", "despacho"],
  },
  {
    pregunta: "¿Pueden crear un diseño personalizado para mí?",
    respuesta:
      "¡Sí! Escríbenos con tu idea (modelo, colores, talla y cantidad) y un asesor revisa si es posible y te da el precio y el tiempo de entrega.",
    claves: ["personalizado", "personalizar", "diseño", "diseno", "custom", "a mi gusto", "propio"],
  },
  {
    pregunta: "¿Manejan pedidos al por mayor?",
    respuesta:
      "Sí, manejamos pedidos al por mayor. Escríbenos con los modelos, tallas y cantidades que necesitas y un asesor te enviará los precios especiales.",
    claves: ["mayor", "por mayor", "mayorista", "cantidad", "docena", "lote", "distribuidor", "negocio"],
  },
];

// ─── utilidades (no hace falta editarlas) ───

const normalizar = (t) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ");

/** Devuelve la pregunta frecuente que mejor coincide con lo que escribió el cliente, o null. */
export function buscarRespuesta(texto) {
  const t = ` ${normalizar(texto)} `;
  let mejor = null;
  let puntos = 0;
  for (const p of PREGUNTAS) {
    const score = p.claves.reduce((acc, c) => acc + (t.includes(normalizar(c)) ? c.length : 0), 0);
    if (score > puntos) {
      puntos = score;
      mejor = p;
    }
  }
  return mejor;
}

export function enlaceWhatsapp(mensaje = "") {
  if (!CONTACTO.whatsapp) return "";
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${CONTACTO.whatsapp}${texto}`;
}

export function telefonoLegible() {
  const n = CONTACTO.whatsapp.replace(/^57/, "");
  return n.length === 10 ? `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : `+${CONTACTO.whatsapp}`;
}

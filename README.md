# Momentum Shoes — Frontend

Tienda en Next.js 14 (Pages Router) + Supabase + Wompi.

## Puesta en marcha

```powershell
npm install
npm run dev
```

Abre http://localhost:3000

## Variables de entorno (`.env.local`)

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya configuradas |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API Keys > `service_role` (solo servidor) |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Wompi > Desarrolladores > Llave pública (`pub_test_...` en pruebas) |
| `WOMPI_INTEGRITY_SECRET` | Wompi > Desarrolladores > Secretos para integración técnica > Integridad |
| `WOMPI_EVENTS_SECRET` | Wompi > Desarrolladores > Secretos para integración técnica > Eventos |
| `NEXT_PUBLIC_SITE_URL` | URL del sitio (`http://localhost:3000` en local) |

Reinicia `npm run dev` después de cambiar `.env.local`.

## Páginas

- `/` inicio · `/catalogo` (filtros `categoria`, `marca`, `talla`, `q`, `orden`) · `/producto/[uid]`
- `/ingresar` · `/registro` · `/recuperar` · `/nueva-contrasena`
- `/favoritos` · `/carrito` · `/cuenta` (pedidos, direcciones, perfil) · `/pago/resultado`

## Flujo de pago

1. `/carrito` llama `POST /api/checkout`: valida sesión, dirección, stock y precios en el servidor,
   crea el pedido en `orders` (PENDING) y devuelve la URL firmada del Web Checkout de Wompi.
2. Wompi devuelve al cliente a `/pago/resultado?id=...`, que consulta `/api/wompi/verify`
   y actualiza el estado del pedido.
3. `POST /api/wompi/webhook` recibe los eventos de Wompi (firma verificada) y también actualiza el pedido.
   Configura en Wompi la URL de eventos: `https://TU-DOMINIO/api/wompi/webhook`.
4. Cuando el pedido pasa a `APPROVED`, el trigger `on_order_approved` de Supabase descuenta el stock.

## Estructura

```
components/   UI reutilizable (Layout, ProductCard, AddressForm, OrderCard...)
contexts/     Auth, Carrito (localStorage), Favoritos, Notificaciones
hooks/        useRequireAuth, useAddresses
lib/          supabase, catálogo, formato de precios, Wompi (servidor)
pages/        rutas y API routes
scss/ styles/ estilos globales y por página
```

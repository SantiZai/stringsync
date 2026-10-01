@AGENTS.md
# Encordados: app para casas de encordados

## Stack
Next.js (App Router, src/), TypeScript, Tailwind, shadcn/ui, Firebase (Auth, Firestore, Storage).

## Convenciones
- UI y textos en español rioplatense.
- Mobile-first.
- Componentes shadcn en `src/components/ui`; no modificarlos salvo necesidad.
- Formularios con react-hook-form + zod.
- Acceso a Firestore solo desde `src/lib/firestore/`, nunca directo en componentes.

## Modelo de datos
- Todos los documentos llevan `shopId` (multi-local desde el diseño).
- Los pedidos no se borran, se cancelan.
- Los datos de cliente y raqueta van desnormalizados en `orders`.

## Reglas de negocio
- Roles: admin, mostrador, encordador.
- Estados: recibido → en_cola → encordando → listo → entregado (o cancelado).
- Cada cambio de estado se registra en `statusHistory`.
- WhatsApp: envío manual con `wa.me`, lógica centralizada en `src/lib/whatsapp.ts`.
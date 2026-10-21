import type { MessageKey, Order, Shop } from "@/types";

// Normaliza a formato internacional para Argentina: 549 + área + número
export function normalizePhoneAR(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  // quita el "15" de móviles si viene después del código de área
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return `549${d}`;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${normalizePhoneAR(phone)}?text=${encodeURIComponent(text)}`;
}

type OrderMsg = Pick<Order, "customerName" | "racketLabel" | "number">;

export interface MessageDef {
  label: string;
  description: string;
  placeholders: { key: string; hint: string }[];
  default: string;
}

// Fuente única de verdad de los mensajes al cliente: el texto por defecto y
// con qué variables se puede escribir. La UI de Configuración se arma con esto
// y los builders de abajo resuelven el texto del local (o el default).
export const MESSAGE_DEFS: Record<MessageKey, MessageDef> = {
  recibido: {
    label: "Pedido recibido",
    description: "Se envía cuando se crea un pedido nuevo.",
    placeholders: [
      { key: "cliente", hint: "Nombre del cliente" },
      { key: "raqueta", hint: "Marca y modelo de la raqueta" },
      { key: "direccion", hint: "Dirección de la sucursal" },
      { key: "pedido", hint: "Número de pedido" },
    ],
    default:
      "Hola {cliente}! Recibimos tu {raqueta} en {direccion}. Pedido #{pedido}. Te avisamos cuando esté lista.",
  },
  recordatorio: {
    label: "Recordatorio de retiro",
    description: "Recordatorio para pedidos que siguen esperando retiro.",
    placeholders: [
      { key: "cliente", hint: "Nombre del cliente" },
      { key: "raqueta", hint: "Marca y modelo de la raqueta" },
      { key: "direccion", hint: "Dirección de la sucursal" },
      { key: "pedido", hint: "Número de pedido" },
    ],
    default:
      "Hola {cliente}! Te recordamos que tu {raqueta} (pedido #{pedido}) sigue esperándote en {direccion}.",
  },
  listo: {
    label: "Pedido listo",
    description: "Se envía cuando el pedido pasa a listo para retirar.",
    placeholders: [
      { key: "cliente", hint: "Nombre del cliente" },
      { key: "raqueta", hint: "Marca y modelo de la raqueta" },
      { key: "direccion", hint: "Dirección de la sucursal" },
      { key: "pedido", hint: "Número de pedido" },
    ],
    default:
      "Hola {cliente}! Tu {raqueta} ya está lista para retirar en {direccion}. Pedido #{pedido}.",
  },
  comprobante: {
    label: "Comprobante",
    description: "Se envía junto con la imagen del comprobante del pedido.",
    placeholders: [
      { key: "cliente", hint: "Nombre del cliente" },
      { key: "pedido", hint: "Número de pedido" },
    ],
    default: "Hola {cliente}! Te dejo el comprobante de tu pedido #{pedido}.",
  },
  reencordado: {
    label: "Reencordado",
    description: "Aviso de que pasaron semanas desde el último encordado.",
    placeholders: [
      { key: "cliente", hint: "Nombre del cliente" },
      { key: "raqueta", hint: "Marca y modelo de la raqueta" },
      { key: "semanas", hint: "Semanas desde el último encordado" },
      { key: "local", hint: "Nombre del local" },
    ],
    default:
      "Hola {cliente}! Pasaron {semanas} semanas desde el último encordado de tu {raqueta}. Te esperamos en {local} para poner a punto tu raqueta.",
  },
};

export const MESSAGE_KEYS = Object.keys(MESSAGE_DEFS) as MessageKey[];

// Reemplaza {variable}; si no existe, la deja tal cual para que se note en la vista previa
export function renderTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

// Variables escritas en el texto que este mensaje no conoce (typo o de otro mensaje)
export function unknownPlaceholders(template: string, key: MessageKey): string[] {
  const known = new Set(MESSAGE_DEFS[key].placeholders.map((p) => p.key));
  const found = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((f) => !known.has(f)))];
}

// Texto efectivo de cada mensaje: el del local si lo personalizó, si no el default
export function messagesOf(shop?: Shop | null): Record<MessageKey, string> {
  const out = {} as Record<MessageKey, string>;
  for (const key of MESSAGE_KEYS) out[key] = shop?.messages?.[key] || MESSAGE_DEFS[key].default;
  return out;
}

// Lo que se guarda en shops.messages: solo lo que no sea el default (vacío = default)
export function messagesPayload(texts: Record<MessageKey, string>): Partial<Record<MessageKey, string>> {
  const out: Partial<Record<MessageKey, string>> = {};
  for (const key of MESSAGE_KEYS) {
    const t = texts[key].trim();
    if (t && t !== MESSAGE_DEFS[key].default) out[key] = t;
  }
  return out;
}

export function orderMessage(key: MessageKey, o: OrderMsg, shop?: Shop | null): string {
  return renderTemplate(messagesOf(shop)[key], {
    cliente: o.customerName,
    raqueta: o.racketLabel,
    pedido: o.number,
    direccion: shop?.address || "el local",
  });
}

export function reencordadoMessage(
  p: { customerName: string; racketLabel: string },
  localName: string,
  weeks: number,
  shop?: Shop | null
): string {
  return renderTemplate(messagesOf(shop).reencordado, {
    cliente: p.customerName,
    raqueta: p.racketLabel,
    semanas: weeks,
    local: localName,
  });
}

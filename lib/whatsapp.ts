import type { Order } from "@/types";

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

type OrderMsg = Pick<Order, "customerName" | "racketLabel" | "number">;

export const messages = {
  recibido: (o: OrderMsg, shop: string) =>
    `Hola ${o.customerName}! Recibimos tu ${o.racketLabel} en ${shop}. ` +
    `Pedido #${o.number}. Te avisamos cuando esté lista.`,
  listo: (o: OrderMsg, shop: string) =>
    `Hola ${o.customerName}! Tu ${o.racketLabel} ya está lista para retirar en ${shop}. ` +
    `Pedido #${o.number}.`,
  recordatorio: (o: OrderMsg, shop: string) =>
    `Hola ${o.customerName}! Te recordamos que tu ${o.racketLabel} (pedido #${o.number}) ` +
    `sigue esperándote en ${shop}.`,
  reencordado: (
    p: { customerName: string; racketLabel: string },
    shop: string,
    weeks: number
  ) =>
    `Hola ${p.customerName}! Pasaron ${weeks} semanas desde el último encordado de tu ${p.racketLabel}. ` +
    `¿Querés que te lo dejemos listo? Te esperamos en ${shop}.`,
};

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${normalizePhoneAR(phone)}?text=${encodeURIComponent(text)}`;
}
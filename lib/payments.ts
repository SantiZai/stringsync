import { DEFAULT_PAYMENT_METHODS } from "@/lib/constants";
import type { Order, Shop } from "@/types";

// Lo que falta cobrar de un pedido
export const balanceOf = (o: Pick<Order, "price" | "paidAmount">) =>
  Math.max(0, Math.round((o.price - o.paidAmount) * 100) / 100);

export function paymentMethodsOf(shop: Shop | null): string[] {
  return shop?.paymentMethods?.length ? shop.paymentMethods : DEFAULT_PAYMENT_METHODS;
}
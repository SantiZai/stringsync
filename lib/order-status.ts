import type { Order, OrderStatus } from "@/types";
import { startOfDay } from "date-fns";

export const statusMeta: Record<OrderStatus, { label: string; badge: string }> = {
  recibido: { label: "Recibido", badge: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  en_cola: { label: "En cola", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  encordando: { label: "Encordando", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  listo: { label: "Listo", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  entregado: { label: "Entregado", badge: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", badge: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export const boardStatuses: OrderStatus[] = ["recibido", "en_cola", "encordando", "listo"];

export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  recibido: "en_cola",
  en_cola: "encordando",
  encordando: "listo",
  listo: "entregado",
};

export const advanceLabel: Partial<Record<OrderStatus, string>> = {
  recibido: "Pasar a cola",
  en_cola: "Empezar a encordar",
  encordando: "Marcar como lista",
  listo: "Entregar",
};

export function isOverdue(o: Order): boolean {
  return (
    ["recibido", "en_cola", "encordando"].includes(o.status) &&
    o.promisedDate.toDate() < startOfDay(new Date())
  );
}
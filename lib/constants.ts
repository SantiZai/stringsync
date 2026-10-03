import type { StringingSpec } from "@/types";

export const DEFAULT_TENSION_UNIT: StringingSpec["tensionUnit"] = "lb";

export const DEFAULT_PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Mercado Pago"];

export const DEFAULT_MIN_STOCK = 2;

export const DEFAULT_REMINDER_WEEKS = 8;
export const REMINDER_SNOOZE_DAYS = 21; // después de avisar, no se vuelve a mostrar por 3 semanas
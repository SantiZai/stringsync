import { format } from "date-fns";
import { es } from "date-fns/locale";

export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export const formatDay = (d: Date) => format(d, "EEE d MMM", { locale: es });
export const formatDateTime = (d: Date) => format(d, "d/M HH:mm");

export const formatTime = (d: Date) => format(d, "HH:mm");

export const parseAmount = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
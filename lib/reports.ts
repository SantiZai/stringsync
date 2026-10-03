import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { stringLabel } from "@/lib/strings";
import { fold } from "@/lib/text";
import type { Order, StringItem } from "@/types";

/** `to` es exclusivo */
export interface Period {
  from: Date;
  to: Date;
}

export type PresetKey = "hoy" | "7d" | "mes" | "mes_pasado" | "3m" | "anio" | "custom";

export const presetLabels: Record<PresetKey, string> = {
  hoy: "Hoy",
  "7d": "Últimos 7 días",
  mes: "Este mes",
  mes_pasado: "Mes pasado",
  "3m": "Últimos 3 meses",
  anio: "Este año",
  custom: "Personalizado…",
};

export function presetRange(key: Exclude<PresetKey, "custom">, now = new Date()): Period {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (key) {
    case "hoy":
      return { from: today, to: tomorrow };
    case "7d":
      return { from: subDays(today, 6), to: tomorrow };
    case "mes":
      return { from: startOfMonth(today), to: tomorrow };
    case "mes_pasado":
      return { from: startOfMonth(subMonths(today, 1)), to: startOfMonth(today) };
    case "3m":
      return { from: startOfMonth(subMonths(today, 2)), to: tomorrow };
    case "anio":
      return { from: startOfYear(today), to: tomorrow };
  }
}

export function previousPeriod(p: Period): Period {
  const days = differenceInCalendarDays(p.to, p.from);
  return { from: subDays(p.from, days), to: p.from };
}

export function formatPeriod(p: Period) {
  const f = (d: Date) => format(d, "d MMM yyyy", { locale: es });
  return differenceInCalendarDays(p.to, p.from) <= 1 ? f(p.from) : `${f(p.from)} – ${f(subDays(p.to, 1))}`;
}

// ── Serie temporal
export type Granularity = "day" | "week" | "month";

export const granularityLabel: Record<Granularity, string> = {
  day: "por día",
  week: "por semana",
  month: "por mes",
};

export function granularityFor(p: Period): Granularity {
  const days = differenceInCalendarDays(p.to, p.from);
  return days <= 31 ? "day" : days <= 120 ? "week" : "month";
}

const bucketStart = (d: Date, g: Granularity) =>
  g === "day" ? startOfDay(d) : g === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);

const nextBucket = (d: Date, g: Granularity) =>
  g === "day" ? addDays(d, 1) : g === "week" ? addDays(d, 7) : addMonths(d, 1);

const bucketLabel = (d: Date, g: Granularity) =>
  g === "month" ? format(d, "MMM yy", { locale: es }) : format(d, "d/M");

export function bucketize(items: { date: Date; amount: number }[], p: Period) {
  const g = granularityFor(p);
  const map = new Map<number, number>();
  for (const i of items) {
    const k = bucketStart(i.date, g).getTime();
    map.set(k, (map.get(k) ?? 0) + i.amount);
  }
  const buckets: { label: string; amount: number }[] = [];
  for (let d = bucketStart(p.from, g); d < p.to; d = nextBucket(d, g)) {
    buckets.push({ label: bucketLabel(d, g), amount: map.get(d.getTime()) ?? 0 });
  }
  return { granularity: g, buckets };
}

// ── Clientes
export interface ClientRow {
  customerId: string;
  name: string;
  orders: number;
  total: number;
  last: Date;
}

export function summarizeClients(orders: Order[]): ClientRow[] {
  const map = new Map<string, ClientRow>();
  for (const o of orders) {
    if (o.status === "cancelado") continue;
    const at = o.createdAt.toDate();
    const row = map.get(o.customerId) ?? {
      customerId: o.customerId,
      name: o.customerName,
      orders: 0,
      total: 0,
      last: at,
    };
    row.orders += 1;
    row.total += o.price;
    if (at > row.last) row.last = at;
    map.set(o.customerId, row);
  }
  return [...map.values()];
}

// ── Cuerdas
export interface StringRow {
  key: string;
  label: string;
  uses: number;
  revenue: number;
  cost: number;
  hasCost: boolean; // solo si es del catálogo y tiene costo cargado
  inCatalog: boolean;
}

export function summarizeStrings(orders: Order[], catalog: StringItem[]) {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const map = new Map<string, StringRow>();
  let local = 0;
  let client = 0;

  for (const o of orders) {
    if (o.status === "cancelado") continue;
    if (o.spec.stringProvidedBy === "cliente") {
      client += 1;
      continue;
    }
    local += 1;

    const item = o.stringId ? byId.get(o.stringId) : undefined;
    const key = item ? item.id : `txt:${fold(o.spec.mainString)}`;
    const row = map.get(key) ?? {
      key,
      label: item ? stringLabel(item) : o.spec.mainString,
      uses: 0,
      revenue: 0,
      cost: 0,
      hasCost: !!item && item.costPrice > 0,
      inCatalog: !!item,
    };
    row.uses += 1;
    row.revenue += o.stringPrice;
    if (item) row.cost += item.costPrice;
    map.set(key, row);
  }

  return { rows: [...map.values()], local, client };
}
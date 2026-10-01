import { DEFAULT_MIN_STOCK } from "@/lib/constants";
import type { StringItem, StringStock, StringView } from "@/types";

export const stringLabel = (s: Pick<StringItem, "brand" | "model" | "gauge">) =>
  [s.brand, s.model, s.gauge].filter(Boolean).join(" ");

export type StockLevel = "sin_stock" | "bajo" | "ok";

export function stockLevel(s: Pick<StringView, "stock" | "minStock">): StockLevel {
  if (s.stock <= 0) return "sin_stock";
  if (s.stock <= s.minStock) return "bajo";
  return "ok";
}

export const stockMeta: Record<StockLevel, { label: string; badge: string }> = {
  ok: { label: "En stock", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  bajo: { label: "Stock bajo", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  sin_stock: { label: "Sin stock", badge: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

// Une el catálogo (único de la organización) con el stock de la sucursal activa.
// Con shopId = null (admin viendo "Todas") suma el stock y el mínimo de todas las sucursales.
export function mergeStock(
  catalog: StringItem[],
  stocks: StringStock[],
  shopId: string | null
): StringView[] {
  return catalog.map((item) => {
    const rows = stocks.filter((r) => r.stringId === item.id);

    if (shopId) {
      const r = rows.find((x) => x.shopId === shopId);
      return {
        ...item,
        stock: r?.stock ?? 0,
        minStock: r?.minStock ?? DEFAULT_MIN_STOCK,
        salePrice: r?.salePrice ?? item.salePrice, // precio propio de la sucursal, si lo hay
        catalogPrice: item.salePrice,
      };
    }

    return {
      ...item,
      stock: rows.reduce((n, r) => n + r.stock, 0),
      minStock: rows.length ? rows.reduce((n, r) => n + r.minStock, 0) : DEFAULT_MIN_STOCK,
      catalogPrice: item.salePrice,
    };
  });
}
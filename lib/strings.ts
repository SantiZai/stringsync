import { DEFAULT_MIN_STOCK } from "@/lib/constants";
import type { StringItem, StringStock, StringView } from "@/types";

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
        salePrice: r?.salePrice ?? item.salePrice,
        catalogPrice: item.salePrice,
      };
    }

    // Todas las sucursales: se suma el stock y el mínimo
    return {
      ...item,
      stock: rows.reduce((n, r) => n + r.stock, 0),
      minStock: rows.length ? rows.reduce((n, r) => n + r.minStock, 0) : DEFAULT_MIN_STOCK,
      catalogPrice: item.salePrice,
    };
  });
}
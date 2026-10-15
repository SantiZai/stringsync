import { DEFAULT_MIN_STOCK } from "@/lib/constants";
import { fold } from "@/lib/text";
import type { StringItem, StringingSpec, StringStock, StringView } from "@/types";

export const stringLabel = (s: Pick<StringItem, "brand" | "model" | "gauge">) =>
  [s.brand, s.model, s.gauge].filter(Boolean).join(" ");

// Para mostrar en selectores y listas: agrega el color si hay, para distinguir
// dos cuerdas iguales que solo difieren en color. No se usa como identidad
// guardada (esa sigue siendo stringLabel, para no romper datos existentes).
export const stringLabelWithColor = (
  s: Pick<StringItem, "brand" | "model" | "gauge" | "color">
) => {
  const base = stringLabel(s);
  const color = s.color?.trim();
  return color ? `${base} · ${color}` : base;
};

// Resumen del encordado sin repetir: si principal y cruzada son iguales
// se muestra una sola vez (misma cuerda y/o misma tensión).
export function setupSummary(spec: Pick<StringingSpec, "mainString" | "crossString" | "mainTension" | "crossTension" | "tensionUnit">): string {
  const main = spec.mainString.trim();
  const cross = spec.crossString.trim();
  const sameString = fold(main) === fold(cross);
  const sameTension = spec.mainTension === spec.crossTension;
  if (sameString && sameTension) return `${main} · ${spec.mainTension} ${spec.tensionUnit}`;
  if (sameString) return `${main} · ${spec.mainTension}/${spec.crossTension} ${spec.tensionUnit}`;
  if (sameTension) return `${main} / ${cross} · ${spec.mainTension} ${spec.tensionUnit}`;
  return `${main} ${spec.mainTension} / ${cross} ${spec.crossTension} ${spec.tensionUnit}`;
}

// Busca la cuerda del catálogo para una configuración: primero por link (id),
// después por nombre (para raquetas guardadas antes del link).
export function matchCatalogString(
  catalog: StringView[],
  spec: { mainString: string; stringId?: string | null }
): StringView | undefined {
  if (spec.stringId) {
    const byId = catalog.find((x) => x.id === spec.stringId);
    if (byId) return byId;
  }
  const name = spec.mainString.trim();
  if (!name) return undefined;
  return catalog.find((x) => fold(stringLabel(x)) === fold(name));
}

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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// main: siempre en sets. detail: la equivalencia en rollos, si la cuerda tiene rollos.
export function formatStock(stock: number, setsPerRoll?: number) {
  const main = plural(stock, "set", "sets");
  if (!setsPerRoll || stock < setsPerRoll) return { main, detail: null as string | null };

  const rolls = Math.floor(stock / setsPerRoll);
  const rest = stock - rolls * setsPerRoll;
  const detail =
    rest > 0
      ? `${plural(rolls, "rollo", "rollos")} y ${plural(rest, "set", "sets")}`
      : plural(rolls, "rollo", "rollos");
  return { main, detail };
}

export const unitLabel = (unit: "set" | "rollo", n: number) =>
  unit === "set" ? plural(n, "set", "sets") : plural(n, "rollo", "rollos");
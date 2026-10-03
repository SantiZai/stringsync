"use client";

import { useMemo } from "react";

import { money } from "@/lib/format";
import { summarizeStrings } from "@/lib/reports";
import type { Order, StringItem } from "@/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  orders: Order[];
  catalog: StringItem[];
  isAdmin: boolean; // solo el admin ve costos y márgenes
}

export function StringsTab({ orders, catalog, isAdmin }: Props) {
  const { rows, local, client } = useMemo(() => summarizeStrings(orders, catalog), [orders, catalog]);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.uses - a.uses), [rows]);
  const maxUses = sorted[0]?.uses ?? 1;
  const totalJobs = local + client;
  const pct = (n: number) => (totalJobs ? `${Math.round((n / totalJobs) * 100)}%` : "0%");

  const kpis = [
    { label: "Encordados", value: String(totalJobs) },
    { label: "Cuerda del local", value: `${local} · ${pct(local)}` },
    { label: "Cuerda del cliente", value: `${client} · ${pct(client)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-3.5 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm font-semibold">Cuerdas más usadas</p>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No hay encordados con cuerda del local en este período.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.key} className="space-y-2 rounded-xl border bg-card p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.uses} encordado{r.uses === 1 ? "" : "s"}
                    {isAdmin && r.hasCost && ` · margen ${money(r.revenue - r.cost)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold">{money(r.revenue)}</span>
                  {!r.inCatalog && <Badge variant="outline">Fuera del catálogo</Badge>}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(r.uses / maxUses) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Las cuerdas “fuera del catálogo” se escribieron a mano en el pedido: no descuentan stock.
        Cargarlas en el catálogo te permite controlarlas.
      </p>
    </div>
  );
}
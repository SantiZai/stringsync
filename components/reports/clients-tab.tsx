"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { formatDay, money } from "@/lib/format";
import { summarizeClients, type Period } from "@/lib/reports";
import type { Customer, Order } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Sort = "total" | "orders";

interface Props {
  orders: Order[];
  customers: Customer[];
  period: Period;
}

export function ClientsTab({ orders, customers, period }: Props) {
  const [sort, setSort] = useState<Sort>("total");

  const rows = useMemo(() => summarizeClients(orders), [orders]);
  const top = useMemo(
    () =>
      [...rows]
        .sort((a, b) =>
          sort === "total" ? b.total - a.total : b.orders - a.orders || b.total - a.total
        )
        .slice(0, 20),
    [rows, sort]
  );

  const returning = rows.filter((r) => r.orders >= 2).length;
  const newCustomers = customers.filter((c) => {
    const d = c.createdAt?.toDate?.();
    return !!d && d >= period.from && d < period.to;
  }).length;

  const kpis = [
    { label: "Clientes atendidos", value: rows.length },
    { label: "Recurrentes", value: returning },
    { label: "Fichas nuevas", value: newCustomers },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-3.5 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Mejores clientes</p>
        <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <TabsList>
            <TabsTrigger value="total">Por gasto</TabsTrigger>
            <TabsTrigger value="orders">Por pedidos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {top.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No hay pedidos en este período.
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((r, i) => (
            <li key={r.customerId}>
              <Link
                href={`/clientes/${r.customerId}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.orders} pedido{r.orders === 1 ? "" : "s"} · última vez {formatDay(r.last)}
                  </p>
                </div>
                <span className="font-semibold">{money(r.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        “Fichas nuevas” cuenta los clientes dados de alta en el período, en toda la organización.
      </p>
    </div>
  );
}
"use client";

import { useMemo } from "react";

import { useShops } from "@/providers/shop-provider";
import { money } from "@/lib/format";
import { balanceOf } from "@/lib/payments";
import { bucketize, granularityLabel, type Period } from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { Order, Payment } from "@/types";
import { Bars } from "@/components/reports/bars";
import { BarChart } from "@/components/reports/bar-chart";

interface Props {
  payments: Payment[];
  prevPayments: Payment[];
  orders: Order[];
  period: Period;
  allBranches: boolean;
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function IncomeTab({ payments, prevPayments, orders, period, allBranches }: Props) {
  const { shops } = useShops();

  const valid = useMemo(() => payments.filter((p) => !p.voided), [payments]);
  const total = valid.reduce((n, p) => n + p.amount, 0);
  const prevTotal = prevPayments.filter((p) => !p.voided).reduce((n, p) => n + p.amount, 0);
  const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const active = orders.filter((o) => o.status !== "cancelado");
  const billed = active.reduce((n, o) => n + o.price, 0);
  const pending = active.reduce((n, o) => n + balanceOf(o), 0);
  const ticket = active.length ? billed / active.length : 0;

  const { buckets, granularity } = useMemo(
    () => bucketize(valid.map((p) => ({ date: p.createdAt.toDate(), amount: p.amount })), period),
    [valid, period]
  );

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of valid) map.set(p.method, (map.get(p.method) ?? 0) + p.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [valid]);

  const byShop = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of valid) {
      const name = shops.find((s) => s.id === p.shopId)?.name ?? "Sucursal";
      map.set(name, (map.get(name) ?? 0) + p.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [valid, shops]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Kpi
          label="Cobrado"
          value={money(total)}
          tone="text-primary"
          hint={
            delta === null ? (
              `${valid.length} cobros`
            ) : (
              <span className={delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% vs período anterior
              </span>
            )
          }
        />
        <Kpi label="Facturado" value={money(billed)} hint="Pedidos creados en el período" />
        <Kpi
          label="Pedidos"
          value={String(active.length)}
          hint={`Ticket promedio ${money(ticket)}`}
        />
        <Kpi label="Por cobrar" value={money(pending)} hint="Saldo de esos pedidos" />
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold">Cobrado {granularityLabel[granularity]}</p>
        <BarChart data={buckets} />
      </div>

      {allBranches && byShop.length > 1 && (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Por sucursal</p>
          <Bars rows={byShop} total={total} />
        </div>
      )}

      {byMethod.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Por medio de pago</p>
          <Bars rows={byMethod} total={total} />
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { subscribeOrdersWithBalance } from "@/lib/firestore/orders";
import { subscribePayments, voidPayment } from "@/lib/firestore/payments";
import { formatDay, formatTime, money } from "@/lib/format";
import { statusMeta } from "@/lib/order-status";
import { balanceOf } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { Order, Payment } from "@/types";
import { PageHeader } from "@/components/page-header";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isManager, isStaff } from "@/lib/roles";
import { useScope } from "@/providers/shop-provider";

type Tab = "cobros" | "pendientes";

export default function CajaPage() {
  const { appUser } = useAuth();
  const scope = useScope();
  const isAdmin = isManager(appUser?.role);

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [tab, setTab] = useState<Tab>("cobros");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentsError, setPaymentsError] = useState(false);

  const [pending, setPending] = useState<Order[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const [payId, setPayId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);

  useEffect(() => {
    if (!scope) return;
    setLoadingPayments(true);
    setPaymentsError(false);
    return subscribePayments(
      { orgId: scope.orgId, shopId: scope.shopId },
      day,
      addDays(day, 1),
      (list) => {
        setPayments(list);
        setLoadingPayments(false);
      },
      (e) => {
        console.error(e); // si falta el índice, acá aparece el link para crearlo
        setPaymentsError(true);
        setLoadingPayments(false);
      }
    );
  }, [scope?.orgId, scope?.shopId, day]);

  useEffect(() => {
    if (!scope) return;
    return subscribeOrdersWithBalance(
      { orgId: scope.orgId, shopId: scope.shopId },
      (list) => {
        setPending(list);
        setLoadingPending(false);
      }
    );
  }, [scope?.orgId, scope?.shopId]);

  const valid = useMemo(() => payments.filter((p) => !p.voided), [payments]);
  const total = valid.reduce((sum, p) => sum + p.amount, 0);
  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of valid) map.set(p.method, (map.get(p.method) ?? 0) + p.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [valid]);
  const pendingTotal = pending.reduce((sum, o) => sum + balanceOf(o), 0);

  const isToday = isSameDay(day, new Date());
  const payOrder = pending.find((o) => o.id === payId) ?? null;

  async function confirmVoid() {
    if (!voidTarget || !appUser) return;
    try {
      await voidPayment(appUser, voidTarget);
      toast.success("Cobro anulado");
    } catch {
      toast.error("No se pudo anular el cobro");
    } finally {
      setVoidTarget(null);
    }
  }

  if (!isStaff(appUser?.role)) {
    return <p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Caja" description={isToday ? "Hoy" : formatDay(day)} />

      {/* Selector de día */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Día anterior"
          onClick={() => setDay(addDays(day, -1))}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
        </Button>
        <div className="flex-1 rounded-lg border bg-card py-2 text-center text-sm font-medium capitalize">
          {formatDay(day)}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Día siguiente"
          disabled={isToday}
          onClick={() => setDay(addDays(day, 1))}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </Button>
        {!isToday && (
          <Button variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
            Hoy
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Cobrado en el día</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">{money(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {valid.length} cobro{valid.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{money(pendingTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pending.length} pedido{pending.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {byMethod.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Por medio de pago</p>
          {byMethod.map(([method, amount]) => (
            <div key={method} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{method}</span>
                <span className="font-medium">{money(amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(amount / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="cobros" className="flex-1">
            Cobros ({valid.length})
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="flex-1">
            Por cobrar ({pending.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Cobros del día */}
      {tab === "cobros" &&
        (loadingPayments ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : paymentsError ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No se pudo cargar la caja. Si es la primera vez, falta crear un índice en Firestore:
            abrí la consola del navegador, hacé clic en el link del error y esperá un par de minutos.
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No hay cobros registrados este día.
          </div>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      p.voided && "text-muted-foreground line-through"
                    )}
                  >
                    #{p.orderNumber} · {p.customerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTime(p.createdAt.toDate())} · {p.method} · {p.createdByName}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.voided ? (
                    <Badge className="border-0 bg-red-500/15 text-red-700 dark:text-red-300">
                      Anulado
                    </Badge>
                  ) : (
                    <span className="font-semibold">{money(p.amount)}</span>
                  )}
                  {isAdmin && !p.voided && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setVoidTarget(p)}
                    >
                      Anular
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}

      {/* Pedidos con saldo */}
      {tab === "pendientes" &&
        (loadingPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No hay pedidos con saldo pendiente.
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{o.number} · {o.customerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.racketLabel} · {statusMeta[o.status].label}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(balanceOf(o))}</p>
                    {o.paidAmount > 0 && (
                      <p className="text-xs text-muted-foreground">de {money(o.price)}</p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => setPayId(o.id)}>
                    Cobrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      <PaymentDialog order={payOrder} onClose={() => setPayId(null)} />

      <AlertDialog open={voidTarget !== null} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se anula el cobro de {voidTarget ? money(voidTarget.amount) : ""} del pedido #
              {voidTarget?.orderNumber}. El monto vuelve a figurar como pendiente y el cobro queda
              registrado como anulado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVoid}>Anular cobro</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
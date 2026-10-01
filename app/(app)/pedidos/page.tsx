"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/providers/auth-provider";
import { useActiveOrders } from "@/hooks/use-active-orders";
import { boardStatuses, isOverdue, statusMeta } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/types";
import { PageHeader } from "@/components/page-header";
import { OrderCard } from "@/components/orders/order-card";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isStaff } from "@/lib/roles";

function Empty() {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
      Sin pedidos
    </div>
  );
}

export default function PedidosPage() {
  const { appUser } = useAuth();
  const { orders, loading } = useActiveOrders();
  const [tab, setTab] = useState<OrderStatus>("recibido");
  const [openId, setOpenId] = useState<string | null>(null);

  const byStatus = (s: OrderStatus) => orders.filter((o) => o.status === s);
  const overdueCount = orders.filter(isOverdue).length;
  const opened: Order | null = orders.find((o) => o.id === openId) ?? null;
  const canCreate = isStaff(appUser?.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Pedidos"
        description={
          overdueCount > 0
            ? `${orders.length} en curso · ${overdueCount} atrasado${overdueCount > 1 ? "s" : ""}`
            : `${orders.length} en curso`
        }
        actions={
          canCreate && (
            <Link href="/pedidos/nuevo" className={buttonVariants()}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Nuevo pedido
            </Link>
          )
        }
      />

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Tablero en pantallas grandes */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-4">
            {boardStatuses.map((s) => (
              <div key={s} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{statusMeta[s].label}</h2>
                  <span className="text-xs text-muted-foreground">{byStatus(s).length}</span>
                </div>
                {byStatus(s).length === 0 ? (
                  <Empty />
                ) : (
                  byStatus(s).map((o) => (
                    <OrderCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} />
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Pestañas en celular y tablet */}
          <div className="space-y-4 lg:hidden">
            <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus)}>
              <TabsList className="w-full">
                {boardStatuses.map((s) => (
                  <TabsTrigger key={s} value={s} className="flex-1 text-xs sm:text-sm">
                    {statusMeta[s].label} ({byStatus(s).length})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="space-y-3">
              {byStatus(tab).length === 0 ? (
                <Empty />
              ) : (
                byStatus(tab).map((o) => (
                  <OrderCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} />
                ))
              )}
            </div>
          </div>
        </>
      )}

      <OrderDetailDialog order={opened} onClose={() => setOpenId(null)} />
    </div>
  );
}
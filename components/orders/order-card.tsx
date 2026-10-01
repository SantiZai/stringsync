"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import { updateOrderStatus } from "@/lib/firestore/orders";
import { formatDay, money } from "@/lib/format";
import { advanceLabel, isOverdue, nextStatus, statusMeta } from "@/lib/order-status";
import { messages, whatsappLink } from "@/lib/whatsapp";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const { appUser } = useAuth();
  const shop = useShop();
  const next = nextStatus[order.status];
  const overdue = isOverdue(order);
  const shopName = shop?.name ?? "el local";
  const unpaid = order.paymentStatus !== "pagado";

  async function advance() {
    if (!next || !appUser) return;
    try {
      await updateOrderStatus(order, next, appUser.uid);
      if (next === "listo") {
        const link = whatsappLink(order.customerPhone, messages.listo(order, shopName));
        toast.success(`Pedido #${order.number} lista`, {
          duration: 10000,
          action: { label: "Avisar por WhatsApp", onClick: () => window.open(link, "_blank") },
        });
      } else if (next === "entregado" && unpaid) {
        toast.warning(`El pedido #${order.number} se entregó con el pago pendiente`);
      }
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="block min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">#{order.number}</span>
            <span className="block truncate font-medium">{order.customerName}</span>
            <span className="block truncate text-sm text-muted-foreground">{order.racketLabel}</span>
          </span>
          <Badge className={`border-0 ${statusMeta[order.status].badge}`}>
            {statusMeta[order.status].label}
          </Badge>
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
            {overdue ? "Atrasado · " : "Entrega · "}
            {formatDay(order.promisedDate.toDate())}
          </span>
          <span className="text-muted-foreground">{money(order.price)}</span>
          {unpaid && <span className="font-medium text-amber-600 dark:text-amber-400">Sin cobrar</span>}
        </span>
      </button>

      <div className="flex gap-2">
        {next && appUser && (
          <Button size="sm" className="flex-1" onClick={advance}>
            {advanceLabel[order.status]}
          </Button>
        )}
        {order.status === "listo" && appUser?.role !== "encordador" && (
          <a
            href={whatsappLink(order.customerPhone, messages.listo(order, shopName))}
            target="_blank"
            rel="noreferrer"
            aria-label="Avisar por WhatsApp"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <HugeiconsIcon icon={WhatsappIcon} size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
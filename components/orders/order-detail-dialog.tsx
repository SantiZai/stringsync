"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useShopById } from "@/hooks/use-shop";
import { useStrings } from "@/hooks/use-strings";
import { cancelOrder } from "@/lib/firestore/orders";
import { formatDateTime, formatDay, money } from "@/lib/format";
import { statusMeta } from "@/lib/order-status";
import { orderMessage, whatsappLink } from "@/lib/whatsapp";
import { subscribeOrderPayments } from "@/lib/firestore/payments";
import { balanceOf } from "@/lib/payments";
import { matchCatalogString, stringLabelWithColor } from "@/lib/strings";
import { fold } from "@/lib/text";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import type { Order, Payment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isStaff } from "@/lib/roles";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function OrderDetailDialog({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  const { appUser } = useAuth();
  const shop = useShopById(order?.shopId)
  const { strings } = useStrings();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [returnStock, setReturnStock] = useState(true);

  const canManage = isStaff(appUser?.role);
  const [payOpen, setPayOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const orderId = order?.id;
  useEffect(() => {
    setPayments([]);
    if (!appUser || !orderId || !canManage) return;
    return subscribeOrderPayments(order.orgId, order.shopId, orderId, setPayments);
  }, [appUser, orderId, canManage]);

  async function cancel() {
    if (!order || !appUser) return;
    try {
      await cancelOrder(appUser, order, { returnStock: stockReturns.length > 0 && returnStock });
      toast.success("Pedido cancelado");
      onClose();
    } catch {
      toast.error("No se pudo cancelar");
    } finally {
      setConfirmCancel(false);
    }
  }

  // Al abrir la confirmación se sugiere devolver la cuerda solo si todavía
  // no se usó (recibido o en cola); si ya se encordó, probablemente se gastó.
  function openCancel() {
    setReturnStock(order ? ["recibido", "en_cola"].includes(order.status) : true);
    setConfirmCancel(true);
  }

  const shopName = shop?.name ?? "el local";
  const s = order?.spec;

  // La cuerda con su color si está en el catálogo (por link o por nombre)
  function stringColor(name: string, stringId?: string | null) {
    const m = matchCatalogString(strings, { mainString: name, stringId: stringId ?? null });
    return m ? stringLabelWithColor(m) : name;
  }

  // Cuerdas del catálogo que salieron del stock (se devuelven al cancelar)
  const stockReturns = order
    ? [
        ...(order.stringId ? [{ id: order.stringId, name: order.spec.mainString }] : []),
        ...(order.crossStringId && order.crossStringId !== order.stringId
          ? [{ id: order.crossStringId, name: order.spec.crossString }]
          : []),
      ]
    : [];

  return (
    <>
      <Dialog open={order !== null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {order && s && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Pedido #{order.number}
                  <Badge className={`border-0 ${statusMeta[order.status].badge}`}>
                    {statusMeta[order.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {order.customerName} · {order.racketLabel}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {/* Si principal y cruzada son iguales, va simple: una sola
                    cuerda y una sola tensión. Si difieren, cada una aparte. */}
                {fold(s.mainString) === fold(s.crossString) &&
                s.mainTension === s.crossTension ? (
                  <>
                    <Row label="Cuerda">{stringColor(s.mainString, order.stringId ?? s.stringId)}</Row>
                    <Row label="Tensión">
                      {s.mainTension} {s.tensionUnit}
                    </Row>
                  </>
                ) : (
                  <>
                    <Row label="Cuerda principal">
                      {stringColor(s.mainString, order.stringId ?? s.stringId)} · {s.mainTension}{" "}
                      {s.tensionUnit}
                    </Row>
                    <Row label="Cuerda cruzada">
                      {stringColor(s.crossString, order.crossStringId ?? s.crossStringId)} ·{" "}
                      {s.crossTension} {s.tensionUnit}
                    </Row>
                  </>
                )}
                {s.crossStringProvidedBy && s.crossStringProvidedBy !== s.stringProvidedBy ? (
                  <>
                    <Row label="Origen principal">
                      {s.stringProvidedBy === "local" ? "Del local" : "Del cliente"}
                    </Row>
                    <Row label="Origen cruzada">
                      {s.crossStringProvidedBy === "local" ? "Del local" : "Del cliente"}
                    </Row>
                  </>
                ) : (
                  <Row label="Origen">
                    {s.stringProvidedBy === "local" ? "Del local" : "Del cliente"}
                  </Row>
                )}
                {s.prestretch && <Row label="Pre-estiramiento">Sí</Row>}
                {s.notes && <Row label="Notas">{s.notes}</Row>}
                <Row label="Entrega prometida">{formatDay(order.promisedDate.toDate())}</Row>
              </div>

              <Separator />

              {canManage && payments.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Cobros</p>
                    {payments.map((p) => (
                      <p
                        key={p.id}
                        className={cn(
                          "flex justify-between text-sm text-muted-foreground",
                          p.voided && "line-through"
                        )}
                      >
                        <span>
                          {formatDateTime(p.createdAt.toDate())} · {p.method}
                        </span>
                        <span>{money(p.amount)}</span>
                      </p>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-2">
                <Row label="Mano de obra">{money(order.laborPrice)}</Row>
                {order.stringPrice > 0 && (
                  <Row label="Cuerda (precio)">{money(order.stringPrice)}</Row>
                )}
                <Row label="Total">{money(order.price)}</Row>
                <Row label="Pago">
                  {order.paymentStatus === "pagado"
                    ? "Pagado"
                    : order.paidAmount > 0
                      ? `Seña ${money(order.paidAmount)} · falta ${money(balanceOf(order))}`
                      : "Pendiente"}
                </Row>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Historial</p>
                {order.statusHistory.map((h, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {formatDateTime(h.at.toDate())} · {statusMeta[h.status].label}
                  </p>
                ))}
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={whatsappLink(
                      order.customerPhone,
                      orderMessage(order.status === "listo" ? "listo" : "recibido", order, shop)
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" />
                    WhatsApp
                  </a>
                  {balanceOf(order) > 0 && order.status !== "cancelado" && (
                    <Button size="sm" onClick={() => setPayOpen(true)}>
                      Registrar cobro
                    </Button>
                  )}
                  {!["entregado", "cancelado"].includes(order.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={openCancel}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                  <Link
                    href={`/pedidos/${order.id}/comprobante`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Comprobante
                  </Link>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el pedido #{order?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              El pedido sale del tablero pero queda registrado en el historial del cliente.
              {order && order.paidAmount > 0 &&
                ` Tiene cobros por ${money(order.paidAmount)}: si devolvés el dinero, pedile al administrador que los anule desde Caja.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {stockReturns.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
              <Checkbox
                id="return-stock"
                checked={returnStock}
                onCheckedChange={(c) => setReturnStock(c === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="return-stock" className="text-sm font-medium">
                  {stockReturns.length > 1
                    ? "Devolver las cuerdas al stock"
                    : "Devolver la cuerda al stock"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se suma{" "}
                  {stockReturns.map((r) => `1 set de ${stringColor(r.name, r.id)}`).join(" y ")} al
                  stock de {shopName}. Si la cuerda ya se usó, dejalo sin tildar.
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>Cancelar pedido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentDialog order={payOpen ? order : null} onClose={() => setPayOpen(false)} />
    </>
  );
}
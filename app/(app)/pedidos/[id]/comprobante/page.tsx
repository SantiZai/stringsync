"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShopById } from "@/hooks/use-shop";
import { subscribeOrderPayments } from "@/lib/firestore/payments";
import { formatDay, formatFull, money } from "@/lib/format";
import { balanceOf } from "@/lib/payments";
import { isStaff } from "@/lib/roles";
import { whatsappLink } from "@/lib/whatsapp";
import { APP_NAME } from "@/lib/brand";
import type { Order, Payment } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const Divider = () => <hr className="border-t border-dashed" />;

export default function ComprobantePage() {
  const { id } = useParams<{ id: string }>();
  const { appUser } = useAuth();
  const staff = isStaff(appUser?.role);

  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [payments, setPayments] = useState<Payment[]>([]);
  const shop = useShopById(order?.shopId);

  useEffect(
    () =>
      onSnapshot(
        doc(db, "orders", id),
        (snap) => setOrder(snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null),
        () => setOrder(null)
      ),
    [id]
  );

  const orgId = order?.orgId;
  const shopId = order?.shopId;
  useEffect(() => {
    if (!orgId || !shopId || !staff) return;
    return subscribeOrderPayments(orgId, shopId, id, setPayments);
  }, [orgId, shopId, id, staff]);

  if (!staff) {
    return <p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>;
  }

  if (order === undefined) return <Skeleton className="mx-auto h-96 w-full max-w-sm" />;

  if (order === null) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <p className="text-muted-foreground">No encontramos este pedido.</p>
        <Link href="/pedidos" className={buttonVariants({ variant: "outline" })}>
          Volver a pedidos
        </Link>
      </div>
    );
  }

  const s = order.spec;
  const paid = payments.filter((p) => !p.voided);
  const balance = balanceOf(order);
  const shopName = shop?.name ?? "StringSync";

  const summary = [
    `*${shopName}* · Pedido #${order.number}`,
    order.racketLabel,
    `Principal: ${s.mainString} · ${s.mainTension} ${s.tensionUnit}`,
    `Cruzada: ${s.crossString} · ${s.crossTension} ${s.tensionUnit}`,
    `Entrega: ${formatDay(order.promisedDate.toDate())}`,
    `Total: ${money(order.price)}`,
    balance > 0 ? `Saldo: ${money(balance)}` : "Pagado ✔",
  ].join("\n");

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link
          href="/pedidos"
          className="mr-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Pedidos
        </Link>
        <a
          href={whatsappLink(order.customerPhone, summary)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" />
          WhatsApp
        </a>
        <Button size="sm" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      <article className="receipt space-y-3 rounded-xl border bg-card p-5 text-sm shadow-sm">
        <header className="space-y-0.5 text-center">
          <h1 className="text-lg font-semibold">{shopName}</h1>
          {shop?.address && <p className="text-muted-foreground">{shop.address}</p>}
          {shop?.phone && <p className="text-muted-foreground">Tel. {shop.phone}</p>}
        </header>

        <Divider />

        <div className="space-y-1">
          <Row label="Pedido">#{order.number}</Row>
          <Row label="Fecha">{formatFull(order.createdAt.toDate())}</Row>
          <Row label="Cliente">{order.customerName}</Row>
        </div>

        <Divider />

        <div className="space-y-1">
          <Row label="Raqueta">{order.racketLabel}</Row>
          <Row label="Cuerda principal">
            {s.mainString} · {s.mainTension} {s.tensionUnit}
          </Row>
          <Row label="Cuerda cruzada">
            {s.crossString} · {s.crossTension} {s.tensionUnit}
          </Row>
          <Row label="Cuerda">{s.stringProvidedBy === "local" ? "Del local" : "Del cliente"}</Row>
          {s.prestretch && <Row label="Pre-estiramiento">Sí</Row>}
          {s.notes && <Row label="Notas">{s.notes}</Row>}
        </div>

        <Divider />

        <div className="space-y-1">
          <Row label="Mano de obra">{money(order.laborPrice)}</Row>
          {order.stringPrice > 0 && <Row label="Cuerda">{money(order.stringPrice)}</Row>}
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{money(order.price)}</span>
          </div>
        </div>

        {paid.length > 0 && (
          <>
            <Divider />
            <div className="space-y-1">
              {paid.map((p) => (
                <Row key={p.id} label={`${formatFull(p.createdAt.toDate())} · ${p.method}`}>
                  {money(p.amount)}
                </Row>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-between text-base font-semibold">
          <span>{balance > 0 ? "Saldo a pagar" : "Pagado"}</span>
          <span>{balance > 0 ? money(balance) : "✔"}</span>
        </div>

        <Divider />

        <p className="text-center font-medium">
          Entrega prometida: {formatDay(order.promisedDate.toDate())}
        </p>

        <footer className="space-y-0.5 pt-1 text-center text-xs text-muted-foreground">
          <p>¡Gracias por tu visita!</p>
          <p>Generado con {APP_NAME}</p>
        </footer>
      </article>
    </div>
  );
}
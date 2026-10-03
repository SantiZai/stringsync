"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { toBlob } from "html-to-image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShopById } from "@/hooks/use-shop";
import { subscribeOrderPayments } from "@/lib/firestore/payments";
import { formatDay, formatFull, money } from "@/lib/format";
import { balanceOf } from "@/lib/payments";
import { isStaff } from "@/lib/roles";
import { normalizePhoneAR } from "@/lib/whatsapp";
import { APP_NAME } from "@/lib/brand";
import type { Order, Payment } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Colores fijos: el comprobante se ve igual en pantalla, en el PDF y en la imagen
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const Divider = () => <hr className="border-t border-dashed border-neutral-400" />;

export default function ComprobantePage() {
  const { id } = useParams<{ id: string }>();
  const { appUser } = useAuth();
  const staff = isStaff(appUser?.role);

  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [payments, setPayments] = useState<Payment[]>([]);
  const shop = useShopById(order?.shopId);

  const receiptRef = useRef<HTMLElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const [busy, setBusy] = useState(false);

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

  const render = useCallback(async () => {
    const node = receiptRef.current;
    if (!node) return null;
    return toBlob(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  }, []);

  // Se prepara la imagen de antemano; se vuelve a generar si cambia el pedido o sus cobros
  useEffect(() => {
    if (!order) return;
    blobRef.current = null;
    const t = setTimeout(() => {
      render()
        .then((b) => (blobRef.current = b))
        .catch(() => (blobRef.current = null));
    }, 400);
    return () => clearTimeout(t);
  }, [order, payments, shop, render]);

  async function getFile() {
    const blob = blobRef.current ?? (await render());
    if (!blob || !order) throw new Error("no-image");
    return new File([blob], `comprobante-${order.number}.png`, { type: "image/png" });
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveImage() {
    setBusy(true);
    try {
      download(await getFile());
    } catch {
      toast.error("No se pudo generar la imagen");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    if (!order) return;
    setBusy(true);
    try {
      const file = await getFile();
      const text = `Hola ${order.customerName}! Te dejo el comprobante de tu pedido #${order.number}.`;

      // Celular: abre el menú de compartir con la imagen, y desde ahí se elige WhatsApp
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }

      // Computadora: se copia la imagen y se abre el chat para pegarla
      const chat = `https://wa.me/${normalizePhoneAR(order.customerPhone)}?text=${encodeURIComponent(text)}`;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
        window.open(chat, "_blank");
        toast.success("Imagen copiada. Pegala en el chat con Ctrl+V", { duration: 8000 });
      } catch {
        download(file);
        window.open(chat, "_blank");
        toast.success("Imagen descargada. Adjuntala en el chat", { duration: 8000 });
      }
    } catch (e) {
      // Si la persona cierra el menú de compartir, no es un error
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error("No se pudo preparar la imagen");
    } finally {
      setBusy(false);
    }
  }

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
  const shopName = shop?.name ?? APP_NAME;

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
        <Button size="sm" onClick={sendWhatsApp} disabled={busy}>
          <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" />
          {busy ? "Preparando…" : "Enviar por WhatsApp"}
        </Button>
        <Button variant="outline" size="sm" onClick={saveImage} disabled={busy}>
          Guardar imagen
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>

      <article
        ref={receiptRef}
        className="receipt space-y-3 rounded-xl border border-neutral-300 bg-white p-5 text-sm text-black shadow-sm"
      >
        <header className="space-y-0.5 text-center">
          <h1 className="text-lg font-semibold">{shopName}</h1>
          {shop?.address && <p className="text-neutral-600">{shop.address}</p>}
          {shop?.phone && <p className="text-neutral-600">Tel. {shop.phone}</p>}
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

        <footer className="space-y-0.5 pt-1 text-center text-xs text-neutral-600">
          <p>¡Gracias por tu visita!</p>
          <p>Generado con {APP_NAME}</p>
        </footer>
      </article>
    </div>
  );
}
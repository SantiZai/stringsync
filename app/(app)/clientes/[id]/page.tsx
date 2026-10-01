"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { subscribeCustomer } from "@/lib/firestore/customers";
import { deleteRacket, subscribeCustomerRackets } from "@/lib/firestore/rackets";
import { normalizePhoneAR } from "@/lib/whatsapp";
import type { Customer, Racket, Order } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { RacketFormDialog } from "@/components/customers/racket-form-dialog";

import { subscribeCustomerOrders } from "@/lib/firestore/orders";
import { formatDay, money } from "@/lib/format";
import { statusMeta } from "@/lib/order-status";
import { Badge } from "@/components/ui/badge";

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
import { isManager } from "@/lib/roles";
import { useScope } from "@/providers/shop-provider";

const sportLabels: Record<Racket["sport"], string> = {
  tenis: "Tenis",
  padel: "Pádel",
  squash: "Squash",
  badminton: "Bádminton",
};

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { appUser } = useAuth();

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [rackets, setRackets] = useState<Racket[]>([]);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [racketDialogOpen, setRacketDialogOpen] = useState(false);
  const [editingRacket, setEditingRacket] = useState<Racket | undefined>();

  const [racketToDelete, setRacketToDelete] = useState<Racket | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const orgId = appUser?.orgId;
  const scopeShopId = useScope()?.shopId ?? null;
  const isAdmin = isManager(appUser?.role);

  useEffect(() => {
    if (!orgId) return;
    return subscribeCustomerOrders({ orgId, shopId: scopeShopId }, id, setOrders);
  }, [orgId, scopeShopId, id]);

  useEffect(() => subscribeCustomer(id, setCustomer), [id]);

  useEffect(() => {
    if (!orgId) return;
    return subscribeCustomerRackets(orgId, id, setRackets);
  }, [orgId, id]);

  function openNewRacket() {
    setEditingRacket(undefined);
    setRacketDialogOpen(true);
  }

  function openEditRacket(r: Racket) {
    setEditingRacket(r);
    setRacketDialogOpen(true);
  }

  async function confirmDeleteRacket() {
    if (!racketToDelete) return;
    try {
      await deleteRacket(racketToDelete.id);
      toast.success("Raqueta eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    } finally {
      setRacketToDelete(null);
    }
  }

  if (customer === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (customer === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-muted-foreground">No encontramos este cliente.</p>
        <Link href="/clientes" className={buttonVariants({ variant: "outline" })}>
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        Clientes
      </Link>

      {/* Datos del cliente */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">{customer.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
            {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditingCustomer(true)}>
            <HugeiconsIcon icon={Edit02Icon} size={16} className="mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer.notes && <p className="whitespace-pre-line text-sm">{customer.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${normalizePhoneAR(customer.phone)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" />
              Abrir WhatsApp
            </a>
            <Link href={`/pedidos/nuevo?cliente=${customer.id}`} className={buttonVariants({ size: "sm" })}>
              Nuevo pedido
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Raquetas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Raquetas</h2>
          <Button size="sm" onClick={openNewRacket}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Agregar
          </Button>
        </div>

        {rackets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Este cliente todavía no tiene raquetas cargadas.
          </div>
        ) : (
          <ul className="space-y-3">
            {rackets.map((r) => (
              <li key={r.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.brand} {r.model}
                    </p>
                    <p className="text-xs text-muted-foreground">{sportLabels[r.sport]}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar raqueta"
                      onClick={() => openEditRacket(r)}
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={16} />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar raqueta"
                        onClick={() => setRacketToDelete(r)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                {r.usualSetup ? (
                  <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Principal:</span>{" "}
                      {r.usualSetup.mainString} · {r.usualSetup.mainTension} {r.usualSetup.tensionUnit}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Cruzada:</span>{" "}
                      {r.usualSetup.crossString} · {r.usualSetup.crossTension} {r.usualSetup.tensionUnit}
                    </p>
                    {r.usualSetup.notes && (
                      <p className="mt-1 text-muted-foreground">{r.usualSetup.notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Sin configuración habitual.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de encordados</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay pedidos.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{o.number} · {o.racketLabel}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDay(o.createdAt.toDate())} · {o.spec.mainString} {o.spec.mainTension}{" "}
                    {o.spec.tensionUnit}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm text-muted-foreground">{money(o.price)}</span>
                  <Badge className={`border-0 ${statusMeta[o.status].badge}`}>
                    {statusMeta[o.status].label}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerFormDialog
        open={editingCustomer}
        onOpenChange={setEditingCustomer}
        customer={customer}
      />
      <RacketFormDialog
        open={racketDialogOpen}
        onOpenChange={setRacketDialogOpen}
        customerId={customer.id}
        racket={editingRacket}
      />

      <AlertDialog
        open={racketToDelete !== null}
        onOpenChange={(o) => !o && setRacketToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar raqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar la {racketToDelete?.brand} {racketToDelete?.model} y su configuración
              habitual. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRacket}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
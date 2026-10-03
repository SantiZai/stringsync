"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useShops } from "@/providers/shop-provider";
import { setShopActive } from "@/lib/firestore/shops";
import { subscribeTeam } from "@/lib/firestore/team";
import { isAdmin } from "@/lib/roles";
import type { AppUser, Shop } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { MemberFormDialog } from "@/components/team/member-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function SucursalesPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { shops, loading, setActiveShopId } = useShops();
  const orgId = appUser?.orgId;
  const admin = isAdmin(appUser?.role);

  const [team, setTeam] = useState<AppUser[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | undefined>();
  const [managerShopId, setManagerShopId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Shop | null>(null);

  useEffect(() => {
    if (!orgId || !admin) return;
    return subscribeTeam({ orgId, role: "admin", shopId: null }, setTeam, () => setTeam([]));
  }, [orgId, admin]);

  function openForm(shop?: Shop) {
    setEditing(shop);
    setFormOpen(true);
  }

  function openManager(shop: Shop) {
    setManagerShopId(shop.id);
    setManagerOpen(true);
  }

  function viewTeam(shop: Shop) {
    setActiveShopId(shop.id);
    router.push("/configuracion/equipo");
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    const next = toggleTarget.active === false;
    try {
      await setShopActive(toggleTarget.id, next);
      toast.success(next ? "Sucursal activada" : "Sucursal desactivada");
    } catch {
      toast.error("No se pudo actualizar la sucursal");
    } finally {
      setToggleTarget(null);
    }
  }

  if (appUser && !admin) {
    return <p className="text-muted-foreground">Solo el administrador puede ver esta sección.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/configuracion"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        Ajustes
      </Link>

      <PageHeader
        title="Sucursales"
        description={`${shops.length} en tu organización`}
        actions={
          <Button onClick={() => openForm()}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Nueva sucursal
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Todavía no hay sucursales. Creá la primera con “Nueva sucursal”.
        </div>
      ) : (
        <ul className="space-y-3">
          {shops.map((s) => {
            const members = team.filter((m) => m.shopId === s.id && m.active !== false);
            const managers = members.filter((m) => m.role === "encargado");
            const inactive = s.active === false;

            return (
              <li key={s.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{s.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[s.address, s.phone].filter(Boolean).join(" · ") || "Sin dirección ni teléfono"}
                    </p>
                  </div>
                  {inactive && (
                    <Badge className="border-0 bg-red-500/15 text-red-700 dark:text-red-300">
                      Inactiva
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {managers.length > 0 ? (
                    <span>
                      <span className="text-muted-foreground">Encargado: </span>
                      <span className="font-medium">{managers.map((m) => m.name).join(", ")}</span>
                    </span>
                  ) : (
                    <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Sin encargado
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    · {members.length} integrante{members.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(s)}>
                    Editar
                  </Button>
                  {!inactive && (
                    <Button variant="outline" size="sm" onClick={() => openManager(s)}>
                      Nombrar encargado
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => viewTeam(s)}>
                    Ver equipo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={inactive ? undefined : "text-destructive"}
                    onClick={() => setToggleTarget(s)}
                  >
                    {inactive ? "Activar" : "Desactivar"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BranchFormDialog open={formOpen} onOpenChange={setFormOpen} shop={editing} shops={shops} />
      <MemberFormDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        defaultShopId={managerShopId}
        defaultRole="encargado"
      />

      <AlertDialog open={toggleTarget !== null} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.active === false ? "¿Activar" : "¿Desactivar"} {toggleTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.active === false
                ? "La sucursal vuelve a estar disponible para su equipo y para nuevos integrantes."
                : "Su equipo no va a poder operar y no se pueden sumar integrantes nuevos. Los pedidos, cobros y el stock quedan en el historial."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {toggleTarget?.active === false ? "Activar" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
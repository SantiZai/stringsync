"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useShops } from "@/providers/shop-provider";
import { subscribeTeam } from "@/lib/firestore/team";
import { updateMember } from "@/lib/team-api";
import { roleLabels } from "@/lib/navigation";
import { isManager } from "@/lib/roles";
import { initials } from "@/lib/text";
import type { AppUser } from "@/types";
import { PageHeader } from "@/components/page-header";
import { MemberFormDialog } from "@/components/team/member-form-dialog";
import { ResetPasswordDialog } from "@/components/team/reset-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export default function EquipoPage() {
  const { appUser } = useAuth();
  const { shops, activeShopId } = useShops();

  const orgId = appUser?.orgId;
  const role = appUser?.role;
  const ownShopId = appUser?.shopId ?? null;
  const isAdmin = role === "admin";

  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | undefined>();
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!orgId || !role) return;
    if (!isManager(role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    return subscribeTeam(
      { orgId, role, shopId: ownShopId },
      (list) => {
        setMembers(list);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setFailed(true);
        setLoading(false);
      }
    );
  }, [orgId, role, ownShopId]);

  const shopName = (id: string | null) =>
    id ? (shops.find((s) => s.id === id)?.name ?? "Sucursal") : "Todas las sucursales";

  // Con una sucursal elegida en el selector, se muestra solo su equipo
  const visible = useMemo(
    () => (activeShopId ? members.filter((m) => m.shopId === activeShopId) : members),
    [members, activeShopId]
  );

  function openForm(member?: AppUser) {
    setEditing(member);
    setFormOpen(true);
  }

  async function setActive(member: AppUser, active: boolean) {
    try {
      await updateMember({ action: "set_active", uid: member.uid, active });
      toast.success(active ? "Cuenta activada" : "Cuenta desactivada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la cuenta");
    } finally {
      setDeactivateTarget(null);
    }
  }

  if (appUser && !isManager(appUser.role)) {
    return <p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>;
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
        title="Equipo"
        description={
          isAdmin
            ? activeShopId
              ? `Equipo de ${shopName(activeShopId)}`
              : "Equipo de todas las sucursales"
            : `Equipo de ${shopName(ownShopId)}`
        }
        actions={
          <Button onClick={() => openForm()}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Nuevo integrante
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No se pudo cargar el equipo. Revisá que hayas publicado las reglas de Firestore y que tu
          usuario tenga <code>orgId</code>. El detalle está en la consola del navegador.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Todavía no hay integrantes en esta sucursal.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => {
            const isMe = m.uid === appUser?.uid;
            // El admin no se toca desde la app, y el encargado no gestiona a otros encargados
            const locked =
              isMe || m.role === "admin" || (role === "encargado" && m.role === "encargado");
            const inactive = m.active === false;

            return (
              <li key={m.uid} className="space-y-3 rounded-xl border bg-card p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {m.name}
                      {isMe && <span className="text-muted-foreground"> (vos)</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="secondary">{roleLabels[m.role]}</Badge>
                    <span className="text-xs text-muted-foreground">{shopName(m.shopId)}</span>
                  </div>
                </div>

                {(inactive || m.mustChangePassword || !locked) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {inactive && (
                      <Badge className="border-0 bg-red-500/15 text-red-700 dark:text-red-300">
                        Desactivada
                      </Badge>
                    )}
                    {m.mustChangePassword && (
                      <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        Falta que cambie la contraseña
                      </Badge>
                    )}
                    {!locked && (
                      <div className="ml-auto flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openForm(m)}>
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setResetTarget(m)}>
                          Contraseña
                        </Button>
                        {inactive ? (
                          <Button size="sm" onClick={() => setActive(m, true)}>
                            Activar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeactivateTarget(m)}
                          >
                            Desactivar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        defaultShopId={activeShopId}
      />
      <ResetPasswordDialog member={resetTarget} onClose={() => setResetTarget(null)} />

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pierde el acceso al instante y se cierran sus sesiones. Sus pedidos y cobros quedan en
              el historial, y podés reactivar la cuenta cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateTarget && setActive(deactivateTarget, false)}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
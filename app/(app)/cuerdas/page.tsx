"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Edit02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useStrings } from "@/hooks/use-strings";
import { setStringActive } from "@/lib/firestore/strings";
import { money } from "@/lib/format";
import { isStaff } from "@/lib/roles";
import { stockLevel, stockMeta, stringLabel } from "@/lib/strings";
import { fold } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { StringView } from "@/types";
import { PageHeader } from "@/components/page-header";
import { StockDialog } from "@/components/strings/stock-dialog";
import { StringFormDialog } from "@/components/strings/string-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "activas" | "alertas" | "archivadas";

export default function CuerdasPage() {
  const { appUser } = useAuth();
  const { strings, loading, shopId } = useStrings();
  const [tab, setTab] = useState<Tab>("activas");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StringView | undefined>();
  const [stockId, setStockId] = useState<string | null>(null);

  // Solo el admin edita el catálogo y ve los costos
  const isAdmin = appUser?.role === "admin";

  const active = strings.filter((s) => s.active);
  const lowCount = active.filter((s) => stockLevel(s) === "bajo").length;
  const outCount = active.filter((s) => stockLevel(s) === "sin_stock").length;
  const alerts = active.filter((s) => stockLevel(s) !== "ok");
  const archived = strings.filter((s) => !s.active);

  const base = tab === "activas" ? active : tab === "alertas" ? alerts : archived;
  const q = fold(search.trim());
  const list = q ? base.filter((s) => fold(`${stringLabel(s)} ${s.color}`).includes(q)) : base;

  const stockTarget = strings.find((s) => s.id === stockId) ?? null;

  function openForm(item?: StringView) {
    setEditing(item);
    setFormOpen(true);
  }

  async function toggleActive(s: StringView) {
    try {
      await setStringActive(s.id, !s.active);
      toast.success(s.active ? "Cuerda archivada" : "Cuerda restaurada");
    } catch {
      toast.error("No se pudo actualizar la cuerda");
    }
  }

  if (!isStaff(appUser?.role)) {
    return <p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Cuerdas"
        description={shopId ? "Catálogo y stock de esta sucursal" : "Catálogo y stock de todas las sucursales"}
        actions={
          isAdmin && (
            <Button onClick={() => openForm()}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Nueva cuerda
            </Button>
          )
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "En catálogo", value: active.length, tone: "" },
          {
            label: "Stock bajo",
            value: lowCount,
            tone: lowCount > 0 ? "text-amber-600 dark:text-amber-400" : "",
          },
          { label: "Sin stock", value: outCount, tone: outCount > 0 ? "text-destructive" : "" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-3.5 shadow-sm">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold tracking-tight", c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por marca, modelo o color"
          className="h-11 rounded-xl bg-card pl-9 shadow-sm"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="activas" className="flex-1">
            Activas ({active.length})
          </TabsTrigger>
          <TabsTrigger value="alertas" className="flex-1">
            Alertas ({alerts.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="archivadas" className="flex-1">
              Archivadas ({archived.length})
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          {strings.length === 0
            ? isAdmin
              ? "Todavía no cargaste cuerdas. Empezá con “Nueva cuerda”."
              : "Todavía no hay cuerdas cargadas. Pedile al administrador que arme el catálogo."
            : tab === "alertas"
              ? "No hay cuerdas con stock bajo. Todo en orden."
              : "No encontramos cuerdas."}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((s) => {
            const level = stockLevel(s);
            const details = [s.gauge, s.color].filter(Boolean).join(" · ");
            const customPrice = shopId !== null && s.salePrice !== s.catalogPrice;
            return (
              <li
                key={s.id}
                className={cn(
                  "space-y-3 rounded-xl border bg-card p-3.5 shadow-sm",
                  !s.active && "opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {s.brand} {s.model}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {details || "Sin detalles"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xl font-semibold leading-none">{s.stock}</span>
                    <Badge className={`border-0 ${stockMeta[level].badge}`}>
                      {stockMeta[level].label}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Venta {money(s.salePrice)}
                  {customPrice && " (precio de la sucursal)"}
                  {isAdmin && s.costPrice > 0 && ` · Costo ${money(s.costPrice)}`}
                </p>

                <div className="flex gap-2">
                  {s.active && (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!shopId}
                      onClick={() => setStockId(s.id)}
                    >
                      {shopId ? "Stock" : "Elegí una sucursal para mover stock"}
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      {s.active && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Editar cuerda"
                          onClick={() => openForm(s)}
                        >
                          <HugeiconsIcon icon={Edit02Icon} size={16} />
                        </Button>
                      )}
                      <Button
                        variant={s.active ? "ghost" : "outline"}
                        size="sm"
                        className={s.active ? "text-muted-foreground" : "flex-1"}
                        onClick={() => toggleActive(s)}
                      >
                        {s.active ? "Archivar" : "Restaurar"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StringFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <StockDialog item={stockTarget} shopId={shopId} onClose={() => setStockId(null)} />
    </div>
  );
}
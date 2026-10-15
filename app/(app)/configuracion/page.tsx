"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import { PageHeader } from "@/components/page-header";
import { PaymentMethodsCard } from "@/components/settings/payment-methods-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Analytics01Icon, Store01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { BranchRequired } from "@/components/branch-required";
import { SettingsLink } from "@/components/settings/settings-link";

const SPORT_KEYS = ["tenis", "squash", "badminton"] as const;

export default function ConfiguracionPage() {
  const { appUser } = useAuth();
  const shop = useShop();
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    const lp = shop.laborPrices ?? {};
    const first =
      lp.tenis ?? lp.squash ?? lp.badminton ?? "";
    setPrice(first === "" ? "" : String(first));
  }, [shop]);

  if (appUser && appUser.role !== "admin") {
    return <p className="text-muted-foreground">Solo el administrador puede ver esta sección.</p>;
  }

  async function save() {
    if (!appUser || !shop) return;
    const n = parseFloat(price.trim().replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Ingresá un valor válido para la mano de obra");
      return;
    }
    const laborPrices: Record<string, number> = {};
    for (const key of SPORT_KEYS) laborPrices[key] = n;
    setSaving(true);
    try {
      await updateDoc(doc(db, "shops", shop.id), { laborPrices });
      toast.success("Mano de obra guardada");
    } catch {
      toast.error("No se pudo guardar la mano de obra");
    } finally {
      setSaving(false);
    }
  }



  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Configuración" description={shop ? `Sucursal ${shop.name}` : "Todas las sucursales"} />

      <div className="space-y-3">
        <SettingsLink
          href="/reportes"
          icon={Analytics01Icon}
          title="Reportes"
          description="Ingresos, clientes y cuerdas por período"
        />
        <SettingsLink
          href="/configuracion/equipo"
          icon={UserGroupIcon}
          title="Equipo"
          description="Encargados, mostrador y encordadores"
        />
        {appUser?.role === "admin" && (
          <SettingsLink
            href="/configuracion/sucursales"
            icon={Store01Icon}
            title="Sucursales"
            description="Crear, editar y asignar encargados"
          />
        )}
      </div>

      {
        shop ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Mano de obra</h2>
                <p className="text-sm text-muted-foreground">
                  Se aplica a todos los deportes y pedidos de esta sucursal.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-labor">Valor de la mano de obra</Label>
                <div className="flex gap-2">
                  <Input
                    id="price-labor"
                    inputMode="decimal"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Button onClick={save} disabled={saving} className="shrink-0">
                    {saving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            </div>
            <PaymentMethodsCard />
          </div>
        ) : (
          <BranchRequired action="editar los precios de mano de obra y los medios de pago" />
        )
      }
    </div>
  );
}
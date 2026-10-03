"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import type { Sport } from "@/types";
import { PageHeader } from "@/components/page-header";
import { PaymentMethodsCard } from "@/components/settings/payment-methods-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Analytics01Icon, ArrowRight01Icon, Store01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { BranchRequired } from "@/components/branch-required";
import { SettingsLink } from "@/components/settings/settings-link";

const sports: { value: Sport; label: string }[] = [
  { value: "tenis", label: "Tenis" },
  { value: "padel", label: "Pádel" },
  { value: "squash", label: "Squash" },
  { value: "badminton", label: "Bádminton" },
];

export default function ConfiguracionPage() {
  const { appUser } = useAuth();
  const shop = useShop();
  const [prices, setPrices] = useState<Record<Sport, string>>({
    tenis: "",
    padel: "",
    squash: "",
    badminton: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setPrices({
      tenis: String(shop.laborPrices?.tenis ?? ""),
      padel: String(shop.laborPrices?.padel ?? ""),
      squash: String(shop.laborPrices?.squash ?? ""),
      badminton: String(shop.laborPrices?.badminton ?? ""),
    });
  }, [shop]);

  if (appUser && appUser.role !== "admin") {
    return <p className="text-muted-foreground">Solo el administrador puede ver esta sección.</p>;
  }

  async function save() {
    if (!appUser) return;
    const laborPrices: Record<string, number> = {};
    for (const s of sports) {
      const n = parseFloat(prices[s.value].replace(",", "."));
      if (Number.isFinite(n) && n >= 0) laborPrices[s.value] = n;
    }
    setSaving(true);
    try {
      // TODO: sacar el !
      await updateDoc(doc(db, "shops", shop!.id), { laborPrices });
      toast.success("Precios guardados");
    } catch {
      toast.error("No se pudieron guardar los precios");
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
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {sports.map((s) => (
                <div key={s.value} className="space-y-2">
                  <Label htmlFor={`price-${s.value}`}>{s.label}</Label>
                  <Input
                    id={`price-${s.value}`}
                    inputMode="decimal"
                    placeholder="0"
                    value={prices[s.value]}
                    onChange={(e) => setPrices((p) => ({ ...p, [s.value]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <PaymentMethodsCard />
          </div>
        ) : (
          <BranchRequired action="editar los precios de mano de obra y los medios de pago" />
        )
      }
    </div>
  );
}
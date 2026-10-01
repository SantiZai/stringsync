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
import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { BranchRequired } from "@/components/branch-required";

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

  if (!shop) return <BranchRequired action="crear un pedido" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Configuración" description="Precios y medios de pago" />

      <Link
        href="/configuracion/equipo"
        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={UserGroupIcon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Equipo</span>
          <span className="block text-sm text-muted-foreground">
            Cuentas de mostrador y encordadores
          </span>
        </span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-muted-foreground" />
      </Link>

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
      </div>
      <PaymentMethodsCard />
    </div>
  );
}
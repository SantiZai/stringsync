"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import { paymentMethodsOf } from "@/lib/payments";
import { fold } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_METHODS = 12;

export function PaymentMethodsCard() {
  const { appUser } = useAuth();
  const shop = useShop();
  const [methods, setMethods] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) setMethods(paymentMethodsOf(shop));
  }, [shop]);

  function add() {
    const name = input.trim();
    if (!name) return;
    if (methods.some((m) => fold(m) === fold(name))) return toast.error("Ese medio de pago ya existe");
    if (methods.length >= MAX_METHODS) return toast.error(`Máximo ${MAX_METHODS} medios de pago`);
    setMethods([...methods, name]);
    setInput("");
  }

  function remove(index: number) {
    if (methods.length === 1) return toast.error("Tiene que quedar al menos un medio de pago");
    setMethods(methods.filter((_, i) => i !== index));
  }

  async function save() {
    if (!appUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "shops", appUser.shopId), { paymentMethods: methods });
      toast.success("Medios de pago guardados");
    } catch {
      toast.error("No se pudieron guardar los medios de pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div>
        <h2 className="font-semibold">Medios de pago</h2>
        <p className="text-sm text-muted-foreground">
          Los que aparecen al registrar un cobro. Cambiarlos no modifica los cobros ya cargados.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {methods.map((m, i) => (
          <li
            key={m}
            className="flex items-center gap-1 rounded-full border bg-muted/60 py-1 pl-3 pr-1 text-sm"
          >
            {m}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Quitar ${m}`}
              onClick={() => remove(i)}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Label htmlFor="newMethod">Agregar medio de pago</Label>
        <div className="flex gap-2">
          <Input
            id="newMethod"
            placeholder="Ej: Cuenta DNI, Mercado Pago QR…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Agregar
          </Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
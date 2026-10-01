"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { createString, updateString } from "@/lib/firestore/strings";
import { parseAmount } from "@/lib/format";
import type { StringView } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isDecimal = (s: string) => /^\d+([.,]\d+)?$/.test(s.trim());

const schema = z
  .object({
    brand: z.string().trim().min(1, "Ingresá la marca"),
    model: z.string().trim().min(1, "Ingresá el modelo"),
    gauge: z.string().trim(),
    color: z.string().trim(),
    costPrice: z.string(),
    salePrice: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (!isDecimal(v.salePrice)) add("salePrice", "Ingresá el precio de venta");
    if (v.costPrice.trim() && !isDecimal(v.costPrice)) add("costPrice", "Monto inválido");
  });

type FormValues = z.infer<typeof schema>;

const empty: FormValues = {
  brand: "",
  model: "",
  gauge: "",
  color: "",
  costPrice: "",
  salePrice: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StringView; // si viene, es edición
}

export function StringFormDialog({ open, onOpenChange, item }: Props) {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
          brand: item.brand,
          model: item.model,
          gauge: item.gauge,
          color: item.color,
          costPrice: item.costPrice ? String(item.costPrice) : "",
          salePrice: String(item.catalogPrice), // el general, no el de una sucursal
        }
        : empty
    );
  }, [open, item, reset]);

  async function onSubmit(v: FormValues) {
    if (!appUser) return;
    const input = {
      brand: v.brand.trim(),
      model: v.model.trim(),
      gauge: v.gauge.trim(),
      color: v.color.trim(),
      costPrice: v.costPrice.trim() ? parseAmount(v.costPrice) : 0,
      salePrice: parseAmount(v.salePrice),
    };

    setSaving(true);
    try {
      if (item) await updateString(item.id, input);
      else await createString(appUser, input);
      toast.success(item ? "Cuerda actualizada" : "Cuerda agregada");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la cuerda");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar cuerda" : "Nueva cuerda"}</DialogTitle>
          <DialogDescription>
            El catálogo es el mismo para todas las sucursales. El stock se carga por sucursal desde
            la lista. Los precios son por set, o sea, por encordado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-brand">Marca</Label>
              <Input id="s-brand" placeholder="Babolat" {...register("brand")} />
              {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-model">Modelo</Label>
              <Input id="s-model" placeholder="RPM Blast" {...register("model")} />
              {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-gauge">Calibre</Label>
              <Input id="s-gauge" placeholder="1.25 mm" {...register("gauge")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-color">Color</Label>
              <Input id="s-color" placeholder="Negro" {...register("color")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-sale">Precio de venta</Label>
              <Input id="s-sale" inputMode="decimal" placeholder="0" {...register("salePrice")} />
              {errors.salePrice && (
                <p className="text-sm text-destructive">{errors.salePrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-cost">Costo (opcional)</Label>
              <Input id="s-cost" inputMode="decimal" placeholder="0" {...register("costPrice")} />
              {errors.costPrice && (
                <p className="text-sm text-destructive">{errors.costPrice.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
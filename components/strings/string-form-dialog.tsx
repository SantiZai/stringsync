"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isDecimal = (s: string) => /^\d+([.,]\d+)?$/.test(s.trim());
const isInt = (s: string) => /^\d+$/.test(s.trim());

const unitNames = { set: "Sets", rollo: "Rollos" } as const;

const schema = z
  .object({
    brand: z.string().trim().min(1, "Ingresá la marca"),
    model: z.string().trim().min(1, "Ingresá el modelo"),
    gauge: z.string().trim(),
    color: z.string().trim(),
    costPrice: z.string(),
    salePrice: z.string(),
    setsPerRoll: z.string(),
    stockUnit: z.enum(["set", "rollo"]),
    stock: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (!isDecimal(v.salePrice)) add("salePrice", "Ingresá el precio de venta");
    if (v.costPrice.trim() && !isDecimal(v.costPrice)) add("costPrice", "Monto inválido");
    if (v.stock.trim() && !isInt(v.stock)) add("stock", "Solo números enteros");

    const perRoll = v.setsPerRoll.trim();
    if (perRoll && (!isInt(perRoll) || parseInt(perRoll, 10) < 1)) {
      add("setsPerRoll", "Ingresá un número entero mayor a 0");
    }
    if (v.stock.trim() && v.stockUnit === "rollo" && !perRoll) {
      add("setsPerRoll", "Indicá cuántos sets rinde un rollo para cargar por rollo");
    }
  });

type FormValues = z.infer<typeof schema>;

const empty: FormValues = {
  brand: "",
  model: "",
  gauge: "",
  color: "",
  costPrice: "",
  salePrice: "",
  setsPerRoll: "",
  stockUnit: "set",
  stock: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StringView; // si viene, es edición
  shopId?: string | null; // sucursal activa, para cargar el stock inicial
  canSeeCost?: boolean; // solo el admin
}

export function StringFormDialog({ open, onOpenChange, item, shopId, canSeeCost = false }: Props) {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });

  const stockUnit = watch("stockUnit");
  const perRoll = watch("setsPerRoll");
  const stockQty = watch("stock");

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
          setsPerRoll: item.setsPerRoll ? String(item.setsPerRoll) : "",
          stockUnit: "set",
          stock: "",
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
      costPrice: canSeeCost && v.costPrice.trim() ? parseAmount(v.costPrice) : 0,
      salePrice: parseAmount(v.salePrice),
      setsPerRoll: v.setsPerRoll.trim() ? parseInt(v.setsPerRoll, 10) : null,
    };

    setSaving(true);
    try {
      if (item) {
        await updateString(item.id, input);
      } else {
        const units = v.stock.trim() ? parseInt(v.stock, 10) : 0;
        const sets = v.stockUnit === "rollo" ? units * (input.setsPerRoll ?? 0) : units;
        await createString(
          appUser,
          input,
          shopId && sets > 0 ? { shopId, unit: v.stockUnit, units, sets } : undefined
        );
      }
      toast.success(item ? "Cuerda actualizada" : "Cuerda agregada");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la cuerda");
    } finally {
      setSaving(false);
    }
  }

  const preview =
    stockUnit === "rollo" && isInt(stockQty) && isInt(perRoll) && parseInt(perRoll, 10) > 0
      ? `${stockQty} × ${perRoll} = ${parseInt(stockQty, 10) * parseInt(perRoll, 10)} sets`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar cuerda" : "Nueva cuerda"}</DialogTitle>
          <DialogDescription>
            El catálogo es el mismo para todas las sucursales. Los precios son por set, o sea, por
            encordado.
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
              <Label htmlFor="s-sale">Precio de venta (por set)</Label>
              <Input id="s-sale" inputMode="decimal" placeholder="0" {...register("salePrice")} />
              {errors.salePrice && (
                <p className="text-sm text-destructive">{errors.salePrice.message}</p>
              )}
            </div>
            {canSeeCost && (
              <div className="space-y-2">
                <Label htmlFor="s-cost">Costo por set (opcional)</Label>
                <Input id="s-cost" inputMode="decimal" placeholder="0" {...register("costPrice")} />
                {errors.costPrice && (
                  <p className="text-sm text-destructive">{errors.costPrice.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-roll">Sets por rollo (opcional)</Label>
            <Input id="s-roll" inputMode="numeric" placeholder="16" {...register("setsPerRoll")} />
            {errors.setsPerRoll ? (
              <p className="text-sm text-destructive">{errors.setsPerRoll.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cuántos encordados rinde un rollo. Completalo si comprás esta cuerda por rollo.
              </p>
            )}
          </div>

          {!item && shopId && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="s-stock">Stock inicial en esta sucursal</Label>
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <Input id="s-stock" inputMode="numeric" placeholder="0" {...register("stock")} />
                <Controller
                  control={control}
                  name="stockUnit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <SelectTrigger className="w-full" aria-label="Unidad">
                        <SelectValue>{unitNames[field.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Sets</SelectItem>
                        <SelectItem value="rollo">Rollos</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
              {preview && <p className="text-xs text-muted-foreground">{preview}</p>}
            </div>
          )}

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
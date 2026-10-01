"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { createRacket, updateRacket, type RacketInput } from "@/lib/firestore/rackets";
import type { Racket } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { DEFAULT_TENSION_UNIT } from "@/lib/constants";

const sportLabels = {
  tenis: "Tenis",
  padel: "Pádel",
  squash: "Squash",
  badminton: "Bádminton",
} as const;

const toNumber = (s: string) => parseFloat(s.replace(",", "."));

const schema = z
  .object({
    brand: z.string().trim().min(1, "Ingresá la marca"),
    model: z.string().trim().min(1, "Ingresá el modelo"),
    sport: z.enum(["tenis", "padel", "squash", "badminton"]),
    mainString: z.string(),
    sameCrossString: z.boolean(),
    crossString: z.string(),
    mainTension: z.string(),
    sameCrossTension: z.boolean(),
    crossTension: z.string(),
    tensionUnit: z.enum(["kg", "lb"]),
    notes: z.string().max(300),
  })
  .superRefine((v, ctx) => {
    if (!v.mainString.trim()) return; // sin cuerda = sin configuración habitual

    if (!(toNumber(v.mainTension) > 0)) {
      ctx.addIssue({ code: "custom", path: ["mainTension"], message: "Ingresá la tensión" });
    }
    if (!v.sameCrossString && !v.crossString.trim()) {
      ctx.addIssue({ code: "custom", path: ["crossString"], message: "Ingresá la cuerda cruzada" });
    }
    if (!v.sameCrossTension && !(toNumber(v.crossTension) > 0)) {
      ctx.addIssue({ code: "custom", path: ["crossTension"], message: "Ingresá la tensión cruzada" });
    }
  });

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  brand: "",
  model: "",
  sport: "tenis",
  mainString: "",
  sameCrossString: true,
  crossString: "",
  mainTension: "",
  sameCrossTension: true,
  crossTension: "",
  tensionUnit: DEFAULT_TENSION_UNIT,
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  racket?: Racket;
}

export function RacketFormDialog({ open, onOpenChange, customerId, racket }: Props) {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const sameCrossString = watch("sameCrossString");
  const sameCrossTension = watch("sameCrossTension");

  useEffect(() => {
    if (!open) return;
    const s = racket?.usualSetup;
    reset(
      s
        ? {
          brand: racket!.brand,
          model: racket!.model,
          sport: racket!.sport,
          mainString: s.mainString,
          sameCrossString: s.crossString === s.mainString,
          crossString: s.crossString === s.mainString ? "" : s.crossString,
          mainTension: String(s.mainTension),
          sameCrossTension: s.crossTension === s.mainTension,
          crossTension: s.crossTension === s.mainTension ? "" : String(s.crossTension),
          tensionUnit: s.tensionUnit,
          notes: s.notes ?? "",
        }
        : {
          ...emptyValues,
          brand: racket?.brand ?? "",
          model: racket?.model ?? "",
          sport: racket?.sport ?? "tenis",
        }
    );
  }, [open, racket, reset]);

  async function onSubmit(v: FormValues) {
    if (!appUser) return;

    const main = v.mainString.trim();
    const mainTension = toNumber(v.mainTension);

    const input: RacketInput = {
      brand: v.brand.trim(),
      model: v.model.trim(),
      sport: v.sport,
      usualSetup: main
        ? {
          mainString: main,
          crossString: v.sameCrossString ? main : v.crossString.trim(),
          mainTension,
          crossTension: v.sameCrossTension ? mainTension : toNumber(v.crossTension),
          tensionUnit: v.tensionUnit,
          stringProvidedBy: "local",
          notes: v.notes.trim(),
        }
        : null,
    };

    setSaving(true);
    try {
      if (racket) await updateRacket(racket.id, input);
      else await createRacket(appUser.orgId, customerId, input);
      toast.success(racket ? "Raqueta actualizada" : "Raqueta agregada");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la raqueta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{racket ? "Editar raqueta" : "Nueva raqueta"}</DialogTitle>
          <DialogDescription>
            La configuración habitual se usa para repetir el último encordado con un toque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Babolat" {...register("brand")} />
              {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" placeholder="Pure Drive" {...register("model")} />
              {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport">Deporte</Label>
            <Controller
              control={control}
              name="sport"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger id="sport" className="w-full">
                    <SelectValue>{sportLabels[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sportLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-3">
            <p className="text-sm font-medium">Configuración habitual (opcional)</p>

            {/* Cuerdas */}
            <div className="space-y-2">
              <Label htmlFor="mainString">Cuerda principal</Label>
              <Input
                id="mainString"
                placeholder="Luxilon Alu Power 1.25"
                {...register("mainString")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="sameCrossString"
                  render={({ field }) => (
                    <Checkbox
                      id="sameCrossString"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                    />
                  )}
                />
                <Label htmlFor="sameCrossString" className="font-normal">
                  Cuerda cruzada igual a la principal
                </Label>
              </div>
              {!sameCrossString && (
                <>
                  <Input
                    id="crossString"
                    aria-label="Cuerda cruzada"
                    placeholder="Cuerda cruzada"
                    {...register("crossString")}
                  />
                  {errors.crossString && (
                    <p className="text-sm text-destructive">{errors.crossString.message}</p>
                  )}
                </>
              )}
            </div>

            {/* Tensiones */}
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="mainTension">Tensión principal</Label>
                <Input
                  id="mainTension"
                  inputMode="decimal"
                  placeholder="55"
                  {...register("mainTension")}
                />
                {errors.mainTension && (
                  <p className="text-sm text-destructive">{errors.mainTension.message}</p>
                )}
              </div>
              <div className="w-24 space-y-2">
                <Label htmlFor="tensionUnit">Unidad</Label>
                <Controller
                  control={control}
                  name="tensionUnit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <SelectTrigger id="tensionUnit" className="w-full">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="sameCrossTension"
                  render={({ field }) => (
                    <Checkbox
                      id="sameCrossTension"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                    />
                  )}
                />
                <Label htmlFor="sameCrossTension" className="font-normal">
                  Tensión cruzada igual a la principal
                </Label>
              </div>
              {!sameCrossTension && (
                <>
                  <Input
                    id="crossTension"
                    aria-label="Tensión cruzada"
                    inputMode="decimal"
                    placeholder="Tensión cruzada"
                    {...register("crossTension")}
                  />
                  {errors.crossTension && (
                    <p className="text-sm text-destructive">{errors.crossTension.message}</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas del encordado</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
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
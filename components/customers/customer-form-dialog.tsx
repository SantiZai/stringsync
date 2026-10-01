"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { createCustomer, updateCustomer } from "@/lib/firestore/customers";
import { digitsOnly } from "@/lib/text";
import type { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre"),
  phone: z
    .string()
    .refine((v) => digitsOnly(v).length >= 8, "Ingresá un teléfono válido"),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido")]),
  notes: z.string().max(500, "Máximo 500 caracteres"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer; // si viene, es edición
  existing?: Customer[]; // para detectar teléfonos repetidos al crear
  onSaved?: (id: string) => void;
}

export function CustomerFormDialog({ open, onOpenChange, customer, existing = [], onSaved }: Props) {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, reset]);

  async function onSubmit(values: FormValues) {
    if (!appUser) return;
    const phone = digitsOnly(values.phone);

    if (!customer && existing.some((c) => c.phone === phone)) {
      setError("phone", { message: "Ya existe un cliente con ese teléfono" });
      return;
    }

    const data = {
      name: values.name.trim(),
      phone,
      email: values.email.trim(),
      notes: values.notes.trim(),
    };

    setSaving(true);
    try {
      if (customer) {
        await updateCustomer(customer.id, data);
        toast.success("Cliente actualizado");
        onSaved?.(customer.id);
      } else {
        const id = await createCustomer(appUser.orgId, data);
        toast.success("Cliente creado");
        onSaved?.(id);
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            El teléfono se usa para avisar por WhatsApp cuando la raqueta esté lista.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre y apellido</Label>
            <Input id="name" autoComplete="off" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="341 555 1234"
              {...register("phone")}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input id="email" type="email" inputMode="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
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
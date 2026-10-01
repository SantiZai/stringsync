"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createMember, updateMember } from "@/lib/team-api";
import { generatePassword, passwordSchema } from "@/lib/password";
import { roleLabels } from "@/lib/navigation";
import type { AppUser } from "@/types";
import { CredentialsCard } from "@/components/team/credentials-card";
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

const roles = ["mostrador", "encordador"] as const;

const roleHelp = {
  mostrador: "Carga pedidos y clientes, cobra, maneja la caja y el stock.",
  encordador: "Ve el tablero de pedidos y avanza los estados. Nada más.",
};

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre"),
  email: z.string().trim().email("Email inválido"),
  role: z.enum(roles),
  password: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: AppUser; // si viene, es edición
}

export function MemberFormDialog({ open, onOpenChange, member }: Props) {
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "mostrador", password: "" },
  });

  const role = watch("role");

  useEffect(() => {
    if (!open) return;
    setCreated(null);
    reset(
      member
        ? {
          name: member.name,
          email: member.email,
          role: member.role === "encordador" ? "encordador" : "mostrador",
          password: "",
        }
        : { name: "", email: "", role: "mostrador", password: generatePassword() }
    );
  }, [open, member, reset]);

  async function onSubmit(v: FormValues) {
    setSaving(true);
    try {
      if (member) {
        await updateMember({ action: "update", uid: member.uid, name: v.name, role: v.role });
        toast.success("Cambios guardados");
        onOpenChange(false);
      } else {
        const check = passwordSchema.safeParse(v.password);
        if (!check.success) {
          setError("password", { message: check.error.issues[0].message });
          return;
        }
        await createMember({ name: v.name, email: v.email, role: v.role, password: v.password });
        setCreated({ email: v.email.trim().toLowerCase(), password: v.password });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Cuenta creada</DialogTitle>
              <DialogDescription>Pasale estos datos a la persona para que pueda ingresar.</DialogDescription>
            </DialogHeader>
            <CredentialsCard email={created.email} password={created.password} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{member ? "Editar integrante" : "Nuevo integrante"}</DialogTitle>
              <DialogDescription>
                {member
                  ? "Podés cambiar el nombre y el rol."
                  : "Se crea la cuenta con una contraseña temporal que después la persona reemplaza."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="m-name">Nombre y apellido</Label>
                <Input id="m-name" autoComplete="off" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-email">Email</Label>
                <Input
                  id="m-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  disabled={!!member}
                  {...register("email")}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-role">Rol</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <SelectTrigger id="m-role" className="w-full">
                        <SelectValue>{roleLabels[field.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">{roleHelp[role]}</p>
              </div>

              {!member && (
                <div className="space-y-2">
                  <Label htmlFor="m-password">Contraseña temporal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="m-password"
                      autoComplete="off"
                      className="font-mono"
                      {...register("password")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue("password", generatePassword())}
                    >
                      Generar
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : member ? "Guardar" : "Crear cuenta"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
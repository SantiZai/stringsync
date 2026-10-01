"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { passwordSchema } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    current: z.string().min(1, "Ingresá tu contraseña actual"),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  })
  .refine((v) => v.next !== v.current, {
    path: ["next"],
    message: "La nueva contraseña tiene que ser distinta de la actual",
  });

type FormValues = z.infer<typeof schema>;

export function PasswordForm({
  onDone,
  onCancel,
}: {
  onDone?: () => void;
  onCancel?: () => void;
}) {
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
    defaultValues: { current: "", next: "", confirm: "" },
  });

  async function onSubmit(v: FormValues) {
    const user = auth.currentUser;
    if (!user?.email) return;

    setSaving(true);
    try {
      // Firebase exige confirmar la contraseña actual antes de cambiarla
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, v.current));
      await updatePassword(user, v.next);

      if (appUser?.mustChangePassword) {
        await updateDoc(doc(db, "users", user.uid), { mustChangePassword: false });
      }

      toast.success("Contraseña actualizada");
      reset();
      onDone?.();
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("current", { message: "La contraseña actual es incorrecta" });
      } else if (code === "auth/too-many-requests") {
        toast.error("Demasiados intentos. Probá de nuevo en unos minutos");
      } else if (code === "auth/network-request-failed") {
        toast.error("Sin conexión. Revisá tu internet");
      } else {
        toast.error("No se pudo cambiar la contraseña");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="pw-current">Contraseña actual</Label>
        <Input id="pw-current" type="password" autoComplete="current-password" {...register("current")} />
        {errors.current && <p className="text-sm text-destructive">{errors.current.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pw-next">Contraseña nueva</Label>
        <Input id="pw-next" type="password" autoComplete="new-password" {...register("next")} />
        {errors.next ? (
          <p className="text-sm text-destructive">{errors.next.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, con letras y números.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pw-confirm">Repetí la contraseña nueva</Label>
        <Input id="pw-confirm" type="password" autoComplete="new-password" {...register("confirm")} />
        {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
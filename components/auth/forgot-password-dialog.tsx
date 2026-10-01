"use client";

import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSent(false);
      setError("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) return setError("Ingresá un email válido");

    setSending(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, value);
      setSent(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      if (code === "auth/network-request-failed") setError("Sin conexión. Revisá tu internet");
      else if (code === "auth/too-many-requests") setError("Demasiados intentos. Probá más tarde");
      else setSent(true); // no revelamos si el email existe o no
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Te enviamos un enlace por email para elegir una contraseña nueva.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm">
              Si el email corresponde a una cuenta, en unos minutos te llega el enlace. Revisá
              también la carpeta de spam.
            </p>
            <p className="text-sm text-muted-foreground">
              Si tu cuenta no tiene un email real, pedile al administrador del local que te
              restablezca la contraseña.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CredentialsCard({ email, password }: { email: string; password: string }) {
  async function copy() {
    const text = [
      "StringSync",
      `Ingresá en: ${window.location.origin}/login`,
      `Email: ${email}`,
      `Contraseña temporal: ${password}`,
      "Al ingresar por primera vez te va a pedir que elijas tu propia contraseña.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Datos copiados");
    } catch {
      toast.error("No se pudo copiar. Copialos a mano");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Email</span>
          <span className="break-all font-medium">{email}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Contraseña temporal</span>
          <span className="font-mono font-semibold">{password}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Guardala ahora: no se vuelve a mostrar. Al primer ingreso, el sistema le pide a la
        persona que elija su propia contraseña.
      </p>
      <Button type="button" variant="outline" className="w-full" onClick={copy}>
        Copiar datos de acceso
      </Button>
    </div>
  );
}
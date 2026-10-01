"use client";

import { useAuth } from "@/providers/auth-provider";
import { Logo } from "@/components/brand/logo";
import { PasswordForm } from "@/components/account/password-form";
import { Button } from "@/components/ui/button";

export function ForcePasswordChange() {
  const { appUser, logout } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <Logo />
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Elegí tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Hola {appUser?.name}. Por seguridad, antes de empezar tenés que reemplazar la
            contraseña temporal que te dieron por una propia.
          </p>
        </div>
        <PasswordForm />
        <Button variant="ghost" className="w-full" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
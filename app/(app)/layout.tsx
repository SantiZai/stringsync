"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/providers/auth-provider";
import { canAccess } from "@/lib/navigation";
import { AppShell } from "@/components/app-shell";
import { ForcePasswordChange } from "@/components/account/force-password-change";
import { Button, buttonVariants } from "@/components/ui/button";
import { useShops } from "@/providers/shop-provider";

function Notice({ text, onLogout }: { text: string; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="max-w-sm text-muted-foreground">{text}</p>
      <Button variant="outline" onClick={onLogout}>
        Cerrar sesión
      </Button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { shops } = useShops();

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace("/login");
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appUser) {
    return <Notice text="Tu usuario todavía no fue habilitado por el administrador." onLogout={logout} />;
  }

  if (appUser.active === false) {
    return <Notice text="Tu cuenta está desactivada. Consultá con el administrador del local." onLogout={logout} />;
  }

  if (appUser.role !== "admin" && shops[0]?.active === false) {
    return <Notice text="Tu sucursal está desactivada. Consultá con el administrador." onLogout={logout} />;
  }

  if (appUser.mustChangePassword) return <ForcePasswordChange />;

  if (!canAccess(appUser.role, pathname)) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Sin permisos</h1>
          <p className="text-muted-foreground">Tu rol no tiene acceso a esta sección.</p>
          <Link href="/pedidos" className={buttonVariants()}>
            Ir a Pedidos
          </Link>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useShops } from "@/providers/shop-provider";
import { Button } from "@/components/ui/button";

export function BranchRequired({ action }: { action: string }) {
  const { appUser } = useAuth();
  const { shops, setActiveShopId } = useShops();
  const available = shops.filter((s) => s.active !== false);

  if (appUser?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Tu cuenta no tiene una sucursal asignada. Consultá con el administrador.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-dashed bg-card/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">Elegí una sucursal para {action}.</p>
      {available.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {available.map((s) => (
            <Button key={s.id} variant="outline" size="sm" onClick={() => setActiveShopId(s.id)}>
              {s.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useShops } from "@/providers/shop-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BranchSwitcher() {
  const { appUser } = useAuth();
  const { shops, activeShopId, setActiveShopId } = useShops();
  if (!appUser) return null;

  const current = shops.find((s) => s.id === activeShopId);

  if (appUser.role !== "admin") {
    return current ? (
      <div className="truncate rounded-lg border bg-card px-3 py-2 text-sm font-medium">
        {current.name}
      </div>
    ) : null;
  }

  if (shops.length === 0) return null;

  return (
    <Select
      value={activeShopId ?? "all"}
      onValueChange={(v) => v && setActiveShopId(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-full" aria-label="Sucursal">
        <SelectValue>{current?.name ?? "Todas las sucursales"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las sucursales</SelectItem>
        {shops.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}{s.active === false ? " (inactiva)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
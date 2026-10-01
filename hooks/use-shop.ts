"use client";

import { useShops } from "@/providers/shop-provider";

// Sucursal activa (null si el admin está viendo "Todas")
export function useShop() {
  const { shops, activeShopId } = useShops();
  return shops.find((s) => s.id === activeShopId) ?? null;
}

// Sucursal de un documento concreto (un pedido, por ejemplo)
export function useShopById(id?: string) {
  const { shops } = useShops();
  return shops.find((s) => s.id === id) ?? null;
}
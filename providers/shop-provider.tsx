"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import type { Scope } from "@/lib/scope";
import type { Shop } from "@/types";

interface ShopsContextValue {
  shops: Shop[];
  loading: boolean;
  activeShopId: string | null; // null = todas (solo admin)
  setActiveShopId: (id: string | null) => void;
}

const ShopsContext = createContext<ShopsContextValue>({
  shops: [],
  loading: true,
  activeShopId: null,
  setActiveShopId: () => { },
});

const KEY = "stringsync:shop";

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId;
  const ownShopId = appUser?.shopId ?? null;
  const isAdmin = appUser?.role === "admin";

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | undefined>(); // undefined = sin elegir, "all" = todas

  useEffect(() => {
    if (!orgId) {
      setShops([]);
      return;
    }
    setLoading(true);
    const fail = () => {
      setShops([]);
      setLoading(false);
    };

    if (isAdmin) {
      return onSnapshot(
        query(collection(db, "shops"), where("orgId", "==", orgId)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop);
          list.sort((a, b) => a.name.localeCompare(b.name, "es"));
          setShops(list);
          setLoading(false);
        },
        fail
      );
    }

    // El resto solo puede leer su propia sucursal
    if (!ownShopId) return fail();
    return onSnapshot(
      doc(db, "shops", ownShopId),
      (snap) => {
        setShops(snap.exists() ? [{ id: snap.id, ...snap.data() } as Shop] : []);
        setLoading(false);
      },
      fail
    );
  }, [orgId, isAdmin, ownShopId]);

  // Recuerda la última sucursal que eligió el admin
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setPicked(v);
    } catch { }
  }, []);

  const activeShopId = useMemo(() => {
    if (!appUser) return null;
    if (!isAdmin) return ownShopId;
    if (picked === "all") return null;
    if (picked && shops.some((s) => s.id === picked)) return picked;
    return shops.length === 1 ? shops[0].id : null; // con una sola sucursal, se elige sola
  }, [appUser, isAdmin, ownShopId, picked, shops]);

  function setActiveShopId(id: string | null) {
    const v = id ?? "all";
    setPicked(v);
    try {
      localStorage.setItem(KEY, v);
    } catch { }
  }

  return (
    <ShopsContext.Provider value={{ shops, loading, activeShopId, setActiveShopId }}>
      {children}
    </ShopsContext.Provider>
  );
}

export const useShops = () => useContext(ShopsContext);

export function useScope(): Scope | null {
  const { appUser } = useAuth();
  const { activeShopId } = useShops();
  const orgId = appUser?.orgId;
  return useMemo(() => (orgId ? { orgId, shopId: activeShopId } : null), [orgId, activeShopId]);
}
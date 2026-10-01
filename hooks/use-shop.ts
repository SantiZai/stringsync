"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import type { Shop } from "@/types";

export function useShop() {
  const { appUser } = useAuth();
  const shopId = appUser?.shopId;
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    if (!shopId) return;
    return onSnapshot(
      doc(db, "shops", shopId),
      (snap) => setShop(snap.exists() ? ({ id: snap.id, ...snap.data() } as Shop) : null),
      () => setShop(null)
    );
  }, [shopId]);

  return shop;
}
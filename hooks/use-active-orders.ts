"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { subscribeActiveOrders } from "@/lib/firestore/orders";
import type { Order } from "@/types";

export function useActiveOrders() {
  const { appUser } = useAuth();
  const shopId = appUser?.shopId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    return subscribeActiveOrders(shopId, (list) => {
      setOrders(list);
      setLoading(false);
    });
  }, [shopId]);

  return { orders, loading };
}
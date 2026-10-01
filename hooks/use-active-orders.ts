"use client";

import { useEffect, useState } from "react";
import { useScope } from "@/providers/shop-provider";
import { subscribeActiveOrders } from "@/lib/firestore/orders";
import type { Order } from "@/types";

export function useActiveOrders() {
  const scope = useScope();
  const orgId = scope?.orgId;
  const shopId = scope?.shopId ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    return subscribeActiveOrders({ orgId, shopId }, (list) => {
      setOrders(list);
      setLoading(false);
    });
  }, [orgId, shopId]);

  return { orders, loading };
}
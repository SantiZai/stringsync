"use client";

import { useEffect, useMemo, useState } from "react";
import { useScope } from "@/providers/shop-provider";
import { subscribeStrings, subscribeStringStock } from "@/lib/firestore/strings";
import { mergeStock } from "@/lib/strings";
import type { StringItem, StringStock } from "@/types";

export function useStrings() {
  const scope = useScope();
  const orgId = scope?.orgId;
  const shopId = scope?.shopId ?? null;

  const [catalog, setCatalog] = useState<StringItem[]>([]);
  const [stocks, setStocks] = useState<StringStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    return subscribeStrings(orgId, (list) => {
      setCatalog(list);
      setLoading(false);
    });
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    return subscribeStringStock({ orgId, shopId }, setStocks);
  }, [orgId, shopId]);

  const strings = useMemo(() => mergeStock(catalog, stocks, shopId), [catalog, stocks, shopId]);
  return { strings, loading, shopId };
}
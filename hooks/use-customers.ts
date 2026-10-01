"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { subscribeCustomers } from "@/lib/firestore/customers";
import type { Customer } from "@/types";

export function useCustomers() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    return subscribeCustomers(
      orgId,
      (list) => {
        setCustomers(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [orgId]);

  return { customers, loading };
}
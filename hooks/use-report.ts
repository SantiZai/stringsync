"use client";

import { useEffect, useState } from "react";
import { fetchOrders, fetchPayments } from "@/lib/firestore/reports";
import { previousPeriod, type Period } from "@/lib/reports";
import type { Scope } from "@/lib/scope";
import type { Order, Payment } from "@/types";

interface ReportState {
  loading: boolean;
  error: boolean;
  payments: Payment[];
  prevPayments: Payment[];
  orders: Order[];
}

export function useReport(scope: Scope | null, period: Period): ReportState {
  const orgId = scope?.orgId;
  const shopId = scope?.shopId ?? null;
  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const [state, setState] = useState<ReportState>({
    loading: true,
    error: false,
    payments: [],
    prevPayments: [],
    orders: [],
  });

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));

    const p = { from: new Date(fromMs), to: new Date(toMs) };
    const sc = { orgId, shopId };
    Promise.all([fetchPayments(sc, p), fetchPayments(sc, previousPeriod(p)), fetchOrders(sc, p)])
      .then(([payments, prevPayments, orders]) => {
        if (!cancelled) setState({ loading: false, error: false, payments, prevPayments, orders });
      })
      .catch((e) => {
        console.error(e); // si falta un índice, acá aparece el link para crearlo
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, shopId, fromMs, toMs]);

  return state;
}
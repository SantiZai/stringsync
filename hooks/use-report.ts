"use client";

import { useEffect, useRef, useState } from "react";
import { fetchOrders, fetchPayments } from "@/lib/firestore/reports";
import { previousPeriod, type Period } from "@/lib/reports";
import type { Scope } from "@/lib/scope";
import type { Order, Payment } from "@/types";

interface ReportData {
  payments: Payment[];
  prevPayments: Payment[];
  orders: Order[];
}

interface ReportState extends ReportData {
  /** Primera carga sin nada que mostrar: la página dibuja skeletons. */
  loading: boolean;
  /** Cambio de período con datos anteriores visibles: indicador sutil, sin parpadeo. */
  refreshing: boolean;
  error: boolean;
}

// Caché en memoria: volver a un período ya visitado es instantáneo.
// Se revalida en segundo plano para no mostrar datos viejos.
const cache = new Map<string, ReportData>();
const MAX_CACHE = 20;

function cacheKey(orgId: string, shopId: string | null, fromMs: number, toMs: number) {
  return `${orgId}|${shopId ?? "all"}|${fromMs}|${toMs}`;
}

function stash(key: string, data: ReportData) {
  cache.set(key, data);
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

// El delta "% vs período anterior" necesita descargar el período anterior
// completo. En rangos largos (ej. "Este año" = 2 años de cobros) duplica
// las lecturas y la latencia, así que se omite y el KPI muestra el conteo.
const PREV_MAX_DAYS = 120;

const empty: ReportData = { payments: [], prevPayments: [], orders: [] };

export function useReport(scope: Scope | null, period: Period): ReportState {
  const orgId = scope?.orgId;
  const shopId = scope?.shopId ?? null;
  const fromMs = period.from.getTime();
  const toMs = period.to.getTime();

  const [state, setState] = useState<ReportState>({
    loading: true,
    refreshing: false,
    error: false,
    ...empty,
  });
  const reqId = useRef(0);

  useEffect(() => {
    if (!orgId) {
      setState({ loading: false, refreshing: false, error: false, ...empty });
      return;
    }
    const id = ++reqId.current;
    const done = () => id === reqId.current;
    const key = cacheKey(orgId, shopId, fromMs, toMs);
    const hit = cache.get(key);

    const p = { from: new Date(fromMs), to: new Date(toMs) };
    const sc = { orgId, shopId };
    const days = Math.round((toMs - fromMs) / 86_400_000);
    const wantPrev = days <= PREV_MAX_DAYS;

    if (hit) {
      // Instantáneo: pintar caché y revalidar sin parpadeo.
      setState({ loading: false, refreshing: true, error: false, ...hit });
    } else {
      // Stale-while-revalidate: mantener lo visible; skeleton solo si no hay nada.
      setState((s) =>
        s.loading && s.payments.length === 0 && s.orders.length === 0
          ? { ...s, loading: true, refreshing: false, error: false }
          : { ...s, loading: false, refreshing: true, error: false }
      );
    }

    (async () => {
      try {
        // 1. Lo visible primero: el período actual. No se espera al anterior.
        const [payments, orders] = await Promise.all([
          fetchPayments(sc, p),
          fetchOrders(sc, p),
        ]);
        if (!done()) return;
        const base: ReportData = {
          payments,
          prevPayments: hit?.prevPayments ?? [],
          orders,
        };
        // Si no hace falta el anterior, esto ya es el resultado final.
        if (!wantPrev) {
          stash(key, base);
          setState({ loading: false, refreshing: false, error: false, ...base });
          return;
        }
        setState({ loading: false, refreshing: true, error: false, ...base });
        // 2. El período anterior en segundo plano (solo alimenta el % vs anterior).
        try {
          const prevPayments = await fetchPayments(sc, previousPeriod(p));
          if (!done()) return;
          const full: ReportData = { payments, prevPayments, orders };
          stash(key, full);
          setState({ loading: false, refreshing: false, error: false, ...full });
        } catch (e) {
          console.error(e);
          if (!done()) return;
          // Los datos actuales igual sirven; solo falta el delta.
          stash(key, base);
          setState({ loading: false, refreshing: false, error: false, ...base });
        }
      } catch (e) {
        console.error(e); // si falta un índice, acá aparece el link para crearlo
        if (!done()) return;
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          // Error fatal solo si no hay nada que mostrar; si hay caché/stale se conserva.
          error: s.payments.length === 0 && s.orders.length === 0 && !hit,
        }));
      }
    })();

    return () => {
      // Los cambios rápidos de filtro no se pisan: gana el último (done()).
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, shopId, fromMs, toMs]);

  return state;
}

import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Period } from "@/lib/reports";
import { scopeWhere, type Scope } from "@/lib/scope";
import type { Order, Payment } from "@/types";

async function fetchRange<T>(name: string, scope: Scope, p: Period): Promise<T[]> {
  const q = query(
    collection(db, name),
    ...scopeWhere(scope),
    where("createdAt", ">=", Timestamp.fromDate(p.from)),
    where("createdAt", "<", Timestamp.fromDate(p.to))
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export const fetchPayments = (scope: Scope, p: Period) => fetchRange<Payment>("payments", scope, p);
export const fetchOrders = (scope: Scope, p: Period) => fetchRange<Order>("orders", scope, p);
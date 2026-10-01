import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Order, Payment } from "@/types";
import { scopeWhere, type Scope } from "@/lib/scope";

const col = collection(db, "payments");
const round2 = (n: number) => Math.round(n * 100) / 100;

function toPayments(snap: { docs: { id: string; data: () => unknown }[] }): Payment[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Payment);
}

// Cobros de un rango de fechas (la caja del día)
export function subscribePayments(
  scope: Scope,
  from: Date,
  to: Date,
  onData: (payments: Payment[]) => void,
  onError: (e: Error) => void
): Unsubscribe {
  const q = query(
    col,
    ...scopeWhere(scope),
    where("createdAt", ">=", Timestamp.fromDate(from)),
    where("createdAt", "<", Timestamp.fromDate(to))
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = toPayments(snap);
      list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      onData(list);
    },
    onError
  );
}

// Los cobros de un pedido se consultan con su propia sucursal
export function subscribeOrderPayments(
  orgId: string,
  shopId: string,
  orderId: string,
  onData: (payments: Payment[]) => void
): Unsubscribe {
  const q = query(
    col,
    where("orgId", "==", orgId),
    where("shopId", "==", shopId),
    where("orderId", "==", orderId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = toPayments(snap);
      list.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      onData(list);
    },
    () => onData([])
  );
}

// Registra el cobro y actualiza el pedido en una sola transacción
export async function registerPayment(
  user: AppUser,
  order: Order,
  input: { amount: number; method: string; note: string }
) {
  const orderRef = doc(db, "orders", order.id);
  const payRef = doc(col);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("not-found");
    const cur = snap.data() as Order;
    if (cur.status === "cancelado") throw new Error("cancelled");

    const paid = round2(cur.paidAmount + input.amount);
    if (paid > cur.price + 0.001) throw new Error("exceeds");

    tx.update(orderRef, {
      paidAmount: paid,
      paymentStatus: paid >= cur.price ? "pagado" : "sena",
    });
    tx.set(payRef, {
      orgId: order.orgId,
      shopId: order.shopId,
      orderId: order.id,
      orderNumber: order.number,
      customerName: order.customerName,
      amount: input.amount,
      method: input.method,
      note: input.note,
      createdAt: Timestamp.now(),
      createdBy: user.uid,
      createdByName: user.name,
    });
  });
}

// Anula un cobro (no lo borra) y devuelve el monto al saldo del pedido
export async function voidPayment(user: AppUser, payment: Payment) {
  const payRef = doc(db, "payments", payment.id);
  const orderRef = doc(db, "orders", payment.orderId);

  await runTransaction(db, async (tx) => {
    const [p, o] = await Promise.all([tx.get(payRef), tx.get(orderRef)]);
    if (!p.exists() || p.data().voided) throw new Error("already-voided");

    tx.update(payRef, { voided: true, voidedAt: Timestamp.now(), voidedBy: user.uid });

    if (o.exists()) {
      const order = o.data() as Order;
      const paid = Math.max(0, round2(order.paidAmount - (p.data().amount as number)));
      tx.update(orderRef, {
        paidAmount: paid,
        paymentStatus: paid <= 0 ? "pendiente" : paid >= order.price ? "pagado" : "sena",
      });
    }
  });
}
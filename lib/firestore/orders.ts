import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { boardStatuses } from "@/lib/order-status";
import { balanceOf } from "@/lib/payments";
import type { AppUser, Order, OrderStatus, StringingSpec } from "@/types";

const col = collection(db, "orders");

export interface NewOrderInput {
  customerId: string;
  customerName: string;
  customerPhone: string;
  racketId: string;
  racketLabel: string;
  spec: StringingSpec;
  laborPrice: number;
  stringPrice: number;
  price: number;
  promisedDate: Date;
}

function toOrders(snap: { docs: { id: string; data: () => unknown }[] }): Order[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Order);
}

// Pedidos en curso (los que se ven en el tablero)
export function subscribeActiveOrders(
  shopId: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(col, where("shopId", "==", shopId), where("status", "in", boardStatuses));
  return onSnapshot(
    q,
    (snap) => {
      const list = toOrders(snap);
      list.sort((a, b) => a.promisedDate.toMillis() - b.promisedDate.toMillis());
      onData(list);
    },
    () => onData([])
  );
}

export function subscribeCustomerOrders(
  shopId: string,
  customerId: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(col, where("shopId", "==", shopId), where("customerId", "==", customerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = toOrders(snap);
      list.sort((a, b) => b.number - a.number);
      onData(list);
    },
    () => onData([])
  );
}

// Número correlativo por local, dentro de una transacción para que nunca se repita
export async function createOrder(user: AppUser, input: NewOrderInput): Promise<number> {
  const counterRef = doc(db, "counters", user.shopId);
  const orderRef = doc(col);

  return runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const number = (counter.exists() ? (counter.data().orders as number) : 0) + 1;
    const now = Timestamp.now();

    tx.set(counterRef, { shopId: user.shopId, orders: number });
    tx.set(orderRef, {
      ...input,
      promisedDate: Timestamp.fromDate(input.promisedDate),
      shopId: user.shopId,
      number,
      status: "recibido",
      paymentStatus: "pendiente",
      paidAmount: 0,
      createdAt: now,
      createdBy: user.uid,
      statusHistory: [{ status: "recibido", at: now, by: user.uid }],
    });
    return number;
  });
}

export async function updateOrderStatus(order: Order, status: OrderStatus, uid: string) {
  await updateDoc(doc(db, "orders", order.id), {
    status,
    statusHistory: arrayUnion({ status, at: Timestamp.now(), by: uid }),
  });
}

// Pedidos con saldo pendiente (incluye los ya entregados)
export function subscribeOrdersWithBalance(
  shopId: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    col,
    where("shopId", "==", shopId),
    where("paymentStatus", "in", ["pendiente", "sena"])
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = toOrders(snap).filter((o) => o.status !== "cancelado" && balanceOf(o) > 0);
      list.sort((a, b) => a.number - b.number);
      onData(list);
    },
    () => onData([])
  );
}
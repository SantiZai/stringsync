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
import type { AppUser, Order, OrderStatus, StringingSpec, StringItem, StringStock } from "@/types";
import { scopeWhere, type Scope } from "@/lib/scope";
import { DEFAULT_MIN_STOCK } from "@/lib/constants";
import { movementData, stockDocId } from "@/lib/firestore/strings";

const col = collection(db, "orders");

export interface NewOrderInput {
  customerId: string;
  customerName: string;
  customerPhone: string;
  stringId: string | null
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
export function subscribeActiveOrders(scope: Scope, onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(col, ...scopeWhere(scope), where("status", "in", boardStatuses));
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
  scope: Scope,
  customerId: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(col, ...scopeWhere(scope), where("customerId", "==", customerId));
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

// Número correlativo por sucursal + descuento de stock de esa sucursal
export async function createOrder(
  user: AppUser,
  shopId: string,
  input: NewOrderInput
): Promise<number> {
  const counterRef = doc(db, "counters", shopId);
  const orderRef = doc(col);
  const stringRef = input.stringId ? doc(db, "strings", input.stringId) : null;
  const stockRef = input.stringId ? doc(db, "stringStock", stockDocId(shopId, input.stringId)) : null;

  return runTransaction(db, async (tx) => {
    // Todas las lecturas van antes que las escrituras
    const counter = await tx.get(counterRef);
    const stringSnap = stringRef ? await tx.get(stringRef) : null;
    const stockSnap = stockRef ? await tx.get(stockRef) : null;

    const number = (counter.exists() ? (counter.data().orders as number) : 0) + 1;
    const now = Timestamp.now();

    let stringId: string | null = null;
    if (stringRef && stockRef && stringSnap?.exists()) {
      const item = { id: stringRef.id, ...(stringSnap.data() as Omit<StringItem, "id">) };
      stringId = item.id;

      if (stockSnap?.exists()) {
        tx.update(stockRef, { stock: (stockSnap.data() as StringStock).stock - 1 });
      } else {
        tx.set(stockRef, {
          orgId: user.orgId,
          shopId,
          stringId: item.id,
          stock: -1,
          minStock: DEFAULT_MIN_STOCK,
        });
      }
      tx.set(
        doc(collection(db, "stockMovements")),
        movementData(user, item, shopId, "consumo", -1, {
          orderId: orderRef.id,
          orderNumber: number,
        })
      );
    }

    tx.set(counterRef, { orgId: user.orgId, shopId, orders: number });
    tx.set(orderRef, {
      ...input,
      stringId,
      promisedDate: Timestamp.fromDate(input.promisedDate),
      orgId: user.orgId,
      shopId,
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
  scope: Scope,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(col, ...scopeWhere(scope), where("paymentStatus", "in", ["pendiente", "sena"]));
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

// Cancela el pedido y devuelve la cuerda al stock de SU sucursal
export async function cancelOrder(user: AppUser, order: Order) {
  const orderRef = doc(db, "orders", order.id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("not-found");
    const cur = snap.data() as Order;
    if (cur.status === "cancelado" || cur.status === "entregado") throw new Error("invalid-status");

    const stringRef = cur.stringId ? doc(db, "strings", cur.stringId) : null;
    const stockRef = cur.stringId ? doc(db, "stringStock", stockDocId(cur.shopId, cur.stringId)) : null;
    const stringSnap = stringRef ? await tx.get(stringRef) : null;
    const stockSnap = stockRef ? await tx.get(stockRef) : null;

    tx.update(orderRef, {
      status: "cancelado",
      statusHistory: arrayUnion({ status: "cancelado", at: Timestamp.now(), by: user.uid }),
    });

    if (stringRef && stockRef && stringSnap?.exists()) {
      const item = { id: stringRef.id, ...(stringSnap.data() as Omit<StringItem, "id">) };
      if (stockSnap?.exists()) {
        tx.update(stockRef, { stock: (stockSnap.data() as StringStock).stock + 1 });
      } else {
        tx.set(stockRef, {
          orgId: cur.orgId,
          shopId: cur.shopId,
          stringId: item.id,
          stock: 1,
          minStock: DEFAULT_MIN_STOCK,
        });
      }
      tx.set(
        doc(collection(db, "stockMovements")),
        movementData(user, item, cur.shopId, "devolucion", 1, {
          orderId: order.id,
          orderNumber: order.number,
        })
      );
    }
  });
}
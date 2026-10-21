import {
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
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
  // segunda cuerda del catálogo, solo si la cruzada es distinta de la principal
  crossStringId: string | null;
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

// ¿El cliente tiene pedidos en la organización? (para no borrarlo con historial)
export async function hasCustomerOrders(orgId: string, customerId: string): Promise<boolean> {
  const snap = await getCountFromServer(
    query(col, where("orgId", "==", orgId), where("customerId", "==", customerId))
  );
  return snap.data().count > 0;
}

// Número correlativo por sucursal + descuento de stock de esa sucursal.
// Si la cruzada es distinta y también salió del local, descuenta 1 set de
// cada cuerda (dos movimientos de consumo).
export async function createOrder(
  user: AppUser,
  shopId: string,
  input: NewOrderInput
): Promise<number> {
  const counterRef = doc(db, "counters", shopId);
  const orderRef = doc(col);
  const stringIds = [...new Set([input.stringId, input.crossStringId].filter((x): x is string => !!x))];

  return runTransaction(db, async (tx) => {
    // Todas las lecturas van antes que las escrituras
    const counter = await tx.get(counterRef);
    const refs = stringIds.map((id) => ({
      stringRef: doc(db, "strings", id),
      stockRef: doc(db, "stringStock", stockDocId(shopId, id)),
    }));
    const snaps = await Promise.all(
      refs.map(async (r) => ({
        string: await tx.get(r.stringRef),
        stock: await tx.get(r.stockRef),
      }))
    );

    const number = (counter.exists() ? (counter.data().orders as number) : 0) + 1;
    const now = Timestamp.now();

    tx.update(doc(db, "rackets", input.racketId), { lastStrungAt: now, lastShopId: shopId });

    const consumed = new Set<string>();
    refs.forEach(({ stringRef, stockRef }, i) => {
      const stringSnap = snaps[i].string;
      const stockSnap = snaps[i].stock;
      if (!stringSnap.exists()) return;

      const item = { id: stringRef.id, ...(stringSnap.data() as Omit<StringItem, "id">) };
      consumed.add(item.id);

      if (stockSnap.exists()) {
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
    });

    tx.set(counterRef, { orgId: user.orgId, shopId, orders: number });
    tx.set(orderRef, {
      ...input,
      stringId: input.stringId && consumed.has(input.stringId) ? input.stringId : null,
      crossStringId:
        input.crossStringId && consumed.has(input.crossStringId) ? input.crossStringId : null,
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

// Cancela el pedido. Si las cuerdas salieron del stock y returnStock es true,
// devuelve 1 set por cada cuerda al stock de SU sucursal (con movimiento de
// devolución por cada una).
export async function cancelOrder(
  user: AppUser,
  order: Order,
  opts?: { returnStock?: boolean }
) {
  const returnStock = opts?.returnStock ?? true;
  const orderRef = doc(db, "orders", order.id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("not-found");
    const cur = snap.data() as Order;
    if (cur.status === "cancelado" || cur.status === "entregado") throw new Error("invalid-status");

    const stringIds = returnStock
      ? [...new Set([cur.stringId, cur.crossStringId].filter((x): x is string => !!x))]
      : [];
    const refs = stringIds.map((id) => ({
      stringRef: doc(db, "strings", id),
      stockRef: doc(db, "stringStock", stockDocId(cur.shopId, id)),
    }));
    const snaps = await Promise.all(
      refs.map(async (r) => ({
        string: await tx.get(r.stringRef),
        stock: await tx.get(r.stockRef),
      }))
    );

    tx.update(orderRef, {
      status: "cancelado",
      statusHistory: arrayUnion({ status: "cancelado", at: Timestamp.now(), by: user.uid }),
    });

    refs.forEach(({ stringRef, stockRef }, i) => {
      const stringSnap = snaps[i].string;
      const stockSnap = snaps[i].stock;
      if (!stringSnap.exists()) return;

      const item = { id: stringRef.id, ...(stringSnap.data() as Omit<StringItem, "id">) };
      if (stockSnap.exists()) {
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
    });
  });
}
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  addDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_MIN_STOCK } from "@/lib/constants";
import { scopeWhere, type Scope } from "@/lib/scope";
import { stringLabel } from "@/lib/strings";
import type { AppUser, StockMovement, StringItem, StringStock } from "@/types";
import { clean } from "./utils";

const col = collection(db, "strings");
const stockCol = collection(db, "stringStock");
const movCol = collection(db, "stockMovements");

export const stockDocId = (shopId: string, stringId: string) => `${shopId}_${stringId}`;

export interface StringInput {
  brand: string;
  model: string;
  gauge: string;
  color: string;
  costPrice: number;
  salePrice: number;
}

export function movementData(
  user: AppUser,
  item: Pick<StringItem, "id" | "brand" | "model" | "gauge">,
  shopId: string,
  type: StockMovement["type"],
  quantity: number,
  extra: { note?: string; orderId?: string; orderNumber?: number } = {}
) {
  return clean({
    orgId: user.orgId,
    shopId,
    stringId: item.id,
    stringLabel: stringLabel(item),
    type,
    quantity,
    ...extra,
    createdAt: Timestamp.now(),
    createdBy: user.uid,
    createdByName: user.name,
  });
}

// Catálogo: único para toda la organización
export function subscribeStrings(orgId: string, onData: (items: StringItem[]) => void): Unsubscribe {
  return onSnapshot(
    query(col, where("orgId", "==", orgId)),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StringItem);
      list.sort((a, b) => stringLabel(a).localeCompare(stringLabel(b), "es"));
      onData(list);
    },
    () => onData([])
  );
}

// Stock: de una sucursal, o de todas si el admin no eligió una
export function subscribeStringStock(scope: Scope, onData: (rows: StringStock[]) => void): Unsubscribe {
  return onSnapshot(
    query(stockCol, ...scopeWhere(scope)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StringStock)),
    () => onData([])
  );
}

export function subscribeStringMovements(
  scope: Scope,
  stringId: string,
  onData: (moves: StockMovement[]) => void
): Unsubscribe {
  return onSnapshot(
    query(movCol, ...scopeWhere(scope), where("stringId", "==", stringId)),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StockMovement);
      list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      onData(list);
    },
    () => onData([])
  );
}

export async function createString(user: AppUser, input: StringInput) {
  await addDoc(col, { ...input, orgId: user.orgId, active: true, createdAt: Timestamp.now() });
}

export async function updateString(id: string, input: StringInput) {
  await updateDoc(doc(db, "strings", id), { ...input });
}

export async function setStringActive(id: string, active: boolean) {
  await updateDoc(doc(db, "strings", id), { active });
}

// "ingreso" suma `value`; "ajuste" deja el stock exactamente en `value`
export async function adjustStock(
  user: AppUser,
  item: Pick<StringItem, "id" | "brand" | "model" | "gauge">,
  shopId: string,
  mode: "ingreso" | "ajuste",
  value: number,
  note: string
) {
  const ref = doc(db, "stringStock", stockDocId(shopId, item.id));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as StringStock).stock : 0;
    const delta = mode === "ingreso" ? value : value - current;
    if (delta === 0) return;

    if (snap.exists()) tx.update(ref, { stock: current + delta });
    else
      tx.set(ref, {
        orgId: user.orgId,
        shopId,
        stringId: item.id,
        stock: current + delta,
        minStock: DEFAULT_MIN_STOCK,
      });
    tx.set(doc(movCol), movementData(user, item, shopId, mode, delta, { note }));
  });
}

// Stock mínimo y precio propio de la sucursal (solo admin y encargado)
export async function updateStockSettings(
  user: AppUser,
  item: Pick<StringItem, "id">,
  shopId: string,
  settings: { minStock: number; salePrice: number | null }
) {
  const ref = doc(db, "stringStock", stockDocId(shopId, item.id));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      tx.update(ref, {
        minStock: settings.minStock,
        salePrice: settings.salePrice ?? deleteField(),
      });
    } else {
      tx.set(
        ref,
        clean({
          orgId: user.orgId,
          shopId,
          stringId: item.id,
          stock: 0,
          minStock: settings.minStock,
          salePrice: settings.salePrice ?? undefined,
        })
      );
    }
  });
}
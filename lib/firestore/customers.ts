import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer } from "@/types";
import { clean } from "./utils";

const col = collection(db, "customers");

export interface CustomerInput {
  name: string;
  phone: string; // solo dígitos
  email: string; // "" si no tiene
  notes: string;
}

export function subscribeCustomers(
  shopId: string,
  onData: (customers: Customer[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  // La query DEBE incluir el where de shopId, si no las reglas la rechazan
  const q = query(col, where("shopId", "==", shopId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
      list.sort((a, b) => a.name.localeCompare(b.name, "es"));
      onData(list);
    },
    onError
  );
}

export function subscribeCustomer(
  id: string,
  onData: (customer: Customer | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "customers", id),
    (snap) => onData(snap.exists() ? ({ id: snap.id, ...snap.data() } as Customer) : null),
    // si no existe o es de otro local, las reglas devuelven error: lo tratamos como "no encontrado"
    () => onData(null)
  );
}

export async function createCustomer(shopId: string, input: CustomerInput): Promise<string> {
  const ref = await addDoc(col, {
    ...input,
    shopId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  await updateDoc(doc(db, "customers", id), clean({ ...input }));
}
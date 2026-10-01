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
  orgId: string,
  onData: (customers: Customer[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(col, where("orgId", "==", orgId));

  return onSnapshot(
    q,
    (snapshot) => {
      const customers = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Customer[];
      onData(customers);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        // En caso de error de permisos o desconexión, envía lista vacía
        onData([]);
      }
    }
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

export async function createCustomer(orgId: string, input: CustomerInput): Promise<string> {
  const ref = await addDoc(col, { ...input, orgId, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  await updateDoc(doc(db, "customers", id), clean({ ...input }));
}
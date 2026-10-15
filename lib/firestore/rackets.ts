import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Racket, StringingSpec } from "@/types";

const col = collection(db, "rackets");

export interface RacketInput {
  brand: string;
  model: string;
  sport: Racket["sport"];
  usualSetup: StringingSpec | null;
}

export function subscribeCustomerRackets(
  orgId: string,
  customerId: string,
  onData: (rackets: Racket[]) => void
): Unsubscribe {
  const q = query(col, where("orgId", "==", orgId), where("customerId", "==", customerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Racket);
      list.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "es"));
      onData(list);
    },
    () => onData([])
  );
}

export async function createRacket(orgId: string, customerId: string, input: RacketInput) {
  await addDoc(col, { ...input, orgId, customerId });
}

export async function updateRacket(id: string, input: RacketInput) {
  await updateDoc(doc(db, "rackets", id), { ...input });
}

export async function deleteRacket(id: string) {
  await deleteDoc(doc(db, "rackets", id));
}

// Borra todas las raquetas de un cliente (al eliminar el cliente)
export async function deleteRacketsOfCustomer(orgId: string, customerId: string): Promise<void> {
  const snap = await getDocs(
    query(col, where("orgId", "==", orgId), where("customerId", "==", customerId))
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export function subscribeOrgRackets(orgId: string, onData: (rackets: Racket[]) => void): Unsubscribe {
  return onSnapshot(
    query(col, where("orgId", "==", orgId)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Racket)),
    () => onData([])
  );
}

export async function markReminderSent(id: string) {
  await updateDoc(doc(db, "rackets", id), { reminderSentAt: Timestamp.now() });
}
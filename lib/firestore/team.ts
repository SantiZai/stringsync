import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";

const order = { admin: 0, encargado: 1, mostrador: 2, encordador: 3 };

export function subscribeTeam(shopId: string, onData: (members: AppUser[]) => void): Unsubscribe {
  const q = query(collection(db, "users"), where("shopId", "==", shopId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
      list.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name, "es"));
      onData(list);
    },
    () => onData([])
  );
}
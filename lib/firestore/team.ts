import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Role } from "@/types";

const order: Record<Role, number> = { admin: 0, encargado: 1, mostrador: 2, encordador: 3 };

// Admin: todo el equipo de la organización. Encargado: el de su sucursal.
// Las consultas tienen que incluir estos filtros, si no las reglas las rechazan.
export function subscribeTeam(
  actor: { orgId: string; role: Role; shopId: string | null },
  onData: (members: AppUser[]) => void,
  onError: (e: Error) => void
): Unsubscribe {
  const q =
    actor.role === "admin"
      ? query(collection(db, "users"), where("orgId", "==", actor.orgId))
      : query(
        collection(db, "users"),
        where("orgId", "==", actor.orgId),
        where("shopId", "==", actor.shopId)
      );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
      list.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name, "es"));
      onData(list);
    },
    onError
  );
}
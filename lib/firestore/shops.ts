import { addDoc, collection, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Shop } from "@/types";
import { clean } from "./utils";

export interface ShopInput {
  name: string;
  address: string;
  phone: string;
}

// Puede copiar precios de mano de obra y medios de pago de otra sucursal
export async function createShop(user: AppUser, input: ShopInput, copyFrom?: Shop | null) {
  const ref = await addDoc(
    collection(db, "shops"),
    clean({
      orgId: user.orgId,
      name: input.name,
      address: input.address || undefined,
      phone: input.phone || undefined,
      active: true,
      createdAt: Timestamp.now(),
      laborPrices: copyFrom?.laborPrices,
      paymentMethods: copyFrom?.paymentMethods,
    })
  );
  return ref.id;
}

export async function updateShop(id: string, input: ShopInput) {
  await updateDoc(doc(db, "shops", id), { ...input });
}

export async function setShopActive(id: string, active: boolean) {
  await updateDoc(doc(db, "shops", id), { active });
}
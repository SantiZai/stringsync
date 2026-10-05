import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Organization } from "@/types";

export async function subscribeOrgById(
  orgId: string,
) {
  const docRef = doc(db, "orgs", orgId);

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return data as Organization;
  }
  return null;
}
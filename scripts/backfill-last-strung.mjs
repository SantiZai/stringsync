import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [orgId] = process.argv.slice(2);
if (!orgId) {
  console.error("Uso: pnpm backfill-last-strung <orgId>");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const snap = await db.collection("orders").where("orgId", "==", orgId).get();
const latest = new Map();
for (const d of snap.docs) {
  const o = d.data();
  if (o.status === "cancelado" || !o.racketId) continue;
  const cur = latest.get(o.racketId);
  if (!cur || o.createdAt.toMillis() > cur.at.toMillis()) {
    latest.set(o.racketId, { at: o.createdAt, shopId: o.shopId });
  }
}

let ok = 0;
for (const [racketId, { at, shopId }] of latest) {
  try {
    await db.doc(`rackets/${racketId}`).update({ lastStrungAt: at, lastShopId: shopId });
    ok++;
  } catch {
    // la raqueta fue eliminada
  }
}
console.log(`✔ ${ok} raquetas actualizadas`);
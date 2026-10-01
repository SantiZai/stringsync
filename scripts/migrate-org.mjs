import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [shopId, orgName] = process.argv.slice(2);
if (!shopId || !orgName) {
  console.error('Uso: pnpm migrate-org local-1 "Nombre de la organización"');
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

const slug = orgName
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

// Si ya se migró, reutiliza la organización existente
const shopRef = db.doc(`shops/${shopId}`);
const shopSnap = await shopRef.get();
if (!shopSnap.exists) {
  console.error(`No existe shops/${shopId}`);
  process.exit(1);
}
const orgId = shopSnap.data().orgId ?? `${slug}-${randomBytes(2).toString("hex")}`;

async function each(collection, field, fn) {
  const snap = await db.collection(collection).where(field, "==", shopId).get();
  let batch = db.batch();
  let n = 0;
  for (const d of snap.docs) {
    fn(batch, d);
    if (++n % 200 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`✔ ${collection}: ${snap.size}`);
}

await db.doc(`orgs/${orgId}`).set({ name: orgName, createdAt: FieldValue.serverTimestamp() }, { merge: true });
await shopRef.set({ orgId, active: true }, { merge: true });

// Usuarios: el admin pasa a ser de toda la organización
await each("users", "shopId", (b, d) =>
  b.update(d.ref, d.data().role === "admin" ? { orgId, shopId: null } : { orgId })
);

// Clientes y raquetas: compartidos en la organización (se quita el shopId)
for (const c of ["customers", "rackets"]) {
  await each(c, "shopId", (b, d) => b.update(d.ref, { orgId, shopId: FieldValue.delete() }));
}

// Operativos: quedan por sucursal y suman orgId
for (const c of ["orders", "payments", "stockMovements"]) {
  await each(c, "shopId", (b, d) => b.update(d.ref, { orgId }));
}
await db.doc(`counters/${shopId}`).set({ orgId }, { merge: true });

// Cuerdas: el catálogo queda en la organización y el stock se mueve a stringStock
await each("strings", "shopId", (b, d) => {
  const s = d.data();
  b.set(db.doc(`stringStock/${shopId}_${d.id}`), {
    orgId,
    shopId,
    stringId: d.id,
    stock: s.stock ?? 0,
    minStock: s.minStock ?? 2,
  });
  b.update(d.ref, {
    orgId,
    shopId: FieldValue.delete(),
    stock: FieldValue.delete(),
    minStock: FieldValue.delete(),
  });
});

console.log(`\n✔ Listo. Organización: ${orgName} (${orgId}) · Sucursal: ${shopId}\n`);
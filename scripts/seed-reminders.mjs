// Crea 4 usuarios con 1 pedido entregado hace 4, 8, 10 y 12 semanas,
// para probar los avisos de reencordado (panel Recordatorios).
// Uso:
//   node --env-file=.env.local scripts/seed-reminders.mjs --shop <shopId>
//   node --env-file=.env.local scripts/seed-reminders.mjs --shop <shopId> --clear
// Con el umbral en 8 semanas: avisa 8, 10 y 12 (el de 4 todavía no).
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}
const shopId = opt("shop");
const clear = args.includes("--clear");

if (!shopId) {
  console.error(`Uso:
  node --env-file=.env.local scripts/seed-reminders.mjs --shop <shopId>
  node --env-file=.env.local scripts/seed-reminders.mjs --shop <shopId> --clear`);
  process.exit(1);
}

const shopSnap = await db.doc(`shops/${shopId}`).get();
if (!shopSnap.exists) {
  console.error(`No existe la sucursal "${shopId}".`);
  process.exit(1);
}
const orgId = shopSnap.data().orgId;

if (clear) {
  for (const col of ["orders", "rackets", "customers"]) {
    const snap = await db.collection(col).where("shopId", "==", shopId).get().catch(() => null);
    const all = snap ?? await db.collection(col).where("orgId", "==", orgId).get();
    const demo = all.docs.filter((d) => d.data().demo === "reencordar");
    for (let i = 0; i < demo.length; i += 400) {
      const batch = db.batch();
      demo.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`  ${col}: ${demo.length} docs demo borrados`);
  }
  console.log("✔ Demo limpio");
  process.exit(0);
}

const week = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();
const demos = [
  { weeks: 4, name: "Paula Sosa", phone: "3415550204", brand: "Wilson", model: "Pro Staff" },
  { weeks: 8, name: "Jorge Medina", phone: "3415550208", brand: "Head", model: "Prestige" },
  { weeks: 10, name: "Ana Quiroga", phone: "3415550210", brand: "Babolat", model: "Pure Strike" },
  { weeks: 12, name: "Luis Herrera", phone: "3415550212", brand: "Yonex", model: "VCore" },
];

const counterSnap = await db.doc(`counters/${shopId}`).get();
let number = (counterSnap.exists ? (counterSnap.data().orders ?? 0) : 0) + 1;

const batch = db.batch();
for (const d of demos) {
  const at = Timestamp.fromMillis(now - d.weeks * week);
  const promised = Timestamp.fromMillis(now - d.weeks * week + 2 * 24 * 60 * 60 * 1000);

  const customerRef = db.collection("customers").doc();
  batch.set(customerRef, {
    orgId, name: d.name, phone: d.phone,
    createdAt: at, demo: "reencordar",
  });

  const racketRef = db.collection("rackets").doc();
  const usualSetup = {
    mainString: "Luxilon Alu Power 1.25",
    crossString: "Luxilon Alu Power 1.25",
    mainTension: 24, crossTension: 24,
    tensionUnit: "kg",
    stringProvidedBy: "local",
    stringId: null,
  };
  batch.set(racketRef, {
    orgId, customerId: customerRef.id,
    brand: d.brand, model: d.model, sport: "tenis",
    usualSetup,
    lastStrungAt: at, // <-- de acá sale el aviso de reencordado
    lastShopId: shopId,
    demo: "reencordar",
  });

  const orderRef = db.collection("orders").doc();
  batch.set(orderRef, {
    orgId, shopId, number,
    customerId: customerRef.id, customerName: d.name, customerPhone: d.phone,
    stringId: null,
    racketId: racketRef.id, racketLabel: `${d.brand} ${d.model}`,
    spec: usualSetup,
    status: "entregado",
    price: 24000, laborPrice: 15000, stringPrice: 9000,
    paymentStatus: "pagado", paidAmount: 24000,
    promisedDate: promised,
    createdAt: at, createdBy: "seed",
    statusHistory: [
      { status: "recibido", at, by: "seed" },
      { status: "entregado", at: promised, by: "seed" },
    ],
    demo: "reencordar",
  });
  console.log(`  hace ${String(d.weeks).padEnd(2)} semanas  #${number} ${d.name}`);
  number++;
}
batch.set(db.doc(`counters/${shopId}`), { orgId, shopId, orders: number - 1 }, { merge: true });
await batch.commit();

console.log(`\n✔ 4 usuarios con pedidos de hace 4, 8, 10 y 12 semanas en "${shopSnap.data().name}"`);
console.log(`  Probar: Clientes → selector de semanas (con 8 ves 3 avisos, con 4 ves los 4)`);
console.log(`  Para borrarlos: --shop ${shopId} --clear\n`);

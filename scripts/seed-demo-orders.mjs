// Crea 5 pedidos demo (uno por estado) para capturas del tablero.
// Uso:
//   node --env-file=.env.local scripts/seed-demo-orders.mjs --shop <shopId>
//   node --env-file=.env.local scripts/seed-demo-orders.mjs --shop <shopId> --clear   (borra los demo)
// Los docs creados llevan demo: true. Continúa el correlativo de la sucursal.
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
  node --env-file=.env.local scripts/seed-demo-orders.mjs --shop <shopId>
  node --env-file=.env.local scripts/seed-demo-orders.mjs --shop <shopId> --clear`);
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
    // customers no tiene shopId: se filtran por demo + orgId en memoria
    const all = snap ?? await db.collection(col).where("orgId", "==", orgId).get();
    const demo = all.docs.filter((d) => d.data().demo === true);
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

const day = 24 * 60 * 60 * 1000;
const now = new Date();
const demos = [
  {
    customer: { name: "Sofía Méndez", phone: "3415550101" },
    racket: { brand: "Babolat", model: "Pure Drive", sport: "tenis" },
    spec: { mainString: "Luxilon Alu Power 1.25", crossString: "Luxilon Alu Power 1.25", mainTension: 24, crossTension: 24 },
    status: "recibido", promisedOffset: 2, price: 25000, paid: 0,
  },
  {
    customer: { name: "Martín López", phone: "3415550102" },
    racket: { brand: "Wilson", model: "Blade 98", sport: "tenis" },
    spec: { mainString: "Wilson NXT 16", crossString: "Wilson NXT 16", mainTension: 25, crossTension: 25 },
    status: "en_cola", promisedOffset: -1, price: 23000, paid: 0, // atrasado a propósito
  },
  {
    customer: { name: "Lucía Fernández", phone: "3415550103" },
    racket: { brand: "Head", model: "Speed MP", sport: "tenis" },
    spec: { mainString: "Head Lynx Tour 1.25", crossString: "Head Lynx Tour 1.25", mainTension: 23, crossTension: 22 },
    status: "encordando", promisedOffset: 1, price: 24000, paid: 0,
  },
  {
    customer: { name: "Diego Torres", phone: "3415550104" },
    racket: { brand: "Yonex", model: "Ezone 100", sport: "tenis" },
    spec: { mainString: "Yonex Poly Tour Pro 1.25", crossString: "Yonex Poly Tour Pro 1.25", mainTension: 24, crossTension: 24 },
    status: "listo", promisedOffset: 0, price: 26000, paid: 10000, // con seña
  },
  {
    customer: { name: "Camila Ruiz", phone: "3415550105" },
    racket: { brand: "Babolat", model: "Pure Aero", sport: "tenis" },
    spec: { mainString: "Tecnifibre X-One 1.28", crossString: "Tecnifibre X-One 1.28", mainTension: 25, crossTension: 25 },
    status: "entregado", promisedOffset: -2, price: 25000, paid: 25000, // pagado
  },
];

const counterSnap = await db.doc(`counters/${shopId}`).get();
let number = (counterSnap.exists ? (counterSnap.data().orders ?? 0) : 0) + 1;

const batch = db.batch();
for (const d of demos) {
  const customerRef = db.collection("customers").doc();
  batch.set(customerRef, {
    orgId, name: d.customer.name, phone: d.customer.phone,
    createdAt: FieldValue.serverTimestamp(), demo: true,
  });

  const racketRef = db.collection("rackets").doc();
  const usualSetup = {
    mainString: d.spec.mainString,
    crossString: d.spec.crossString,
    mainTension: d.spec.mainTension,
    crossTension: d.spec.crossTension,
    tensionUnit: "kg",
    stringProvidedBy: "local",
    stringId: null,
  };
  batch.set(racketRef, {
    orgId, customerId: customerRef.id,
    brand: d.racket.brand, model: d.racket.model, sport: d.racket.sport,
    usualSetup, demo: true,
  });

  const orderRef = db.collection("orders").doc();
  const at = Timestamp.now();
  const history = [{ status: "recibido", at, by: "seed" }];
  if (d.status !== "recibido") history.push({ status: d.status, at, by: "seed" });
  batch.set(orderRef, {
    orgId, shopId, number,
    customerId: customerRef.id, customerName: d.customer.name, customerPhone: d.customer.phone,
    stringId: null,
    racketId: racketRef.id, racketLabel: `${d.racket.brand} ${d.racket.model}`,
    spec: usualSetup,
    status: d.status,
    price: d.price, laborPrice: 15000, stringPrice: d.price - 15000,
    paymentStatus: d.paid >= d.price ? "pagado" : d.paid > 0 ? "sena" : "pendiente",
    paidAmount: d.paid,
    promisedDate: Timestamp.fromDate(new Date(now.getTime() + d.promisedOffset * day)),
    createdAt: at, createdBy: "seed",
    statusHistory: history,
    demo: true,
  });
  console.log(`  #${number} ${d.status.padEnd(10)} ${d.customer.name}`);
  number++;
}
batch.set(db.doc(`counters/${shopId}`), { orgId, shopId, orders: number - 1 }, { merge: true });
await batch.commit();

console.log(`\n✔ 5 pedidos demo en "${shopSnap.data().name}" (recibido → entregado, uno atrasado, uno con seña, uno pagado)`);
console.log(`  Para borrarlos: --shop ${shopId} --clear\n`);

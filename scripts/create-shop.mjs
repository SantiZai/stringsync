import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const args = process.argv.slice(2);

// Modo listado: muestra las organizaciones y sus sucursales
if (args[0] === "--list") {
  const orgs = await db.collection("orgs").get();
  for (const o of orgs.docs) {
    console.log(`\n${o.data().name}  (orgId: ${o.id})`);
    const shops = await db.collection("shops").where("orgId", "==", o.id).get();
    for (const s of shops.docs) {
      console.log(`   - ${s.data().name}  (shopId: ${s.id})${s.data().active === false ? "  [inactiva]" : ""}`);
    }
  }
  console.log();
  process.exit(0);
}

function opt(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}
const copyFrom = opt("copy-from");
const address = opt("address");
const phone = opt("phone");
const [orgId, shopName] = args;

if (!orgId || !shopName) {
  console.error(`Uso:
  pnpm create-shop <orgId> "Nombre de la sucursal" [--address "Calle 123"] [--phone 341...] [--copy-from <shopId>]
  pnpm create-shop --list      (muestra organizaciones y sucursales)`);
  process.exit(1);
}

const org = await db.doc(`orgs/${orgId}`).get();
if (!org.exists) {
  console.error(`No existe la organización "${orgId}". Usá "pnpm create-shop --list" para ver las que hay.`);
  process.exit(1);
}

const slug = shopName
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const shopId = `${slug}-${randomBytes(2).toString("hex")}`;

const data = {
  orgId,
  name: shopName,
  active: true,
  createdAt: FieldValue.serverTimestamp(),
};
if (address) data.address = address;
if (phone) data.phone = phone;

// Copia precios de mano de obra y medios de pago de otra sucursal de la misma organización
if (copyFrom) {
  const src = await db.doc(`shops/${copyFrom}`).get();
  if (!src.exists || src.data().orgId !== orgId) {
    console.error(`La sucursal "${copyFrom}" no existe o es de otra organización.`);
    process.exit(1);
  }
  if (src.data().laborPrices) data.laborPrices = src.data().laborPrices;
  if (src.data().paymentMethods) data.paymentMethods = src.data().paymentMethods;
}

await db.doc(`shops/${shopId}`).set(data);

console.log("\n✔ Sucursal creada");
console.log(`  Organización: ${org.data().name} (${orgId})`);
console.log(`  Sucursal:     ${shopName} (${shopId})`);
if (copyFrom) console.log(`  Copió precios y medios de pago de: ${copyFrom}`);
console.log("  Ya aparece en el selector del admin. Ahora puede crear su encargado desde Equipo.\n");
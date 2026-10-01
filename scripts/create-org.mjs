import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [orgName, shopName, adminName, adminEmail] = process.argv.slice(2);
if (!orgName || !shopName || !adminName || !adminEmail) {
  console.error('Uso: pnpm create-org "Organización" "Primera sucursal" "Nombre del admin" email');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const suffix = () => randomBytes(2).toString("hex");

const orgId = `${slug(orgName)}-${suffix()}`;
const shopId = `${slug(shopName)}-${suffix()}`;
const email = adminEmail.trim().toLowerCase();

const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("") + "A7";

const user = await auth.createUser({ email, password, displayName: adminName });

try {
  const batch = db.batch();
  batch.set(db.doc(`orgs/${orgId}`), { name: orgName, createdAt: FieldValue.serverTimestamp() });
  batch.set(db.doc(`shops/${shopId}`), {
    orgId,
    name: shopName,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`users/${user.uid}`), {
    orgId,
    shopId: null, // el admin es de toda la organización
    role: "admin",
    name: adminName,
    email,
    active: true,
    mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
} catch (e) {
  await auth.deleteUser(user.uid);
  throw e;
}

console.log("\n✔ Organización creada");
console.log(`  Organización: ${orgName} (${orgId})`);
console.log(`  Sucursal:     ${shopName} (${shopId})`);
console.log(`  Email:        ${email}`);
console.log(`  Contraseña:   ${password}   (temporal: se la pide cambiar al ingresar)\n`);
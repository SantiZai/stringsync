import { randomBytes } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [shopName, adminName, adminEmail] = process.argv.slice(2);
if (!shopName || !adminName || !adminEmail) {
  console.error('Uso: pnpm create-shop "Nombre del local" "Nombre del admin" email@del.admin');
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

const slug = shopName
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const shopId = `${slug}-${randomBytes(2).toString("hex")}`;

const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password =
  Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("") + "A7";

const user = await auth.createUser({
  email: adminEmail.trim().toLowerCase(),
  password,
  displayName: adminName,
});

try {
  const batch = db.batch();
  batch.set(db.doc(`shops/${shopId}`), {
    name: shopName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`users/${user.uid}`), {
    shopId,
    role: "admin",
    name: adminName,
    email: adminEmail.trim().toLowerCase(),
    active: true,
    mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
} catch (e) {
  await auth.deleteUser(user.uid);
  throw e;
}

console.log("\n✔ Local creado");
console.log(`  Local:      ${shopName} (${shopId})`);
console.log(`  Email:      ${adminEmail}`);
console.log(`  Contraseña: ${password}   (temporal: se la pide cambiar al ingresar)\n`);
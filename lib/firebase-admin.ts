import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno FIREBASE_ADMIN_* (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY). Revisá Vercel > Settings > Environment Variables."
    );
  }

  // Vercel suele pegar la key con comillas y con \n escapados
  privateKey = privateKey.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY mal formateada (no contiene BEGIN PRIVATE KEY)");
  }

  return { projectId, clientEmail, privateKey };
}

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const { projectId, clientEmail, privateKey } = getAdminConfig();
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
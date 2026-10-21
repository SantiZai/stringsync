import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  const code = (e as { code?: string }).code;
  console.error("[api] error interno:", code ? `${code} — ${e}` : e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export interface Actor {
  uid: string;
  orgId: string;
  shopId: string | null;
  role: "admin" | "encargado";
}

// Verifica el token de quien llama y que sea admin o encargado activo
export async function requireManager(req: Request): Promise<Actor> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token || token === "undefined" || token === "null")
    throw new HttpError(401, "No autenticado");

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid; // true = chequea sesiones revocadas
  } catch {
    throw new HttpError(401, "Sesión inválida. Volvé a ingresar");
  }

  // Si el Admin SDK no puede leer Firestore, casi siempre es por credenciales
  // mal configuradas en el servidor (FIREBASE_ADMIN_*), así que lo decimos claro.
  const data = await adminDb
    .doc(`users/${uid}`)
    .get()
    .then((snap) => snap.data())
    .catch((e) => {
      console.error("[auth] No se pudo leer el perfil en Firestore:", e);
      throw new HttpError(
        500,
        "No se pudo verificar tu usuario en el servidor. Revisá las variables FIREBASE_ADMIN_* en Vercel."
      );
    });
  if (
    !data ||
    !data.orgId ||
    !["admin", "encargado"].includes(data.role) ||
    data.active === false ||
    (data.role === "encargado" && !data.shopId)
  ) {
    throw new HttpError(403, "No tenés permisos para esta acción");
  }

  return {
    uid,
    orgId: data.orgId as string,
    shopId: (data.shopId ?? null) as string | null,
    role: data.role as "admin" | "encargado",
  };
}
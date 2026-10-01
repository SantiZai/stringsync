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
  console.error(e);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

// Verifica el token de quien llama y que sea admin activo. Devuelve su uid y su local.
export async function requireAdmin(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "No autenticado");

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid; // true = chequea sesiones revocadas
  } catch {
    throw new HttpError(401, "Sesión inválida. Volvé a ingresar");
  }

  const data = (await adminDb.doc(`users/${uid}`).get()).data();
  if (!data || data.role !== "admin" || data.active === false) {
    throw new HttpError(403, "No tenés permisos para esta acción");
  }
  return { uid, shopId: data.shopId as string };
}
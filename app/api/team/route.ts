import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server/require-admin";
import { passwordSchema } from "@/lib/password";

export const runtime = "nodejs";

const name = z.string().trim().min(2, "Ingresá el nombre").max(60);
const role = z.enum(["mostrador", "encordador"]); // los admin no se crean desde la app
const uid = z.string().min(1);

const createSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().email("Email inválido"),
  role,
  password: passwordSchema,
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), uid, name, role }),
  z.object({ action: z.literal("set_active"), uid, active: z.boolean() }),
  z.object({ action: z.literal("reset_password"), uid, password: passwordSchema }),
]);

// Solo se puede operar sobre usuarios del mismo local, que no sean admin ni uno mismo
async function loadTarget(admin: { uid: string; shopId: string }, targetUid: string) {
  if (targetUid === admin.uid) throw new HttpError(400, "No podés modificar tu propia cuenta desde acá");
  const ref = adminDb.doc(`users/${targetUid}`);
  const data = (await ref.get()).data();
  if (!data || data.shopId !== admin.shopId) throw new HttpError(404, "Usuario no encontrado");
  if (data.role === "admin") throw new HttpError(403, "No se puede modificar a un administrador");
  return ref;
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { name, email, role, password } = parsed.data;

    let created;
    try {
      created = await adminAuth.createUser({ email, password, displayName: name });
    } catch (e) {
      if ((e as { code?: string }).code === "auth/email-already-exists") {
        throw new HttpError(409, "Ya existe una cuenta con ese email");
      }
      throw e;
    }

    try {
      await adminDb.doc(`users/${created.uid}`).set({
        shopId: admin.shopId,
        role,
        name,
        email,
        active: true,
        mustChangePassword: true,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: admin.uid,
      });
    } catch (e) {
      await adminAuth.deleteUser(created.uid); // no dejamos una cuenta sin perfil
      throw e;
    }

    return NextResponse.json({ uid: created.uid });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const body = parsed.data;
    const ref = await loadTarget(admin, body.uid);

    if (body.action === "update") {
      await ref.update({ name: body.name, role: body.role });
      await adminAuth.updateUser(body.uid, { displayName: body.name });
    } else if (body.action === "set_active") {
      await adminAuth.updateUser(body.uid, { disabled: !body.active });
      if (!body.active) await adminAuth.revokeRefreshTokens(body.uid); // corta sus sesiones abiertas
      await ref.update({ active: body.active });
    } else {
      await adminAuth.updateUser(body.uid, { password: body.password });
      await adminAuth.revokeRefreshTokens(body.uid);
      await ref.update({ mustChangePassword: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
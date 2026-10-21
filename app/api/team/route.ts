import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireManager, type Actor } from "@/lib/server/require-admin";
import { passwordSchema } from "@/lib/password";

export const runtime = "nodejs";

const name = z.string().trim().min(2, "Ingresá el nombre").max(60);
const role = z.enum(["encargado", "mostrador", "encordador"]); // los admin no se crean desde la app
const uid = z.string().min(1);
const shopId = z.string().min(1, "Elegí la sucursal");

const createSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().email("Email inválido"),
  role,
  shopId,
  password: passwordSchema,
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), uid, name, role, shopId }),
  z.object({ action: z.literal("set_active"), uid, active: z.boolean() }),
  z.object({ action: z.literal("reset_password"), uid, password: passwordSchema }),
]);

// El encargado no puede nombrar encargados
function assertRole(actor: Actor, newRole: string) {
  if (actor.role === "encargado" && newRole === "encargado") {
    throw new HttpError(403, "Solo el administrador puede nombrar encargados");
  }
}

// La sucursal tiene que ser de la misma organización (y, para el encargado, la suya)
async function assertShop(actor: Actor, targetShopId: string) {
  if (actor.role === "encargado" && targetShopId !== actor.shopId) {
    throw new HttpError(403, "Solo podés gestionar el equipo de tu sucursal");
  }
  const shop = (await adminDb.doc(`shops/${targetShopId}`).get()).data();
  if (!shop || shop.orgId !== actor.orgId) throw new HttpError(404, "Sucursal no encontrada");
  if (shop.active === false) throw new HttpError(400, "La sucursal está inactiva");
}

// Errores del Admin SDK → respuestas que se puedan entender (y no un 500 misterioso)
function authHttpError(e: unknown): never {
  const code = (e as { code?: string }).code;
  if (code === "auth/insufficient-permission") {
    throw new HttpError(
      500,
      "Firebase rechazó las credenciales del servidor. Revisá las variables FIREBASE_ADMIN_* en Vercel."
    );
  }
  if (code === "auth/user-not-found") {
    throw new HttpError(404, "La cuenta de acceso de este usuario ya no existe. Eliminalo del equipo y volvé a crearlo.");
  }
  if (code === "auth/email-already-exists") throw new HttpError(409, "Ya existe una cuenta con ese email");
  if (code === "auth/uid-already-exists") throw new HttpError(409, "Ya existe una cuenta para este usuario");
  if (code === "auth/invalid-password" || code === "auth/invalid-email") throw new HttpError(400, "Datos de la cuenta inválidos");
  throw e;
}

// Solo se puede operar sobre usuarios de la misma organización, que no sean admin ni uno mismo
async function loadTarget(actor: Actor, targetUid: string) {
  if (targetUid === actor.uid) throw new HttpError(400, "No podés modificar tu propia cuenta desde acá");
  const ref = adminDb.doc(`users/${targetUid}`);
  const data = (await ref.get()).data();
  if (!data || data.orgId !== actor.orgId) throw new HttpError(404, "Usuario no encontrado");
  if (data.role === "admin") throw new HttpError(403, "No se puede modificar a un administrador");
  if (actor.role === "encargado" && (data.shopId !== actor.shopId || data.role === "encargado")) {
    throw new HttpError(403, "No tenés permisos sobre este usuario");
  }
  return ref;
}

export async function POST(req: Request) {
  try {
    const actor = await requireManager(req);
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { name, email, role, shopId, password } = parsed.data;

    assertRole(actor, role);
    await assertShop(actor, shopId);

    const created = await adminAuth.createUser({ email, password, displayName: name }).catch(authHttpError);

    try {
      await adminDb.doc(`users/${created.uid}`).set({
        orgId: actor.orgId,
        shopId,
        role,
        name,
        email,
        active: true,
        mustChangePassword: true,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
      });
    } catch (e) {
      await adminAuth.deleteUser(created.uid).catch(() => null); // no dejamos una cuenta sin perfil
      throw e;
    }

    return NextResponse.json({ uid: created.uid });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireManager(req);
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const body = parsed.data;
    const ref = await loadTarget(actor, body.uid);

    if (body.action === "update") {
      assertRole(actor, body.role);
      await assertShop(actor, body.shopId);
      await adminAuth.updateUser(body.uid, { displayName: body.name }).catch(authHttpError);
      await ref.update({ name: body.name, role: body.role, shopId: body.shopId });
    } else if (body.action === "set_active") {
      await adminAuth.updateUser(body.uid, { disabled: !body.active }).catch(authHttpError);
      if (!body.active) await adminAuth.revokeRefreshTokens(body.uid).catch(() => null); // corta sus sesiones abiertas
      await ref.update({ active: body.active });
    } else {
      try {
        await adminAuth.updateUser(body.uid, { password: body.password }); // reset_password
      } catch (e) {
        if ((e as { code?: string }).code !== "auth/user-not-found") authHttpError(e);
        // El perfil existe pero la cuenta de Auth no (p. ej. creada solo en Firestore):
        // la recreamos con el mismo uid para que el resto de los datos sigan valiendo.
        const profile = (await ref.get()).data();
        if (!profile?.email) {
          throw new HttpError(404, "Este usuario no tiene cuenta de acceso. Eliminalo del equipo y volvé a crearlo.");
        }
        await adminAuth
          .createUser({
            uid: body.uid,
            email: profile.email,
            password: body.password,
            displayName: profile.name ?? "",
          })
          .catch(authHttpError);
      }
      await adminAuth.revokeRefreshTokens(body.uid).catch(() => null);
      await ref.update({ mustChangePassword: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

// Elimina la cuenta de Auth y el perfil. Los pedidos, cobros y movimientos
// quedan intactos en el historial (guardan todo desnormalizado).
export async function DELETE(req: Request) {
  try {
    const actor = await requireManager(req);
    const parsed = z.object({ uid }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");
    const ref = await loadTarget(actor, parsed.data.uid);

    try {
      await adminAuth.deleteUser(parsed.data.uid);
    } catch (e) {
      // Si la cuenta de Auth ya no existe, igual se borra el perfil
      if ((e as { code?: string }).code !== "auth/user-not-found") authHttpError(e);
    }
    await adminAuth.revokeRefreshTokens(parsed.data.uid).catch(() => null);
    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
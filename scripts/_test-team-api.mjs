/* Test e2e temporal del /api/team — borrar después de usarlo. */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const tag = `t${Date.now()}`;
const orgId = `test-org-${tag}`;
const shopId = `test-shop-${tag}`;
const adminEmail = `test-admin-${tag}@test.debug`;
const memberEmail = `test-member-${tag}@test.debug`;
const orphanEmail = `test-orphan-${tag}@test.debug`;
const pass = "Abcdef1234";
const newPass = "Zyxwvu9876";

const authUsers = [];
const firestoreRefs = [];
let passed = 0;
let failed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function idTokenFor(user) {
  const custom = await auth.createCustomToken(user.uid);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`signInWithCustomToken: ${JSON.stringify(json.error)}`);
  return json.idToken;
}

async function signIn(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return { ok: res.ok, code: (await res.json()).error?.message ?? null };
}

async function api(method, token, body) {
  const res = await fetch(`${BASE}/api/team`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

let adminToken;
try {
  console.log(`Base: ${BASE} | org: ${orgId}`);

  // ---------- setup ----------
  const adminUser = await auth.createUser({ email: adminEmail, password: pass, displayName: "Test Admin" });
  authUsers.push(adminUser.uid);
  const adminRef = db.doc(`users/${adminUser.uid}`);
  firestoreRefs.push(adminRef);
  const orgRef = db.doc(`orgs/${orgId}`);
  const shopRef = db.doc(`shops/${shopId}`);
  firestoreRefs.push(orgRef, shopRef);
  await orgRef.set({ name: "Test Org", createdAt: FieldValue.serverTimestamp() });
  await shopRef.set({ orgId, name: "Test Shop", active: true, createdAt: FieldValue.serverTimestamp() });
  await adminRef.set({ orgId, shopId: null, role: "admin", name: "Test Admin", email: adminEmail, active: true });

  const orphanUid = `orphan-${tag}`;
  const orphanRef = db.doc(`users/${orphanUid}`);
  firestoreRefs.push(orphanRef);
  await orphanRef.set({ orgId, shopId, role: "mostrador", name: "Orphan", email: orphanEmail, active: true });

  adminToken = await idTokenFor(adminUser);

  // ---------- 1) POST crea miembro ----------
  const create = await api("POST", adminToken, { name: "Test Member", email: memberEmail, role: "mostrador", shopId, password: pass });
  check("POST create member -> 200", create.status === 200 && !!create.json.uid, `status=${create.status} ${JSON.stringify(create.json)}`);
  const memberUid = create.json.uid;
  if (memberUid) authUsers.push(memberUid);

  // ---------- 2) el miembro recién creado puede loguearse ----------
  const login1 = await signIn(memberEmail, pass);
  check("login con contraseña temporal recién creada", login1.ok, JSON.stringify(login1));

  // ---------- 3) PATCH reset_password y login con la nueva ----------
  const reset = await api("PATCH", adminToken, { action: "reset_password", uid: memberUid, password: newPass });
  check("PATCH reset_password -> 200", reset.status === 200, `status=${reset.status} ${JSON.stringify(reset.json)}`);
  const login2 = await signIn(memberEmail, newPass);
  check("login con contraseña restablecida", login2.ok, JSON.stringify(login2));

  // ---------- 4) reset sobre perfil huérfano (sin cuenta Auth) se auto-repara ----------
  const resetOrphan = await api("PATCH", adminToken, { action: "reset_password", uid: orphanUid, password: newPass });
  check("PATCH reset_password en huérfano -> 200 (self-heal)", resetOrphan.status === 200, `status=${resetOrphan.status} ${JSON.stringify(resetOrphan.json)}`);
  const loginOrphan = await signIn(orphanEmail, newPass);
  check("login del huérfano tras self-heal", loginOrphan.ok, JSON.stringify(loginOrphan));
  authUsers.push(orphanUid);

  // ---------- 5) set_active false y login rechazado ----------
  const deactivate = await api("PATCH", adminToken, { action: "set_active", uid: memberUid, active: false });
  check("PATCH set_active false -> 200", deactivate.status === 200, `status=${deactivate.status} ${JSON.stringify(deactivate.json)}`);
  const loginDisabled = await signIn(memberEmail, newPass);
  check("login de cuenta desactivada rechazado", !loginDisabled.ok && /user[-_]disabled/i.test(String(loginDisabled.code)), JSON.stringify(loginDisabled));

  const activate = await api("PATCH", adminToken, { action: "set_active", uid: memberUid, active: true });
  check("PATCH set_active true -> 200", activate.status === 200, `status=${activate.status} ${JSON.stringify(activate.json)}`);

  // ---------- 6) PATCH update (nombre) ----------
  const update = await api("PATCH", adminToken, { action: "update", uid: memberUid, name: "Test Member 2", role: "mostrador", shopId });
  check("PATCH update nombre -> 200", update.status === 200, `status=${update.status} ${JSON.stringify(update.json)}`);

  // ---------- 7) DELETE y login ya no existe ----------
  const del = await api("DELETE", adminToken, { uid: memberUid });
  check("DELETE member -> 200", del.status === 200, `status=${del.status} ${JSON.stringify(del.json)}`);
  const loginGone = await signIn(memberEmail, newPass);
  check("login tras DELETE rechazado", !loginGone.ok, JSON.stringify(loginGone));

  // ---------- 8) token inválido -> 401 ----------
  const noAuth = await api("POST", "tokendeado", { name: "X", email: "x@x.com", role: "mostrador", shopId, password: pass });
  check("POST sin token válido -> 401", noAuth.status === 401, `status=${noAuth.status}`);
} catch (e) {
  failed++;
  console.log("  FAIL  excepción inesperada:", e.message ?? e);
} finally {
  // ---------- cleanup ----------
  for (const uid of authUsers) await auth.deleteUser(uid).catch(() => null);
  for (const ref of firestoreRefs) await ref.delete().catch(() => null);
  console.log(`\nResultado: ${passed} pass, ${failed} fail`);
  process.exit(failed ? 1 : 0);
}

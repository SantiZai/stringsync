/* Test e2e de UI de los mensajes de WhatsApp — borrar después de usarlo.
   Cubre: login, edición en Configuración, validaciones, guardado en Firestore
   y que las plantillas custom lleguen a los links reales de WhatsApp. */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { pathToFileURL } from "node:url";

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

const pwPath = "C:/Users/santy/AppData/Local/Temp/opencode/pwtest/node_modules/playwright-core/index.js";
const mod = await import(pathToFileURL(pwPath).href);
const chromium = mod.chromium ?? mod.default?.chromium;
if (!chromium) throw new Error("No se pudo cargar playwright-core");

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const tag = `ui${Date.now()}`;
const orgId = `test-org-${tag}`;
const shopId = `test-shop-${tag}`;
const adminEmail = `test-admin-${tag}@test.debug`;
const pass = "Abcdef1234";
const ADDRESS = "Av. Corrientes 543";

const DEFAULT_RECIBIDO =
  "Hola {cliente}! Recibimos tu {raqueta} en {direccion}. Pedido #{pedido}. Te avisamos cuando esté lista.";
const DEFAULT_COMPROBANTE = "Hola {cliente}! Te dejo el comprobante de tu pedido #{pedido}.";
const CUSTOM_RECIBIDO = "¡Hola {cliente}! Anotamos tu {raqueta} en {direccion}. Pedido #{pedido}. ¡Gracias por confiar!";
const CUSTOM_LISTO = "¡{cliente}! Tu {raqueta} está lista en {direccion} — Pedido #{pedido}";

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

// Espera a que shops.messages cumpla la condición (evita carreras con el toast)
async function waitForMessages(pred, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const data = (await db.doc(`shops/${shopId}`).get()).data();
    if (pred(data?.messages ?? {})) return data.messages;
    if (Date.now() > until) return null;
    await new Promise((r) => setTimeout(r, 300));
  }
}

const cleanups = [];
try {
  // ---------- setup: org + 1 sucursal + admin ----------
  const adminUser = await auth.createUser({ email: adminEmail, password: pass, displayName: "UI Tester" });
  cleanups.push(() => auth.deleteUser(adminUser.uid).catch(() => null));
  cleanups.push(() => db.doc(`users/${adminUser.uid}`).delete().catch(() => null));
  await db.doc(`orgs/${orgId}`).set({ name: "Test Org UI" });
  await db.doc(`shops/${shopId}`).set({ orgId, name: "Local Deco", address: ADDRESS, active: true, createdAt: Timestamp.now() });
  await db.doc(`users/${adminUser.uid}`).set({
    orgId, shopId: null, role: "admin", name: "UI Tester", email: adminEmail, active: true,
  });
  cleanups.push(() => db.doc(`orgs/${orgId}`).delete().catch(() => null));
  cleanups.push(() => db.doc(`shops/${shopId}`).delete().catch(() => null));

  // ---------- browser ----------
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const shot = async (name) => {
    try { await page.screenshot({ path: `C:/Users/santy/AppData/Local/Temp/opencode/fail-${name}.png`, fullPage: true }); } catch { }
  };

  // login
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", adminEmail);
  await page.fill("#password", pass);
  await page.click("button[type=submit]");
  try {
    await page.waitForURL("**/pedidos", { timeout: 30000 });
    check("login como admin", true);
  } catch {
    await shot("login");
    check("login como admin", false, page.url());
  }

  // ---------- Configuración ----------
  await page.goto(`${BASE}/configuracion`, { waitUntil: "domcontentloaded" });
  await page.getByText("Mensajes de WhatsApp").waitFor({ timeout: 30000 });
  check("la tarjeta de mensajes se muestra", true);

  const taRecibido = page.locator('textarea[aria-label="Pedido recibido"]');
  check("el mensaje 'Pedido recibido' arranca abierto", await taRecibido.isVisible());
  check("arranca con el texto por defecto", (await taRecibido.inputValue()) === DEFAULT_RECIBIDO);

  // chip de variable inserta en el cursor
  await taRecibido.fill("");
  await page.locator('button:has-text("{cliente}")').first().click();
  check("el chip {cliente} inserta la variable", (await taRecibido.inputValue()) === "{cliente}", await taRecibido.inputValue());

  // validación: variable desconocida no guarda
  await taRecibido.fill("Hola {clientee}");
  await page.getByRole("button", { name: "Guardar mensajes" }).click();
  await page.getByText("no conozco la variable").waitFor({ timeout: 10000 });
  const blockedSnap = await db.doc(`shops/${shopId}`).get();
  check("guardar con variable desconocida se bloquea", !(blockedSnap.data()?.messages?.recibido), JSON.stringify(blockedSnap.data()?.messages));

  // guardar custom válido
  await taRecibido.fill(CUSTOM_RECIBIDO);
  await page.getByRole("button", { name: "Guardar mensajes" }).click();
  const savedRecibido = await waitForMessages((m) => m.recibido === CUSTOM_RECIBIDO);
  check("Firestore guarda el custom de recibido", savedRecibido?.recibido === CUSTOM_RECIBIDO, JSON.stringify(savedRecibido));
  await page.locator('span:has-text("Personalizado")').first().waitFor({ timeout: 5000 }).catch(() => null);
  check("badge 'Personalizado' en la fila", await page.locator('span:has-text("Personalizado")').first().isVisible());

  // acordeón: abrir 'Pedido listo' cierra el anterior
  await page.getByRole("button", { name: "Pedido listo" }).click();
  const taListo = page.locator('textarea[aria-label="Pedido listo"]');
  check("al abrir 'Pedido listo' se ve su textarea", await taListo.isVisible());
  check("'Pedido recibido' se cierra", !(await taRecibido.isVisible()));
  await taListo.fill(CUSTOM_LISTO);
  await page.getByRole("button", { name: "Guardar mensajes" }).click();
  const savedListo = await waitForMessages((m) => m.listo === CUSTOM_LISTO);
  check("Firestore guarda el custom de listo", savedListo?.listo === CUSTOM_LISTO, JSON.stringify(savedListo));

  // 'Restaurar por defecto' y estado sin guardar
  await page.getByRole("button", { name: "Comprobante" }).click();
  const taComprobante = page.locator('textarea[aria-label="Comprobante"]');
  await taComprobante.fill("Texto temporal");
  const saveBtn = page.getByRole("button", { name: "Guardar mensajes" });
  check("hay cambios sin guardar", !(await saveBtn.isDisabled()));
  await page.getByRole("button", { name: "Restaurar por defecto" }).click();
  check("restaurar vuelve al default", (await taComprobante.inputValue()) === DEFAULT_COMPROBANTE);
  check("sin cambios, guardar queda deshabilitado", await saveBtn.isDisabled());

  // ---------- pedidos: los links de WhatsApp usan las plantillas custom ----------
  const mkOrder = async (n, status, phone) => {
    const ref = db.collection("orders").doc(`${shopId}-o${n}`);
    await ref.set({
      orgId, shopId, number: n,
      customerId: "test-customer", customerName: "María López", customerPhone: phone,
      racketId: "test-racket", racketLabel: "Head Speed MP",
      spec: { mainString: "Verve Hyper", crossString: "Verve Hyper", mainTension: 24, crossTension: 23, tensionUnit: "kg", stringProvidedBy: "local", notes: "" },
      status, price: 1000, laborPrice: 1000, stringPrice: 0,
      paymentStatus: "pagado", paidAmount: 1000,
      promisedDate: Timestamp.now(), createdAt: Timestamp.now(), createdBy: adminUser.uid,
      statusHistory: [{ status, at: Timestamp.now(), by: adminUser.uid }],
    });
    cleanups.push(() => ref.delete().catch(() => null));
  };
  await mkOrder(901, "listo", "3411234567");
  await mkOrder(902, "recibido", "3417654321");

  await page.goto(`${BASE}/pedidos`, { waitUntil: "domcontentloaded" });
  const listoLink = page.locator('a[aria-label="Avisar por WhatsApp"]').first();
  await listoLink.waitFor({ timeout: 30000 });
  const listoHref = decodeURIComponent(await listoLink.getAttribute("href"));
  const expectedListo = CUSTOM_LISTO
    .replace("{cliente}", "María López")
    .replace("{raqueta}", "Head Speed MP")
    .replace("{direccion}", ADDRESS)
    .replace("{pedido}", "901");
  check("link 'Avisar por WhatsApp' usa la plantilla custom de listo", listoHref === `https://wa.me/5493411234567?text=${expectedListo}`, listoHref);

  // detalle del pedido recibido → link con la plantilla custom de recibido
  await page.locator('button:has-text("#902")').first().click();
  const dialogLink = page.locator('a:has-text("WhatsApp")').first();
  await dialogLink.waitFor({ timeout: 15000 });
  const recibidoHref = decodeURIComponent(await dialogLink.getAttribute("href"));
  const expectedRecibido = CUSTOM_RECIBIDO
    .replace("{cliente}", "María López")
    .replace("{raqueta}", "Head Speed MP")
    .replace("{direccion}", ADDRESS)
    .replace("{pedido}", "902");
  check("link del detalle usa la plantilla custom de recibido", recibidoHref === `https://wa.me/5493417654321?text=${expectedRecibido}`, recibidoHref);

  await browser.close();
} catch (e) {
  failed++;
  console.log("  FAIL  excepción inesperada:", e.message ?? e);
} finally {
  for (const c of cleanups.reverse()) await c().catch(() => null);
  console.log(`\nResultado: ${passed} pass, ${failed} fail`);
  process.exit(failed ? 1 : 0);
}

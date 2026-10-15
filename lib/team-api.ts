import { auth } from "@/lib/firebase";

export type TeamRole = "encargado" | "mostrador" | "encordador";

type PatchBody =
  | { action: "update"; uid: string; name: string; role: TeamRole; shopId: string }
  | { action: "set_active"; uid: string; active: boolean }
  | { action: "reset_password"; uid: string; password: string };

async function call(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("No autenticado. Volvé a ingresar.");
  const res = await fetch("/api/team", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[team-api] ${method} /api/team -> ${res.status}`, json);
    throw new Error(json.error ?? `No se pudo completar la acción (${res.status})`);
  }
  return json;
}

export const createMember = (input: {
  name: string;
  email: string;
  role: TeamRole;
  shopId: string;
  password: string;
}) => call("POST", input);

export const updateMember = (body: PatchBody) => call("PATCH", body);

export const deleteMember = (uid: string) => call("DELETE", { uid });
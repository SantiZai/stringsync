import { auth } from "@/lib/firebase";

export type TeamRole = "encargado" | "mostrador" | "encordador";

type PatchBody =
  | { action: "update"; uid: string; name: string; role: TeamRole; shopId: string }
  | { action: "set_active"; uid: string; active: boolean }
  | { action: "reset_password"; uid: string; password: string };

async function call(method: "POST" | "PATCH", body: unknown) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/team", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "No se pudo completar la acción");
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
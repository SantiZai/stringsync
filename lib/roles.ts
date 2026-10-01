import type { Role } from "@/types";

export const isManager = (r?: Role) => r === "admin" || r === "encargado";
export const isStaff = (r?: Role) => r === "admin" || r === "encargado" || r === "mostrador";
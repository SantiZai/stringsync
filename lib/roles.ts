import type { Role } from "@/types";

export const isAdmin = (r?: Role) => r === "admin";
export const isManager = (r?: Role) => r === "admin" || r === "encargado";
export const isStaff = (r?: Role) => r === "admin" || r === "encargado" || r === "mostrador";
export const isWorkshop = (r?: Role) => r === "encordador";

// ── Permisos por acción (reflejan las reglas de Firestore)

/** Crear pedidos, cobrar, entregar, cancelar, ver clientes y caja */
export const canOperate = isStaff;

/** Editar el catálogo de cuerdas y ver costos */
export const canEditCatalog = isAdmin;

/** Stock mínimo y precio propio de la sucursal, mano de obra y medios de pago */
export const canEditShopSettings = isManager;

/** Anular cobros y eliminar raquetas */
export const canVoidPayments = isManager;

/** Crear y administrar cuentas del equipo */
export const canManageTeam = isManager;

/** Crear y editar sucursales, y nombrar encargados */
export const canManageBranches = isAdmin;
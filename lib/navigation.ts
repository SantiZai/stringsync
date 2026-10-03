import type { IconSvgElement } from "@hugeicons/react";
import {
  Task01Icon,
  UserGroupIcon,
  Wallet01Icon,
  PackageIcon,
  Settings01Icon,
  Analytics01Icon
} from "@hugeicons/core-free-icons";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: IconSvgElement;
  roles: Role[];
  mobile?: boolean;
}

const ALL: Role[] = ["admin", "encargado", "mostrador", "encordador"];
const STAFF: Role[] = ["admin", "encargado", "mostrador"];
const MANAGERS: Role[] = ["admin", "encargado"];

export const navItems: NavItem[] = [
  { label: "Pedidos", href: "/pedidos", icon: Task01Icon, roles: ALL },
  { label: "Clientes", href: "/clientes", icon: UserGroupIcon, roles: STAFF },
  { label: "Cuerdas", href: "/cuerdas", icon: PackageIcon, roles: STAFF },
  { label: "Caja", href: "/caja", icon: Wallet01Icon, roles: STAFF },
  { label: "Ajustes", href: "/configuracion", icon: Settings01Icon, roles: MANAGERS },
  { label: "Reportes", href: "/reportes", icon: Analytics01Icon, roles: MANAGERS, mobile: false },
];

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  encargado: "Encargado",
  mostrador: "Mostrador",
  encordador: "Encordador",
};

// El orden importa: gana la primera coincidencia
const routeRoles: [string, Role[]][] = [
  ["/pedidos/nuevo", STAFF],
  ["/pedidos", ALL],
  ["/clientes", STAFF],
  ["/cuerdas", STAFF],
  ["/caja", STAFF],
  ["/configuracion/sucursales", ["admin"]],
  ["/configuracion", MANAGERS],
  ["/reportes", MANAGERS],
];

export function canAccess(role: Role, pathname: string): boolean {
  const match = routeRoles.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return match ? match[1].includes(role) : true;
}
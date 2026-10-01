import type { IconSvgElement } from "@hugeicons/react";
import {
  Task01Icon,
  UserGroupIcon,
  Wallet01Icon,
  PackageIcon,
  Settings01Icon
} from "@hugeicons/core-free-icons";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: IconSvgElement;
  roles: Role[];
}

export const navItems: NavItem[] = [
  { label: "Pedidos", href: "/pedidos", icon: Task01Icon, roles: ["admin", "mostrador", "encordador"] },
  { label: "Clientes", href: "/clientes", icon: UserGroupIcon, roles: ["admin", "mostrador"] },
  { label: "Cuerdas", href: "/cuerdas", icon: PackageIcon, roles: ["admin", "mostrador"] },
  { label: "Caja", href: "/caja", icon: Wallet01Icon, roles: ["admin", "mostrador"] },
  { label: "Configuración", href: "/configuracion", icon: Settings01Icon, roles: ["admin"] },
];

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  mostrador: "Mostrador",
  encordador: "Encordador",
};

// El orden importa: gana la primera coincidencia
const routeRoles: [string, Role[]][] = [
  ["/pedidos/nuevo", ["admin", "mostrador"]],
  ["/pedidos", ["admin", "mostrador", "encordador"]],
  ["/clientes", ["admin", "mostrador"]],
  ["/cuerdas", ["admin", "mostrador"]],
  ["/caja", ["admin", "mostrador"]],
  ["/configuracion", ["admin"]],
];

export function canAccess(role: Role, pathname: string): boolean {
  const match = routeRoles.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return match ? match[1].includes(role) : true;
}
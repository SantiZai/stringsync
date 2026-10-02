import type { Timestamp } from "firebase/firestore";

export type Sport = "tenis" | "padel" | "squash" | "badminton";

export type Role = "admin" | "encargado" | "mostrador" | "encordador";

export interface AppUser {
  uid: string;
  orgId: string;
  shopId: string | null; // el admin no pertenece a una sucursal
  role: Role;
  name: string;
  email: string;
  active?: boolean;
  mustChangePassword?: boolean;
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone: string; // guardado normalizado, solo dígitos
  email?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface Racket {
  id: string;
  orgId: string;
  customerId: string;
  brand: string;
  model: string;
  sport: Sport;
  photoUrl?: string;
  // configuración habitual, para "repetir último encordado"
  usualSetup?: StringingSpec | null;
}

export interface StringingSpec {
  mainString: string;
  crossString: string;
  mainTension: number;
  crossTension: number;
  tensionUnit: "kg" | "lb";
  stringProvidedBy: "local" | "cliente";
  prestretch?: boolean;
  notes?: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Shop {
  id: string;
  orgId: string;
  name: string;
  address?: string;
  phone?: string;
  active?: boolean;
  laborPrices?: Partial<Record<Sport, number>>;
  paymentMethods?: string[];
}

export interface Payment {
  id: string;
  orgId: string;
  shopId: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  amount: number;
  method: string; // se guarda el nombre, así renombrar un medio no altera el historial
  note?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
  voided?: boolean;
  voidedAt?: Timestamp;
  voidedBy?: string;
}

export type OrderStatus =
  | "recibido"
  | "en_cola"
  | "encordando"
  | "listo"
  | "entregado"
  | "cancelado";

export type PaymentStatus = "pendiente" | "sena" | "pagado";

export interface Order {
  id: string;
  orgId: string;
  shopId: string;
  number: number; // correlativo por sucursal
  customerId: string;
  customerName: string; // desnormalizado para listar rápido
  customerPhone: string;
  stringId?: string | null; // cuerda del catálogo usada (descuenta stock)
  racketId: string;
  racketLabel: string; // "Babolat Pure Drive"
  spec: StringingSpec;
  status: OrderStatus;
  price: number;
  laborPrice: number;
  stringPrice: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  promisedDate: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  statusHistory: { status: OrderStatus; at: Timestamp; by: string }[];
}

export interface StringItem {
  id: string;
  orgId: string;
  brand: string;
  model: string;
  gauge: string;
  color: string;
  costPrice: number;
  salePrice: number; // precio general del catálogo
  setsPerRoll?: number; // cuántos encordados rinde un rollo (si se vende por rollo)
  active: boolean;
  createdAt: Timestamp;
}

// Un documento por cuerda y por sucursal. id = `${shopId}_${stringId}`
export interface StringStock {
  id: string;
  orgId: string;
  shopId: string;
  stringId: string;
  stock: number;
  minStock: number;
  salePrice?: number; // si existe, pisa el precio del catálogo en esa sucursal
}

// Lo que ve la interfaz: catálogo + stock de la sucursal activa (o la suma de todas)
export type StringView = StringItem & {
  stock: number;
  minStock: number;
  catalogPrice: number; // salePrice pasa a ser el precio efectivo
};

export interface StockMovement {
  id: string;
  orgId: string;
  shopId: string;
  stringId: string;
  stringLabel: string;
  type: "ingreso" | "ajuste" | "consumo" | "devolucion";
  quantity: number; // con signo: +5, -1
  unit?: "set" | "rollo"; // cómo se cargó el movimiento
  units?: number;         // cantidad en esa unidad (quantity sigue en sets)
  orderId?: string;
  orderNumber?: number;
  note?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
}
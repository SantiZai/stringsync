import type { Timestamp } from "firebase/firestore";

export type Sport = "tenis" | "padel" | "squash" | "badminton";

export type Role = "admin" | "mostrador" | "encordador";

export interface AppUser {
  uid: string;
  shopId: string;
  role: Role;
  name: string;
  email: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string; // guardado normalizado, solo dígitos
  email?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface Racket {
  id: string;
  shopId: string;
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

export interface Shop {
  id: string;
  name: string;
  phone?: string;
  laborPrices?: Partial<Record<Sport, number>>;
  paymentMethods?: string[];
}

export interface Payment {
  id: string;
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
  shopId: string;
  number: number; // correlativo por local
  customerId: string;
  customerName: string; // desnormalizado para listar rápido
  customerPhone: string;
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
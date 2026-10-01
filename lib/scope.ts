import { where, type QueryConstraint } from "firebase/firestore";

// shopId null = toda la organización (solo el admin)
export interface Scope {
  orgId: string;
  shopId: string | null;
}

export const scopeWhere = (s: Scope): QueryConstraint[] =>
  s.shopId
    ? [where("orgId", "==", s.orgId), where("shopId", "==", s.shopId)]
    : [where("orgId", "==", s.orgId)];
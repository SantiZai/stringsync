"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { subscribeOrgRackets } from "@/lib/firestore/rackets";
import type { Racket } from "@/types";

export function useOrgRackets() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId;
  const [rackets, setRackets] = useState<Racket[]>([]);

  useEffect(() => {
    if (!orgId) return;
    return subscribeOrgRackets(orgId, setRackets);
  }, [orgId]);

  return rackets;
}
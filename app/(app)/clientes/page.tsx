"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { useCustomers } from "@/hooks/use-customers";
import { digitsOnly, fold } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";

import { initials } from "@/lib/text";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MAX_RESULTS = 100;

export default function ClientesPage() {
  const router = useRouter();
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const results = useMemo(() => {
    const q = fold(search.trim());
    if (!q) return customers;
    const digits = digitsOnly(search);
    return customers.filter(
      (c) => fold(c.name).includes(q) || (digits.length >= 3 && c.phone.includes(digits))
    );
  }, [customers, search]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Clientes"
        description={`${customers.length} en total`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="h-11 rounded-xl bg-card pl-9 shadow-sm"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl bg-card/50 border border-dashed p-8 text-center text-sm text-muted-foreground">
          {customers.length === 0
            ? "Todavía no cargaste clientes."
            : "No encontramos clientes con esa búsqueda."}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {results.slice(0, MAX_RESULTS).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.phone}</p>
                  </div>
                  {c.email && (
                    <span className="hidden truncate text-sm text-muted-foreground sm:block">{c.email}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {results.length > MAX_RESULTS && (
            <p className="text-center text-sm text-muted-foreground">
              Mostrando {MAX_RESULTS} de {results.length}. Afiná la búsqueda para ver el resto.
            </p>
          )}
        </>
      )}

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={customers}
        onSaved={(id) => router.push(`/clientes/${id}`)}
      />
    </div>
  );
}
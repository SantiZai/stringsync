"use client";

import { useState } from "react";

import { useAuth } from "@/providers/auth-provider";
import { useScope, useShops } from "@/providers/shop-provider";
import { useCustomers } from "@/hooks/use-customers";
import { useReport } from "@/hooks/use-report";
import { useStrings } from "@/hooks/use-strings";
import { formatPeriod, presetRange, type Period, type PresetKey } from "@/lib/reports";
import { isAdmin, isManager } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ClientsTab } from "@/components/reports/clients-tab";
import { IncomeTab } from "@/components/reports/income-tab";
import { PeriodPicker } from "@/components/reports/period-picker";
import { StringsTab } from "@/components/reports/strings-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "ingresos" | "clientes" | "cuerdas";

export default function ReportesPage() {
  const { appUser } = useAuth();
  const { shops } = useShops();
  const scope = useScope();
  const { customers } = useCustomers();
  const { strings } = useStrings();

  const manager = isManager(appUser?.role);
  const [preset, setPreset] = useState<PresetKey>("mes");
  const [period, setPeriod] = useState<Period>(() => presetRange("mes"));
  const [tab, setTab] = useState<Tab>("ingresos");

  // Solo se consulta si el rol puede ver reportes
  const report = useReport(manager ? scope : null, period);

  if (appUser && !manager) {
    return <p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>;
  }

  const allBranches = (scope?.shopId ?? null) === null;
  const scopeName = allBranches
    ? "Todas las sucursales"
    : (shops.find((s) => s.id === scope?.shopId)?.name ?? "Sucursal");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Reportes" description={`${scopeName} · ${formatPeriod(period)}`} />

      <PeriodPicker
        preset={preset}
        onChange={(k, p) => {
          setPreset(k);
          setPeriod(p);
        }}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="ingresos" className="flex-1">
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex-1">
            Clientes
          </TabsTrigger>
          <TabsTrigger value="cuerdas" className="flex-1">
            Cuerdas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {report.loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-52 w-full" />
        </div>
      ) : report.error ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los reportes. Si es la primera vez, falta crear un índice en
          Firestore: abrí la consola del navegador, hacé clic en el link del error y esperá un par
          de minutos.
        </div>
      ) : tab === "ingresos" ? (
        <IncomeTab
          payments={report.payments}
          prevPayments={report.prevPayments}
          orders={report.orders}
          period={period}
          allBranches={allBranches}
        />
      ) : tab === "clientes" ? (
        <ClientsTab orders={report.orders} customers={customers} period={period} />
      ) : (
        <StringsTab
          orders={report.orders}
          catalog={strings}
          isAdmin={isAdmin(appUser?.role)}
        />
      )}
    </div>
  );
}
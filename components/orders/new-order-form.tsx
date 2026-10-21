"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useCustomers } from "@/hooks/use-customers";
import { useShop } from "@/hooks/use-shop";
import { useStrings } from "@/hooks/use-strings";
import { subscribeCustomerRackets, updateRacketSetup } from "@/lib/firestore/rackets";
import { createOrder, type NewOrderInput } from "@/lib/firestore/orders";
import { DEFAULT_TENSION_UNIT } from "@/lib/constants";
import { formatDay, money, parseAmount } from "@/lib/format";
import { formatStock, matchCatalogString, stringLabelWithColor, setupSummary } from "@/lib/strings";
import { fold, digitsOnly, initials } from "@/lib/text";
import { orderMessage, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Racket, StringingSpec } from "@/types";

import { BranchRequired } from "@/components/branch-required";
import { PageHeader } from "@/components/page-header";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { RacketFormDialog } from "@/components/customers/racket-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providerLabels = { local: "La pone el local", cliente: "La trae el cliente" } as const;

interface SpecForm {
  mainString: string;
  sameCrossString: boolean;
  crossString: string;
  crossProvider: StringingSpec["stringProvidedBy"];
  mainTension: string;
  sameCrossTension: boolean;
  crossTension: string;
  unit: StringingSpec["tensionUnit"];
  provider: StringingSpec["stringProvidedBy"];
  prestretch: boolean;
  notes: string;
}

const emptySpec: SpecForm = {
  mainString: "",
  sameCrossString: true,
  crossString: "",
  crossProvider: "local",
  mainTension: "",
  sameCrossTension: true,
  crossTension: "",
  unit: DEFAULT_TENSION_UNIT,
  provider: "local",
  prestretch: false,
  notes: "",
};

// Compara la config del pedido con la habitual de la raqueta. Ignora el
// proveedor y la cuerda del catálogo: pickRacket los deriva del match con
// el catálogo (no se guardan tal cual), así no preguntamos por cambios que
// el usuario no hizo.
function setupDiffers(a: StringingSpec, b: StringingSpec) {
  const t = (s?: string) => fold((s ?? "").trim());
  return (
    t(a.mainString) !== t(b.mainString) ||
    t(a.crossString) !== t(b.crossString) ||
    a.mainTension !== b.mainTension ||
    a.crossTension !== b.crossTension ||
    a.tensionUnit !== b.tensionUnit ||
    a.prestretch !== b.prestretch ||
    t(a.notes) !== t(b.notes)
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {n}
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function NewOrderForm() {
  const router = useRouter();
  const preselected = useSearchParams().get("cliente");
  const { appUser } = useAuth();
  const shop = useShop(); // sucursal activa (null si el admin está en "Todas")
  const { customers } = useCustomers();
  const { strings, loading: stringsLoading } = useStrings();

  const activeStrings = useMemo(() => strings.filter((s) => s.active), [strings]);

  // Cliente
  const [customerId, setCustomerId] = useState<string | null>(preselected);
  const [search, setSearch] = useState("");
  const [customerDialog, setCustomerDialog] = useState(false);

  // Raqueta
  const [rackets, setRackets] = useState<Racket[]>([]);
  const [racketId, setRacketId] = useState<string | null>(null);
  const [racketDialog, setRacketDialog] = useState(false);

  // Encordado
  const [f, setF] = useState<SpecForm>(emptySpec);
  const patch = (p: Partial<SpecForm>) => setF((prev) => ({ ...prev, ...p }));
  const [stringId, setStringId] = useState<string | null>(null);
  // Si el usuario eligió el proveedor a mano, no se lo pisamos con el autocompletado
  const [providerTouched, setProviderTouched] = useState(false);
  // Cuerda cruzada: solo cuando es distinta de la principal
  const [crossStringId, setCrossStringId] = useState<string | null>(null);
  const [crossTouched, setCrossTouched] = useState(false);

  // Entrega
  const [promised, setPromised] = useState<Date>(() => startOfDay(addDays(new Date(), 1)));
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Precio
  const [labor, setLabor] = useState("");
  const [stringPrice, setStringPrice] = useState("");
  const [crossPrice, setCrossPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirmación al confirmar el pedido: si la config cambió respecto de la
  // habitual de la raqueta, preguntamos si queremos actualizarla. El diálogo
  // está abierto mientras `pending` tenga datos.
  const [pending, setPending] = useState<NewOrderInput | null>(null);
  const [confirmAction, setConfirmAction] = useState<"create" | "update" | null>(null);
  const [confirmStep, setConfirmStep] = useState<"setup" | "order">("order");

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const racket = rackets.find((r) => r.id === racketId) ?? null;
  const catalogString = activeStrings.find((s) => s.id === stringId) ?? null;
  const crossCatalogString = activeStrings.find((s) => s.id === crossStringId) ?? null;
  // Las dos del local: se cobra solo la más cara de las dos
  const bothLocal =
    f.provider === "local" && !f.sameCrossString && f.crossProvider === "local";

  // Buscador de clientes
  const matches = useMemo(() => {
    const q = fold(search.trim());
    if (!q) return [];
    const digits = digitsOnly(search);
    return customers
      .filter((c) => fold(c.name).includes(q) || (digits.length >= 3 && c.phone.includes(digits)))
      .slice(0, 5);
  }, [customers, search]);

  // Raquetas del cliente elegido (compartidas en toda la organización)
  useEffect(() => {
    setRacketId(null);
    setRackets([]);
    setStringId(null);
    setCrossStringId(null);
    setCrossPrice("");
    if (!appUser || !customerId) return;
    return subscribeCustomerRackets(appUser.orgId, customerId, setRackets);
  }, [appUser, customerId]);

  function pickRacket(r: Racket) {
    const s = r.usualSetup;
    // Si la cuerda habitual está en el catálogo (link por id o por nombre),
    // va por el local con su precio. Si no la tenemos, queda como traída
    // por el cliente (con el nombre igual anotado).
    const match = s ? matchCatalogString(activeStrings, s) : undefined;
    const provider = s && !match && !stringsLoading ? "cliente" : "local";
    const sameCross = s ? s.crossString === s.mainString : true;
    const crossMatch =
      s && !sameCross
        ? matchCatalogString(activeStrings, {
            mainString: s.crossString,
            stringId: s.crossStringId ?? null,
          })
        : undefined;

    setRacketId(r.id);
    setProviderTouched(false);
    setCrossTouched(false);
    setF({
      mainString: s?.mainString ?? "",
      sameCrossString: sameCross,
      crossString: s && !sameCross ? s.crossString : "",
      crossProvider:
        s && !sameCross && !crossMatch && !stringsLoading ? "cliente" : "local",
      mainTension: s ? String(s.mainTension) : "",
      sameCrossTension: s ? s.crossTension === s.mainTension : true,
      crossTension: s && s.crossTension !== s.mainTension ? String(s.crossTension) : "",
      unit: s?.tensionUnit ?? DEFAULT_TENSION_UNIT,
      provider,
      prestretch: s?.prestretch ?? false,
      notes: s?.notes ?? "",
    });
    setStringId(match?.id ?? null);
    setStringPrice(match ? String(match.salePrice) : "");
    setCrossStringId(crossMatch?.id ?? null);
    setCrossPrice(crossMatch ? String(crossMatch.salePrice) : "");
  }

  function pickCatalogString(value: string) {
    if (value === "otra") {
      setStringId(null);
      return;
    }
    const s = activeStrings.find((x) => x.id === value);
    if (!s) return;
    setStringId(s.id);
    patch({ mainString: stringLabelWithColor(s) });
    setStringPrice(String(s.salePrice)); // ya viene con el precio propio de la sucursal, si lo hay
  }

  function pickCrossCatalogString(value: string) {
    if (value === "otra") {
      setCrossStringId(null);
      setCrossPrice("");
      return;
    }
    const s = activeStrings.find((x) => x.id === value);
    if (!s) return;
    setCrossStringId(s.id);
    patch({ crossString: stringLabelWithColor(s) });
    setCrossPrice(String(s.salePrice));
  }

  // Si el cliente tiene una sola raqueta, se elige sola
  useEffect(() => {
    if (rackets.length === 1 && !racketId) pickRacket(rackets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rackets]);

  // Si el catálogo termina de cargar después de elegir la raqueta, se reevalúa
  // el proveedor (local si la cuerda habitual está, cliente si no). No pisa
  // lo que el usuario ya eligió o escribió a mano.
  useEffect(() => {
    if (stringsLoading || !racket?.usualSetup) return;
    const su = racket.usualSetup;

    // principal: local si la cuerda habitual está, cliente si no
    if (!providerTouched && f.mainString.trim() === su.mainString.trim()) {
      const match = matchCatalogString(activeStrings, su);
      if (match && (f.provider !== "local" || stringId !== match.id)) {
        patch({ provider: "local" });
        setStringId(match.id);
        setStringPrice(String(match.salePrice));
      } else if (!match && f.provider !== "cliente") {
        patch({ provider: "cliente" });
        setStringId(null);
        setStringPrice("");
      }
    }

    // Ídem con la cruzada, solo cuando es distinta de la principal
    const setupDiffCross = su.crossString !== su.mainString;
    if (!crossTouched && !f.sameCrossString && setupDiffCross &&
        f.crossString.trim() === su.crossString.trim()) {
      const crossMatch = matchCatalogString(activeStrings, {
        mainString: su.crossString,
        stringId: su.crossStringId ?? null,
      });
      if (crossMatch && (f.crossProvider !== "local" || crossStringId !== crossMatch.id)) {
        patch({ crossProvider: "local" });
        setCrossStringId(crossMatch.id);
        setCrossPrice(String(crossMatch.salePrice));
      } else if (!crossMatch && f.crossProvider !== "cliente") {
        patch({ crossProvider: "cliente" });
        setCrossStringId(null);
        setCrossPrice("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStrings, stringsLoading, racket?.id, providerTouched, crossTouched]);

  // Mano de obra según el deporte y los precios de la sucursal
  useEffect(() => {
    if (!racket) return;
    const p = shop?.laborPrices?.[racket.sport];
    setLabor(p != null ? String(p) : "");
  }, [racket?.id, racket?.sport, shop?.laborPrices]); // eslint-disable-line react-hooks/exhaustive-deps

  // La cuerda se cobra una sola vez: si las dos son del local, la más cara
  const mainStringCost = f.provider === "local" ? parseAmount(stringPrice) : 0;
  const crossStringCost =
    !f.sameCrossString && f.crossProvider === "local" ? parseAmount(crossPrice) : 0;
  const stringCost = Math.max(mainStringCost, crossStringCost);
  const total = parseAmount(labor) + stringCost;

  const quickDates = [
    { label: "Hoy", days: 0 },
    { label: "Mañana", days: 1 },
    { label: "En 2 días", days: 2 },
    { label: "En 3 días", days: 3 },
    { label: "En 1 semana", days: 7 },
  ].map((o) => ({ ...o, date: startOfDay(addDays(new Date(), o.days)) }));
  const isQuick = quickDates.some((o) => isSameDay(o.date, promised));

  async function finish(data: NewOrderInput, updateSetup: boolean) {
    if (!appUser || !shop) return;

    setConfirmAction(updateSetup ? "update" : "create");
    setConfirmStep(updateSetup ? "setup" : "order");
    setSaving(true);
    let phase: "setup" | "order" = updateSetup ? "setup" : "order";

    try {
      if (updateSetup) {
        await updateRacketSetup(data.racketId, { ...data.spec, stringId: data.stringId });
        phase = "order";
        setConfirmStep("order");
      }
      const number = await createOrder(appUser, shop.id, data);
      const link = whatsappLink(data.customerPhone, orderMessage("recibido", { ...data, number }, shop));
      toast.success(`Pedido #${number} creado`, {
        duration: 10000,
        action: { label: "Avisar por WhatsApp", onClick: () => window.open(link, "_blank") },
      });
      router.push("/pedidos");
    } catch {
      toast.error(
        phase === "setup" ? "No se pudo actualizar la configuración" : "No se pudo crear el pedido"
      );
      setSaving(false);
      setConfirmAction(null);
      setConfirmStep("order");
    }
  }

  async function submit() {
    if (!appUser || !shop || !customer || !racket) return;

    const mt = parseAmount(f.mainTension);
    if (!(mt > 0)) return toast.error("Ingresá la tensión principal");
    if (!f.sameCrossString && f.crossProvider === "local" && !f.crossString.trim())
      return toast.error("Ingresá la cuerda cruzada");
    if (!f.sameCrossTension && !(parseAmount(f.crossTension) > 0))
      return toast.error("Ingresá la tensión cruzada");
    if (f.provider === "local" && !f.mainString.trim()) return toast.error("Ingresá la cuerda principal");

    const main = f.mainString.trim() || "Cuerda del cliente";
    const cross = f.sameCrossString ? main : f.crossString.trim() || "Cuerda del cliente";
    // Un segundo uso de cuerda solo si la cruzada es distinta: eso agrega su
    // propio set de stock (una cuerda igual = un solo set, como siempre).
    const secondString = !f.sameCrossString && fold(cross) !== fold(main);

    const spec: StringingSpec = {
      mainString: main,
      crossString: cross,
      mainTension: mt,
      crossTension: f.sameCrossTension ? mt : parseAmount(f.crossTension),
      tensionUnit: f.unit,
      stringProvidedBy: f.provider,
      ...(secondString
        ? {
            crossStringProvidedBy: f.crossProvider,
            crossStringId: f.crossProvider === "local" ? crossStringId : null,
          }
        : {}),
      prestretch: f.prestretch,
      notes: f.notes.trim(),
    };

    const data: NewOrderInput = {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      racketId: racket.id,
      racketLabel: `${racket.brand} ${racket.model}`,
      spec,
      stringId: f.provider === "local" ? stringId : null,
      crossStringId: secondString && f.crossProvider === "local" ? crossStringId : null,
      laborPrice: parseAmount(labor),
      stringPrice: stringCost, // si las dos son del local, se cobra la más cara
      price: total,
      promisedDate: promised,
    };

    // Si la config del pedido difiere de la habitual de la raqueta (o la
    // raqueta todavía no tiene), recién ahí, al confirmar, preguntamos.
    if (!racket.usualSetup || setupDiffers(spec, racket.usualSetup)) {
      setPending(data);
      return;
    }

    await finish(data, false);
  }

  function changeConfirm(open: boolean) {
    if (saving) return; // mientras carga no se cierra
    if (!open) setPending(null);
  }

  // Después de todos los hooks: el admin en "Todas" tiene que elegir una sucursal
  if (!shop) return <BranchRequired action="crear un pedido" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Nuevo pedido" description={shop.name} />

      {/* 1. Cliente */}
      <Section n={1} title="Cliente">
        {customer ? (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{customer.name}</p>
              <p className="truncate text-sm text-muted-foreground">{customer.phone}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCustomerId(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
              autoFocus
            />
            {matches.length > 0 && (
              <ul className="space-y-2">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <span className="text-sm text-muted-foreground">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" onClick={() => setCustomerDialog(true)}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Cliente nuevo
            </Button>
          </div>
        )}
      </Section>

      {/* 2. Raqueta */}
      {customer && (
        <Section n={2} title="Raqueta">
          {rackets.length === 0 && (
            <p className="text-sm text-muted-foreground">Este cliente todavía no tiene raquetas.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {rackets.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRacket(r)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:border-primary/40",
                  r.id === racketId && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <span className="block font-medium">
                  {r.brand} {r.model}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {r.usualSetup ? setupSummary(r.usualSetup) : "Sin configuración habitual"}
                </span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setRacketDialog(true)}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
            Raqueta nueva
          </Button>
        </Section>
      )}

      {/* 3. Encordado */}
      {racket && (
        <Section n={3} title="Encordado">
          <div className="space-y-2">
            <Label>Cuerda</Label>
            <Select
              value={f.provider}
              onValueChange={(v) => {
                if (!v) return;
                setProviderTouched(true);
                patch({ provider: v as SpecForm["provider"] });
                if (v === "cliente") setStringId(null); // la cuerda del cliente no toca el stock
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{providerLabels[f.provider]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">{providerLabels.local}</SelectItem>
                <SelectItem value="cliente">{providerLabels.cliente}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {f.provider === "local" && activeStrings.length > 0 && (
              <div className="space-y-2">
                <Label>Cuerda del catálogo</Label>
                <Select value={stringId ?? "otra"} onValueChange={(v) => v && pickCatalogString(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {catalogString ? stringLabelWithColor(catalogString) : "Otra (sin control de stock)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeStrings.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {stringLabelWithColor(s)} · {s.stock > 0 ? formatStock(s.stock, s.setsPerRoll).main : "sin stock"}
                      </SelectItem>
                    ))}
                    <SelectItem value="otra">Otra (sin control de stock)</SelectItem>
                  </SelectContent>
                </Select>
                {catalogString && catalogString.stock <= 0 && (
                  <p className="text-xs text-destructive">
                    Esta cuerda figura sin stock en {shop.name}. Si seguís, el stock va a quedar en
                    negativo hasta que cargues el ingreso.
                  </p>
                )}
              </div>
            )}

            {!catalogString && (
              <>
                <Label htmlFor="mainString">Cuerda principal</Label>
                <Input
                  id="mainString"
                  placeholder={f.provider === "cliente" ? "Opcional" : "Luxilon Alu Power 1.25"}
                  value={f.mainString}
                  onChange={(e) => patch({ mainString: e.target.value })}
                />
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="sameCrossString"
                checked={f.sameCrossString}
                onCheckedChange={(c) => {
                  const same = c === true;
                  patch({ sameCrossString: same });
                  // al separarla, arranca con el mismo proveedor que la principal
                  if (!same && !crossTouched) patch({ crossProvider: f.provider });
                }}
              />
              <Label htmlFor="sameCrossString" className="font-normal">
                Cuerda cruzada igual a la principal
              </Label>
            </div>

            {!f.sameCrossString && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <Label>Cuerda cruzada</Label>
                <Select
                  value={f.crossProvider}
                  onValueChange={(v) => {
                    if (!v) return;
                    setCrossTouched(true);
                    patch({ crossProvider: v as SpecForm["crossProvider"] });
                    if (v === "cliente") {
                      setCrossStringId(null); // la cuerda del cliente no toca el stock
                      setCrossPrice("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{providerLabels[f.crossProvider]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">{providerLabels.local}</SelectItem>
                    <SelectItem value="cliente">{providerLabels.cliente}</SelectItem>
                  </SelectContent>
                </Select>

                {f.crossProvider === "local" && activeStrings.length > 0 && (
                  <div className="space-y-2">
                    <Label>Cuerda del catálogo</Label>
                    <Select
                      value={crossStringId ?? "otra"}
                      onValueChange={(v) => v && pickCrossCatalogString(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {crossCatalogString
                            ? stringLabelWithColor(crossCatalogString)
                            : "Otra (sin control de stock)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {activeStrings.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {stringLabelWithColor(s)} ·{" "}
                            {s.stock > 0
                              ? formatStock(s.stock, s.setsPerRoll).main
                              : "sin stock"}
                          </SelectItem>
                        ))}
                        <SelectItem value="otra">Otra (sin control de stock)</SelectItem>
                      </SelectContent>
                    </Select>
                    {crossCatalogString && crossCatalogString.stock <= 0 && (
                      <p className="text-xs text-destructive">
                        Esta cuerda figura sin stock en {shop.name}. Si seguís, el stock va a
                        quedar en negativo hasta que cargues el ingreso.
                      </p>
                    )}
                  </div>
                )}

                {!crossCatalogString && (
                  <Input
                    aria-label="Cuerda cruzada"
                    placeholder={f.crossProvider === "cliente" ? "Opcional" : "Cuerda cruzada"}
                    value={f.crossString}
                    onChange={(e) => patch({ crossString: e.target.value })}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_6rem] items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="mainTension">Tensión principal</Label>
                <Input
                  id="mainTension"
                  inputMode="decimal"
                  placeholder="55"
                  value={f.mainTension}
                  onChange={(e) => patch({ mainTension: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select
                  value={f.unit}
                  onValueChange={(v) => v && patch({ unit: v as SpecForm["unit"] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{f.unit}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="sameCrossTension"
                checked={f.sameCrossTension}
                onCheckedChange={(c) => patch({ sameCrossTension: c === true })}
              />
              <Label htmlFor="sameCrossTension" className="font-normal">
                Tensión cruzada igual a la principal
              </Label>
            </div>
            {!f.sameCrossTension && (
              <Input
                aria-label="Tensión cruzada"
                inputMode="decimal"
                placeholder="Tensión cruzada"
                value={f.crossTension}
                onChange={(e) => patch({ crossTension: e.target.value })}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="prestretch"
              checked={f.prestretch}
              onCheckedChange={(c) => patch({ prestretch: c === true })}
            />
            <Label htmlFor="prestretch" className="font-normal">
              Con pre-estiramiento
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={f.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
        </Section>
      )}

      {/* 4. Entrega */}
      {racket && (
        <Section n={4} title="Fecha de entrega">
          <div className="flex flex-wrap gap-2">
            {quickDates.map((o) => (
              <Button
                key={o.label}
                type="button"
                size="sm"
                variant={isSameDay(o.date, promised) ? "default" : "outline"}
                onClick={() => setPromised(o.date)}
              >
                {o.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={isQuick ? "outline" : "default"}
              onClick={() => setCalendarOpen(true)}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={16} className="mr-2" />
              {isQuick ? "Otra fecha" : formatDay(promised)}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Se la prometemos al cliente para el{" "}
            <span className="font-medium text-foreground">{formatDay(promised)}</span>.
          </p>
        </Section>
      )}

      {/* 5. Precio */}
      {racket && (
        <Section n={5} title="Precio">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="labor">Mano de obra</Label>
              <Input
                id="labor"
                inputMode="decimal"
                placeholder="0"
                value={labor}
                onChange={(e) => setLabor(e.target.value)}
              />
              {shop.laborPrices?.[racket.sport] == null && (
                <p className="text-xs text-muted-foreground">
                  Sin precio configurado para este deporte. El encargado o el admin puede cargarlo en
                  Ajustes.
                </p>
              )}
            </div>
            {f.provider === "local" && (
              <div className="space-y-2">
                <Label htmlFor="stringPrice">
                  {bothLocal ? "Precio de la principal" : "Precio de la cuerda"}
                </Label>
                <Input
                  id="stringPrice"
                  inputMode="decimal"
                  placeholder="0"
                  value={stringPrice}
                  onChange={(e) => setStringPrice(e.target.value)}
                />
              </div>
            )}
            {!f.sameCrossString && f.crossProvider === "local" && (
              <div className="space-y-2">
                <Label htmlFor="crossPrice">Precio de la cruzada</Label>
                <Input
                  id="crossPrice"
                  inputMode="decimal"
                  placeholder="0"
                  value={crossPrice}
                  onChange={(e) => setCrossPrice(e.target.value)}
                />
              </div>
            )}
            {bothLocal && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Si las dos son del local, se cobra la más cara de las dos.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold">{money(total)}</span>
          </div>
        </Section>
      )}

      {racket && (
        <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
          {saving ? "Creando pedido…" : "Crear pedido"}
        </Button>
      )}

      {/* Diálogos */}
      <CustomerFormDialog
        open={customerDialog}
        onOpenChange={setCustomerDialog}
        existing={customers}
        onSaved={(id) => setCustomerId(id)}
      />
      {customer && (
        <RacketFormDialog
          open={racketDialog}
          onOpenChange={setRacketDialog}
          customerId={customer.id}
        />
      )}

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="w-auto max-w-fit">
          <DialogHeader>
            <DialogTitle>Fecha de entrega</DialogTitle>
            <DialogDescription>Elegí el día que le prometés al cliente.</DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            locale={es}
            selected={promised}
            defaultMonth={promised}
            disabled={{ before: startOfDay(new Date()) }}
            onSelect={(d) => {
              if (d) {
                setPromised(startOfDay(d));
                setCalendarOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ¿Actualizar la configuración habitual de la raqueta? Solo aparece
          al confirmar el pedido y solo si la config cambió (o no existía). */}
      <AlertDialog open={!!pending} onOpenChange={changeConfirm}>
        <AlertDialogContent>
          {pending && racket && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {racket.usualSetup
                    ? `¿Actualizar la configuración de ${racket.brand} ${racket.model}?`
                    : `¿Guardar la configuración de ${racket.brand} ${racket.model}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {racket.usualSetup
                    ? "Cambiaste la configuración con la que se autocompletó el pedido. ¿Querés guardarla como la habitual de esta raqueta?"
                    : "Esta raqueta todavía no tiene configuración habitual. ¿Querés guardar la de este pedido para que se autocomplete la próxima vez?"}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-1.5 rounded-lg border bg-muted/50 p-3 text-sm">
                {racket.usualSetup && (
                  <div className="flex gap-3">
                    <span className="w-16 shrink-0 text-muted-foreground">Actual</span>
                    <span className="min-w-0 break-words">{setupSummary(racket.usualSetup)}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground">Nueva</span>
                  <span className="min-w-0 break-words font-medium">
                    {setupSummary(pending.spec)}
                  </span>
                </div>
                {pending.spec.prestretch !== (racket.usualSetup?.prestretch ?? false) && (
                  <div className="flex gap-3">
                    <span className="w-16 shrink-0 text-muted-foreground">Pre-est.</span>
                    <span className="min-w-0">
                      {pending.spec.prestretch ? "Con pre-estiramiento" : "Sin pre-estiramiento"}
                    </span>
                  </div>
                )}
                {fold(pending.spec.notes ?? "") !== fold(racket.usualSetup?.notes ?? "") && (
                  <div className="flex gap-3">
                    <span className="w-16 shrink-0 text-muted-foreground">Notas</span>
                    <span className="min-w-0 break-words">
                      {pending.spec.notes || "Sin notas"}
                    </span>
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => finish(pending, false)}
                >
                  {saving && confirmAction === "create" ? "Creando pedido…" : "Solo crear pedido"}
                </Button>
                <Button disabled={saving} onClick={() => finish(pending, true)}>
                  {saving && confirmAction === "update"
                    ? confirmStep === "setup"
                      ? "Actualizando…"
                      : "Creando pedido…"
                    : "Actualizar y crear"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
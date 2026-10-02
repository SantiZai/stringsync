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
import { subscribeCustomerRackets } from "@/lib/firestore/rackets";
import { createOrder } from "@/lib/firestore/orders";
import { DEFAULT_TENSION_UNIT } from "@/lib/constants";
import { formatDay, money, parseAmount } from "@/lib/format";
import { stringLabel, formatStock } from "@/lib/strings";
import { fold, digitsOnly, initials } from "@/lib/text";
import { messages, whatsappLink } from "@/lib/whatsapp";
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
  mainTension: "",
  sameCrossTension: true,
  crossTension: "",
  unit: DEFAULT_TENSION_UNIT,
  provider: "local",
  prestretch: false,
  notes: "",
};

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
  const { strings } = useStrings();

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

  // Entrega
  const [promised, setPromised] = useState<Date>(() => startOfDay(addDays(new Date(), 1)));
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Precio
  const [labor, setLabor] = useState("");
  const [stringPrice, setStringPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const racket = rackets.find((r) => r.id === racketId) ?? null;
  const catalogString = activeStrings.find((s) => s.id === stringId) ?? null;

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
    if (!appUser || !customerId) return;
    return subscribeCustomerRackets(appUser.orgId, customerId, setRackets);
  }, [appUser, customerId]);

  function pickRacket(r: Racket) {
    const s = r.usualSetup;
    // Si la cuerda habitual está en el catálogo, se preselecciona con el precio de esta sucursal
    const match = s
      ? activeStrings.find((x) => fold(stringLabel(x)) === fold(s.mainString))
      : undefined;

    setRacketId(r.id);
    setF({
      mainString: s?.mainString ?? "",
      sameCrossString: s ? s.crossString === s.mainString : true,
      crossString: s && s.crossString !== s.mainString ? s.crossString : "",
      mainTension: s ? String(s.mainTension) : "",
      sameCrossTension: s ? s.crossTension === s.mainTension : true,
      crossTension: s && s.crossTension !== s.mainTension ? String(s.crossTension) : "",
      unit: s?.tensionUnit ?? DEFAULT_TENSION_UNIT,
      provider: "local",
      prestretch: s?.prestretch ?? false,
      notes: s?.notes ?? "",
    });
    setStringId(match?.id ?? null);
    setStringPrice(match ? String(match.salePrice) : "");
  }

  function pickCatalogString(value: string) {
    if (value === "otra") {
      setStringId(null);
      return;
    }
    const s = activeStrings.find((x) => x.id === value);
    if (!s) return;
    setStringId(s.id);
    patch({ mainString: stringLabel(s) });
    setStringPrice(String(s.salePrice)); // ya viene con el precio propio de la sucursal, si lo hay
  }

  // Si el cliente tiene una sola raqueta, se elige sola
  useEffect(() => {
    if (rackets.length === 1 && !racketId) pickRacket(rackets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rackets]);

  // Mano de obra según el deporte y los precios de la sucursal
  useEffect(() => {
    if (!racket) return;
    const p = shop?.laborPrices?.[racket.sport];
    setLabor(p != null ? String(p) : "");
  }, [racket?.id, racket?.sport, shop?.laborPrices]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = parseAmount(labor) + (f.provider === "local" ? parseAmount(stringPrice) : 0);

  const quickDates = [
    { label: "Hoy", days: 0 },
    { label: "Mañana", days: 1 },
    { label: "En 2 días", days: 2 },
    { label: "En 3 días", days: 3 },
    { label: "En 1 semana", days: 7 },
  ].map((o) => ({ ...o, date: startOfDay(addDays(new Date(), o.days)) }));
  const isQuick = quickDates.some((o) => isSameDay(o.date, promised));

  async function submit() {
    if (!appUser || !shop || !customer || !racket) return;

    const mt = parseAmount(f.mainTension);
    if (!(mt > 0)) return toast.error("Ingresá la tensión principal");
    if (!f.sameCrossString && !f.crossString.trim()) return toast.error("Ingresá la cuerda cruzada");
    if (!f.sameCrossTension && !(parseAmount(f.crossTension) > 0))
      return toast.error("Ingresá la tensión cruzada");
    if (f.provider === "local" && !f.mainString.trim()) return toast.error("Ingresá la cuerda principal");

    const main = f.mainString.trim() || "Cuerda del cliente";
    const spec: StringingSpec = {
      mainString: main,
      crossString: f.sameCrossString ? main : f.crossString.trim(),
      mainTension: mt,
      crossTension: f.sameCrossTension ? mt : parseAmount(f.crossTension),
      tensionUnit: f.unit,
      stringProvidedBy: f.provider,
      prestretch: f.prestretch,
      notes: f.notes.trim(),
    };

    const data = {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      racketId: racket.id,
      racketLabel: `${racket.brand} ${racket.model}`,
      spec,
      stringId: f.provider === "local" ? stringId : null,
      laborPrice: parseAmount(labor),
      stringPrice: f.provider === "local" ? parseAmount(stringPrice) : 0,
      price: total,
      promisedDate: promised,
    };

    setSaving(true);
    try {
      const number = await createOrder(appUser, shop.id, data);
      const link = whatsappLink(customer.phone, messages.recibido({ ...data, number }, shop.name));
      toast.success(`Pedido #${number} creado`, {
        duration: 10000,
        action: { label: "Avisar por WhatsApp", onClick: () => window.open(link, "_blank") },
      });
      router.push("/pedidos");
    } catch {
      toast.error("No se pudo crear el pedido");
      setSaving(false);
    }
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
                  {r.usualSetup
                    ? `${r.usualSetup.mainString} · ${r.usualSetup.mainTension} ${r.usualSetup.tensionUnit}`
                    : "Sin configuración habitual"}
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
                      {catalogString ? stringLabel(catalogString) : "Otra (sin control de stock)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeStrings.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {stringLabel(s)} · {s.stock > 0 ? formatStock(s.stock, s.setsPerRoll).main : "sin stock"}
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
                onCheckedChange={(c) => patch({ sameCrossString: c === true })}
              />
              <Label htmlFor="sameCrossString" className="font-normal">
                Cuerda cruzada igual a la principal
              </Label>
            </div>
            {!f.sameCrossString && (
              <Input
                aria-label="Cuerda cruzada"
                placeholder="Cuerda cruzada"
                value={f.crossString}
                onChange={(e) => patch({ crossString: e.target.value })}
              />
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
                <Label htmlFor="stringPrice">Precio de la cuerda</Label>
                <Input
                  id="stringPrice"
                  inputMode="decimal"
                  placeholder="0"
                  value={stringPrice}
                  onChange={(e) => setStringPrice(e.target.value)}
                />
              </div>
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
    </div>
  );
}
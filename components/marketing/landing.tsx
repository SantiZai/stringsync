import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Chatting01Icon,
  CheckmarkCircle02Icon,
  PackageIcon,
  ShieldCheckIcon,
  Store01Icon,
  Task01Icon,
  TennisRacketIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { APP_TAGLINE } from "@/lib/brand";
import { SITE_WHATSAPP_URL } from "@/lib/site";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const features = [
  {
    icon: Task01Icon,
    title: "Tablero de pedidos sin papeles",
    text: "Seguí cada trabajo de recibido a entregado: en cola, encordando y listo. Con fecha prometida, atrasados a la vista e historial de estados.",
  },
  {
    icon: UserGroupIcon,
    title: "Clientes y raquetas",
    text: "Ficha por cliente con sus raquetas, tensiones habituales en kg o lb y el botón de repetir último encordado para cargar en segundos.",
  },
  {
    icon: PackageIcon,
    title: "Cuerdas y stock por sucursal",
    text: "Catálogo con precio de venta y costo, alertas de stock bajo o sin stock, movimientos de ingreso, consumo y devolución. Soporta sets y rollos.",
  },
  {
    icon: Wallet01Icon,
    title: "Caja diaria clara",
    text: "Cobros por día, por medio de pago y por sucursal. Señas, saldos pendientes y anulaciones con auditoría. Sin planillas sueltas.",
  },
  {
    icon: Chatting01Icon,
    title: "Avisos por WhatsApp",
    text: "Plantillas listas para avisar cuando la raqueta ingresa, cuando está lista o para recordar retiros. Se abren en wa.me con el texto armado.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Roles y multi-sucursal",
    text: "Administrador, encargado, mostrador y encordador con permisos distintos. Varias sucursales con precios y stock propios, todo en tiempo real.",
  },
];

const steps = [
  {
    n: "1",
    title: "Cargás el pedido en mostrador",
    text: "Cliente, raqueta, cuerda, tensión y fecha prometida. Precio de mano de obra y cuerda separados.",
  },
  {
    n: "2",
    title: "El taller avanza el tablero",
    text: "El encordador mueve de cola a encordando y a listo. El mostrador ve los atrasados sin preguntar.",
  },
  {
    n: "3",
    title: "Avisás y cobrás",
    text: "Mandás el WhatsApp de lista para retirar y registrás el cobro en Caja con el medio de pago usado.",
  },
];

const boardPreview: { label: string; badge: string; cards: { title: string; sub: string }[] }[] = [
  {
    label: "Recibido",
    badge: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    cards: [{ title: "#1042 · Babolat Pure Drive", sub: "25/23 kg · para mañana" }],
  },
  {
    label: "En cola",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cards: [{ title: "#1041 · Head Speed MP", sub: "Atrasado · avisar taller" }],
  },
  {
    label: "Encordando",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cards: [{ title: "#1039 · Wilson Blade", sub: "Luxilon · 24/24 kg" }],
  },
  {
    label: "Listo",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cards: [{ title: "#1035 · Nox ML10", sub: "WhatsApp enviado" }],
  },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="border-b bg-card/50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:px-8 md:py-20">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {["Tenis", "Pádel", "Squash", "Bádminton"].map((s) => (
                  <Badge key={s} variant="outline" className="rounded-full">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                  {APP_TAGLINE}
                </h1>
                <p className="max-w-md text-base text-muted-foreground md:text-lg">
                  Pedidos, clientes, stock y avisos en un solo lugar, para que el taller trabaje
                  sin papeles. Pensada para el mostrador y para el encordador.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={SITE_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ size: "lg" })}
                >
                  <HugeiconsIcon icon={Chatting01Icon} size={18} className="mr-2" />
                  Hablar por WhatsApp
                </a>
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Ingresar a la app
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="ml-2" />
                </Link>
              </div>

              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {[
                  "Funciona en celular y compu, con modo oscuro",
                  "Varias sucursales y roles por equipo",
                  "Se instala como app (PWA) desde el navegador",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={18}
                      className="shrink-0 text-primary"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Vista previa del tablero, misma estética que la app */}
            <div className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Pedidos en curso</p>
                <Badge className="border-0 bg-primary/10 text-primary">4 columnas</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {boardPreview.map((col) => (
                  <div key={col.label} className="space-y-2 rounded-xl border bg-card p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{col.label}</p>
                    </div>
                    {col.cards.map((c) => (
                      <div key={c.title} className="space-y-1 rounded-lg border bg-background p-2">
                        <Badge className={`border-0 text-[11px] ${col.badge}`}>{col.label}</Badge>
                        <p className="text-xs font-medium leading-tight">{c.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Tablero real de la app: recibido → en cola → encordando → listo
              </p>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section id="funcionalidades" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 md:px-8 md:py-20">
            <div className="max-w-2xl space-y-2">
              <Badge variant="outline" className="rounded-full">
                Funcionalidades
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight">
                Todo lo que hoy se anota en papel, acá adentro
              </h2>
              <p className="text-muted-foreground">
                Estas son las secciones reales de StringSync. La landing muestra lo mismo que vas a
                usar todos los días.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon, title, text }) => (
                <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <HugeiconsIcon icon={icon} size={20} />
                  </span>
                  <h3 className="mt-4 font-semibold leading-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: TennisRacketIcon, title: "4 deportes", text: "Tenis, pádel, squash y bádminton." },
                { icon: Store01Icon, title: "Multi-local", text: "Sucursales con stock y precios propios." },
                { icon: Wallet01Icon, title: "Medios AR", text: "Efectivo, transferencia, tarjeta y Mercado Pago." },
              ].map(({ icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-xl border bg-card/50 p-4"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <HugeiconsIcon icon={icon} size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-20 border-y bg-card/50">
          <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 md:px-8 md:py-20">
            <div className="max-w-2xl space-y-2">
              <Badge variant="outline" className="rounded-full">
                Cómo funciona
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight">
                Del mostrador a la entrega en 3 pasos
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="rounded-xl border bg-card p-5 shadow-sm">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
            <div className="overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground md:p-12">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <LogoMark inverted size={40} />
                    <p className="text-sm font-medium opacity-80">
                      Para casas de encordado de Argentina
                    </p>
                  </div>
                  <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight">
                    ¿Querés ordenar tu taller esta semana?
                  </h2>
                  <p className="max-w-xl text-primary-foreground/80">
                    Escribinos por WhatsApp y te mostramos cómo cargar tu primer pedido, tu catálogo
                    de cuerdas y tu caja del día. Sin compromiso.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={SITE_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "secondary", size: "lg" })}
                  >
                    <HugeiconsIcon icon={Chatting01Icon} size={18} className="mr-2" />
                    Escribir por WhatsApp
                  </a>
                  <Link
                    href="/login"
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className:
                        "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                    })}
                  >
                    Ya soy cliente, ingresar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

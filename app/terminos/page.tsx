import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTACT_EMAIL, SITE_WHATSAPP_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Condiciones de uso de StringSync para locales de encordado: cuentas, roles, pagos, stock y responsabilidades.",
};

const sections = [
  {
    title: "1. Qué es StringSync",
    body: [
      "StringSync es un software para locales de encordado de raquetas (tenis, pádel, squash y bádminton). Incluye pedidos, clientes, catálogo y stock de cuerdas, caja y avisos por WhatsApp.",
      "Estos términos regulan el uso de la landing pública y de la aplicación privada por parte del local cliente y su personal.",
    ],
  },
  {
    title: "2. Cuentas y roles",
    body: [
      "Cada persona usa una cuenta individual con email y contraseña. Los roles son: administrador, encargado, mostrador y encordador, cada uno con permisos distintos.",
      "El administrador del local es responsable de habilitar, suspender y dar de baja a su equipo, y de exigir el cambio de contraseña inicial. No compartas cuentas: lo que se hace con tu usuario queda registrado a tu nombre.",
    ],
  },
  {
    title: "3. Uso correcto",
    body: [
      "Usá la app solo para la operatoria del local: cargar pedidos reales, stock real y cobros reales. Están prohibidos el acceso no autorizado, la extracción masiva de datos y cualquier uso que vulnere la Ley 25.326 o derechos de terceros.",
      "Los pedidos no se eliminan, se cancelan. Los cobros anulados quedan visibles como anulados para mantener la auditoría de caja.",
    ],
  },
  {
    title: "4. Sucursales, stock y precios",
    body: [
      "El servicio soporta varias sucursales con stock y precios propios por local. El catálogo general lo administra el responsable designado.",
      "El control de stock es una ayuda operativa: el local debe hacer recuentos físicos periódicos. Las diferencias por carga tardía, consumo no registrado o mermas son responsabilidad del local.",
    ],
  },
  {
    title: "5. Pagos y facturación",
    body: [
      "La Caja registra cobros, señas y saldos por medios como efectivo, transferencia, tarjeta o Mercado Pago, pero no reemplaza la facturación fiscal del local.",
      "Cada local es responsable de emitir sus comprobantes y de cumplir sus obligaciones impositivas.",
    ],
  },
  {
    title: "6. WhatsApp",
    body: [
      "La app genera enlaces de WhatsApp (wa.me) con mensajes pre-armados de recibido, listo y recordatorio. El envío se confirma manualmente en WhatsApp y depende de ese servicio de terceros.",
      "El local debe usar estos avisos solo con clientes que le hayan compartido su número en el marco del pedido.",
    ],
  },
  {
    title: "7. Disponibilidad y soporte",
    body: [
      "Buscamos que el servicio esté disponible 24/7 desde celular o compu y que se pueda instalar como app (PWA), pero depende de internet, del navegador y de proveedores como Firebase y WhatsApp.",
      "Hacemos copias y mantenimiento razonables, pero recomendamos al local conservar sus comprobantes y registros críticos.",
    ],
  },
  {
    title: "8. Responsabilidad",
    body: [
      "El servicio se brinda “tal como está”. En la máxima medida permitida por la ley, no respondemos por lucro cesante, pérdida de datos por mal uso, cortes de terceros o diferencias de stock o caja mal cargadas.",
      "Nuestra responsabilidad total, de existir, se limita a lo abonado por el local en los últimos 3 meses.",
    ],
  },
  {
    title: "9. Vigencia y baja",
    body: [
      "Estos términos rigen desde el primer acceso. Podemos suspender cuentas que incumplan estos términos o la política de privacidad.",
      "El local puede pedir la baja y la exportación razonable de sus datos escribiendo al contacto. Los registros anulados o cancelados se conservan por trazabilidad y obligaciones legales.",
    ],
  },
  {
    title: "10. Ley aplicable y contacto",
    body: [
      "Rigen las leyes de la República Argentina. Ante controversias, serán competentes los tribunales ordinarios del domicilio del responsable a designar, salvo norma de orden público en contrario.",
      `Contacto: ${SITE_CONTACT_EMAIL} y WhatsApp comercial en la sección Contacto de la landing. Última actualización: octubre de 2026.`,
    ],
  },
];

export default function TerminosPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
        <div className="space-y-3">
          <Badge variant="outline" className="rounded-full">
            Legal · Argentina
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Términos y Condiciones
          </h1>
          <p className="text-muted-foreground">
            Reglas claras para usar StringSync en tu local. Si algo no te cierra,{" "}
            <a
              href={SITE_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              preguntanos por WhatsApp
            </a>
            .
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((s) => (
            <article key={s.title} className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">{s.title}</h2>
              <div className="mt-2 space-y-2">
                {s.body.map((p) => (
                  <p key={p.slice(0, 32)} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Relacionado:{" "}
          <Link href="/privacidad" className="font-medium text-primary hover:underline">
            Política de Privacidad
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

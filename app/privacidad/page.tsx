import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo trata StringSync los datos personales según la Ley 25.326 de Protección de Datos Personales (Argentina).",
};

const sections = [
  {
    title: "1. Quiénes somos y alcance",
    body: [
      "StringSync es una aplicación para casas de encordado: gestiona pedidos, clientes, raquetas, stock de cuerdas, caja y avisos por WhatsApp.",
      "Esta política explica qué datos se guardan cuando un local usa la app y cuando alguien visita esta landing. Textos genéricos para Argentina, a completar con razón social, CUIT, domicilio y email de contacto del responsable.",
    ],
  },
  {
    title: "2. Qué datos tratamos",
    body: [
      "Datos del local y su equipo: nombre, email laboral, rol (administrador, encargado, mostrador, encordador) y sucursal asignada.",
      "Datos de clientes del local: nombre, teléfono, email opcional y notas operativas. Datos de raquetas y encordados: marca, modelo, deporte, tensiones, cuerda usada y fecha prometida.",
      "Datos de caja: montos, medios de pago, saldos y quién registró cada cobro. Datos técnicos de visita: los mínimos necesarios para seguridad y funcionamiento (por ejemplo, los que provee el hosting y Firebase).",
    ],
  },
  {
    title: "3. Para qué los usamos",
    body: [
      "Operar el servicio: crear y seguir pedidos, avisar por WhatsApp, controlar stock y registrar cobros.",
      "Administrar accesos por rol y por sucursal, y mantener el historial de estados y movimientos.",
      "Responder consultas enviadas por WhatsApp o email desde la landing. No vendemos datos ni los usamos para publicidad de terceros.",
    ],
  },
  {
    title: "4. Base legal (Ley 25.326)",
    body: [
      "Tratamos datos con consentimiento del titular y en el marco de la relación con el local que contrata el servicio, según la Ley 25.326 de Protección de Datos Personales y normas complementarias de la Agencia de Acceso a la Información Pública.",
      "Los datos de clientes finales son cargados por cada local, que actúa como responsable de esa recolección frente a sus propios clientes.",
    ],
  },
  {
    title: "5. Dónde se guardan y por cuánto tiempo",
    body: [
      "Usamos Firebase (Google) como infraestructura de autenticación y base de datos. Los datos pueden alojarse fuera de Argentina con medidas de seguridad del proveedor.",
      "Conservamos los pedidos, cobros y movimientos mientras el local sea cliente y por los plazos legales o contables que correspondan. Los pedidos no se borran, se cancelan, para mantener la trazabilidad del taller.",
    ],
  },
  {
    title: "6. Tus derechos",
    body: [
      "Podés pedir acceso, rectificación, actualización o supresión de tus datos personales, según los arts. 13, 14 y 16 de la Ley 25.326.",
      `Para ejercerlos escribinos a ${SITE_CONTACT_EMAIL} indicando tu nombre, tu vínculo con el local y qué querés modificar. Respondemos en plazos razonables.`,
      "También podés reclamar ante la Agencia de Acceso a la Información Pública (www.argentina.gob.ar/aaip).",
    ],
  },
  {
    title: "7. WhatsApp y comunicaciones",
    body: [
      "Los avisos de pedidos se envían de forma manual desde la app abriendo wa.me con el texto ya armado. No enviamos spam ni mensajes masivos.",
      "Si nos escribís por WhatsApp desde la landing, usamos esa conversación solo para responder tu consulta comercial.",
    ],
  },
  {
    title: "8. Seguridad",
    body: [
      "Acceso por cuentas individuales con contraseña, roles con permisos distintos y obligación de cambiar la contraseña temporal.",
      "Ningún sistema es infalible: si detectamos un incidente que afecte datos personales, avisaremos al local involucrado y tomaremos medidas de contención.",
    ],
  },
  {
    title: "9. Menores",
    body: [
      "El servicio está dirigido a locales y a su personal. Si un cliente final es menor, sus datos deben ser provistos por un adulto responsable.",
    ],
  },
  {
    title: "10. Cambios y contacto",
    body: [
      "Podemos actualizar esta política y publicaremos la nueva versión con su fecha. El uso continuado después de los cambios implica aceptación.",
      `Contacto de privacidad: ${SITE_CONTACT_EMAIL}. Última actualización: octubre de 2026.`,
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
        <div className="space-y-3">
          <Badge variant="outline" className="rounded-full">
            Legal · Argentina
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Política de Privacidad
          </h1>
          <p className="text-muted-foreground">
            Cómo tratamos los datos en StringSync según la Ley 25.326. Lenguaje simple, sin letra
            chica.
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
          ¿Buscabas las condiciones de uso?{" "}
          <Link href="/terminos" className="font-medium text-primary hover:underline">
            Leer Términos y Condiciones
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          <p className="text-sm text-muted-foreground">
            Pedidos, clientes, stock y caja para locales de encordado.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Producto</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/#funcionalidades" className="hover:text-foreground">
                Funcionalidades
              </Link>
            </li>
            <li>
              <Link href="/#como-funciona" className="hover:text-foreground">
                Cómo funciona
              </Link>
            </li>
            <li>
              <Link href="/#contacto" className="hover:text-foreground">
                Contacto por WhatsApp
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Ingresar a la app
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Legal</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/privacidad" className="hover:text-foreground">
                Política de Privacidad
              </Link>
            </li>
            <li>
              <Link href="/terminos" className="hover:text-foreground">
                Términos y Condiciones
              </Link>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Tratamiento de datos según Ley 25.326 de Protección de Datos Personales (Argentina).
          </p>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>© {new Date().getFullYear()} StringSync. Todos los derechos reservados.</span>
          <span>Hecho para talleres que trabajan sin papeles.</span>
        </div>
      </div>
    </footer>
  );
}

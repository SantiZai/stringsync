import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <Link href="/" aria-label="StringSync inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#funcionalidades" className="transition-colors hover:text-foreground">
            Funcionalidades
          </Link>
          <Link href="/#como-funciona" className="transition-colors hover:text-foreground">
            Cómo funciona
          </Link>
          <Link href="/#contacto" className="transition-colors hover:text-foreground">
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants()}>
            Ingresar
          </Link>
        </div>
      </div>
    </header>
  );
}

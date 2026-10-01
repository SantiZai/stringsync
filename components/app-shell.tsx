"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/text";
import { navItems, roleLabels } from "@/lib/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";

function useVisibleNav() {
  const { appUser } = useAuth();
  const pathname = usePathname();
  const items = appUser ? navItems.filter((i) => i.roles.includes(appUser.role)) : [];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return { items, isActive };
}

function Sidebar() {
  const { appUser, logout } = useAuth();
  const { items, isActive } = useVisibleNav();
  if (!appUser) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={icon} size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials(appUser.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{appUser.name}</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabels[appUser.role]}</p>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={logout}>
          <HugeiconsIcon icon={Logout01Icon} size={18} />
        </Button>
      </div>
    </div>
  );
}

function MobileTopBar() {
  const { logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={logout}>
          <HugeiconsIcon icon={Logout01Icon} size={18} />
        </Button>
      </div>
    </header>
  );
}

function BottomNav() {
  const { items, isActive } = useVisibleNav();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex">
        {items.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/10"
                  )}
                >
                  <HugeiconsIcon icon={icon} size={20} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r bg-card/50 md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <MobileTopBar />
        <main className="animate-in fade-in-0 duration-300 p-4 pb-28 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
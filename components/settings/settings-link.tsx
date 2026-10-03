import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface Props {
  href: string;
  icon: IconSvgElement;
  title: string;
  description: string;
}

export function SettingsLink({ href, icon, title, description }: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-muted-foreground" />
    </Link>
  );
}
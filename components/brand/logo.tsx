import { cn } from "@/lib/utils";

interface MarkProps {
  size?: number;
  inverted?: boolean; // para usarlo sobre fondos de color primario
  className?: string;
}

export function LogoMark({ size = 32, inverted = false, className }: MarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[28%]",
        inverted
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "bg-primary text-primary-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.72}
        height={size * 0.72}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <path d="M22 9.5C22 9.5 20 7 16 7C12.5 7 10.5 8.8 10.5 11C10.5 13.4 12.8 14.3 16 15.5C19.2 16.7 21.5 17.6 21.5 20C21.5 22.2 19.5 24 16 24C12 24 10 21.5 10 21.5" />
        <circle cx="22" cy="9.5" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="10" cy="21.5" r="1.7" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

interface LogoProps extends MarkProps {
  className?: string;
}

export function Logo({ size = 32, inverted = false, className }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} inverted={inverted} />
      <span className="text-lg font-semibold tracking-tight">
        String
        <span className={inverted ? "opacity-70" : "text-primary"}>Sync</span>
      </span>
    </span>
  );
}
"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useShop } from "@/hooks/use-shop";
import { useShops } from "@/providers/shop-provider";
import { markReminderSent } from "@/lib/firestore/rackets";
import { formatDay } from "@/lib/format";
import type { Reminder } from "@/lib/reminders";
import { initials } from "@/lib/text";
import { messages, whatsappLink } from "@/lib/whatsapp";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [4, 6, 8, 12, 16];

interface Props {
  reminders: Reminder[];
  weeks: number;
  onWeeksChange: (weeks: number) => void;
}

export function RemindersPanel({ reminders, weeks, onWeeksChange }: Props) {
  const shop = useShop();
  const { shops } = useShops();

  async function mark(id: string, text: string) {
    try {
      await markReminderSent(id);
      toast.success(text);
    } catch {
      toast.error("No se pudo actualizar el recordatorio");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Hace más de</span>
        <Select value={String(weeks)} onValueChange={(v) => v && onWeeksChange(Number(v))}>
          <SelectTrigger className="w-32" aria-label="Semanas">
            <SelectValue>{weeks} semanas</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {w} semanas
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No hay clientes para avisar. Todo al día.
        </div>
      ) : (
        <ul className="space-y-2">
          {reminders.map(({ racket, customer, weeks: w, lastSent }) => {
            const label = `${racket.brand} ${racket.model}`;
            const shopName =
              shop?.name ?? shops.find((s) => s.id === racket.lastShopId)?.name ?? "el local";
            const link = whatsappLink(
              customer.phone,
              messages.reencordado(
                { customerName: customer.name, racketLabel: label },
                shopName,
                w
              )
            );

            return (
              <li key={racket.id} className="space-y-3 rounded-xl border bg-card p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/clientes/${customer.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {label} · último encordado hace {w} semanas (
                      {formatDay(racket.lastStrungAt!.toDate())})
                    </p>
                  </div>
                  {lastSent && (
                    <Badge variant="outline" className="shrink-0">
                      Avisado el {formatDay(lastSent)}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* El link se abre y, en el mismo click, queda marcado como avisado */}
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => mark(racket.id, "Marcado como avisado")}
                    className={buttonVariants({ size: "sm", className: "flex-1" })}
                  >
                    <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" />
                    Avisar por WhatsApp
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => mark(racket.id, "Lo vas a volver a ver en 3 semanas")}
                  >
                    Posponer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
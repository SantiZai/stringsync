import { differenceInCalendarDays, differenceInWeeks } from "date-fns";
import { REMINDER_SNOOZE_DAYS } from "@/lib/constants";
import type { Customer, Racket } from "@/types";

export interface Reminder {
  racket: Racket;
  customer: Customer;
  weeks: number;
  lastSent: Date | null;
}

export function dueReminders(
  rackets: Racket[],
  customers: Customer[],
  minWeeks: number,
  now = new Date()
): Reminder[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const out: Reminder[] = [];

  for (const r of rackets) {
    if (!r.lastStrungAt) continue;
    const customer = byId.get(r.customerId);
    if (!customer) continue;

    const last = r.lastStrungAt.toDate();
    const weeks = differenceInWeeks(now, last);
    if (weeks < minWeeks) continue;

    // Un aviso anterior al último encordado ya no cuenta
    const sent =
      r.reminderSentAt && r.reminderSentAt.toMillis() > last.getTime()
        ? r.reminderSentAt.toDate()
        : null;
    if (sent && differenceInCalendarDays(now, sent) < REMINDER_SNOOZE_DAYS) continue;

    out.push({ racket: r, customer, weeks, lastSent: sent });
  }

  return out.sort((a, b) => b.weeks - a.weeks);
}
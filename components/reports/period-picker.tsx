"use client";

import { useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { presetLabels, presetRange, type Period, type PresetKey } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  preset: PresetKey;
  onChange: (preset: PresetKey, period: Period) => void;
}

export function PeriodPicker({ preset, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  function pick(v: string) {
    if (v === "custom") return setOpen(true);
    const key = v as Exclude<PresetKey, "custom">;
    onChange(key, presetRange(key));
  }

  function apply() {
    if (!range?.from) return;
    onChange("custom", {
      from: startOfDay(range.from),
      to: addDays(startOfDay(range.to ?? range.from), 1),
    });
    setOpen(false);
  }

  return (
    <>
      <Select value={preset} onValueChange={(v) => v && pick(v)}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Período">
          <SelectValue>{presetLabels[preset]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(presetLabels) as PresetKey[]).map((k) => (
            <SelectItem key={k} value={k}>
              {presetLabels[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto max-w-fit">
          <DialogHeader>
            <DialogTitle>Elegí el período</DialogTitle>
            <DialogDescription>Tocá el primer y el último día.</DialogDescription>
          </DialogHeader>
          <Calendar
            mode="range"
            locale={es}
            selected={range}
            onSelect={setRange}
            disabled={{ after: new Date() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={apply} disabled={!range?.from}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
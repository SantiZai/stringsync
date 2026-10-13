"use client";

import { useState } from "react";

import { money, moneyShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BarChart({ data }: { data: { label: string; amount: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.amount), 1);
  const total = data.reduce((n, d) => n + d.amount, 0);
  const every = Math.ceil(data.length / 8); // muestra ~8 etiquetas de fecha como máximo
  // Con pocas barras hay lugar para el monto de cada una; con muchas solo
  // se etiqueta el máximo para no saturar (el resto se ve al tocar).
  const showAllValues = data.length <= 12;

  if (data.length === 0 || total === 0) {
    return (
      <div>
        <div className="flex h-36 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
          Sin cobros en este período
        </div>
        <p className="mt-2 text-right text-sm font-semibold">Total {money(0)}</p>
      </div>
    );
  }

  const current = selected !== null ? data[selected] : null;

  return (
    <div>
      <div className="flex gap-1">
        {data.map((d, i) => {
          const isMax = d.amount === max && d.amount > 0;
          const isSelected = selected === i;
          const showValue = d.amount > 0 && (showAllValues || isMax || isSelected);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(isSelected ? null : i)}
              className="flex min-w-0 flex-1 flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
              title={`${d.label}: ${money(d.amount)}`}
              aria-label={`${d.label}: ${money(d.amount)}`}
            >
              <span
                className={cn(
                  "h-4 truncate text-center text-[10px] leading-4",
                  showValue ? "font-medium text-foreground" : "text-transparent",
                  isSelected && "text-primary"
                )}
              >
                {showValue ? moneyShort(d.amount) : "·"}
              </span>
              <div className="flex h-36 items-end">
                <div
                  className={cn(
                    "w-full rounded-t transition-colors",
                    isSelected ? "bg-primary/70 ring-1 ring-primary" : "bg-primary",
                    d.amount === 0 && "bg-muted"
                  )}
                  style={{ height: `${(d.amount / max) * 100}%`, minHeight: d.amount > 0 ? 2 : 0 }}
                />
              </div>
              <span className="mt-1.5 h-4 truncate text-center text-[10px] text-muted-foreground">
                {i % every === 0 ? d.label : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 min-h-5 text-center text-xs text-muted-foreground" aria-live="polite">
        {current && current.amount > 0 ? (
          <>
            <span className="font-semibold text-foreground">
              {current.label}: {money(current.amount)}
            </span>{" "}
            · tocá otra barra para comparar
          </>
        ) : (
          <>
            Total <span className="font-semibold text-foreground">{money(total)}</span> · tocá una
            barra para ver el detalle
          </>
        )}
      </p>
    </div>
  );
}

import { money } from "@/lib/format";

export function BarChart({ data }: { data: { label: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const every = Math.ceil(data.length / 8); // muestra ~8 etiquetas como máximo

  return (
    <div className="flex gap-1">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex min-w-0 flex-1 flex-col"
          title={`${d.label}: ${money(d.amount)}`}
        >
          <div className="flex h-36 items-end">
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${(d.amount / max) * 100}%`, minHeight: d.amount > 0 ? 2 : 0 }}
            />
          </div>
          <span className="mt-1.5 h-4 truncate text-center text-[10px] text-muted-foreground">
            {i % every === 0 ? d.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
import { money } from "@/lib/format";

export function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <div className="space-y-3">
      {rows.map(([label, amount]) => (
        <div key={label} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span className="font-medium">{money(amount)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${total > 0 ? (amount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
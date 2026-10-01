export function BranchRequired({ action }: { action: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
      Elegí una sucursal en el selector de arriba para {action}.
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import {
  adjustStock,
  subscribeStringMovements,
  updateStockSettings,
} from "@/lib/firestore/strings";
import { formatDateTime, money, parseAmount } from "@/lib/format";
import { isManager } from "@/lib/roles";
import { stringLabel } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { StockMovement, StringView } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "ingreso" | "ajuste" | "config";

function movementLabel(m: StockMovement) {
  switch (m.type) {
    case "ingreso":
      return "Ingreso";
    case "ajuste":
      return "Ajuste";
    case "consumo":
      return `Pedido #${m.orderNumber}`;
    case "devolucion":
      return `Devolución pedido #${m.orderNumber}`;
  }
}

interface Props {
  item: StringView | null;
  shopId: string | null;
  onClose: () => void;
}

export function StockDialog({ item, shopId, onClose }: Props) {
  const { appUser } = useAuth();
  const manager = isManager(appUser?.role);

  const [mode, setMode] = useState<Mode>("ingreso");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [minStock, setMinStock] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [moves, setMoves] = useState<StockMovement[]>([]);

  const itemId = item?.id;
  const orgId = appUser?.orgId;

  useEffect(() => {
    setMode("ingreso");
    setQty("");
    setNote("");
    setMoves([]);
    if (!orgId || !itemId || !shopId) return;
    return subscribeStringMovements({ orgId, shopId }, itemId, setMoves);
  }, [orgId, itemId, shopId]);

  useEffect(() => {
    if (!item) return;
    setMinStock(String(item.minStock));
    setPrice(item.salePrice !== item.catalogPrice ? String(item.salePrice) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const n = /^\d+$/.test(qty.trim()) ? parseInt(qty, 10) : null;
  const resulting = item && n !== null ? (mode === "ingreso" ? item.stock + n : n) : null;

  function changeMode(m: Mode) {
    setMode(m);
    setQty(m === "ajuste" && item ? String(item.stock) : "");
  }

  async function submit() {
    if (!appUser || !item || !shopId) return;
    setSaving(true);
    try {
      if (mode === "config") {
        if (!/^\d+$/.test(minStock.trim())) return toast.error("El mínimo tiene que ser un número entero");
        const p = price.trim() ? parseAmount(price) : null;
        if (p !== null && !(p > 0)) return toast.error("Precio inválido");
        await updateStockSettings(appUser, item, shopId, {
          minStock: parseInt(minStock, 10),
          salePrice: p,
        });
        toast.success("Ajustes guardados");
      } else {
        if (n === null) return toast.error("Ingresá una cantidad entera");
        if (mode === "ingreso" && n <= 0) return toast.error("La cantidad tiene que ser mayor a 0");
        await adjustStock(appUser, item, shopId, mode, n, note.trim());
        toast.success(mode === "ingreso" ? "Stock ingresado" : "Stock corregido");
      }
      onClose();
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={item !== null && shopId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{stringLabel(item)}</DialogTitle>
              <DialogDescription>
                Stock en esta sucursal:{" "}
                <span className="font-semibold text-foreground">{item.stock}</span>{" "}
                {item.stock === 1 ? "set" : "sets"}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="ingreso" className="flex-1">
                  Ingresar
                </TabsTrigger>
                <TabsTrigger value="ajuste" className="flex-1">
                  Corregir
                </TabsTrigger>
                {manager && (
                  <TabsTrigger value="config" className="flex-1">
                    Ajustes
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {mode === "config" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Avisar cuando queden</Label>
                  <Input
                    id="minStock"
                    inputMode="numeric"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchPrice">Precio de venta en esta sucursal</Label>
                  <Input
                    id="branchPrice"
                    inputMode="decimal"
                    placeholder={`Vacío = precio general (${money(item.catalogPrice)})`}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qty">
                    {mode === "ingreso" ? "Sets que ingresan" : "Stock real contado"}
                  </Label>
                  <Input
                    id="qty"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                  />
                  {resulting !== null && (
                    <p className="text-xs text-muted-foreground">Va a quedar en {resulting}.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockNote">Nota (opcional)</Label>
                  <Input
                    id="stockNote"
                    placeholder={mode === "ingreso" ? "Compra a proveedor" : "Conteo de inventario"}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {moves.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Últimos movimientos</p>
                    {moves.slice(0, 8).map((m) => (
                      <p key={m.id} className="flex justify-between gap-3 text-sm text-muted-foreground">
                        <span className="truncate">
                          {formatDateTime(m.createdAt.toDate())} · {movementLabel(m)}
                          {m.note ? ` · ${m.note}` : ""}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-medium",
                            m.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
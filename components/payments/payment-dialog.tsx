"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import { registerPayment } from "@/lib/firestore/payments";
import { money, parseAmount } from "@/lib/format";
import { balanceOf, paymentMethodsOf } from "@/lib/payments";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  order: Order | null; // null = cerrado
  onClose: () => void;
  onPaid?: (remaining: number) => void;
  extraAction?: { label: string; onClick: () => void };
}

export function PaymentDialog({ order, onClose, onPaid, extraAction }: Props) {
  const { appUser } = useAuth();
  const shop = useShop();
  const methods = paymentMethodsOf(shop);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const balance = order ? balanceOf(order) : 0;
  const selected = methods.includes(method) ? method : methods[0];

  // Al abrir, el monto arranca con el saldo completo
  const orderId = order?.id;
  useEffect(() => {
    if (!orderId) return;
    setAmount(String(balance));
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function submit() {
    if (!order || !appUser) return;
    const value = parseAmount(amount);
    if (!(value > 0)) return toast.error("Ingresá el monto");
    if (value > balance + 0.001) return toast.error(`El monto supera el saldo (${money(balance)})`);

    setSaving(true);
    try {
      await registerPayment(appUser, order, { amount: value, method: selected, note: note.trim() });
      toast.success(`Cobro de ${money(value)} registrado`);
      onPaid?.(Math.round((balance - value) * 100) / 100);
      onClose();
    } catch {
      toast.error("No se pudo registrar el cobro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={order !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {order && (
          <>
            <DialogHeader>
              <DialogTitle>Cobrar pedido #{order.number}</DialogTitle>
              <DialogDescription>
                {order.customerName} · {order.racketLabel}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span>{money(order.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ya cobrado</span>
                <span>{money(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Saldo</span>
                <span>{money(balance)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto a cobrar</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setAmount(String(balance))}>
                  Saldo completo
                </Button>
                {order.paidAmount === 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAmount(String(Math.round(balance / 2)))}
                  >
                    Seña 50%
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <Select value={selected} onValueChange={(v) => v && setMethod(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{selected}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payNote">Nota (opcional)</Label>
              <Input id="payNote" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <DialogFooter>
              {extraAction && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    extraAction.onClick();
                    onClose();
                  }}
                >
                  {extraAction.label}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? "Registrando…" : "Registrar cobro"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { createShop, updateShop } from "@/lib/firestore/shops";
import type { Shop } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop?: Shop; // si viene, es edición
  shops: Shop[]; // para elegir de cuál copiar precios
}

export function BranchFormDialog({ open, onOpenChange, shop, shops }: Props) {
  const { appUser } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [copyId, setCopyId] = useState("none");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(shop?.name ?? "");
    setAddress(shop?.address ?? "");
    setPhone(shop?.phone ?? "");
    setCopyId("none");
    setError("");
  }, [open, shop]);

  const copyFrom = shops.find((s) => s.id === copyId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    const clean = { name: name.trim(), address: address.trim(), phone: phone.trim() };
    if (clean.name.length < 2) return setError("Ingresá el nombre de la sucursal");
    if (shops.some((s) => s.id !== shop?.id && s.name.toLowerCase() === clean.name.toLowerCase())) {
      return setError("Ya existe una sucursal con ese nombre");
    }

    setSaving(true);
    try {
      if (shop) await updateShop(shop.id, clean);
      else await createShop(appUser, clean, copyFrom);
      toast.success(shop ? "Sucursal actualizada" : "Sucursal creada");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la sucursal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shop ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
          <DialogDescription>
            El nombre, la dirección y el teléfono salen en los comprobantes y en los mensajes de
            WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="b-name">Nombre</Label>
            <Input
              id="b-name"
              placeholder="Pichincha"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="b-address">Dirección (opcional)</Label>
            <Input id="b-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="b-phone">Teléfono (opcional)</Label>
            <Input
              id="b-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {!shop && shops.length > 0 && (
            <div className="space-y-2">
              <Label>Copiar precios y medios de pago de</Label>
              <Select value={copyId} onValueChange={(v) => v && setCopyId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{copyFrom?.name ?? "No copiar (empezar vacía)"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No copiar (empezar vacía)</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
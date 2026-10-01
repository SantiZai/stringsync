"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon } from "@hugeicons/core-free-icons";

import { PasswordForm } from "@/components/account/password-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ChangePasswordButton({ label = false }: { label?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size={label ? "sm" : "icon"}
        className={label ? "w-full justify-start" : undefined}
        aria-label="Cambiar contraseña"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={LockPasswordIcon} size={18} className={label ? "mr-2" : undefined} />
        {label && "Cambiar contraseña"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Por seguridad, te pedimos la contraseña actual antes de cambiarla.
            </DialogDescription>
          </DialogHeader>
          {open && <PasswordForm onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
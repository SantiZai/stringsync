"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { updateMember } from "@/lib/team-api";
import { generatePassword, passwordSchema } from "@/lib/password";
import type { AppUser } from "@/types";
import { CredentialsCard } from "@/components/team/credentials-card";
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

export function ResetPasswordDialog({
  member,
  onClose,
}: {
  member: AppUser | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const uid = member?.uid;
  useEffect(() => {
    if (!uid) return;
    setPassword(generatePassword());
    setDone(false);
    setError("");
  }, [uid]);

  async function submit() {
    if (!member) return;
    const check = passwordSchema.safeParse(password);
    if (!check.success) return setError(check.error.issues[0].message);

    setSaving(true);
    try {
      await updateMember({ action: "reset_password", uid: member.uid, password });
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo restablecer la contraseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {member && (
          <>
            <DialogHeader>
              <DialogTitle>Restablecer contraseña</DialogTitle>
              <DialogDescription>
                {done
                  ? `Contraseña de ${member.name} restablecida.`
                  : `${member.name} va a perder sus sesiones abiertas y tendrá que elegir una contraseña nueva al ingresar.`}
              </DialogDescription>
            </DialogHeader>

            {done ? (
              <>
                <CredentialsCard email={member.email} password={password} />
                <DialogFooter>
                  <Button onClick={onClose}>Listo</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="r-password">Contraseña temporal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="r-password"
                      className="font-mono"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                      Generar
                    </Button>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button onClick={submit} disabled={saving}>
                    {saving ? "Restableciendo…" : "Restablecer"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
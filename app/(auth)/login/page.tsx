"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email o contraseña incorrectos";
      case "auth/too-many-requests":
        return "Demasiados intentos. Probá de nuevo en unos minutos";
      case "auth/network-request-failed":
        return "Sin conexión. Revisá tu internet";
    }
  }
  return "No se pudo iniciar sesión";
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Si ya hay sesión, no tiene sentido ver el login
  useEffect(() => {
    if (!loading && firebaseUser) router.replace("/pedidos");
  }, [loading, firebaseUser, router]);

  async function onSubmit({ email, password }: FormValues) {
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/pedidos");
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo size={38} inverted className="[&>span:last-child]:text-xl" />
        <div className="max-w-md space-y-3">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">{APP_TAGLINE}</h2>
          <p className="text-primary-foreground/80">
            Pedidos, clientes, stock y avisos en un solo lugar, para que el taller trabaje sin papeles.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border-[28px] border-primary-foreground/10" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <Logo className="mb-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Bienvenido a {APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">Ingresá con tu cuenta del local</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />}
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
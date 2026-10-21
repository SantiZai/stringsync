"use client";

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/auth-provider";
import { useShop } from "@/hooks/use-shop";
import {
  MESSAGE_DEFS,
  MESSAGE_KEYS,
  messagesOf,
  messagesPayload,
  renderTemplate,
  unknownPlaceholders,
} from "@/lib/whatsapp";
import type { MessageKey, Shop } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BranchRequired } from "@/components/branch-required";

const MAX_LEN = 1500;

// Datos de ejemplo para la vista previa (dirección y nombre se usan los reales del local)
const SAMPLE: Record<string, string> = {
  cliente: "María López",
  raqueta: "Head Speed MP",
  pedido: "123",
  direccion: "Av. Corrientes 1234",
  semanas: "8",
  local: "StringSync",
};

function MessagesCardInner({ shop }: { shop: Shop }) {
  const { appUser } = useAuth();
  // Se hidrata en el initializer: el componente se remonta por sucursal (key={shop.id})
  const [texts, setTexts] = useState(() => messagesOf(shop));
  const [baseline, setBaseline] = useState(() => messagesOf(shop));
  const [custom, setCustom] = useState(() => {
    const c = {} as Record<MessageKey, boolean>;
    for (const k of MESSAGE_KEYS) c[k] = Boolean(shop.messages?.[k]);
    return c;
  });
  const [open, setOpen] = useState<MessageKey | null>("recibido");
  const [saving, setSaving] = useState(false);
  const areaRefs = useRef<Partial<Record<MessageKey, HTMLTextAreaElement | null>>>({});

  const dirty = MESSAGE_KEYS.some((k) => texts[k] !== baseline[k]);

  const sampleValues: Record<string, string> = {
    ...SAMPLE,
    direccion: shop.address || SAMPLE.direccion,
    local: shop.name || SAMPLE.local,
  };

  function setValue(k: MessageKey, value: string) {
    setTexts((t) => ({ ...t, [k]: value }));
  }

  // Inserta {variable} en el cursor del textarea
  function insert(k: MessageKey, key: string) {
    const el = areaRefs.current[k];
    const token = `{${key}}`;
    const cur = texts[k];
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? start;
    setValue(k, cur.slice(0, start) + token + cur.slice(end));
    if (el) {
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    }
  }

  async function save() {
    if (!appUser) return;
    for (const k of MESSAGE_KEYS) {
      const t = texts[k].trim();
      if (t.length > MAX_LEN) {
        return toast.error(`"${MESSAGE_DEFS[k].label}": máximo ${MAX_LEN} caracteres`);
      }
      const unknown = unknownPlaceholders(t, k);
      if (unknown.length) {
        return toast.error(
          `"${MESSAGE_DEFS[k].label}": no conozco la variable ${unknown.map((u) => `{${u}}`).join(", ")}`
        );
      }
    }
    setSaving(true);
    try {
      const messages = messagesPayload(texts);
      await updateDoc(doc(db, "shops", shop.id), { messages });
      const nextCustom = {} as Record<MessageKey, boolean>;
      for (const k of MESSAGE_KEYS) nextCustom[k] = k in messages;
      setCustom(nextCustom);
      setBaseline(texts);
      toast.success("Mensajes guardados");
    } catch {
      toast.error("No se pudieron guardar los mensajes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div>
        <h2 className="font-semibold">Mensajes de WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Los textos que se envían a los clientes en cada etapa. Tocá un mensaje para editarlo; los
          que no personalices se envían tal cual están.
        </p>
      </div>

      <div className="divide-y overflow-hidden rounded-lg border">
        {MESSAGE_KEYS.map((k) => {
          const def = MESSAGE_DEFS[k];
          const expanded = open === k;
          const text = texts[k];
          const preview = renderTemplate(text.trim() || def.default, sampleValues);
          const unresolved = /\{\w+\}/.test(preview);
          return (
            <div key={k}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : k)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{def.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {def.description}
                  </span>
                </span>
                <span
                  className={
                    custom[k]
                      ? "shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                      : "shrink-0 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                  }
                >
                  {custom[k] ? "Personalizado" : "Por defecto"}
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded && (
                <div className="space-y-3 border-t bg-muted/20 px-3 py-3">
                  <Textarea
                    ref={(el) => {
                      areaRefs.current[k] = el;
                    }}
                    value={text}
                    onChange={(e) => setValue(k, e.target.value)}
                    maxLength={MAX_LEN}
                    className="min-h-24 font-mono text-sm"
                    placeholder={def.default}
                    aria-label={def.label}
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Variables:</span>
                    {def.placeholders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        title={p.hint}
                        onClick={() => insert(k, p.key)}
                        className="rounded-full border bg-muted/60 px-2 py-0.5 font-mono text-xs hover:bg-muted"
                      >
                        {`{${p.key}}`}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Vista previa</p>
                    <p className="whitespace-pre-wrap text-sm">{preview}</p>
                    {unresolved && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Quedó una variable sin completar. Revisá el texto.
                      </p>
                    )}
                    {!text.trim() && (
                      <p className="text-xs text-muted-foreground">
                        Vacío: se enviará el mensaje por defecto.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {text.length}/{MAX_LEN}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue(k, def.default)}
                      disabled={text === def.default}
                    >
                      Restaurar por defecto
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {dirty ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Hay cambios sin guardar
            </span>
          ) : (
            "Todo al día"
          )}
        </p>
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? "Guardando…" : "Guardar mensajes"}
        </Button>
      </div>
    </div>
  );
}

export function MessagesCard() {
  const shop = useShop();
  if (!shop) return <BranchRequired action="personalizar los mensajes de WhatsApp" />;
  // key por sucursal: al cambiar de sucursal se remonta y se hidrata de nuevo sin efectos
  return <MessagesCardInner key={shop.id} shop={shop} />;
}

"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { Notice } from "../ui";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  submitClass?: string;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
};

/** Sunucu aksiyonuna bağlı form: bekleme durumu, hata ve başarı mesajı gösterir. */
export function ActionForm({ action, children, submitLabel = "Kaydet", submitClass = "btn-primary", className = "space-y-4", resetOnSuccess, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        // React 19 form aksiyonları gönderimden sonra alanları sıfırlar; hata durumunda
        // girilen değerler kaybolmasın diye aksiyonu kendimiz çağırıyoruz.
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      <button type="submit" className={submitClass} disabled={pending}>
        {pending ? "İşleniyor…" : submitLabel}
      </button>
    </form>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

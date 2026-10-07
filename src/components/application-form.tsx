"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Notice } from "./ui";

type Action = (p: ActionState, fd: FormData) => Promise<ActionState>;

/** Başvuru formu */
export function ApplicationForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl">🏓</div>
        <h2 className="mt-4 text-2xl font-bold">Başvurunuz alındı</h2>
        <p className="mt-2 text-ink-soft">{state.ok}</p>
      </div>
    );
  }

  return (
    <form className="card space-y-5 p-6 sm:p-8" action={formAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Ad soyad</span>
          <input name="name" required maxLength={60} autoComplete="name" className="input" />
        </label>
        <label className="block">
          <span className="label">E-posta</span>
          <input name="email" type="email" required autoComplete="email" className="input" placeholder="ad.soyad@havelsan.com.tr" pattern=".+@havelsan\.com\.tr" title="Sadece @havelsan.com.tr uzantılı e-posta" />
        </label>
        <label className="block">
          <span className="label">Telefon</span>
          <input name="phone" type="tel" required autoComplete="tel" className="input" placeholder="05xx xxx xx xx" />
        </label>
        <label className="block">
          <span className="label">Şifre</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </label>
        <label className="block">
          <span className="label">Şifre (tekrar)</span>
          <input name="password2" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Kendinizi tanıtın (isteğe bağlı)</span>
          <textarea name="about" rows={3} maxLength={400} className="input" placeholder="Kaç yıldır oynuyorsunuz, daha önce lisanslı ya da lig maçı yaptınız mı?" />
        </label>
        {/* Botlar için gizli alan */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <button type="submit" className="btn-accent w-full py-3 text-base" disabled={pending}>
        {pending ? "Gönderiliyor…" : "Başvuruyu gönder"}
      </button>
      <p className="text-center text-xs text-ink-soft">Başlangıç puanınızı lig sorumlusu belirler. Onaylanınca bu e-posta ve şifreyle giriş yaparsınız.</p>
    </form>
  );
}

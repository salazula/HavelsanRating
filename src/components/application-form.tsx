"use client";

import { useActionState, useState, startTransition } from "react";
import type { ActionState } from "@/lib/action-state";
import { squareShrink } from "./photo-upload";
import { Notice } from "./ui";

type Action = (p: ActionState, fd: FormData) => Promise<ActionState>;

/** Başvuru formu: fotoğraf gönderilmeden önce tarayıcıda kırpılıp küçültülür. */
export function ApplicationForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [preview, setPreview] = useState<string | null>(null);

  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl">🪐</div>
        <h2 className="mt-4 text-2xl font-bold">Başvurunuz alındı</h2>
        <p className="mt-2 text-ink-soft">{state.ok}</p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-5 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const f = fd.get("photo");
        if (f instanceof File && f.size) fd.set("photo", await squareShrink(f));
        startTransition(() => formAction(fd));
      }}
    >
      <div className="flex items-center gap-4">
        <label className="grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-table-200 bg-table-50 text-center text-[11px] font-semibold text-table-600 hover:border-table-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : "Fotoğraf ekle"}
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <p className="text-sm text-ink-soft">Profil fotoğrafı isteğe bağlı. Onaylanınca Telegram kanalındaki karşılama mesajında da görünür.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Ad soyad</span>
          <input name="name" required maxLength={60} autoComplete="name" className="input" />
        </label>
        <label className="block">
          <span className="label">E-posta</span>
          <input name="email" type="email" required autoComplete="email" className="input" placeholder="ornek@mail.com" />
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

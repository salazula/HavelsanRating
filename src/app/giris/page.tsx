import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HeroArt, Logo } from "@/components/art";
import { ActionForm, Field } from "@/components/forms/action-form";
import { login } from "./actions";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/panel");
  if ((await db.user.count()) === 0) redirect("/kurulum");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="cosmos relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <Link href="/" className="relative flex items-center gap-2.5">
          <Logo />
          <span className="font-display font-bold">Havelsan Rating</span>
        </Link>
        <HeroArt className="relative my-auto w-full max-w-lg self-center drop-shadow-2xl" />
        <p className="relative max-w-md text-table-100">
          Oyuncular maç sonuçlarını girip rakiplerinin sonuçlarını onaylar; lig sorumlusu grupları ve turları buradan yönetir.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="font-display font-bold">Havelsan Rating</span>
          </Link>
          <h1 className="text-3xl font-bold">Panele giriş</h1>
          <p className="mt-1 mb-8 text-ink-soft">
            Hesabınız yok mu? <Link href="/basvuru" className="font-semibold text-table-600">Başvuru yapın</Link>
          </p>
          <ActionForm action={login} submitLabel="Giriş yap" submitClass="btn-primary w-full py-3">
            <Field label="E-posta">
              <input name="email" type="email" required autoComplete="email" className="input" placeholder="ad.soyad@havelsan.com.tr" />
            </Field>
            <Field label="Şifre">
              <input name="password" type="password" required autoComplete="current-password" className="input" />
            </Field>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}

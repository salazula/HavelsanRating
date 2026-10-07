import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { Logo } from "@/components/art";
import { ActionForm, Field } from "@/components/forms/action-form";
import { setupAdmin } from "./actions";

export const metadata: Metadata = { title: "Kurulum" };

export default async function SetupPage() {
  await connection(); // derleme sırasında değil, her istekte kontrol et
  if ((await db.user.count()) > 0) redirect("/giris");
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo />
          <span className="font-display font-bold">Masa Tenisi Rating</span>
        </div>
        <h1 className="text-2xl font-bold">İlk kurulum</h1>
        <p className="mt-1 mb-6 text-sm text-ink-soft">Süper admin hesabını oluşturun. Bu ekran sadece bir kez, sistemde hiç kullanıcı yokken açılır.</p>
        <ActionForm action={setupAdmin} submitLabel="Hesabı oluştur" submitClass="btn-primary w-full py-3">
          <Field label="Ad soyad"><input name="name" required className="input" /></Field>
          <Field label="E-posta"><input name="email" type="email" required className="input" /></Field>
          <Field label="Şifre" hint="En az 8 karakter"><input name="password" type="password" minLength={8} required className="input" /></Field>
        </ActionForm>
      </div>
    </div>
  );
}

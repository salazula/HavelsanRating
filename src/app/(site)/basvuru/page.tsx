import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ApplicationForm } from "@/components/application-form";
import { submitApplication } from "./actions";

export const metadata: Metadata = { title: "Başvuru" };

export default function ApplyPage() {
  return (
    <>
      <PageHeader eyebrow="Masa Tenisi Rating" title="Rating’e katılın" subtitle="Bilgilerinizi bırakın; lig sorumlusu başvurunuzu inceleyip başlangıç puanınızı belirlesin." />
      <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
        <ApplicationForm action={submitApplication} />
        <p className="mt-6 text-center text-sm text-ink-soft">
          Zaten hesabınız var mı? <Link href="/giris" className="font-semibold text-table-600">Giriş yapın</Link>
        </p>
      </div>
    </>
  );
}

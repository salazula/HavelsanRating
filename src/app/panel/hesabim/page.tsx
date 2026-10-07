import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { changePassword, updatePhone } from "./actions";

export default async function AccountPage() {
  const me = await requireUser();
  return (
    <>
      <PanelTitle title="Hesabım" subtitle={`${me.email} · ${roleLabel[me.role]}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Şifre değiştir</h2>
          <ActionForm action={changePassword} submitLabel="Şifreyi değiştir" resetOnSuccess>
            <Field label="Mevcut şifre"><input name="current" type="password" required autoComplete="current-password" className="input" /></Field>
            <Field label="Yeni şifre" hint="En az 8 karakter"><input name="next" type="password" minLength={8} required autoComplete="new-password" className="input" /></Field>
            <Field label="Yeni şifre (tekrar)"><input name="repeat" type="password" minLength={8} required autoComplete="new-password" className="input" /></Field>
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">İletişim</h2>
          <ActionForm action={updatePhone} submitLabel="Kaydet">
            <Field label="Telefon"><input name="phone" type="tel" defaultValue={me.phone ?? ""} className="input" /></Field>
          </ActionForm>
        </section>
      </div>
    </>
  );
}

import type { GroupSlot } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS } from "@/lib/schedule";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { deleteSlot, loadDefaultSlots, saveSlot } from "./actions";

function SlotFields({ s, nextOrder }: { s?: GroupSlot; nextOrder: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-7">
      <Field label="Grup"><input name="code" required defaultValue={s?.code} maxLength={3} className="input uppercase" /></Field>
      <div className="sm:col-span-2">
        <Field label="Gün">
          <select name="weekday" defaultValue={s?.weekday ?? 7} className="input">
            {WEEKDAYS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Başlangıç"><input name="startTime" type="time" required defaultValue={s?.startTime ?? "16:00"} className="input" /></Field>
      <Field label="Bitiş"><input name="endTime" type="time" defaultValue={s?.endTime ?? ""} className="input" /></Field>
      <Field label="Kişi"><input name="size" type="number" min={2} max={12} required defaultValue={s?.size ?? 6} className="input" /></Field>
      <Field label="Sıra"><input name="order" type="number" min={0} defaultValue={s?.order ?? nextOrder} className="input" /></Field>
      <div className="sm:col-span-7"><Field label="Masa / yer"><input name="place" defaultValue={s?.place ?? ""} placeholder="ör. 1 Numaralı Masa" className="input" /></Field></div>
    </div>
  );
}

export default async function SlotsPage() {
  await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const slots = await db.groupSlot.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PanelTitle
        title="Grup düzeni"
        subtitle="Her grubun haftalık oyun günü, saati, masası ve kişi sayısı. Her hafta gruplar bu düzene göre, sıra numarası küçük olan grup en yüksek puanlılardan oluşacak şekilde kurulur."
      />
      {!slots.length && (
        <section className="card mb-6 p-5">
          <p className="mb-3 text-sm text-ink-soft">Henüz grup tanımlı değil. Excel’deki düzeni (A-C Pazar, D-F Cumartesi, G-I Cuma, J-M Pazartesi) tek tıkla yükleyebilir, sonra düzenleyebilirsiniz.</p>
          <ActionForm action={loadDefaultSlots} submitLabel="Excel’deki grup düzenini yükle" className="space-y-2"><span /></ActionForm>
        </section>
      )}
      <div className="space-y-3">
        {slots.map((s) => (
          <details key={s.id} className="card px-4 py-3">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-table-600 font-display font-bold text-white">{s.code}</span>
              <span className="flex-1 text-sm">
                <b>{WEEKDAYS[s.weekday]}</b> {s.startTime}{s.endTime ? `-${s.endTime}` : ""}{s.place ? ` · ${s.place}` : ""}
              </span>
              <span className="chip bg-table-50 text-table-700">{s.size} kişi</span>
            </summary>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <ActionForm action={saveSlot.bind(null, s.id)} submitLabel="Kaydet" className="flex-1 space-y-3">
                <SlotFields s={s} nextOrder={s.order} />
              </ActionForm>
              <ActionForm action={deleteSlot.bind(null, s.id)} submitLabel="Grubu sil" submitClass="btn-danger" className="space-y-2" confirm={`${s.code} grubu düzenden silinsin mi?`}>
                <span />
              </ActionForm>
            </div>
          </details>
        ))}
      </div>
      <section className="card mt-8 p-5">
        <h2 className="mb-4 font-bold">+ Yeni grup</h2>
        <ActionForm action={saveSlot.bind(null, null)} submitLabel="Grubu ekle" resetOnSuccess>
          <SlotFields nextOrder={slots.length} />
        </ActionForm>
      </section>
    </>
  );
}

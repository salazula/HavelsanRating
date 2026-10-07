import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Empty, RoundStatusChip } from "@/components/ui";
import { createRound } from "./actions";
import { dateFromYmd, nextMonday, toLocalInput } from "@/lib/schedule";

export default async function RoundsPage() {
  await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const rounds = await db.round.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { groups: true } }, groups: { select: { _count: { select: { entries: true } } } } },
  });
  const busy = rounds.some((r) => r.status !== "CLOSED");
  const monday = nextMonday();
  // Varsayılan son katılım: haftadan önceki gün 22:00
  const defDeadline = toLocalInput(new Date(dateFromYmd(monday).getTime() - 2 * 3600000));
  const slotCount = await db.groupSlot.count();
  return (
    <>
      <PanelTitle title="Haftalar" subtitle="Her hafta: gruplar kurulur → oyuncular son güne kadar katılım bildirir → fikstür otomatik oluşur, maçlar oynanır → hafta kapanır, puanlar işlenir.">
        <Link href="/panel/grup-duzeni" className="btn-ghost">Grup düzeni →</Link>
      </PanelTitle>
      {!busy && (
        <section className="card mb-8 p-5">
          <h2 className="mb-1 font-bold">+ Yeni hafta</h2>
          <p className="mb-4 text-sm text-ink-soft">Aktif oyuncular puan sırasına göre grup düzenindeki gruplara yerleştirilir.{!slotCount && <> Önce <Link href="/panel/grup-duzeni" className="font-semibold text-table-600 underline">grup düzenini</Link> tanımlayın.</>}</p>
          <ActionForm action={createRound} submitLabel="Haftayı oluştur" className="flex flex-wrap items-end gap-3">
            <div className="w-48"><Field label="Hafta başı (pazartesi)"><input name="weekStart" type="date" required defaultValue={monday} className="input" /></Field></div>
            <div className="w-60"><Field label="Son katılım bildirimi"><input name="deadline" type="datetime-local" required defaultValue={defDeadline} className="input" /></Field></div>
            <div className="w-48"><Field label="Ad (isteğe bağlı)"><input name="name" placeholder="ör. 6-12 Ekim" className="input" /></Field></div>
          </ActionForm>
        </section>
      )}
      {rounds.length ? (
        <ul className="card divide-y divide-line">
          {rounds.map((r) => (
            <li key={r.id}>
              <Link href={`/panel/turlar/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-table-50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name} {r.isDemo && <span className="chip ml-1 bg-amber-50 text-amber-700">Deneme</span>}</p>
                  <p className="text-xs text-ink-soft">
                    {r._count.groups} grup · {r.groups.reduce((s, g) => s + g._count.entries, 0)} oyuncu · {r.closedAt ? `Kapandı: ${formatDate(r.closedAt)}` : `Oluşturuldu: ${formatDate(r.createdAt)}`}
                  </p>
                </div>
                <RoundStatusChip status={r.status} />
                <span className="text-sm font-semibold text-table-600">Aç →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Henüz hafta yok">Önce oyuncuları ve grup düzenini ekleyin, sonra ilk haftayı oluşturun.</Empty>
      )}
    </>
  );
}

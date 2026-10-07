import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { groupInclude, groupResults, type GroupWithData } from "@/lib/queries";
import { getRules } from "@/lib/rules";
import type { Rules } from "@/lib/rating";
import { attendanceLabel, formatDateTime, signed } from "@/lib/labels";
import { playWindowText, toLocalInput } from "@/lib/schedule";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { GroupTable } from "@/components/group-table";
import { ScoreSelect } from "@/components/score-select";
import { MatchStatusChip, Notice, RoundStatusChip } from "@/components/ui";
import { setResult } from "../../maclarim/actions";
import {
  addGroup,
  closeRound,
  createFixtureNow,
  deleteGroup,
  deleteRound,
  openAttendance,
  placePlayer,
  redistribute,
  removeEntry,
  setAttendance,
  setManualBonus,
  undoClose,
  undoFixture,
  updateRound,
} from "../actions";

type Groups = GroupWithData[];

export default async function RoundPage({ params }: PageProps<"/panel/turlar/[id]">) {
  const user = await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const { id } = await params;
  const rules = await getRules();
  const round = await db.round.findUnique({ where: { id }, include: { groups: { include: groupInclude, orderBy: { order: "asc" } } } });
  if (!round) notFound();
  const superAdmin = user.role === "SUPER_ADMIN";
  const editable = round.status === "DRAFT" || round.status === "ATTENDANCE";

  return (
    <>
      <Link href="/panel/turlar" className="mb-4 inline-block text-sm font-semibold text-table-600">← Haftalar</Link>
      <PanelTitle
        title={round.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <RoundStatusChip status={round.status} />
            {round.isDemo && <span className="chip bg-amber-50 text-amber-700">Deneme</span>}
            {round.deadline && <span className="text-sm">Son katılım: {formatDateTime(round.deadline)}</span>}
            {round.weekStart && <span className="text-sm">· Maçlar: {playWindowText(round.weekStart)}</span>}
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          {round.status === "DRAFT" && (
            <ActionForm action={openAttendance.bind(null, id)} submitLabel="Grupları yayınla, katılımı aç" submitClass="btn-accent" className="space-y-2" confirm="Gruplar yayınlansın ve oyuncular katılım bildirebilsin mi?">
              <span />
            </ActionForm>
          )}
          {round.status === "ATTENDANCE" && (
            <ActionForm action={createFixtureNow.bind(null, id)} submitLabel="Fikstürü şimdi oluştur" submitClass="btn-accent" className="space-y-2" confirm="Son katılım zamanını beklemeden fikstür oluşturulsun mu? Bildirim yapmayanlar hükmen sayılacak.">
              <span />
            </ActionForm>
          )}
          {round.status === "OPEN" && (
            <ActionForm action={closeRound.bind(null, id)} submitLabel="Haftayı kapat ve puanları işle" submitClass="btn-accent" className="space-y-2" confirm="Hafta kapatılsın mı? Sadece kesinleşmiş maçlar hesaba katılır; onay bekleyen ve itirazlı sonuçlar sayılmaz.">
              <span />
            </ActionForm>
          )}
        </div>
      </PanelTitle>

      {editable && <EditView round={round} groups={round.groups} superAdmin={superAdmin} />}
      {round.status === "OPEN" && <OpenView roundId={id} groups={round.groups} superAdmin={superAdmin} rules={rules} />}
      {round.status === "CLOSED" && (
        <>
          {superAdmin && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <ActionForm action={undoClose.bind(null, id)} submitLabel="Kapanışı geri al" submitClass="btn-danger" className="space-y-2" confirm="Hafta yeniden açılsın ve bu haftanın puanları oyunculardan geri alınsın mı?">
                <span />
              </ActionForm>
              <p className="text-xs text-ink-soft">Sadece en son kapanan hafta geri alınabilir.</p>
            </div>
          )}
          <div className="grid gap-6">
            {round.groups.map((g) => <GroupTable key={g.id} group={g} results={groupResults(g, rules)} />)}
          </div>
        </>
      )}
    </>
  );
}

async function EditView({ round, groups, superAdmin }: { round: { id: string; name: string; status: string; deadline: Date | null }; groups: Groups; superAdmin: boolean }) {
  const roundId = round.id;
  const players = await db.player.findMany({ where: { active: true }, orderBy: [{ rating: "desc" }, { name: "asc" }] });
  const placed = new Map(groups.flatMap((g) => g.entries.map((e) => [e.playerId, g.code] as const)));
  const unplaced = players.filter((p) => !placed.has(p.id));
  const entries = groups.flatMap((g) => g.entries);
  const count = (a: string) => entries.filter((e) => e.attendance === a).length;
  return (
    <div className="space-y-6">
      {round.status === "ATTENDANCE" && (
        <div className="grid grid-cols-3 gap-4">
          {[["Katılıyor", count("YES")], ["Katılmıyor", count("NO")], ["Bildirmedi", count("PENDING")]].map(([k, v]) => (
            <div key={k} className="card p-4">
              <p className="text-sm text-ink-soft">{k}</p>
              <p className="font-display text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
      {round.status === "ATTENDANCE" && (
        <Notice tone="info">
          Son katılım zamanı geçince fikstür otomatik oluşur: bildirim yapmayanlar hükmen sayılır, eksik gruplar alt gruptaki katılan en yüksek puanlı oyuncularla tamamlanır.
        </Notice>
      )}

      <section className="card p-5">
        <ActionForm action={updateRound.bind(null, roundId)} submitLabel="Kaydet" submitClass="btn-ghost" className="flex flex-wrap items-end gap-3">
          <div className="w-56"><Field label="Hafta adı"><input name="name" defaultValue={round.name} className="input" /></Field></div>
          <div className="w-60"><Field label="Son katılım bildirimi"><input name="deadline" type="datetime-local" required defaultValue={toLocalInput(round.deadline)} className="input" /></Field></div>
        </ActionForm>
      </section>

      {unplaced.length > 0 && <Notice tone="info">Gruba yerleşmemiş aktif oyuncular: {unplaced.map((p) => p.name).join(", ")}</Notice>}

      {groups.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Oyuncu ekle / taşı</h2>
          <ActionForm action={placePlayer.bind(null, roundId)} submitLabel="Yerleştir" className="flex flex-wrap items-end gap-3">
            <div className="w-72">
              <Field label="Oyuncu">
                <select name="playerId" required className="input">
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.rating}){placed.has(p.id) ? ` · ${placed.get(p.id)} grubunda` : ""}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="w-40">
              <Field label="Grup">
                <select name="groupId" required className="input">
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.code} Grubu</option>)}
                </select>
              </Field>
            </div>
          </ActionForm>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} className="card p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{g.code} Grubu <span className="text-sm font-normal text-ink-soft">· {g.entries.length}/{g.size} oyuncu</span></h3>
              <ActionForm action={deleteGroup.bind(null, g.id)} submitLabel="Sil" submitClass="text-xs font-semibold text-rubber-600" className="space-y-1" confirm={`${g.code} grubu silinsin mi?`}>
                <span />
              </ActionForm>
            </div>
            <p className="mb-3 text-xs text-ink-soft">{g.schedule ?? "Pazartesi-Cuma, serbest gün"}</p>
            <ul className="divide-y divide-line text-sm">
              {[...g.entries].sort((a, b) => b.player.rating - a.player.rating).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate">{e.player.name} <span className="text-ink-soft tabular-nums">{e.player.rating}</span></span>
                  <ActionForm action={setAttendance.bind(null, e.id)} submitLabel="✓" submitClass="btn-ghost px-2 py-1 text-xs" className="flex items-center gap-1">
                    <select name="attendance" defaultValue={e.attendance} className="input w-auto py-1 text-xs">
                      {(["PENDING", "YES", "NO"] as const).map((a) => <option key={a} value={a}>{attendanceLabel[a]}</option>)}
                    </select>
                  </ActionForm>
                  <ActionForm action={removeEntry.bind(null, e.id)} submitLabel="Çıkar" submitClass="text-xs font-semibold text-rubber-600" className="space-y-1">
                    <span />
                  </ActionForm>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {round.status === "DRAFT" && (
          <ActionForm action={redistribute.bind(null, roundId)} submitLabel="Grupları yeniden dağıt" submitClass="btn-ghost" className="space-y-2" confirm="Gruplar silinip grup düzenine göre yeniden kurulsun mu?">
            <span />
          </ActionForm>
        )}
        <ActionForm action={addGroup.bind(null, roundId)} submitLabel="+ Boş grup ekle" submitClass="btn-ghost" className="space-y-2">
          <span />
        </ActionForm>
        {superAdmin && (
          <ActionForm action={deleteRound.bind(null, roundId)} submitLabel="Haftayı sil" submitClass="btn-danger" className="space-y-2" confirm="Hafta ve grupları silinsin mi?">
            <span />
          </ActionForm>
        )}
      </div>
    </div>
  );
}

function OpenView({ roundId, groups, superAdmin, rules }: { roundId: string; groups: Groups; superAdmin: boolean; rules: Rules }) {
  const all = groups.flatMap((g) => g.matches);
  const done = all.filter((m) => m.status === "APPROVED").length;
  const waiting = all.filter((m) => m.status === "SUBMITTED").length;
  const disputed = all.filter((m) => m.status === "DISPUTED").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[["Kesinleşen", `${done}/${all.length}`], ["Onay bekleyen", waiting], ["İtirazlı", disputed]].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-sm text-ink-soft">{k}</p>
            <p className="font-display text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      {groups.map((g) => {
        const res = groupResults(g, rules);
        return (
          <section key={g.id} className="space-y-2">
            <GroupTable group={g} results={res} />
            <details className="card px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-table-600">{g.code} Grubu: maç sonuçları ve ek puanlar</summary>
              <ul className="mt-3 divide-y divide-line">
                {g.matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate"><b>{m.playerA.name}</b> – {m.playerB.name}</span>
                    <MatchStatusChip status={m.status} />
                    {m.disputeNote && <span className="text-xs text-rubber-600">“{m.disputeNote}”</span>}
                    <ActionForm action={setResult.bind(null, m.id)} submitLabel="Kaydet" submitClass="btn-ghost py-2" className="flex items-center gap-2">
                      <ScoreSelect withKK withEmpty defaultValue={m.kind === "BOTH_ABSENT" ? "KK" : m.kind ? `${m.setsA}-${m.setsB}` : ""} className="input w-auto py-2" />
                    </ActionForm>
                  </li>
                ))}
                {!g.matches.length && <li className="py-2 text-sm text-ink-soft">Bu grupta maç yok (yeterli katılım olmadı).</li>}
              </ul>
              <p className="mt-2 text-xs text-ink-soft">Skor, soldaki (kalın yazılan) oyuncunun gözünden seçilir. Kaydedilen sonuç kesinleşir.</p>
              <h4 className="mt-5 mb-2 text-sm font-bold">Elle ek puan</h4>
              <ul className="divide-y divide-line">
                {g.entries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{e.player.name}{e.manualBonus ? <span className="ml-2 chip bg-ball-500/15 text-ball-600">{signed(e.manualBonus)}</span> : null}</span>
                    <ActionForm action={setManualBonus.bind(null, e.id)} submitLabel="Kaydet" submitClass="btn-ghost py-2" className="flex items-center gap-2">
                      <input name="manualBonus" type="number" defaultValue={e.manualBonus} className="input w-20 py-2" />
                      <input name="note" defaultValue={e.note ?? ""} placeholder="Açıklama" className="input w-44 py-2" />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <ActionForm action={undoFixture.bind(null, roundId)} submitLabel="Fikstürü geri al" submitClass="btn-ghost" className="space-y-2" confirm="Maçlar silinip katılım aşamasına dönülsün mü? (Sadece hiç sonuç girilmemişse)">
          <span />
        </ActionForm>
        {superAdmin && (
          <ActionForm action={deleteRound.bind(null, roundId)} submitLabel="Haftayı sil" submitClass="btn-danger" className="space-y-2" confirm="Hafta, grupları ve tüm maç sonuçları silinsin mi?">
            <span />
          </ActionForm>
        )}
      </div>
    </div>
  );
}

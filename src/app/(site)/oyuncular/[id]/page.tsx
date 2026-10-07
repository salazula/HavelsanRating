import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getRanking } from "@/lib/queries";
import { scoreMatch } from "@/lib/rating";
import { getRules, parseRules } from "@/lib/rules";
import { formatDate } from "@/lib/labels";
import { RatingChart } from "@/components/rating-chart";
import { AttendanceChip, Avatar, Delta, Empty, PageHeader, PlayerLink, SectionTitle } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/oyuncular/[id]">): Promise<Metadata> {
  const p = await db.player.findUnique({ where: { id: (await params).id }, select: { name: true } });
  return { title: p?.name ?? "Oyuncu" };
}

export default async function PlayerPage({ params }: PageProps<"/oyuncular/[id]">) {
  const { id } = await params;
  const [player, rules] = await Promise.all([db.player.findUnique({ where: { id } }), getRules()]);
  if (!player) notFound();
  const [ranking, entries, matches] = await Promise.all([
    getRanking(),
    db.groupEntry.findMany({
      where: { playerId: id, group: { round: { status: { not: "DRAFT" } } } },
      include: { group: { include: { round: true } } },
      orderBy: { group: { round: { createdAt: "asc" } } },
    }),
    db.match.findMany({
      where: { status: "APPROVED", OR: [{ playerAId: id }, { playerBId: id }] },
      include: { playerA: true, playerB: true, group: { include: { round: true, entries: true } } },
      orderBy: [{ group: { round: { createdAt: "desc" } } }, { confirmedAt: "desc" }],
    }),
  ]);
  const rank = ranking.find((r) => r.id === id)?.rank;
  const closed = entries.filter((e) => e.ratingAfter != null);
  const chart = closed.length
    ? [{ label: "Başlangıç", value: closed[0]!.ratingBefore }, ...closed.map((e) => ({ label: e.group.round.name, value: e.ratingAfter! }))]
    : [];
  const best = closed.length ? Math.max(...chart.map((c) => c.value)) : player.rating;

  return (
    <>
      <PageHeader eyebrow={rank ? `${rank}. sırada` : player.active ? "Oyuncu" : "Pasif oyuncu"} title={player.name} photo={<Avatar name={player.name} size="2xl" />}>
        <dl className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Rating", player.rating],
            ["En yüksek", best],
            ["Maç / Galibiyet", `${player.matches} / ${player.wins}`],
            ["Set averajı", player.setAverage],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/8 px-4 py-3 ring-1 ring-white/10">
              <dt className="text-xs font-semibold text-table-200">{k}</dt>
              <dd className="font-display text-2xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-10 sm:px-6">
        <section>
          <SectionTitle title="Rating geçmişi" />
          <div className="card p-4"><RatingChart points={chart} /></div>
        </section>

        <section>
          <SectionTitle title="Turlar" />
          {entries.length ? (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-table-50/60 text-left text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                    <th className="px-4 py-2.5">Tur</th>
                    <th className="px-4 py-2.5">Grup</th>
                    <th className="px-4 py-2.5">Katılım</th>
                    <th className="px-4 py-2.5 text-right">Maç Ö.</th>
                    <th className="px-4 py-2.5 text-right">M/G</th>
                    <th className="px-4 py-2.5 text-right">Maç puanı</th>
                    <th className="px-4 py-2.5 text-right">Ek puan</th>
                    <th className="px-4 py-2.5 text-right">Maç S.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...entries].reverse().map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 font-semibold">{e.group.round.name}</td>
                      <td className="px-4 py-2.5">{e.group.code}{e.movedFrom && <span className="ml-1 text-xs text-ink-soft">({e.movedFrom}↑)</span>}</td>
                      <td className="px-4 py-2.5"><AttendanceChip value={e.attendance} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{e.ratingBefore}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{e.played != null ? `${e.played}/${e.won}` : "–"}</td>
                      <td className="px-4 py-2.5 text-right"><Delta value={e.matchPoints} /></td>
                      <td className="px-4 py-2.5 text-right"><Delta value={e.bonus} /></td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">{e.ratingAfter ?? <span className="font-normal text-ink-soft">devam ediyor</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Henüz tura katılmadı" />
          )}
        </section>

        <section>
          <SectionTitle title="Maçlar" />
          {matches.length ? (
            <ul className="card divide-y divide-line">
              {matches.map((m) => {
                const isA = m.playerAId === id;
                const opp = isA ? m.playerB : m.playerA;
                const ra = m.group.entries.find((e) => e.playerId === m.playerAId)?.ratingBefore ?? 0;
                const rb = m.group.entries.find((e) => e.playerId === m.playerBId)?.ratingBefore ?? 0;
                const o = scoreMatch({ ratingA: ra, ratingB: rb, kind: m.kind!, setsA: m.setsA, setsB: m.setsB }, m.group.round.rules ? parseRules(m.group.round.rules) : rules);
                const pts = isA ? o.pointsA : o.pointsB;
                const mine = isA ? m.setsA : m.setsB;
                const theirs = isA ? m.setsB : m.setsA;
                const won = m.kind === "NORMAL" && (mine ?? 0) > (theirs ?? 0);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${m.kind === "BOTH_ABSENT" ? "bg-line text-ink-soft" : won ? "bg-emerald-50 text-emerald-700" : "bg-rubber-500/10 text-rubber-600"}`}>
                      {m.kind === "BOTH_ABSENT" ? "KK" : won ? "G" : "M"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate"><Avatar name={opp.name} size="xs" /><PlayerLink id={opp.id} name={opp.name} /> <span className="text-ink-soft">({isA ? rb : ra})</span></p>
                      <p className="text-xs text-ink-soft">{m.group.round.name} · {m.group.code} Grubu · {formatDate(m.confirmedAt)}</p>
                    </div>
                    <span className="font-display font-bold tabular-nums">{m.kind === "BOTH_ABSENT" ? "Hükmen" : `${mine}-${theirs}`}</span>
                    <Delta value={pts} className="w-10 text-right" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="Henüz kesinleşmiş maç yok" />
          )}
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { liveMatches, recentLiveFinished } from "@/lib/queries";
import { deriveLive, parsePoints, parseSetScores } from "@/lib/live";
import { formatDateTime } from "@/lib/labels";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar, Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Canlı" };

export default async function LivePage() {
  await connection();
  const [live, finished] = await Promise.all([liveMatches(), recentLiveFinished()]);

  return (
    <>
      <AutoRefresh seconds={5} />
      <PageHeader eyebrow="Masa Tenisi Rating" title="Canlı skor" subtitle="Masada skorbordla tutulan maçlar sayı sayı burada. Sayfa kendiliğinden yenilenir." />
      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-10 sm:px-6">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rubber-500" /> Şu an oynanan
          </h2>
          {live.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {live.map((m) => {
                const l = deriveLive(parsePoints(m.livePoints), m.liveFirstServer === "A" || m.liveFirstServer === "B" ? m.liveFirstServer : null);
                return (
                  <article key={m.id} className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-5 py-2.5 text-xs font-semibold text-ink-soft">
                      <span>{m.group.code} Grubu · {l.sets.length + 1}. set</span>
                      <span className="chip bg-rubber-500 text-white">CANLI</span>
                    </div>
                    {(["A", "B"] as const).map((s) => {
                      const p = s === "A" ? m.playerA : m.playerB;
                      return (
                        <div key={s} className="flex items-center gap-3 px-5 py-3">
                          <Avatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {p.name} {l.server === s && <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-ball-500 align-middle" title="Servis" />}
                          </span>
                          <span className="flex gap-1">
                            {l.sets.map((st, i) => (
                              <span key={i} className={`w-7 text-center text-sm tabular-nums ${st[s === "A" ? 0 : 1] > st[s === "A" ? 1 : 0] ? "font-bold" : "text-ink-soft"}`}>
                                {st[s === "A" ? 0 : 1]}
                              </span>
                            ))}
                          </span>
                          <span className="w-8 text-center font-display text-lg font-bold text-table-600 tabular-nums">{s === "A" ? l.setsA : l.setsB}</span>
                          <span className="w-14 rounded-xl bg-table-900 py-1 text-center font-display text-2xl font-bold text-white tabular-nums">
                            {l.current[s === "A" ? 0 : 1]}
                          </span>
                        </div>
                      );
                    })}
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty title="Şu an canlı maç yok">Oyuncular maça başlarken “Maçlarım” sayfasından skorbordu açınca maç burada görünür.</Empty>
          )}
        </section>

        {finished.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">Az önce biten</h2>
            <ul className="card divide-y divide-line">
              {finished.map((m) => {
                const aWon = (m.setsA ?? 0) > (m.setsB ?? 0);
                const sets = parseSetScores(m.setScores);
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="chip bg-table-50 text-table-700">{m.group.code}</span>
                    <span className={aWon ? "font-bold" : "text-ink-soft"}>{m.playerA.name}</span>
                    <span className="rounded-lg bg-table-900 px-2.5 py-1 font-display font-bold text-white tabular-nums">{m.setsA}-{m.setsB}</span>
                    <span className={!aWon ? "font-bold" : "text-ink-soft"}>{m.playerB.name}</span>
                    {sets && <span className="text-xs text-ink-soft tabular-nums">({sets.map(([x, y]) => `${x}-${y}`).join(", ")})</span>}
                    <span className="ml-auto text-xs text-ink-soft">{m.status === "SUBMITTED" ? "Onay bekliyor · " : ""}{formatDateTime(m.liveUpdatedAt)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

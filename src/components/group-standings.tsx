import Link from "next/link";
import { standings, type GroupWithData } from "@/lib/queries";
import type { EntryResult } from "@/lib/rating";
import { parseSetScores, setScoresText } from "@/lib/live";
import { Avatar, Delta, MatchStatusChip } from "./ui";

/** Oyuncunun kendi grubu: anlık puan durumu ve gruptaki tüm maçlar. `me` satırı vurgulanır. */
export function GroupStandings({ group, results, me }: { group: GroupWithData; results: Map<string, EntryResult>; me?: string }) {
  const playing = group.entries.filter((e) => e.attendance === "YES");
  const rows = standings(playing, results);
  const done = group.matches.filter((m) => m.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-table-50/60 px-4 py-3">
          <h2 className="font-display text-lg font-bold">{group.code} Grubu puan durumu</h2>
          <span className="text-xs font-medium text-ink-soft">{done}/{group.matches.length} maç kesinleşti</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
              <th className="w-8 px-3 py-2">#</th>
              <th className="px-2 py-2">Oyuncu</th>
              <th className="px-2 py-2 text-center">O</th>
              <th className="px-2 py-2 text-center">G</th>
              <th className="px-2 py-2 text-center">M</th>
              <th className="px-2 py-2 text-right">Puan</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">Yeni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((e, i) => {
              const r = results.get(e.playerId)!;
              const mine = e.playerId === me;
              return (
                <tr key={e.id} className={mine ? "bg-ball-500/10" : ""}>
                  <td className="px-3 py-2.5 font-bold text-ink-soft tabular-nums">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <Link href={`/oyuncular/${e.playerId}`} className="flex min-w-0 items-center gap-2">
                      <Avatar name={e.player.name} size="xs" />
                      <span className={`truncate ${mine ? "font-bold" : "font-semibold"}`}>{e.player.name}</span>
                      {mine && <span className="chip bg-ball-500 text-[10px] text-white">Sen</span>}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{r.played}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-emerald-700 tabular-nums">{r.won}</td>
                  <td className="px-2 py-2.5 text-center text-rubber-600 tabular-nums">{r.played - r.won}</td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums"><Delta value={r.total} /></td>
                  <td className="hidden px-3 py-2.5 text-right font-display font-bold tabular-nums sm:table-cell">{r.ratingAfter}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-soft">
          Sıralama galibiyet, sonra puan değişimine göre. Puan sütunu kesinleşen maçları gösterir; eksik maç ve yıldız bonusları grubun tüm maçları bitince eklenir.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-bold">Gruptaki maçlar</h2>
        <ul className="card divide-y divide-line">
          {group.matches.map((m) => {
            const mineMatch = m.playerAId === me || m.playerBId === me;
            const aWon = m.kind === "NORMAL" && (m.setsA ?? 0) > (m.setsB ?? 0);
            const bWon = m.kind === "NORMAL" && !aWon;
            const sets = setScoresText(parseSetScores(m.setScores));
            const live = m.status === "PENDING" && !!m.liveStartedAt;
            return (
              <li key={m.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${mineMatch ? "bg-ball-500/5" : ""}`}>
                <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className={`truncate text-right ${aWon ? "font-bold" : ""}`}>{m.playerA.name}</span>
                  <span className={`min-w-12 rounded-lg px-2 py-0.5 text-center font-display font-bold tabular-nums ${m.kind ? "bg-table-900 text-white" : "bg-line text-ink-soft"}`}>
                    {m.kind === "BOTH_ABSENT" ? "KK" : m.kind ? `${m.setsA}-${m.setsB}` : "–"}
                  </span>
                  <span className={`truncate ${bWon ? "font-bold" : ""}`}>{m.playerB.name}</span>
                </div>
                {live ? (
                  <Link href="/canli" className="chip bg-rubber-500 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Canlı</Link>
                ) : (
                  <MatchStatusChip status={m.status} />
                )}
                {sets && <span className="w-full text-center text-xs text-ink-soft tabular-nums">{sets}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

import Link from "next/link";
import type { Match, Player, Group, Round } from "@prisma/client";
import { formatDateTime } from "@/lib/labels";
import { parseSetScores, setScoresText } from "@/lib/live";

type M = Match & { playerA: Player; playerB: Player; group: Group & { round: Round } };

/** Son sonuçlar: kazanan kalın yazılır. */
export function ResultList({ matches }: { matches: M[] }) {
  return (
    <ul className="card divide-y divide-line">
      {matches.map((m) => {
        const aWon = m.kind === "NORMAL" && (m.setsA ?? 0) > (m.setsB ?? 0);
        const bWon = m.kind === "NORMAL" && !aWon;
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="chip shrink-0 bg-table-50 text-table-700">{m.group.code}</span>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Link href={`/oyuncular/${m.playerAId}`} className={`truncate text-right ${aWon ? "font-bold" : "text-ink-soft"}`}>{m.playerA.name}</Link>
              <span title={setScoresText(parseSetScores(m.setScores)) || undefined} className="rounded-lg bg-table-900 px-2.5 py-1 font-display font-bold text-white tabular-nums">
                {m.kind === "BOTH_ABSENT" ? "KK" : `${m.setsA}-${m.setsB}`}
              </span>
              <Link href={`/oyuncular/${m.playerBId}`} className={`truncate ${bWon ? "font-bold" : "text-ink-soft"}`}>{m.playerB.name}</Link>
            </div>
            <span className="hidden shrink-0 text-xs text-ink-soft sm:block">{formatDateTime(m.confirmedAt ?? m.updatedAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}

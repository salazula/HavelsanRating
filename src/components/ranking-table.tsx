import Link from "next/link";
import type { Player } from "@prisma/client";
import { Avatar, Delta } from "./ui";

type Row = Player & { rank: number };

export function RankingTable({ rows, changes, compact }: { rows: Row[]; changes: Map<string, number>; compact?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-table-50/60 text-left text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
              <th className="w-12 px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">Oyuncu</th>
              <th className="px-3 py-2.5 text-right">Puan</th>
              <th className="px-3 py-2.5 text-right">Son tur</th>
              {!compact && (
                <>
                  <th className="px-3 py-2.5 text-right">Set Av.</th>
                  <th className="px-3 py-2.5 text-right">Maç</th>
                  <th className="px-3 py-2.5 text-right">Galibiyet</th>
                  <th className="px-3 py-2.5 text-right">Oran</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id} className="transition hover:bg-table-50/50">
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-grid h-7 w-7 place-items-center rounded-md text-xs font-bold tabular-nums ${p.rank <= 3 ? "bg-ball-500 text-white" : "text-ink-soft"}`}>{p.rank}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/oyuncular/${p.id}`} className="flex items-center gap-2.5 font-semibold hover:text-table-600">
                    <Avatar name={p.name} size="sm" />
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-display text-base font-bold tabular-nums">{p.rating}</td>
                <td className="px-3 py-2.5 text-right"><Delta value={changes.get(p.id)} /></td>
                {!compact && (
                  <>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.setAverage}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.matches}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.wins}</td>
                    <td className="px-3 py-2.5 text-right text-ink-soft tabular-nums">{p.matches ? `%${Math.round((p.wins / p.matches) * 100)}` : "–"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

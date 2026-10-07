import Link from "next/link";
import type { GroupWithData } from "@/lib/queries";
import type { EntryResult } from "@/lib/rating";
import { attendanceLabel } from "@/lib/labels";
import { Avatar, Delta } from "./ui";

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

/** Grup çapraz tablosu: her hücre satırdaki oyuncunun gözünden skor. */
export function GroupTable({ group, results, showSchedule = true }: { group: GroupWithData; results: Map<string, EntryResult>; showSchedule?: boolean }) {
  const playing = group.entries.filter((e) => e.attendance === "YES");
  const absent = group.entries.filter((e) => e.attendance === "NO" || e.attendance === "AUTO_NO");
  const ids = playing.map((e) => e.playerId);
  const cell = (rowId: string, colId: string) => {
    if (rowId === colId) return { text: "", tone: "bg-line/60" };
    const m = group.matches.find((x) => (x.playerAId === rowId && x.playerBId === colId) || (x.playerAId === colId && x.playerBId === rowId));
    if (!m || m.status === "PENDING" || !m.kind) return { text: "", tone: "" };
    const approved = m.status === "APPROVED";
    if (m.kind === "BOTH_ABSENT") return { text: "KK", tone: "text-ink-soft", approved };
    const mine = m.playerAId === rowId ? m.setsA! : m.setsB!;
    const theirs = m.playerAId === rowId ? m.setsB! : m.setsA!;
    const won = mine > theirs;
    return { text: `${mine}-${theirs}`, tone: won ? "text-emerald-700 bg-emerald-50/70" : "text-rubber-600 bg-rubber-500/5", approved };
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-table-50/60 px-4 py-3">
        <h3 className="font-display text-lg font-bold">{group.code} Grubu</h3>
        {showSchedule && group.schedule && <p className="text-xs font-medium text-ink-soft">{group.playAt ? `${dayFmt.format(group.playAt)} · ` : ""}{group.schedule}</p>}
      </div>
      {playing.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink-soft">Bu grupta maç yapılmadı.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
              <th className="px-3 py-2">Oyuncu</th>
              <th className="px-2 py-2 text-right whitespace-nowrap">Maç Ö.</th>
              {ids.map((_, i) => (
                <th key={i} className="w-11 px-1 py-2 text-center">{i + 1}</th>
              ))}
              <th className="px-2 py-2 text-center">M/G</th>
              <th className="px-2 py-2 text-right">Puan</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Maç S.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {playing.map((e, i) => {
              const r = results.get(e.playerId);
              return (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="mr-2 inline-block w-4 text-xs font-bold text-ink-soft tabular-nums">{i + 1}</span>
                    <Avatar name={e.player.name} size="xs" />{" "}
                    <Link href={`/oyuncular/${e.playerId}`} className="font-semibold whitespace-nowrap hover:text-table-600">{e.player.name}</Link>
                    {e.movedFrom && <span className="chip ml-1.5 bg-table-50 text-[10px] text-table-700" title="Grubu tamamlamak için alt gruptan alındı">{e.movedFrom}↑</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.ratingBefore}</td>
                  {ids.map((col) => {
                    const c = cell(e.playerId, col);
                    return (
                      <td key={col} className={`px-1 py-2 text-center text-xs font-semibold tabular-nums ${c.tone}`} title={c.approved === false ? "Onay bekliyor" : undefined}>
                        {c.text}
                        {c.approved === false && <span className="text-amber-600">*</span>}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center text-xs text-ink-soft tabular-nums">{r ? `${r.played}/${r.won}` : "–"}</td>
                  <td className="px-2 py-2 text-right"><Delta value={r?.total} /></td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{r?.ratingAfter ?? e.ratingBefore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      {absent.length > 0 && (
        <div className="border-t border-line px-4 py-2.5 text-xs text-ink-soft">
          <span className="font-semibold">Katılmayanlar:</span>{" "}
          {absent.map((e, i) => (
            <span key={e.id}>
              {i > 0 && " · "}
              <Link href={`/oyuncular/${e.playerId}`} className="font-medium text-ink hover:text-table-600">{e.player.name}</Link> ({attendanceLabel[e.attendance]}, <Delta value={results.get(e.playerId)?.total} />)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Katılım aşamasında grup listesi */
export function AttendanceList({ group }: { group: GroupWithData }) {
  const yes = group.entries.filter((e) => e.attendance === "YES").length;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-table-50/60 px-4 py-3">
        <h3 className="font-display text-lg font-bold">{group.code} Grubu <span className="text-sm font-normal text-ink-soft">· {yes}/{group.entries.length} katılıyor</span></h3>
        {group.schedule && <p className="text-xs font-medium text-ink-soft">{group.playAt ? `${dayFmt.format(group.playAt)} · ` : ""}{group.schedule}</p>}
      </div>
      <ul className="divide-y divide-line text-sm">
        {[...group.entries].sort((a, b) => b.ratingBefore - a.ratingBefore).map((e) => (
          <li key={e.id} className="flex items-center gap-2 px-4 py-2">
            <Avatar name={e.player.name} size="xs" />
            <Link href={`/oyuncular/${e.playerId}`} className="flex-1 truncate font-semibold hover:text-table-600">{e.player.name}</Link>
            <span className="tabular-nums text-ink-soft">{e.player.rating}</span>
            <span className={`chip ${e.attendance === "YES" ? "bg-emerald-50 text-emerald-700" : e.attendance === "PENDING" ? "bg-line text-ink-soft" : "bg-rubber-500/10 text-rubber-600"}`}>{attendanceLabel[e.attendance]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

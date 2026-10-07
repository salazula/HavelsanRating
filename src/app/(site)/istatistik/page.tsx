import type { Metadata } from "next";
import { db } from "@/lib/db";
import { lastChanges } from "@/lib/queries";
import { Delta, Empty, PageHeader, PlayerLink } from "@/components/ui";

export const metadata: Metadata = { title: "İstatistik" };

function Board({ title, hint, rows }: { title: string; hint?: string; rows: { id: string; name: string; value: React.ReactNode }[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line bg-table-50/60 px-4 py-3">
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      </div>
      {rows.length ? (
        <ol className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-5 text-xs font-bold text-ink-soft tabular-nums">{i + 1}</span>
              <PlayerLink id={r.id} name={r.name} className="flex-1 truncate" />
              <span className="font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-ink-soft">Henüz veri yok</p>
      )}
    </section>
  );
}

export default async function StatsPage() {
  const [players, changes, starEntries] = await Promise.all([
    db.player.findMany({ where: { active: true } }),
    lastChanges(),
    db.groupEntry.findMany({ where: { played: { gt: 0 } }, select: { playerId: true, played: true, won: true } }),
  ]);
  if (!players.length) {
    return (
      <>
        <PageHeader eyebrow="Havelsan Rating" title="İstatistikler" />
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6"><Empty title="Henüz oyuncu eklenmedi" /></div>
      </>
    );
  }
  const name = new Map(players.map((p) => [p.id, p.name]));
  const starCount = new Map<string, number>();
  for (const e of starEntries) if (e.played === e.won) starCount.set(e.playerId, (starCount.get(e.playerId) ?? 0) + 1);

  const hundred = players.filter((p) => p.matches >= 100).sort((a, b) => b.matches - a.matches);
  const mostWins = [...players].sort((a, b) => b.wins - a.wins).slice(0, 10);
  const bestRatio = players.filter((p) => p.matches >= 20).sort((a, b) => b.wins / b.matches - a.wins / a.matches).slice(0, 10);
  const risers = [...changes.entries()].filter(([id]) => name.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const stars = [...starCount.entries()].filter(([id]) => name.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sets = [...players].sort((a, b) => b.setAverage - a.setAverage).slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Havelsan Rating" title="İstatistik liderleri" />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        <Board title="100 maç barajını aşanlar" rows={hundred.map((p) => ({ id: p.id, name: p.name, value: `${p.matches} maç` }))} />
        <Board title="Son turun yükselenleri" rows={risers.map(([id, v]) => ({ id, name: name.get(id)!, value: <Delta value={v} /> }))} />
        <Board title="Haftanın yıldızı" hint="Turdaki tüm maçlarını kazanma sayısı" rows={stars.map(([id, v]) => ({ id, name: name.get(id)!, value: `${v} kez` }))} />
        <Board title="En çok galibiyet" rows={mostWins.map((p) => ({ id: p.id, name: p.name, value: p.wins }))} />
        <Board title="En yüksek galibiyet oranı" hint="En az 20 maç" rows={bestRatio.map((p) => ({ id: p.id, name: p.name, value: `%${Math.round((p.wins / p.matches) * 100)}` }))} />
        <Board title="En iyi set averajı" rows={sets.map((p) => ({ id: p.id, name: p.name, value: p.setAverage }))} />
      </div>
    </>
  );
}

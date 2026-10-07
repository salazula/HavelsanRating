import Link from "next/link";
import { db } from "@/lib/db";
import { getRanking, getShowcaseRound, groupStars, lastChanges } from "@/lib/queries";
import { getRules } from "@/lib/rules";
import { HeroArt } from "@/components/art";
import { RankingTable } from "@/components/ranking-table";
import { ResultList } from "@/components/result-list";
import { Avatar, Empty, PlayerLink, SectionTitle } from "@/components/ui";

export default async function HomePage() {
  const [ranking, changes, round, recent, matchCount] = await Promise.all([
    getRanking(),
    lastChanges(),
    getShowcaseRound(),
    db.match.findMany({
      where: { status: "APPROVED" },
      include: { playerA: true, playerB: true, group: { include: { round: true } } },
      orderBy: { confirmedAt: "desc" },
      take: 8,
    }),
    db.match.count({ where: { status: "APPROVED", kind: "NORMAL" } }),
  ]);

  // Haftanın yıldızları: turda tüm maçlarını kazananlar
  const rules = await getRules();
  const stars = (round?.groups ?? []).flatMap((g) => groupStars(g, rules).map(({ entry }) => ({ ...entry, group: g.code })));
  const totalMatches = round?.groups.reduce((s, g) => s + g.matches.length, 0) ?? 0;
  const doneMatches = round?.groups.reduce((s, g) => s + g.matches.filter((m) => m.status === "APPROVED").length, 0) ?? 0;

  return (
    <>
      <section className="cosmos relative overflow-hidden text-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="chip bg-white/10 text-ball-300 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-sm bg-ball-400" />
              {round ? `${round.name} · ${{ ATTENDANCE: "katılım bildirimi sürüyor", OPEN: "maçlar oynanıyor", CLOSED: "tamamlandı", DRAFT: "" }[round.status]}` : "İlk hafta yakında"}
            </span>
            <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-ball-300 uppercase">Havelsan · Kurum içi lig</p>
            <h1 className="mt-2 text-4xl leading-[1.1] font-bold sm:text-5xl">
              Masa Tenisi Ligi
            </h1>
            <p className="mt-5 max-w-xl text-lg text-table-100">
              Haftalık gruplar, şeffaf puan hesabı ve güncel sıralama. Maçlar Pazartesi-Cuma arasında, size uyan gün oynanır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/siralama" className="btn-accent px-5 py-3 text-base">Sıralama</Link>
              <Link href="/gruplar" className="btn border border-white/25 bg-white/5 px-5 py-3 text-base text-white hover:bg-white/15">Gruplar</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["Oyuncu", ranking.length],
                ["Oynanan maç", matchCount],
                ["Bu hafta", totalMatches ? `${doneMatches}/${totalMatches}` : "–"],
              ].map(([k, v]) => (
                <div key={k} className="border-l-2 border-ball-400 bg-white/5 px-4 py-3">
                  <dt className="text-xs font-semibold text-table-200">{k}</dt>
                  <dd className="font-display text-2xl font-bold sm:text-3xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroArt className="mx-auto w-full max-w-xl" />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <SectionTitle title="Sıralama" href="/siralama" linkText="Tam liste" />
          {ranking.length ? <RankingTable rows={ranking.slice(0, 15)} changes={changes} compact /> : <Empty title="Henüz oyuncu eklenmedi" />}
        </section>
        <div className="space-y-12">
          {stars.length > 0 && (
            <section>
              <SectionTitle title="Haftanın yıldızları" href="/yildizlar" linkText="Tüm haftalar" />
              <ul className="card divide-y divide-line">
                {stars.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-lg">⭐</span>
                    <Avatar name={s.player.name} photoUrl={s.player.photoUrl} size="sm" />
                    <PlayerLink id={s.playerId} name={s.player.name} className="flex-1" />
                    <span className="chip bg-table-50 text-table-700">{s.group} Grubu</span>
                    <span className="chip bg-ball-500/15 text-ball-600">+{rules.unbeatenBonus}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <SectionTitle title="Son sonuçlar" href="/gruplar" linkText="Gruplar" />
            {recent.length ? <ResultList matches={recent} /> : <Empty title="Henüz sonuç yok" />}
          </section>
        </div>
      </div>
    </>
  );
}

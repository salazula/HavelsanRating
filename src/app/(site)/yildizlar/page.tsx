import type { Metadata } from "next";
import { db } from "@/lib/db";
import { groupInclude, groupStars } from "@/lib/queries";
import { getRules } from "@/lib/rules";
import { Avatar, Empty, PageHeader, PlayerLink } from "@/components/ui";

export const metadata: Metadata = { title: "Haftanın Yıldızları" };

export default async function StarsPage() {
  const rules = await getRules();
  const rounds = await db.round.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    include: { groups: { include: groupInclude, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 26,
  });
  const weeks = rounds
    .map((r) => ({ round: r, groups: r.groups.map((g) => ({ g, stars: groupStars(g, rules) })).filter((x) => x.stars.length) }))
    .filter((w) => w.groups.length);

  return (
    <>
      <PageHeader
        eyebrow="Masa Tenisi Rating"
        title="Haftanın yıldızları"
        subtitle={`Grubundaki tüm maçlarını kazanan oyuncu o haftanın yıldızıdır ve +${rules.unbeatenBonus} puan alır. Her grubun kendi yıldızı olabilir.`}
      />
      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-10 sm:px-6">
        {weeks.length ? (
          weeks.map(({ round, groups }) => (
            <section key={round.id}>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
                {round.name}
                {round.status === "OPEN" && <span className="chip bg-ball-500 text-table-900">Devam ediyor</span>}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.flatMap(({ g, stars }) =>
                  stars.map(({ entry, result }) => (
                    <div key={entry.id} className="card relative flex items-center gap-4 overflow-hidden p-4">
                      <div className="absolute -top-6 -right-6 text-7xl opacity-10">⭐</div>
                      <Avatar name={entry.player.name} photoUrl={entry.player.photoUrl} size="lg" />
                      <div className="min-w-0">
                        <PlayerLink id={entry.playerId} name={entry.player.name} className="block truncate text-lg" />
                        <p className="text-sm text-ink-soft">{g.code} Grubu · {result.won}/{result.played} galibiyet</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-600">+{result.total} puan → {result.ratingAfter}</p>
                      </div>
                    </div>
                  )),
                )}
              </div>
            </section>
          ))
        ) : (
          <Empty title="Henüz haftanın yıldızı yok">Bir grup tamamlandığında tüm maçlarını kazanan oyuncu burada görünür.</Empty>
        )}
      </div>
    </>
  );
}

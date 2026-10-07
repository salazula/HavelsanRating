import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getShowcaseRound, groupResults } from "@/lib/queries";
import { getRules } from "@/lib/rules";
import { AttendanceList, GroupTable } from "@/components/group-table";
import { formatDateTime } from "@/lib/labels";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Gruplar" };

export default async function GroupsPage({ searchParams }: PageProps<"/gruplar">) {
  const sp = await searchParams;
  const rules = await getRules();
  const id = typeof sp.tur === "string" ? sp.tur : undefined;
  const [round, rounds] = await Promise.all([
    getShowcaseRound(id),
    db.round.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const visible = round && round.status !== "DRAFT" ? round : null;

  return (
    <>
      <PageHeader
        eyebrow={visible ? ({ ATTENDANCE: "Katılım bildirimi sürüyor", OPEN: "Maçlar oynanıyor", CLOSED: "Tamamlanan hafta", DRAFT: "" }[visible.status]) : "Gruplar"}
        title={visible ? `${visible.name} grupları` : "Gruplar"}
        subtitle={visible?.status === "ATTENDANCE" ? `Oyuncular ${visible.deadline ? formatDateTime(visible.deadline) : "son güne"} kadar katılım bildirir; ardından eksik gruplar alt gruptan tamamlanır ve fikstür oluşur.` : visible?.status === "OPEN" ? `Skorlar satırdaki oyuncunun gözünden yazılır; * işaretliler rakip onayı bekliyor. Puan sütunu kesinleşen maçları gösterir; eksik maç (+${rules.perMissingMatch}) ve yıldız (+${rules.unbeatenBonus}) bonusları grubun tüm maçları bitince eklenir. ↑ işaretli oyuncular grubu tamamlamak için alt gruptan alındı.` : "Skorlar satırdaki oyuncunun gözünden yazılır. Puan sütunu set averajı ve grup bonuslarını içerir."}
      >
        {rounds.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <Link
                key={r.id}
                href={`/gruplar?tur=${r.id}`}
                className={`chip ring-1 ring-white/20 ${r.id === visible?.id ? "bg-white text-table-800" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                {r.name}
              </Link>
            ))}
          </div>
        )}
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {visible ? (
          <div className="grid gap-6">
            {visible.status === "ATTENDANCE" ? (
              <div className="grid gap-6 md:grid-cols-2">
                {visible.groups.map((g) => <AttendanceList key={g.id} group={g} />)}
              </div>
            ) : (
              visible.groups.map((g) => <GroupTable key={g.id} group={g} results={groupResults(g, rules)} />)
            )}
          </div>
        ) : (
          <Empty title="Henüz yayınlanmış bir hafta yok">Lig sorumlusu grupları yayınlayınca burada görünecek.</Empty>
        )}
      </div>
    </>
  );
}

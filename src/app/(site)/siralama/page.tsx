import type { Metadata } from "next";
import { getRanking, lastChanges } from "@/lib/queries";
import { RankingTable } from "@/components/ranking-table";
import { Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Sıralama" };

export default async function RankingPage() {
  const [ranking, changes] = await Promise.all([getRanking(), lastChanges()]);
  return (
    <>
      <PageHeader eyebrow="Masa Tenisi Rating" title="Oyuncu sıralaması" subtitle="Güncel rating puanları. Son tur sütunu, en son tamamlanan turdaki değişimi gösterir." />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {ranking.length ? <RankingTable rows={ranking} changes={changes} /> : <Empty title="Henüz oyuncu eklenmedi" />}
      </div>
    </>
  );
}

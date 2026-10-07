import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm } from "@/components/forms/action-form";
import { ScoreSelect } from "@/components/score-select";
import { Empty, MatchStatusChip } from "@/components/ui";
import { confirmResult, setResult } from "../maclarim/actions";

export default async function ResultsPage() {
  await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const round = await db.round.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } });
  const matches = round
    ? await db.match.findMany({
        where: { group: { roundId: round.id }, status: { in: ["SUBMITTED", "DISPUTED"] } },
        include: { playerA: true, playerB: true, submittedBy: true, group: true },
        orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
      })
    : [];
  return (
    <>
      <PanelTitle title="Sonuçlar ve onaylar" subtitle={round ? `${round.name}: rakip onayı bekleyen ve itiraz edilen sonuçlar` : "Devam eden tur yok."}>
        {round && <Link href={`/panel/turlar/${round.id}`} className="btn-ghost">Tüm maçlar →</Link>}
      </PanelTitle>
      {matches.length ? (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li key={m.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="chip bg-table-50 text-table-700">{m.group.code}</span>
                <p className="min-w-0 flex-1 font-semibold">
                  {m.playerA.name} <span className="mx-1 rounded-lg bg-table-900 px-2 py-0.5 font-display text-white tabular-nums">{m.setsA}-{m.setsB}</span> {m.playerB.name}
                </p>
                <MatchStatusChip status={m.status} />
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Giren: {m.submittedBy?.name ?? "—"} · {formatDateTime(m.submittedAt)}
                {m.disputeNote && <span className="text-rubber-600"> · İtiraz: “{m.disputeNote}”</span>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                {m.status === "SUBMITTED" && (
                  <ActionForm action={confirmResult.bind(null, m.id)} submitLabel="Bu sonucu onayla" className="space-y-2">
                    <span />
                  </ActionForm>
                )}
                <ActionForm action={setResult.bind(null, m.id)} submitLabel="Düzelt ve kesinleştir" submitClass="btn-ghost" className="flex items-center gap-2">
                  <ScoreSelect withKK withEmpty defaultValue={`${m.setsA}-${m.setsB}`} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Bekleyen sonuç yok" />
      )}
    </>
  );
}

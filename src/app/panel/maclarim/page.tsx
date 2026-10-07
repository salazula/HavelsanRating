import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { scoreMatch } from "@/lib/rating";
import { parseSetScores, setScoresText } from "@/lib/live";
import { getRules } from "@/lib/rules";
import { groupInclude, groupResults } from "@/lib/queries";
import { GroupStandings } from "@/components/group-standings";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm } from "@/components/forms/action-form";
import { ScoreSelect } from "@/components/score-select";
import { Delta, Empty, MatchStatusChip, Notice } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { playUntil, playWindowText } from "@/lib/schedule";
import { confirmResult, declareAttendance, disputeResult, submitResult } from "./actions";

export default async function MyMatches() {
  const user = await requireUser();
  const rules = await getRules();
  const me = user.playerId;
  if (!me) return <Notice tone="info">Hesabınız bir oyuncuya bağlı değil.</Notice>;

  const round = await db.round.findFirst({ where: { status: { in: ["ATTENDANCE", "OPEN"] } }, orderBy: { createdAt: "desc" } });
  const entry = round
    ? await db.groupEntry.findFirst({ where: { playerId: me, group: { roundId: round.id } }, include: { group: true } })
    : null;
  if (round?.status === "ATTENDANCE") {
    const open = !round.deadline || round.deadline > new Date();
    return (
      <>
        <PanelTitle title="Maçlarım" subtitle={round.name}>
          <Link href={`/oyuncular/${me}`} className="btn-ghost">Profilim →</Link>
        </PanelTitle>
        {entry ? (
          <div className="card p-5">
            <p className="text-sm text-ink-soft">Bu hafta</p>
            <p className="font-display text-2xl font-bold">{entry.group.code} Grubu</p>
            <p className="mt-1 text-sm">
              Maçlar {round.weekStart ? playWindowText(round.weekStart) : "Pazartesi-Cuma"} arasında, istediğiniz gün{entry.group.schedule ? ` · ${entry.group.schedule}` : ""}
            </p>
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-3 text-sm">
                Durumunuz:{" "}
                <b>{{ PENDING: "Bildirilmedi", YES: "Katılacağım", NO: "Katılamayacağım", AUTO_NO: "Hükmen (bildirilmedi)" }[entry.attendance]}</b>
                {round.deadline && <span className="text-ink-soft"> · Son bildirim: {formatDateTime(round.deadline)}</span>}
              </p>
              {open ? (
                <div className="flex flex-col items-start gap-3">
                  <ActionForm action={declareAttendance.bind(null, entry.id, true)} submitLabel="✓ Katılacağım" submitClass={entry.attendance === "YES" ? "btn-primary" : "btn-ghost"} className="flex flex-row-reverse items-center gap-2"><span /></ActionForm>
                  <ActionForm action={declareAttendance.bind(null, entry.id, false)} submitLabel="✗ Katılamayacağım" submitClass={entry.attendance === "NO" ? "btn-danger" : "btn-ghost"} className="flex flex-row-reverse items-center gap-2"><span /></ActionForm>
                </div>
              ) : (
                <Notice tone="info">Bildirim süresi doldu, fikstür birazdan oluşacak.</Notice>
              )}
              <p className="mt-4 text-xs text-ink-soft">Son güne kadar bildirim yapmayan oyuncu hükmen sayılır ve gelmeme cezası alır. Grubunuzda eksik olursa alt gruptan oyuncu alınır; siz de üst gruba çağrılabilirsiniz.</p>
            </div>
          </div>
        ) : (
          <Empty title="Bu hafta bir gruba yerleştirilmediniz" />
        )}
      </>
    );
  }
  const matches = round
    ? await db.match.findMany({
        where: { group: { roundId: round.id }, OR: [{ playerAId: me }, { playerBId: me }] },
        include: { playerA: true, playerB: true, submittedBy: true, group: { include: { entries: true } } },
        orderBy: { id: "asc" },
      })
    : [];
  const group = matches[0]?.group;
  const weekOpen = !round?.weekStart || playUntil(round.weekStart) > new Date();
  // Oyuncunun grubu: puan durumu ve diğer maçlar (fikstür oluştuysa)
  const groupId = group?.id ?? (round?.status === "OPEN" ? entry?.groupId : undefined);
  const myGroup = groupId ? await db.group.findUnique({ where: { id: groupId }, include: { ...groupInclude, round: true } }) : null;

  return (
    <>
      <PanelTitle
        title="Maçlarım"
        subtitle={round ? `${round.name}${group ? ` · ${group.code} Grubu${group.schedule ? ` · ${group.schedule}` : ""}` : ""}` : "Şu an devam eden bir hafta yok."}
      >
        <Link href={`/oyuncular/${me}`} className="btn-ghost">Profilim →</Link>
      </PanelTitle>
      {round?.weekStart && matches.length > 0 && (
        <div className="mb-4">
          {playUntil(round.weekStart) > new Date() ? (
            <Notice tone="info">
              Maçlarınızı rakiplerinizle anlaşarak <b>{playWindowText(round.weekStart)}</b> arasında istediğiniz gün oynayın. Cuma gecesine kadar sonucu girilmeyen maçlar hükmen sayılır ve iki oyuncuya da gelmeme cezası uygulanır.
            </Notice>
          ) : (
            <Notice tone="info">Hafta sona erdi. Oynanmayan maçlar hükmen sayıldı; onay bekleyen ve itirazlı sonuçları lig sorumlusu kesinleştirecek.</Notice>
          )}
        </div>
      )}
      {entry && entry.attendance !== "YES" && <div className="mb-4"><Notice tone="error">Bu hafta {entry.attendance === "AUTO_NO" ? "katılım bildirmediğiniz için hükmen sayıldınız" : "katılmayacağınızı bildirdiniz"}; maçınız yok.</Notice></div>}
      {entry?.movedFrom && <div className="mb-4"><Notice tone="info">Grubu tamamlamak için {entry.movedFrom} grubundan {entry.group.code} grubuna alındınız.</Notice></div>}
      {!round || !matches.length ? (
        <Empty title="Bu hafta maçınız yok" />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const iAmA = m.playerAId === me;
            const opp = iAmA ? m.playerB : m.playerA;
            const ra = m.group.entries.find((e) => e.playerId === m.playerAId)!.ratingBefore;
            const rb = m.group.entries.find((e) => e.playerId === m.playerBId)!.ratingBefore;
            const myView = m.kind === "NORMAL" ? (iAmA ? `${m.setsA}-${m.setsB}` : `${m.setsB}-${m.setsA}`) : m.kind === "BOTH_ABSENT" ? "Hükmen" : null;
            const o = m.kind ? scoreMatch({ ratingA: ra, ratingB: rb, kind: m.kind, setsA: m.setsA, setsB: m.setsB }, rules) : null;
            const pts = o ? (iAmA ? o.pointsA : o.pointsB) : null;
            const submittedByMe = m.submittedBy?.playerId === me;
            const sets = parseSetScores(m.setScores);
            return (
              <div key={m.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{opp.name} <span className="font-normal text-ink-soft">({iAmA ? rb : ra})</span></p>
                    <p className="text-xs text-ink-soft">
                      {myView ? <>Skor (sizin gözünüzden): <b className="text-ink">{myView}</b>{sets ? ` (${setScoresText(sets, !iAmA)})` : ""} · Puan: <Delta value={pts} /></> : "Sonuç girilmedi"}
                      {m.status === "SUBMITTED" && (submittedByMe ? " · rakibinizin onayı bekleniyor" : " · rakibiniz girdi")}
                    </p>
                  </div>
                  <MatchStatusChip status={m.status} />
                </div>
                {weekOpen && m.status === "PENDING" && (
                  <Link href={`/skor/${m.id}`} className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-table-900 px-4 py-3 text-sm font-semibold text-white hover:bg-table-800">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.liveStartedAt ? "animate-pulse bg-rubber-500" : "bg-ball-400"}`} />
                      {m.liveStartedAt ? "Canlı skor sürüyor, skorborda dön" : "Masada canlı skor tut"}
                    </span>
                    <span aria-hidden>→</span>
                  </Link>
                )}
                {weekOpen && (m.status === "PENDING" || (m.status === "SUBMITTED" && submittedByMe)) && (
                  <ActionForm action={submitResult.bind(null, m.id)} submitLabel={m.status === "PENDING" ? "Sonucu gönder" : "Sonucu güncelle"} className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                    <ScoreSelect defaultValue={submittedByMe ? myView ?? "" : ""} />
                  </ActionForm>
                )}
                {m.status === "SUBMITTED" && !submittedByMe && (
                  <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-line pt-3">
                    <ActionForm action={confirmResult.bind(null, m.id)} submitLabel={`${myView} sonucunu onayla`} submitClass="btn-primary" className="space-y-2">
                      <span />
                    </ActionForm>
                    <ActionForm action={disputeResult.bind(null, m.id)} submitLabel="İtiraz et" submitClass="btn-danger" className="flex flex-wrap items-center gap-2">
                      <input name="note" placeholder="Doğru skor / açıklama" className="input w-56" />
                    </ActionForm>
                  </div>
                )}
                {m.status === "DISPUTED" && (
                  <p className="mt-3 border-t border-line pt-3 text-sm text-rubber-600">İtiraz edildi{m.disputeNote ? `: “${m.disputeNote}”` : ""}. Lig sorumlusu karar verecek.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {myGroup && myGroup.matches.length > 0 && (
        <div className="mt-10">
          <GroupStandings group={myGroup} results={groupResults(myGroup, rules)} me={me} />
          <Link href="/gruplar" className="mt-4 inline-block text-sm font-semibold text-table-600">Tüm grupları gör →</Link>
        </div>
      )}
    </>
  );
}

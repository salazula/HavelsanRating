import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Avatar, Empty, Notice, PlayerLink } from "@/components/ui";
import { approveApplication, rejectApplication, resendWelcome } from "./actions";

export default async function ApplicationsPage({ searchParams }: PageProps<"/panel/basvurular">) {
  await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const sonuc = String((await searchParams).sonuc ?? "");
  const last = sonuc ? await db.application.findUnique({ where: { id: sonuc } }) : null;
  const lastPlayer = last?.playerId ? await db.player.findUnique({ where: { id: last.playerId }, select: { rating: true } }) : null;
  const [pending, decided, stats] = await Promise.all([
    db.application.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    db.application.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 30 }),
    db.player.aggregate({ where: { active: true, isDemo: false }, _min: { rating: true }, _max: { rating: true }, _avg: { rating: true } }),
  ]);
  const hint = stats._min.rating != null ? `Mevcut oyuncular: en düşük ${stats._min.rating}, ortalama ${Math.round(stats._avg.rating!)}, en yüksek ${stats._max.rating}` : undefined;

  return (
    <>
      <PanelTitle title="Başvurular" subtitle={pending.length ? `${pending.length} başvuru onay bekliyor` : "Bekleyen başvuru yok"} />

      {last?.status === "APPROVED" && (
        <div className="mb-6">
          <Notice tone={last.telegramError ? "info" : "success"}>
            {last.name} {lastPlayer?.rating} puanla aramıza katıldı ve giriş yapabilir.{" "}
            {last.telegramError ? `Telegram mesajı gönderilemedi: ${last.telegramError}` : "Telegram kanalına duyuruldu."}
          </Notice>
        </div>
      )}
      {last?.status === "REJECTED" && (
        <div className="mb-6">
          <Notice tone="info">{last.name} başvurusu reddedildi.</Notice>
        </div>
      )}

      {pending.length ? (
        <div className="space-y-5">
          {pending.map((a) => (
            <section key={a.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar name={a.name} photoUrl={a.photoUrl} size="xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold">{a.name}</h2>
                  <p className="text-sm text-ink-soft">
                    {a.email} · <a href={`tel:${a.phone}`} className="font-semibold text-table-600">{a.phone}</a> · {formatDateTime(a.createdAt)}
                  </p>
                  {a.about && <p className="mt-3 rounded-lg bg-table-50 px-4 py-3 text-sm whitespace-pre-line">{a.about}</p>}
                </div>
              </div>
              <div className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-2">
                <ActionForm action={approveApplication.bind(null, a.id)} submitLabel="Onayla ve oyuncu olarak ekle" className="space-y-3">
                  <Field label="Başlangıç puanı" hint={hint}>
                    <input name="rating" type="number" min={0} max={4000} required className="input" />
                  </Field>
                </ActionForm>
                <ActionForm action={rejectApplication.bind(null, a.id)} submitLabel="Reddet" submitClass="btn-danger" className="space-y-3" confirm={`${a.name} başvurusu reddedilsin mi?`}>
                  <Field label="Ret nedeni (isteğe bağlı, sadece panelde görünür)">
                    <input name="reason" maxLength={300} className="input" />
                  </Field>
                </ActionForm>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Empty title="Bekleyen başvuru yok">Sitedeki “Başvuru yap” formundan gelen başvurular burada görünür.</Empty>
      )}

      {decided.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-bold">Sonuçlanan başvurular</h2>
          <ul className="card divide-y divide-line">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Avatar name={a.name} photoUrl={a.photoUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  {a.playerId ? <PlayerLink id={a.playerId} name={a.name} /> : <span className="font-semibold">{a.name}</span>}
                  <span className="block text-xs text-ink-soft">
                    {a.decidedBy} · {formatDateTime(a.decidedAt)}
                    {a.rejectReason ? ` · ${a.rejectReason}` : ""}
                    {a.telegramError ? ` · Telegram: ${a.telegramError}` : ""}
                  </span>
                </span>
                {a.status === "APPROVED" ? (
                  <span className="chip bg-emerald-50 text-emerald-700">Onaylandı</span>
                ) : (
                  <span className="chip bg-rubber-500/10 text-rubber-600">Reddedildi</span>
                )}
                {a.status === "APPROVED" && a.telegramError && (
                  <ActionForm action={resendWelcome.bind(null, a.id)} submitLabel="Telegram'a tekrar gönder" submitClass="btn-ghost py-1.5 text-xs" className="flex items-center gap-2">
                    <span />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { isManager, requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { Notice, RoundStatusChip } from "@/components/ui";

export default async function PanelHome({ searchParams }: PageProps<"/panel">) {
  const user = await requireUser();
  const sp = await searchParams;
  const manager = isManager(user);
  const me = user.playerId;

  const round = await db.round.findFirst({ where: { status: { in: ["OPEN", "DRAFT"] } }, orderBy: { createdAt: "desc" } });
  const openId = round?.status === "OPEN" ? round.id : "-";
  const [myToConfirm, myPending, submitted, disputed, total, approved, players, noAccount, applications] = await Promise.all([
    me
      ? db.match.count({ where: { group: { roundId: openId }, status: "SUBMITTED", OR: [{ playerAId: me }, { playerBId: me }], NOT: { submittedBy: { playerId: me } } } })
      : 0,
    me ? db.match.count({ where: { group: { roundId: openId }, status: "PENDING", OR: [{ playerAId: me }, { playerBId: me }] } }) : 0,
    db.match.count({ where: { group: { roundId: openId }, status: "SUBMITTED" } }),
    db.match.count({ where: { group: { roundId: openId }, status: "DISPUTED" } }),
    db.match.count({ where: { group: { roundId: openId } } }),
    db.match.count({ where: { group: { roundId: openId }, status: "APPROVED" } }),
    db.player.count({ where: { active: true } }),
    db.player.count({ where: { active: true, user: null } }),
    manager ? db.application.count({ where: { status: "PENDING" } }) : 0,
  ]);

  const stats: [string, React.ReactNode][] = manager
    ? [["Aktif oyuncu", players], ["Bu turda kesinleşen", total ? `${approved}/${total}` : "–"], ["Onay bekleyen", submitted], ["İtirazlı", disputed]]
    : [["Onayınızı bekleyen", myToConfirm], ["Sonucu girilmemiş maçınız", myPending]];

  return (
    <>
      {sp.yetki === "yok" && <div className="mb-6"><Notice tone="error">Bu sayfaya erişim yetkiniz yok.</Notice></div>}
      <PanelTitle title={`Merhaba, ${user.name.split(" ")[0]} 👋`} subtitle={roleLabel[user.role]} />
      <div className={`grid gap-4 ${manager ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
        {stats.map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="text-sm text-ink-soft">{k}</p>
            <p className="mt-1 font-display text-3xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {round ? (
          <div className="card flex flex-wrap items-center gap-3 p-5">
            <div className="flex-1">
              <p className="font-bold">{round.name}</p>
              <p className="text-sm text-ink-soft">{round.status === "OPEN" ? "Maçlar oynanıyor, sonuçlar girilebilir." : "Gruplar hazırlanıyor."}</p>
            </div>
            <RoundStatusChip status={round.status} />
            {me && round.status === "OPEN" && <Link href="/panel/maclarim" className="btn-primary">Maçlarım →</Link>}
            {manager && <Link href={`/panel/turlar/${round.id}`} className="btn-ghost">Turu yönet →</Link>}
          </div>
        ) : (
          <Notice tone="info">Şu an devam eden bir tur yok.{manager && <> <Link href="/panel/turlar" className="font-semibold underline">Yeni tur oluşturun.</Link></>}</Notice>
        )}
        {myToConfirm > 0 && <Notice tone="success">Rakiplerinizin girdiği {myToConfirm} sonuç onayınızı bekliyor. <Link href="/panel/maclarim" className="font-semibold underline">Onayla</Link></Notice>}
        {manager && applications > 0 && <Notice tone="success">{applications} yeni oyuncu başvurusu onay bekliyor. <Link href="/panel/basvurular" className="font-semibold underline">İncele</Link></Notice>}
        {manager && disputed > 0 && <Notice tone="error">{disputed} sonuca itiraz edildi. <Link href="/panel/sonuclar" className="font-semibold underline">İncele</Link></Notice>}
        {manager && noAccount > 0 && (
          <Notice tone="info">{noAccount} aktif oyuncunun giriş hesabı yok; bu oyuncuların maç sonuçlarını siz girmelisiniz. <Link href="/panel/oyuncular" className="font-semibold underline">Hesap aç</Link></Notice>
        )}
        {manager && players === 0 && (
          <Notice tone="info">Henüz oyuncu yok. <Link href="/panel/oyuncular" className="font-semibold underline">Oyuncular</Link> sayfasından Excel listesini yapıştırarak başlayın.</Notice>
        )}
      </div>
    </>
  );
}

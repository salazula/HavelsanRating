import "server-only";
import { db } from "./db";
import { computeGroup, fillGroups, roundRobinPairs } from "./rating";
import { getRules, toStored } from "./rules";
import { approvedMatches, entryInput } from "./queries";
import { playUntil } from "./schedule";
import { postGroupIfComplete } from "./telegram";

/**
 * Katılım süresi bitmiş turun fikstürünü oluşturur:
 *  1. Son güne kadar bildirim yapmayanlar hükmen (AUTO_NO) sayılır.
 *  2. Eksik gruplar alt gruplardaki katılan oyuncularla tamamlanır.
 *  3. Her grupta katılan oyuncular arasında herkesle herkes maçları oluşturulur.
 * Aynı tur için iki kez çalışmaz (durum ATTENDANCE → OPEN geçişi kilit görevi görür).
 */
export async function generateFixture(roundId: string) {
  return db.$transaction(
    async (tx) => {
      const lock = await tx.round.updateMany({ where: { id: roundId, status: "ATTENDANCE" }, data: { status: "OPEN", openedAt: new Date() } });
      if (!lock.count) return { ok: false as const, error: "Tur katılım aşamasında değil." };

      await tx.groupEntry.updateMany({ where: { group: { roundId }, attendance: "PENDING" }, data: { attendance: "AUTO_NO", attendanceAt: new Date() } });

      const groups = await tx.group.findMany({ where: { roundId }, orderBy: { order: "asc" }, include: { entries: { include: { player: true } } } });
      const all = groups.flatMap((g, i) => g.entries.map((e) => ({ e, i })));
      const moved = fillGroups(
        all.map(({ e, i }) => ({ id: e.id, groupIndex: i, rating: e.player.rating, attending: e.attendance === "YES" })),
        groups.map((g) => g.size),
      );
      for (const [entryId, to] of moved) {
        const from = all.find((x) => x.e.id === entryId)!;
        await tx.groupEntry.update({ where: { id: entryId }, data: { groupId: groups[to]!.id, movedFrom: from.e.movedFrom ?? groups[from.i]!.code } });
      }

      let matchCount = 0;
      const fresh = await tx.group.findMany({ where: { roundId }, include: { entries: { include: { player: true } } } });
      for (const g of fresh) {
        const sorted = [...g.entries].sort((a, b) => b.player.rating - a.player.rating || b.player.setAverage - a.player.setAverage);
        for (const [i, e] of sorted.entries()) {
          await tx.groupEntry.update({ where: { id: e.id }, data: { seed: i, ratingBefore: e.player.rating, setAvgBefore: e.player.setAverage } });
        }
        const playing = sorted.filter((e) => e.attendance === "YES");
        const pairs = roundRobinPairs(playing);
        if (pairs.length) {
          await tx.match.createMany({ data: pairs.map(([a, b]) => ({ groupId: g.id, playerAId: a.playerId, playerBId: b.playerId })) });
          matchCount += pairs.length;
        }
      }
      return { ok: true as const, moved: moved.size, matches: matchCount };
    },
    { timeout: 60000 },
  );
}

/**
 * Haftası (Cuma gecesi) bitmiş turda hiç sonuç girilmemiş maçları hükmen (iki taraf da gelmedi) olarak kesinleştirir.
 * Onay bekleyen ve itirazlı maçlara dokunmaz; onları lig sorumlusu sonuçlandırır.
 */
export async function forfeitUnplayed(roundId: string) {
  const now = new Date();
  const pending = await db.match.findMany({ where: { group: { roundId }, status: "PENDING" }, select: { id: true, groupId: true } });
  if (!pending.length) return 0;
  const res = await db.match.updateMany({
    where: { id: { in: pending.map((m) => m.id) }, status: "PENDING" },
    data: { status: "APPROVED", kind: "BOTH_ABSENT", setsA: null, setsB: null, submittedAt: now, confirmedAt: now },
  });
  for (const groupId of new Set(pending.map((m) => m.groupId))) await postGroupIfComplete(groupId).catch(() => null);
  return res.count;
}

let lastRun = 0;

/**
 * Süresi geçmiş katılım aşamalarını fikstüre çevirir, Cuma gecesi biten haftalarda oynanmayan maçları hükmen yapar.
 * Sayfa isteklerinde ve günlük cron'da çağrılır.
 */
export async function runDueJobs(force = false) {
  const now = Date.now();
  if (!force && now - lastRun < 30_000) return;
  lastRun = now;
  try {
    const due = await db.round.findMany({ where: { status: "ATTENDANCE", deadline: { lte: new Date() } }, select: { id: true } });
    for (const r of due) await generateFixture(r.id);
    const open = await db.round.findMany({ where: { status: "OPEN", isDemo: false, weekStart: { not: null } }, select: { id: true, weekStart: true } });
    for (const r of open) if (playUntil(r.weekStart!) <= new Date()) await forfeitUnplayed(r.id);
  } catch (e) {
    console.error("Otomatik fikstür hatası:", e);
  }
}

/**
 * Aktif oyuncuları puan sırasına göre grup düzenindeki gruplara (kişi sayılarına göre) dağıtır; fazlası son gruba.
 * demo: sadece deneme oyuncuları (deneme verisi için) / sadece gerçek oyuncular.
 */
export async function distribute(roundId: string, weekStart: Date, demo = false) {
  const [slots, players] = await Promise.all([
    db.groupSlot.findMany({ orderBy: { order: "asc" } }),
    db.player.findMany({ where: { active: true, isDemo: demo }, orderBy: [{ rating: "desc" }, { setAverage: "desc" }] }),
  ]);
  if (!slots.length) throw new Error("Önce Grup düzeni sayfasından grupları (gün, saat, kişi sayısı) tanımlayın.");
  let k = 0;
  const plan = slots.map((s, i) => {
    const take = i === slots.length - 1 ? players.length - k : s.size;
    const chunk = players.slice(k, k + Math.max(0, take));
    k += chunk.length;
    return { s, chunk };
  }).filter((p) => p.chunk.length || !demo);
  await db.$transaction(async (tx) => {
    await tx.group.deleteMany({ where: { roundId } });
    for (const [i, { s, chunk }] of plan.entries()) {
      await tx.group.create({
        data: {
          roundId,
          code: s.code,
          order: i,
          size: s.size,
          schedule: s.place,
          entries: { create: chunk.map((p, j) => ({ playerId: p.id, seed: j, ratingBefore: p.rating, setAvgBefore: p.setAverage })) },
        },
      });
    }
  });
  return { players: players.length, groups: plan.filter((p) => p.chunk.length).length };
}

/** Haftayı kapatır: kesinleşmiş maçlara göre puanları hesaplar ve oyunculara işler. */
export async function applyClose(roundId: string) {
  const rules = await getRules();
  const round = await db.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { groups: { include: { entries: true, matches: { where: { status: "APPROVED" } } } } },
  });
  await db.$transaction(
    async (tx) => {
      for (const g of round.groups) {
        const res = computeGroup(g.entries.map(entryInput), approvedMatches(g.matches), rules);
        for (const e of g.entries) {
          const r = res.get(e.playerId)!;
          await tx.groupEntry.update({
            where: { id: e.id },
            data: { matchPoints: r.matchPoints, bonus: r.bonus, ratingAfter: r.ratingAfter, setAvgAfter: r.setAvgAfter, played: r.played, won: r.won },
          });
          await tx.player.update({
            where: { id: e.playerId },
            data: {
              rating: { increment: r.ratingAfter - e.ratingBefore },
              setAverage: { increment: r.setAvgAfter - e.setAvgBefore },
              matches: { increment: r.played },
              wins: { increment: r.won },
            },
          });
        }
      }
      await tx.round.update({ where: { id: roundId }, data: { status: "CLOSED", closedAt: new Date(), rules: toStored(rules) } });
    },
    { timeout: 60000 },
  );
}

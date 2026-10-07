import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { computeGroup, type EntryResult, type Rules } from "./rating";

export const groupInclude = {
  entries: { include: { player: true }, orderBy: { seed: "asc" } },
  matches: { include: { playerA: true, playerB: true }, orderBy: { id: "asc" } },
} satisfies Prisma.GroupInclude;

export type GroupWithData = Prisma.GroupGetPayload<{ include: typeof groupInclude }>;

/** Sitede gösterilecek tur: devam eden tur, yoksa son tamamlanan. */
export async function getShowcaseRound(id?: string) {
  const include = { groups: { include: groupInclude, orderBy: { order: "asc" } } } satisfies Prisma.RoundInclude;
  if (id) return db.round.findUnique({ where: { id }, include });
  return (
    (await db.round.findFirst({ where: { status: { in: ["OPEN", "ATTENDANCE"] } }, include, orderBy: { createdAt: "desc" } })) ??
    (await db.round.findFirst({ where: { status: "CLOSED" }, include, orderBy: { closedAt: "desc" } }))
  );
}

/** Gruptaki tüm maçlar kesinleşti mi (en az bir maç varsa) */
export function groupComplete(group: { matches: { status: string }[] }) {
  return group.matches.length > 0 && group.matches.every((m) => m.status === "APPROVED");
}

/** Fikstüre giren (maç yapacak) oyuncular */
export function isPlaying(e: { attendance: string }) {
  return e.attendance === "YES";
}

/**
 * Grubun (kesinleşmiş maçlara göre) sonuçları. Tur kapalıysa kayıtlı değerler kullanılır.
 * Grup tamamlanmadan önce eksik maç (+8) ve yıldız (+10) bonusları belli olmadığından katılan oyuncular için
 * sadece maç puanları ve elle girilen ek puan gösterilir; katılmayanların cezası fikstürle birlikte kesinleşir.
 */
export function groupResults(group: GroupWithData & { round?: { status: string } }, rules: Rules): Map<string, EntryResult> {
  const closed = group.entries.length > 0 && group.entries.every((e) => e.ratingAfter != null);
  if (closed) {
    return new Map(
      group.entries.map((e) => [
        e.playerId,
        {
          playerId: e.playerId,
          matchPoints: e.matchPoints!,
          bonus: e.bonus!,
          total: e.ratingAfter! - e.ratingBefore,
          ratingAfter: e.ratingAfter!,
          setAvgAfter: e.setAvgAfter!,
          played: e.played!,
          won: e.won!,
        },
      ]),
    );
  }
  const live = computeGroup(group.entries.map(entryInput), approvedMatches(group.matches), rules);
  if (groupComplete(group)) return live;
  for (const e of group.entries) {
    if (e.attendance !== "YES" && e.attendance !== "PENDING") continue; // cezası belli
    const r = live.get(e.playerId)!;
    const total = r.matchPoints + e.manualBonus;
    live.set(e.playerId, { ...r, bonus: e.manualBonus, total, ratingAfter: e.ratingBefore + total });
  }
  return live;
}

type EntryRow = { playerId: string; ratingBefore: number; setAvgBefore: number; manualBonus: number; attendance: string };
export function entryInput(e: EntryRow) {
  return {
    playerId: e.playerId,
    ratingBefore: e.ratingBefore,
    setAvgBefore: e.setAvgBefore,
    manualBonus: e.manualBonus,
    absent: e.attendance === "NO" ? ("NO" as const) : e.attendance === "AUTO_NO" ? ("AUTO_NO" as const) : null,
  };
}

type MatchRow = { status: string; kind: "NORMAL" | "BOTH_ABSENT" | null; playerAId: string; playerBId: string; setsA: number | null; setsB: number | null };
export function approvedMatches(ms: MatchRow[]) {
  return ms
    .filter((m) => m.status === "APPROVED" && m.kind)
    .map((m) => ({ playerAId: m.playerAId, playerBId: m.playerBId, kind: m.kind!, setsA: m.setsA, setsB: m.setsB }));
}

/** Grup puan sıralaması: galibiyet, sonra kazanılan puan, sonra maç öncesi puan */
export function standings<E extends { playerId: string; ratingBefore: number }>(entries: E[], res: Map<string, EntryResult>) {
  return [...entries].sort((a, b) => {
    const ra = res.get(a.playerId)!;
    const rb = res.get(b.playerId)!;
    return rb.won - ra.won || rb.total - ra.total || b.ratingBefore - a.ratingBefore;
  });
}

/** Puana göre sıralı aktif oyuncular (sıra numarasıyla). */
export async function getRanking() {
  const players = await db.player.findMany({ where: { active: true }, orderBy: [{ rating: "desc" }, { setAverage: "desc" }, { name: "asc" }] });
  return players.map((p, i) => ({ ...p, rank: i + 1 }));
}

/** Oyuncunun son tamamlanan turdaki puan değişimi */
export async function lastChanges() {
  const last = await db.round.findFirst({ where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, select: { id: true } });
  if (!last) return new Map<string, number>();
  const entries = await db.groupEntry.findMany({ where: { group: { roundId: last.id } }, select: { playerId: true, ratingBefore: true, ratingAfter: true } });
  return new Map(entries.map((e) => [e.playerId, (e.ratingAfter ?? e.ratingBefore) - e.ratingBefore]));
}

/** Haftanın yıldızları: grubundaki tüm maçlarını kazananlar (grup bazlı; tamamlanmamış gruplar sayılmaz) */
export function groupStars(group: GroupWithData, rules: Rules) {
  const closed = group.entries.length > 0 && group.entries.every((e) => e.ratingAfter != null);
  if (!closed && !groupComplete(group)) return [];
  const res = groupResults(group, rules);
  return group.entries.filter((e) => {
    const r = res.get(e.playerId);
    return e.attendance === "YES" && r && r.played > 0 && r.played === r.won;
  }).map((e) => ({ entry: e, result: res.get(e.playerId)! }));
}

/** Bu süreden uzun güncellenmeyen skorbord "canlı" sayılmaz */
const LIVE_STALE_MS = 45 * 60_000;
const liveWhere = () => ({ status: "PENDING" as const, liveStartedAt: { not: null }, liveUpdatedAt: { gt: new Date(Date.now() - LIVE_STALE_MS) } });

export function liveCount() {
  return db.match.count({ where: liveWhere() });
}

export function liveMatches() {
  return db.match.findMany({
    where: { ...liveWhere(), group: { round: { status: "OPEN" } } },
    include: { playerA: true, playerB: true, group: true },
    orderBy: { liveStartedAt: "asc" },
  });
}

/** Skorbordla oynanıp son 6 saatte biten maçlar */
export function recentLiveFinished() {
  return db.match.findMany({
    where: { liveStartedAt: { not: null }, status: { in: ["SUBMITTED", "APPROVED"] }, liveUpdatedAt: { gt: new Date(Date.now() - 6 * 3600_000) } },
    include: { playerA: true, playerB: true, group: true },
    orderBy: { liveUpdatedAt: "desc" },
    take: 12,
  });
}

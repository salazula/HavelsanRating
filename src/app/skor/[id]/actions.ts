"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isManager, requireUser } from "@/lib/auth";
import { deriveLive, parsePoints, type Side } from "@/lib/live";

export type LiveView = {
  points: Side[];
  firstServer: Side | null;
  version: number;
  status: string;
  started: boolean;
};

export type LiveResult = { view: LiveView; error?: string };

async function load(matchId: string) {
  return db.match.findUnique({ where: { id: matchId }, include: { group: { include: { round: true } } } });
}

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

function view(m: Loaded): LiveView {
  return {
    points: parsePoints(m.livePoints),
    firstServer: m.liveFirstServer === "A" || m.liveFirstServer === "B" ? m.liveFirstServer : null,
    version: m.liveVersion,
    status: m.status,
    started: !!m.liveStartedAt,
  };
}

/** Skorbordu sadece maçın oyuncuları ve lig sorumlusu/süper admin kullanabilir. */
async function authorize(matchId: string) {
  const user = await requireUser();
  const m = await load(matchId);
  if (!m) throw new Error("Maç bulunamadı.");
  const mine = !!user.playerId && (m.playerAId === user.playerId || m.playerBId === user.playerId);
  if (!mine && !isManager(user)) throw new Error("Bu maçın skorunu sadece oyuncuları tutabilir.");
  return { user, m };
}

function refresh() {
  revalidatePath("/canli");
  revalidatePath("/panel/maclarim");
}

export async function getLive(matchId: string): Promise<LiveResult> {
  const { m } = await authorize(matchId);
  return { view: view(m) };
}

export async function startLive(matchId: string, firstServer: Side): Promise<LiveResult> {
  const { user, m } = await authorize(matchId);
  if (m.group.round.status !== "OPEN") return { view: view(m), error: "Bu hafta sonuç girişine açık değil." };
  if (m.status !== "PENDING") return { view: view(m), error: "Bu maçın sonucu zaten girilmiş." };
  const now = new Date();
  const updated = await db.match.update({
    where: { id: matchId },
    data: { livePoints: [], liveFirstServer: firstServer, liveStartedAt: now, liveUpdatedAt: now, liveById: user.id, liveVersion: { increment: 1 } },
    include: { group: { include: { round: true } } },
  });
  refresh();
  return { view: view(updated) };
}

/**
 * Sayı ekler ("A"/"B") ya da son sayıyı geri alır (null). `version` istemcinin bildiği sürümdür;
 * başka bir cihaz araya girdiyse değişiklik yapılmaz ve güncel durum döner.
 */
export async function livePoint(matchId: string, side: Side | null, version: number): Promise<LiveResult> {
  const { user, m } = await authorize(matchId);
  if (m.group.round.status !== "OPEN") return { view: view(m), error: "Bu hafta sonuç girişine kapalı." };
  if (m.liveVersion !== version) return { view: view(m), error: "conflict" };
  if (!m.liveStartedAt) return { view: view(m), error: "Önce maçı başlatın." };

  const points = parsePoints(m.livePoints);
  const before = deriveLive(points);
  if (before.finished && side) return { view: view(m), error: "Maç bitti." };
  // Bitmiş maç, rakip onaylamadıysa geri alınarak yeniden açılabilir
  if (before.finished && m.status !== "SUBMITTED") return { view: view(m), error: "Sonuç kesinleşti; değişiklik için lig sorumlusuna başvurun." };
  if (!side && !points.length) return { view: view(m) };

  const next = side ? [...points, side] : points.slice(0, -1);
  const live = deriveLive(next);
  const now = new Date();
  const manager = isManager(user);

  let result: Prisma.MatchUncheckedUpdateManyInput = {};
  if (live.finished) {
    result = {
      status: manager ? "APPROVED" : "SUBMITTED",
      kind: "NORMAL",
      setsA: live.setsA,
      setsB: live.setsB,
      setScores: live.sets,
      submittedById: user.id,
      submittedAt: now,
      confirmedById: manager ? user.id : null,
      confirmedAt: manager ? now : null,
      disputeNote: null,
    };
  } else if (before.finished) {
    result = { status: "PENDING", kind: null, setsA: null, setsB: null, setScores: Prisma.DbNull, submittedById: null, submittedAt: null };
  }

  const res = await db.match.updateMany({
    where: { id: matchId, liveVersion: version },
    data: { ...result, livePoints: next, liveUpdatedAt: now, liveById: user.id, liveVersion: { increment: 1 } },
  });
  const fresh = (await load(matchId))!;
  if (!res.count) return { view: view(fresh), error: "conflict" };
  refresh();
  return { view: view(fresh) };
}

/** Skorbordu sıfırlar (sonuç girilmemişse). */
export async function cancelLive(matchId: string): Promise<LiveResult> {
  const { m } = await authorize(matchId);
  if (m.status !== "PENDING") return { view: view(m), error: "Sonucu girilmiş maçın skorbordu silinemez." };
  const updated = await db.match.update({
    where: { id: matchId },
    data: { livePoints: Prisma.DbNull, liveFirstServer: null, liveStartedAt: null, liveUpdatedAt: null, liveById: null, liveVersion: { increment: 1 } },
    include: { group: { include: { round: true } } },
  });
  refresh();
  return { view: view(updated) };
}

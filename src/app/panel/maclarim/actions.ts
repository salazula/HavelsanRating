"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isManager, requireUser } from "@/lib/auth";
import { isValidScore } from "@/lib/rating";
import { postGroupIfComplete } from "@/lib/telegram";
import type { ActionState } from "@/lib/action-state";

function refresh() {
  revalidatePath("/", "layout");
}

async function loadMatch(id: string) {
  return db.match.findUnique({ where: { id }, include: { group: { include: { round: true } }, submittedBy: true } });
}

/** "3-1" → [3,1]; geçersizse null */
function parseScore(v: FormDataEntryValue | null): [number, number] | null {
  const m = /^([0-3])-([0-3])$/.exec(String(v ?? ""));
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return isValidScore(a, b) ? [a, b] : null;
}

/** Oyuncu kendi maçının sonucunu girer (skor kendi gözünden). Rakip onaylayınca kesinleşir. */
export async function submitResult(matchId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const m = await loadMatch(matchId);
  if (!m) return { error: "Maç bulunamadı." };
  if (m.group.round.status !== "OPEN") return { error: "Bu tur sonuç girişine kapalı." };
  const me = user.playerId;
  if (!me || (m.playerAId !== me && m.playerBId !== me)) return { error: "Sadece kendi maçınızın sonucunu girebilirsiniz." };
  if (m.status === "APPROVED") return { error: "Bu maçın sonucu kesinleşmiş. Değişiklik için lig sorumlusuna başvurun." };
  if (m.status === "DISPUTED") return { error: "Bu sonuç için itiraz var, lig sorumlusu karar verecek." };
  if (m.status === "SUBMITTED" && m.submittedBy?.playerId !== me) return { error: "Rakibiniz sonucu girmiş; onaylayın ya da itiraz edin." };
  const s = parseScore(fd.get("score"));
  if (!s) return { error: "Geçerli bir skor seçin (3-0, 3-1, 3-2, 2-3, 1-3, 0-3)." };
  const [mine, theirs] = s;
  const iAmA = m.playerAId === me;
  await db.match.update({
    where: { id: matchId },
    data: {
      kind: "NORMAL",
      setsA: iAmA ? mine : theirs,
      setsB: iAmA ? theirs : mine,
      status: "SUBMITTED",
      setScores: Prisma.DbNull, // elle girilen sonuçta set skoru yok
      submittedById: user.id,
      submittedAt: new Date(),
      confirmedById: null,
      confirmedAt: null,
      disputeNote: null,
    },
  });
  refresh();
  return { ok: "Sonuç kaydedildi, rakibinizin onayı bekleniyor." };
}

/** Rakip, girilen sonucu onaylar. */
export async function confirmResult(matchId: string, _p: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const m = await loadMatch(matchId);
  if (!m || m.status !== "SUBMITTED") return { error: "Onay bekleyen bir sonuç yok." };
  if (m.group.round.status !== "OPEN") return { error: "Bu tur kapanmış." };
  const me = user.playerId;
  const isOpponent = !!me && (m.playerAId === me || m.playerBId === me) && m.submittedBy?.playerId !== me;
  if (!isOpponent && !isManager(user)) return { error: "Bu sonucu sadece rakip oyuncu veya lig sorumlusu onaylayabilir." };
  await db.match.update({ where: { id: matchId }, data: { status: "APPROVED", confirmedById: user.id, confirmedAt: new Date() } });
  await postGroupIfComplete(m.groupId).catch(() => null);
  refresh();
  return { ok: "Sonuç onaylandı." };
}

/** Rakip, girilen sonuca itiraz eder; lig sorumlusu karar verir. */
export async function disputeResult(matchId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const m = await loadMatch(matchId);
  if (!m || m.status !== "SUBMITTED") return { error: "İtiraz edilecek bir sonuç yok." };
  const me = user.playerId;
  if (!me || (m.playerAId !== me && m.playerBId !== me) || m.submittedBy?.playerId === me) return { error: "Sadece rakip oyuncu itiraz edebilir." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  await db.match.update({ where: { id: matchId }, data: { status: "DISPUTED", disputeNote: note || null } });
  refresh();
  return { ok: "İtirazınız lig sorumlusuna iletildi." };
}

/** Lig sorumlusu sonucu doğrudan girer/düzeltir (kesinleşir) ya da siler. Skor A oyuncusunun gözünden. */
export async function setResult(matchId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const m = await loadMatch(matchId);
  if (!m) return { error: "Maç bulunamadı." };
  if (m.group.round.status !== "OPEN") return { error: "Sadece devam eden turdaki maçlar değiştirilebilir." };
  const v = String(fd.get("score") ?? "");
  if (v === "") {
    await db.match.update({
      where: { id: matchId },
      data: { status: "PENDING", kind: null, setsA: null, setsB: null, setScores: Prisma.DbNull, livePoints: Prisma.DbNull, liveFirstServer: null, liveStartedAt: null, liveUpdatedAt: null, liveById: null, liveVersion: { increment: 1 }, submittedById: null, submittedAt: null, confirmedById: null, confirmedAt: null, disputeNote: null },
    });
    await db.group.update({ where: { id: m.groupId }, data: { telegramSentAt: null } });
    refresh();
    return { ok: "Sonuç silindi." };
  }
  const now = new Date();
  if (v === "KK") {
    await db.match.update({
      where: { id: matchId },
      data: { status: "APPROVED", kind: "BOTH_ABSENT", setsA: null, setsB: null, setScores: Prisma.DbNull, submittedById: user.id, submittedAt: now, confirmedById: user.id, confirmedAt: now },
    });
  } else {
    const s = parseScore(v);
    if (!s) return { error: "Geçerli bir skor seçin." };
    await db.match.update({
      where: { id: matchId },
      data: { status: "APPROVED", kind: "NORMAL", setsA: s[0], setsB: s[1], ...(m.setsA === s[0] && m.setsB === s[1] ? {} : { setScores: Prisma.DbNull }), submittedById: m.submittedById ?? user.id, submittedAt: m.submittedAt ?? now, confirmedById: user.id, confirmedAt: now },
    });
  }
  await postGroupIfComplete(m.groupId).catch(() => null);
  refresh();
  return { ok: "Sonuç kesinleşti." };
}

/** Oyuncu bu haftaki grubuna katılıp katılmayacağını bildirir (son katılım zamanına kadar değiştirebilir). */
export async function declareAttendance(entryId: string, attending: boolean, _p: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const e = await db.groupEntry.findUnique({ where: { id: entryId }, include: { group: { include: { round: true } } } });
  if (!e || !user.playerId || e.playerId !== user.playerId) return { error: "Kayıt bulunamadı." };
  const r = e.group.round;
  if (r.status !== "ATTENDANCE" || (r.deadline && r.deadline <= new Date())) return { error: "Katılım bildirimi kapandı." };
  await db.groupEntry.update({ where: { id: entryId }, data: { attendance: attending ? "YES" : "NO", attendanceAt: new Date() } });
  refresh();
  return { ok: attending ? "Katılımınız kaydedildi." : "Katılamayacağınız kaydedildi." };
}

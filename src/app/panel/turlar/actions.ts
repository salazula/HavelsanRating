"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Attendance } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { groupCode } from "@/lib/rating";
import { DEFAULT_GROUP_SIZE, dateFromYmd, fromLocalInput, weekName } from "@/lib/schedule";
import { applyClose, distribute, generateFixture } from "@/lib/weekly";
import type { ActionState } from "@/lib/action-state";

const MANAGERS = ["SUPER_ADMIN", "LEAGUE_MANAGER"] as const;

function refresh() {
  revalidatePath("/", "layout");
}

/** Gruplar tur hazırlanırken ve katılım aşamasında değiştirilebilir. */
async function editableRound(roundId: string) {
  const r = await db.round.findUnique({ where: { id: roundId } });
  if (!r) throw new Error("Tur bulunamadı.");
  if (r.status !== "DRAFT" && r.status !== "ATTENDANCE") throw new Error("Fikstür oluştuktan sonra gruplar değiştirilemez.");
  return r;
}

function err(e: unknown): ActionState {
  return { error: e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu." };
}


export async function createRound(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const ymd = String(fd.get("weekStart") ?? "");
  const deadline = fromLocalInput(String(fd.get("deadline") ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return { error: "Haftanın başlangıç tarihini seçin." };
  if (!deadline) return { error: "Son katılım zamanını girin." };
  const weekStart = dateFromYmd(ymd);
  const name = String(fd.get("name") ?? "").trim() || weekName(weekStart);
  const busy = await db.round.findFirst({ where: { status: { in: ["DRAFT", "ATTENDANCE", "OPEN"] } } });
  if (busy) return { error: busy.isDemo ? "Deneme verisi açık; önce Ayarlar'dan deneme verisini silin." : "Önce devam eden haftayı tamamlayın." };
  if (!(await db.groupSlot.count())) return { error: "Önce Grup düzeni sayfasından grupları tanımlayın." };
  const r = await db.round.create({ data: { name, weekStart, deadline } });
  try {
    await distribute(r.id, weekStart);
  } catch (e) {
    await db.round.delete({ where: { id: r.id } });
    return err(e);
  }
  refresh();
  redirect(`/panel/turlar/${r.id}`);
}

export async function redistribute(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    const r = await editableRound(roundId);
    if (r.status !== "DRAFT") return { error: "Katılım başladıktan sonra yeniden dağıtılamaz; oyuncuları tek tek taşıyın." };
    const res = await distribute(roundId, r.weekStart ?? new Date());
    refresh();
    return { ok: `${res.players} oyuncu ${res.groups} gruba yerleştirildi.` };
  } catch (e) {
    return err(e);
  }
}

export async function updateRound(roundId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    await editableRound(roundId);
    const deadline = fromLocalInput(String(fd.get("deadline") ?? ""));
    const name = String(fd.get("name") ?? "").trim();
    if (!deadline) return { error: "Son katılım zamanını girin." };
    if (name.length < 2) return { error: "Hafta adı girin." };
    await db.round.update({ where: { id: roundId }, data: { deadline, name } });
    refresh();
    return { ok: "Kaydedildi." };
  } catch (e) {
    return err(e);
  }
}

/** Grupları yayınlar ve oyuncuların katılım bildirimini açar. */
export async function openAttendance(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const r = await db.round.findUnique({ where: { id: roundId }, include: { _count: { select: { groups: true } } } });
  if (r?.status !== "DRAFT") return { error: "Tur hazırlık aşamasında değil." };
  if (!r._count.groups) return { error: "Önce grupları oluşturun." };
  await db.round.update({ where: { id: roundId }, data: { status: "ATTENDANCE" } });
  refresh();
  return { ok: "Katılım bildirimi açıldı." };
}

export async function setAttendance(entryId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const value = String(fd.get("attendance") ?? "") as Attendance;
  if (!["PENDING", "YES", "NO", "AUTO_NO"].includes(value)) return { error: "Geçersiz seçim." };
  const e = await db.groupEntry.findUnique({ where: { id: entryId }, include: { group: { include: { round: true } } } });
  if (!e) return { error: "Kayıt bulunamadı." };
  if (!["DRAFT", "ATTENDANCE"].includes(e.group.round.status)) return { error: "Fikstür oluştu; katılım değiştirilemez." };
  await db.groupEntry.update({ where: { id: entryId }, data: { attendance: value, attendanceAt: new Date() } });
  refresh();
  return { ok: "Kaydedildi." };
}

/** Son günü beklemeden fikstürü oluşturur. */
export async function createFixtureNow(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const res = await generateFixture(roundId);
  if (!res.ok) return { error: res.error };
  refresh();
  return { ok: `Fikstür oluştu: ${res.matches} maç, alt gruptan ${res.moved} oyuncu taşındı.` };
}

/** Hiç sonuç girilmemişse fikstürü siler ve katılım aşamasına döner (taşınan oyuncular gruplarına geri gider). */
export async function undoFixture(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const r = await db.round.findUnique({ where: { id: roundId }, include: { groups: { include: { entries: true } } } });
  if (r?.status !== "OPEN") return { error: "Fikstür yok." };
  if (await db.match.count({ where: { group: { roundId }, status: { not: "PENDING" } } })) {
    return { error: "Sonuç girilmiş maçlar var; önce sonuçları silin." };
  }
  const byCode = new Map(r.groups.map((g) => [g.code, g.id]));
  await db.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { group: { roundId } } });
    for (const e of r.groups.flatMap((g) => g.entries)) {
      if (e.movedFrom && byCode.has(e.movedFrom)) {
        await tx.groupEntry.update({ where: { id: e.id }, data: { groupId: byCode.get(e.movedFrom)!, movedFrom: null } });
      }
    }
    await tx.groupEntry.updateMany({ where: { group: { roundId }, attendance: "AUTO_NO" }, data: { attendance: "PENDING", attendanceAt: null } });
    await tx.round.update({ where: { id: roundId }, data: { status: "ATTENDANCE", openedAt: null } });
  });
  refresh();
  return { ok: "Fikstür silindi, katılım aşamasına dönüldü. Son katılım zamanını ileri almayı unutmayın." };
}

export async function addGroup(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    await editableRound(roundId);
    const count = await db.group.count({ where: { roundId } });
    let i = count;
    while (await db.group.findFirst({ where: { roundId, code: groupCode(i) } })) i++;
    await db.group.create({ data: { roundId, code: groupCode(i), order: i, size: DEFAULT_GROUP_SIZE } });
    refresh();
    return { ok: `${groupCode(i)} grubu eklendi.` };
  } catch (e) {
    return err(e);
  }
}

export async function deleteGroup(groupId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    const g = await db.group.findUnique({ where: { id: groupId } });
    if (!g) return { error: "Grup bulunamadı." };
    await editableRound(g.roundId);
    await db.group.delete({ where: { id: groupId } });
    refresh();
    return { ok: "Grup silindi." };
  } catch (e) {
    return err(e);
  }
}

/** Oyuncuyu gruba ekler ya da başka gruba taşır. */
export async function placePlayer(roundId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    await editableRound(roundId);
    const playerId = String(fd.get("playerId") ?? "");
    const groupId = String(fd.get("groupId") ?? "");
    const [player, group, prev] = await Promise.all([
      db.player.findUnique({ where: { id: playerId } }),
      db.group.findUnique({ where: { id: groupId } }),
      db.groupEntry.findFirst({ where: { playerId, group: { roundId } } }),
    ]);
    if (!player || !group || group.roundId !== roundId) return { error: "Oyuncu ve grup seçin." };
    await db.$transaction([
      db.groupEntry.deleteMany({ where: { playerId, group: { roundId } } }),
      db.groupEntry.create({
        data: { groupId, playerId, ratingBefore: player.rating, setAvgBefore: player.setAverage, seed: 99, attendance: prev?.attendance ?? "PENDING", attendanceAt: prev?.attendanceAt },
      }),
    ]);
    refresh();
    return { ok: `${player.name} → ${group.code} grubu` };
  } catch (e) {
    return err(e);
  }
}

export async function removeEntry(entryId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  try {
    const e = await db.groupEntry.findUnique({ where: { id: entryId }, include: { group: true } });
    if (!e) return { error: "Kayıt bulunamadı." };
    await editableRound(e.group.roundId);
    await db.groupEntry.delete({ where: { id: entryId } });
    refresh();
    return { ok: "Oyuncu gruptan çıkarıldı." };
  } catch (e) {
    return err(e);
  }
}

export async function setManualBonus(entryId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const value = Number(fd.get("manualBonus") ?? 0);
  if (!Number.isInteger(value) || Math.abs(value) > 500) return { error: "Geçerli bir tam sayı girin." };
  const e = await db.groupEntry.findUnique({ where: { id: entryId }, include: { group: { include: { round: true } } } });
  if (!e) return { error: "Kayıt bulunamadı." };
  if (e.group.round.status === "CLOSED") return { error: "Tur kapanmış." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 200) || null;
  await db.groupEntry.update({ where: { id: entryId }, data: { manualBonus: value, note } });
  refresh();
  return { ok: "Ek puan kaydedildi." };
}

/** Haftayı kapatır: kesinleşmiş maçlara göre puanları hesaplar ve oyunculara işler. */
export async function closeRound(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const round = await db.round.findUnique({ where: { id: roundId } });
  if (round?.status !== "OPEN") return { error: "Sadece fikstürü oluşmuş hafta kapatılabilir." };
  await applyClose(roundId);
  refresh();
  return { ok: "Hafta kapandı, yeni puanlar işlendi." };
}

/** Son kapanan haftayı geri alır (puanlar eski haline döner). Sadece süper admin. */
export async function undoClose(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const last = await db.round.findFirst({ where: { status: "CLOSED" }, orderBy: { closedAt: "desc" } });
  if (!last || last.id !== roundId) return { error: "Sadece en son kapanan hafta geri alınabilir." };
  if (await db.round.findFirst({ where: { status: { in: ["DRAFT", "ATTENDANCE", "OPEN"] } } })) {
    return { error: "Önce yeni oluşturulan haftayı silin." };
  }
  const entries = await db.groupEntry.findMany({ where: { group: { roundId } } });
  await db.$transaction(
    async (tx) => {
      for (const e of entries) {
        if (e.ratingAfter == null) continue;
        await tx.player.update({
          where: { id: e.playerId },
          data: {
            rating: { decrement: e.ratingAfter - e.ratingBefore },
            setAverage: { decrement: (e.setAvgAfter ?? e.setAvgBefore) - e.setAvgBefore },
            matches: { decrement: e.played ?? 0 },
            wins: { decrement: e.won ?? 0 },
          },
        });
        await tx.groupEntry.update({
          where: { id: e.id },
          data: { matchPoints: null, bonus: null, ratingAfter: null, setAvgAfter: null, played: null, won: null },
        });
      }
      await tx.round.update({ where: { id: roundId }, data: { status: "OPEN", closedAt: null } });
    },
    { timeout: 60000 },
  );
  refresh();
  return { ok: "Hafta yeniden açıldı, puanlar geri alındı." };
}

export async function deleteRound(roundId: string, _p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const r = await db.round.findUnique({ where: { id: roundId } });
  if (!r) return { error: "Hafta bulunamadı." };
  if (r.status === "CLOSED") return { error: "Kapanmış hafta silinemez; önce geri alın." };
  await db.round.delete({ where: { id: roundId } });
  refresh();
  redirect("/panel/turlar");
}

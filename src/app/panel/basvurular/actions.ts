"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const MANAGERS = ["SUPER_ADMIN", "LEAGUE_MANAGER"] as const;

function refresh() {
  revalidatePath("/", "layout");
}

/** Başvuruyu onaylar: oyuncuyu belirlenen başlangıç puanıyla ve giriş hesabıyla oluşturur. */
export async function approveApplication(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser([...MANAGERS]);
  const rating = Number(String(fd.get("rating") ?? "").trim());
  if (!Number.isInteger(rating) || rating < 0 || rating > 4000) return { error: "Başlangıç puanını girin (0-4000 arası tam sayı)." };
  const app = await db.application.findUnique({ where: { id } });
  if (!app || app.status !== "PENDING" || !app.passwordHash) return { error: "Bu başvuru zaten sonuçlanmış." };
  if (await db.user.findUnique({ where: { email: app.email } })) return { error: "Bu e-posta ile kayıtlı bir kullanıcı zaten var." };

  const player = await db.$transaction(async (tx) => {
    // Aynı anda iki kişi onaylarsa ikincisi burada durur
    const claimed = await tx.application.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", decidedBy: user.name, decidedAt: new Date(), passwordHash: null } });
    if (!claimed.count) return null;
    const p = await tx.player.create({ data: { name: app.name, rating, phone: app.phone } });
    await tx.user.create({ data: { email: app.email, name: app.name, role: "PLAYER", playerId: p.id, phone: app.phone, passwordHash: app.passwordHash! } });
    await tx.application.update({ where: { id }, data: { playerId: p.id } });
    return p;
  });
  if (!player) return { error: "Bu başvuru zaten sonuçlanmış." };

  refresh();
  // Kart listeden kalktığı için sonucu sayfanın üstünde gösteriyoruz
  redirect(`/panel/basvurular?sonuc=${id}`);
}

export async function rejectApplication(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser([...MANAGERS]);
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || null;
  const res = await db.application.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", rejectReason: reason, decidedBy: user.name, decidedAt: new Date(), passwordHash: null },
  });
  if (!res.count) return { error: "Bu başvuru zaten sonuçlanmış." };
  refresh();
  redirect(`/panel/basvurular?sonuc=${id}`);
}

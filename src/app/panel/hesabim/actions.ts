"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export async function changePassword(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!(await bcrypt.compare(current, me.passwordHash))) return { error: "Mevcut şifre hatalı." };
  if (next.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };
  if (next !== fd.get("repeat")) return { error: "Yeni şifreler aynı değil." };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Şifreniz değiştirildi." };
}

export async function updatePhone(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const phone = String(fd.get("phone") ?? "").trim() || null;
  if (phone && phone.length > 30) return { error: "Telefon numarası çok uzun." };
  await db.user.update({ where: { id: me.id }, data: { phone } });
  if (me.playerId) await db.player.update({ where: { id: me.playerId }, data: { phone } });
  return { ok: "Telefonunuz kaydedildi." };
}

"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailField } from "@/lib/email";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const profile = z.object({
  name: z.string().trim().min(2, "Ad soyad gerekli"),
  email: emailField(),
  phone: z.string().trim().optional().transform((v) => v || null),
  role: z.enum(["SUPER_ADMIN", "LEAGUE_MANAGER", "PLAYER"]),
  playerId: z.string().transform((v) => v || null),
});
const playerNeedsLink = [
  (d: { role: string; playerId: string | null }) => d.role !== "PLAYER" || !!d.playerId,
  { message: "Oyuncu hesabı için oyuncu seçin" },
] as const;
const schema = profile.extend({ password: z.string().min(8, "Şifre en az 8 karakter olmalı") }).refine(...playerNeedsLink);
const updateSchema = profile.refine(...playerNeedsLink);

export async function createUser(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { password, ...data } = parsed.data;
  if (await db.user.findUnique({ where: { email: data.email } })) return { error: "Bu e-posta ile kayıtlı kullanıcı var." };
  if (data.playerId && (await db.user.findUnique({ where: { playerId: data.playerId } }))) return { error: "Bu oyuncunun zaten hesabı var." };
  await db.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/panel/kullanicilar");
  return { ok: `${data.name} oluşturuldu. Giriş bilgilerini kendisiyle paylaşın.` };
}

export async function toggleUser(id: string) {
  const me = await requireUser(["SUPER_ADMIN"]);
  if (me.id === id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (u) await db.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/panel/kullanicilar");
}

export async function resetPassword(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
  return { ok: "Şifre güncellendi." };
}

export async function updateUser(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser(["SUPER_ADMIN"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;
  if (me.id === id && data.role !== "SUPER_ADMIN") return { error: "Kendi süper admin yetkinizi kaldıramazsınız." };
  const other = await db.user.findUnique({ where: { email: data.email } });
  if (other && other.id !== id) return { error: "Bu e-posta başka bir kullanıcıda kayıtlı." };
  if (data.playerId) {
    const linked = await db.user.findUnique({ where: { playerId: data.playerId } });
    if (linked && linked.id !== id) return { error: "Bu oyuncu başka bir hesaba bağlı." };
  }
  await db.user.update({ where: { id }, data });
  revalidatePath("/panel", "layout");
  return { ok: "Kullanıcı bilgileri kaydedildi." };
}

export async function deleteUser(id: string, _p: ActionState): Promise<ActionState> {
  const me = await requireUser(["SUPER_ADMIN"]);
  if (me.id === id) return { error: "Kendi hesabınızı silemezsiniz." };
  await db.user.delete({ where: { id } }).catch(() => null);
  revalidatePath("/panel", "layout");
  return { ok: "Kullanıcı silindi." };
}


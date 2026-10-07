"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  name: z.string().trim().min(2, "Ad soyad gerekli"),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

/** Sadece sistemde hiç kullanıcı yokken çalışır: ilk süper admin hesabını oluşturur. */
export async function setupAdmin(_p: ActionState, fd: FormData): Promise<ActionState> {
  if ((await db.user.count()) > 0) return { error: "Kurulum zaten tamamlanmış." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { password, ...data } = parsed.data;
  const user = await db.user.create({ data: { ...data, role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(user.id);
  redirect("/panel");
}

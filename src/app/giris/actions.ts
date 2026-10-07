"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    if (!user && (await db.application.findFirst({ where: { email, status: "PENDING" } }))) {
      return { error: "Başvurunuz henüz onaylanmadı. Onaylanınca bu e-posta ve şifreyle giriş yapabilirsiniz." };
    }
    return { error: "E-posta veya şifre hatalı." };
  }
  await createSession(user.id);
  redirect("/panel");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

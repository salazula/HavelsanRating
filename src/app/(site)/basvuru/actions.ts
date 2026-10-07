"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";

const schema = z
  .object({
    name: z.string().trim().min(3, "Adınızı ve soyadınızı yazın.").max(60),
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
    phone: z.string().trim().regex(/^[+\d][\d\s()-]{9,19}$/, "Geçerli bir telefon numarası girin."),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(72),
    password2: z.string(),
    about: z.string().trim().max(400, "Tanıtım en fazla 400 karakter olabilir.").optional(),
  })
  .refine((d) => d.password === d.password2, { message: "Şifreler aynı değil.", path: ["password2"] });

/** Herkese açık başvuru formu. Puan alanı yoktur; başlangıç puanını onaylayan kişi belirler. */
export async function submitApplication(_p: ActionState, fd: FormData): Promise<ActionState> {
  // Botlar için gizli alan: doluysa sessizce kabul edilmiş gibi davran
  if (String(fd.get("website") ?? "")) return { ok: "Başvurunuz alındı." };

  const parsed = schema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    password: fd.get("password"),
    password2: fd.get("password2"),
    about: String(fd.get("about") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  if (await db.user.findUnique({ where: { email: d.email } })) return { error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin." };
  if (await db.application.findFirst({ where: { email: d.email, status: "PENDING" } })) return { error: "Bu e-posta ile bekleyen bir başvuru zaten var." };
  // Toplu sahte başvuruya karşı basit sınır
  if ((await db.application.count({ where: { createdAt: { gt: new Date(Date.now() - 3600_000) } } })) >= 30) {
    return { error: "Şu an çok fazla başvuru var, lütfen biraz sonra tekrar deneyin." };
  }

  let photoUrl: string | null = null;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size) {
    const saved = await saveImage(photo);
    if ("error" in saved) return { error: saved.error };
    photoUrl = saved.url;
  }

  await db.application.create({
    data: { name: d.name, email: d.email, phone: d.phone, about: d.about ?? null, photoUrl, passwordHash: await bcrypt.hash(d.password, 10) },
  });
  return { ok: "Başvurunuz alındı! Lig sorumlusu onayladığında bu e-posta ve şifreyle giriş yapabileceksiniz." };
}

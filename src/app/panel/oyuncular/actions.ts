"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { EMAIL_DOMAIN_ERROR, isAllowedEmail } from "@/lib/email";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const MANAGERS = ["SUPER_ADMIN", "LEAGUE_MANAGER"] as const;
const int = (min: number, max: number) => z.coerce.number().int("Tam sayı girin").min(min).max(max);

const playerSchema = z.object({
  name: z.string().trim().min(3, "Ad soyad gerekli"),
  rating: int(0, 5000),
  setAverage: int(-10000, 10000).default(0),
  matches: int(0, 100000).default(0),
  wins: int(0, 100000).default(0),
  phone: z.string().trim().optional().transform((v) => v || null),
});

function refresh() {
  revalidatePath("/", "layout");
}

export async function createPlayer(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const parsed = playerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.wins > parsed.data.matches) return { error: "Galibiyet maç sayısından fazla olamaz." };
  await db.player.create({ data: parsed.data });
  refresh();
  return { ok: `${parsed.data.name} eklendi.` };
}

export async function updatePlayer(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const parsed = playerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.wins > parsed.data.matches) return { error: "Galibiyet maç sayısından fazla olamaz." };
  await db.player.update({ where: { id }, data: { ...parsed.data, active: fd.get("active") === "on" } });
  // Oyuncunun hesabı varsa adını da güncelle
  await db.user.updateMany({ where: { playerId: id, role: "PLAYER" }, data: { name: parsed.data.name } });
  refresh();
  return { ok: "Kaydedildi." };
}

export async function deletePlayer(id: string, _p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  if (await db.groupEntry.count({ where: { playerId: id } })) {
    return { error: "Tura katılmış oyuncu silinemez; pasife alabilirsiniz." };
  }
  await db.user.deleteMany({ where: { playerId: id, role: "PLAYER" } });
  await db.player.delete({ where: { id } });
  refresh();
  return { ok: "Oyuncu silindi." };
}

/**
 * Excel'den toplu aktarım. Her satır: Ad Soyad, Puan [, Set averajı, Maç, Galibiyet]
 * (sekme, noktalı virgül veya virgülle ayrılmış). Aynı isimde oyuncu varsa puanı güncellenir.
 */
export async function importPlayers(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const text = String(fd.get("text") ?? "");
  const rows: { name: string; rating: number; setAverage?: number; matches?: number; wins?: number }[] = [];
  const errors: string[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(/\t|;|,/).map((c) => c.trim()).filter(Boolean);
    // Başta sıra numarası varsa at
    if (cols.length > 2 && /^\d+$/.test(cols[0]!) && !/^\d+$/.test(cols[1]!)) cols.shift();
    const [name, rating, setAverage, matches, wins] = cols;
    const r = Number(rating);
    if (!name || name.length < 3 || !Number.isInteger(r)) {
      if (i === 0 && !Number.isInteger(r)) continue; // başlık satırı
      errors.push(`${i + 1}. satır okunamadı: “${line.slice(0, 40)}”`);
      continue;
    }
    const n = (v?: string) => (v && /^-?\d+$/.test(v) ? Number(v) : undefined);
    rows.push({ name: name.replace(/\s+/g, " "), rating: r, setAverage: n(setAverage), matches: n(matches), wins: n(wins) });
  }
  if (!rows.length) return { error: errors[0] ?? "Aktarılacak satır bulunamadı." };
  const existing = await db.player.findMany();
  const key = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const byName = new Map(existing.map((p) => [key(p.name), p]));
  let created = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const r of rows) {
      const found = byName.get(key(r.name));
      const data = { rating: r.rating, setAverage: r.setAverage, matches: r.matches, wins: r.wins };
      if (found) {
        await tx.player.update({ where: { id: found.id }, data });
        updated++;
      } else {
        await tx.player.create({ data: { name: r.name, ...data } });
        created++;
      }
    }
  });
  refresh();
  const msg = `${created} oyuncu eklendi, ${updated} oyuncu güncellendi.`;
  return errors.length ? { error: `${msg} Okunamayan satırlar: ${errors.slice(0, 5).join(" · ")}` } : { ok: msg };
}

/** Oyuncuya giriş hesabı açar (rakip onayı için her oyuncunun hesabı olmalı). */
export async function createAccount(playerId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!z.string().email().safeParse(email).success) return { error: "Geçerli bir e-posta girin." };
  if (!isAllowedEmail(email)) return { error: EMAIL_DOMAIN_ERROR };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  const player = await db.player.findUnique({ where: { id: playerId }, include: { user: true } });
  if (!player) return { error: "Oyuncu bulunamadı." };
  if (player.user) return { error: "Bu oyuncunun zaten hesabı var." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Bu e-posta ile kayıtlı kullanıcı var." };
  await db.user.create({ data: { email, name: player.name, role: "PLAYER", playerId, passwordHash: await bcrypt.hash(password, 10) } });
  refresh();
  return { ok: `Hesap açıldı. Giriş bilgilerini ${player.name} ile paylaşın.` };
}

/** Lig sorumlusu oyuncunun şifresini sıfırlayabilir (yönetici hesaplarına dokunamaz). */
export async function resetPlayerPassword(playerId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  const res = await db.user.updateMany({ where: { playerId, role: "PLAYER" }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return res.count ? { ok: "Şifre güncellendi." } : { error: "Bu oyuncunun oyuncu hesabı yok." };
}

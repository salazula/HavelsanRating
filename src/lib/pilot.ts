import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { PLANET_DEFAULT_SLOTS } from "./schedule";

/*
 * Pilot uygulama: Excel'deki ("grup gir" sayfası) A ve B grubu oyuncularını gerçek oyuncu olarak ekler ve
 * her birine giriş hesabı açar. Tüm kayıtlar isPilot ile işaretlidir; "Pilot verisini sil" oyuncuları,
 * hesapları ve yalnızca pilot oyuncuların yer aldığı haftaları topluca kaldırır.
 * Telefon numaraları uydurmadır.
 */

export const PILOT_PASSWORD = "Havelsan2026!";

export const PILOT_PLAYERS = [
  { name: "Alp Kayman", rating: 1798, group: "A" },
  { name: "Alperen Kuzu", rating: 1763, group: "A" },
  { name: "Barış Uğur", rating: 1743, group: "A" },
  { name: "Ersoy Önemli", rating: 1735, group: "A" },
  { name: "Berke Arda Dündar", rating: 1686, group: "A" },
  { name: "Muhammet Kartal", rating: 1656, group: "A" },
  { name: "Celal Sami Tüfekçi", rating: 1651, group: "B" },
  { name: "Sinan Kürün", rating: 1645, group: "B" },
  { name: "Uğur Özgürgil", rating: 1639, group: "B" },
  { name: "Metin Alp Yurtseven", rating: 1631, group: "B" },
  { name: "Ongun Berke Sevil", rating: 1609, group: "B" },
  { name: "Kağan Yurdal", rating: 1600, group: "B" }, // Excel gruplarında yok; puanı lig sorumlusu verdi
] as const;

/** Pilotta lig sorumlusu testini yapacak hesap (oyuncu kaydı yok, gruplara girmez) */
export const PILOT_MANAGER = { name: "Erkan Öztep", phone: "0536 418 72 05" } as const;

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" };

/** "Celal Sami Tüfekçi" → "celalsamitufekci@deneme.local" */
export function pilotEmail(name: string) {
  const local = name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => TR[c] ?? c)
    .normalize("NFKD")
    .replace(/[^a-z]/g, "");
  return `${local}@deneme.local`;
}

/** Uydurma ama gerçekçi görünen numara: 0532 412 07 31 */
export function pilotPhone(i: number) {
  const prefix = ["532", "533", "535", "541", "542", "505", "506", "552", "553", "554", "555"][i % 11];
  const n = String((i * 7919 + 4127) * 104729).slice(-7);
  return `0${prefix} ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)}`;
}

const key = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

export async function pilotAccounts() {
  return db.user.findMany({
    where: { isPilot: true },
    select: { email: true, name: true, phone: true, role: true, player: { select: { rating: true } } },
    orderBy: [{ role: "asc" }, { player: { rating: "desc" } }],
  });
}

export async function createPilot(): Promise<{ ok: string } | { error: string }> {
  if (!(await db.groupSlot.count())) {
    await db.groupSlot.createMany({ data: PLANET_DEFAULT_SLOTS.map((s, i) => ({ ...s, order: i })) });
  }
  const existing = await db.player.findMany({ where: { isDemo: false }, select: { name: true, isPilot: true } });
  const taken = new Set(existing.filter((p) => !p.isPilot).map((p) => key(p.name)));
  const loaded = new Set(existing.filter((p) => p.isPilot).map((p) => key(p.name)));
  const emails = new Set((await db.user.findMany({ select: { email: true } })).map((u) => u.email));
  const hash = await bcrypt.hash(PILOT_PASSWORD, 10);
  const skipped: string[] = [];
  let created = 0;
  let managerCreated = false;
  await db.$transaction(async (tx) => {
    for (const [i, p] of PILOT_PLAYERS.entries()) {
      if (loaded.has(key(p.name))) continue; // önceden yüklenmiş; sadece eksikler eklenir
      const email = pilotEmail(p.name);
      if (taken.has(key(p.name)) || emails.has(email)) {
        skipped.push(p.name);
        continue;
      }
      const phone = pilotPhone(i);
      const player = await tx.player.create({ data: { name: p.name, rating: p.rating, phone, isPilot: true } });
      await tx.user.create({ data: { email, name: p.name, role: "PLAYER", phone, playerId: player.id, passwordHash: hash, isPilot: true } });
      created++;
    }
    const email = pilotEmail(PILOT_MANAGER.name);
    if (!emails.has(email)) {
      await tx.user.create({ data: { email, name: PILOT_MANAGER.name, role: "LEAGUE_MANAGER", phone: PILOT_MANAGER.phone, passwordHash: hash, isPilot: true } });
      managerCreated = true;
    }
  });
  if (!created && !managerCreated && !skipped.length) return { error: "Pilot hesaplarının hepsi zaten yüklü." };
  const msg = `Pilot verisi yüklendi: ${created} oyuncu ve hesabı (A ve B grubu)${managerCreated ? `, lig sorumlusu ${PILOT_MANAGER.name}` : ""}.`;
  return skipped.length ? { ok: `${msg} Zaten kayıtlı olduğu için atlananlar: ${skipped.join(", ")}.` } : { ok: msg };
}

export async function deletePilot(): Promise<{ ok: string } | { error: string }> {
  const pilotIds = (await db.player.findMany({ where: { isPilot: true }, select: { id: true } })).map((p) => p.id);
  if (!pilotIds.length && !(await db.user.count({ where: { isPilot: true } }))) return { error: "Silinecek pilot verisi yok." };
  // Pilot oyuncuların oynadığı haftalar; içinde pilot dışı oyuncu olan hafta silinmez
  const rounds = await db.round.findMany({
    where: { isDemo: false, groups: { some: { entries: { some: { playerId: { in: pilotIds } } } } } },
    include: { groups: { include: { entries: { select: { player: { select: { isPilot: true, name: true } } } } } } },
  });
  const mixed = rounds.filter((r) => r.groups.some((g) => g.entries.some((e) => !e.player.isPilot)));
  if (mixed.length) {
    return { error: `Şu haftalarda pilot dışı oyuncular da var, önce o haftaları silin: ${mixed.map((r) => r.name).join(", ")}.` };
  }
  const result = await db.$transaction(async (tx) => {
    const r = await tx.round.deleteMany({ where: { id: { in: rounds.map((x) => x.id) } } });
    await tx.user.deleteMany({ where: { OR: [{ isPilot: true }, { playerId: { in: pilotIds } }] } });
    const p = await tx.player.deleteMany({ where: { id: { in: pilotIds } } });
    return { rounds: r.count, players: p.count };
  });
  return { ok: `Pilot verisi silindi (${result.players} oyuncu ve hesabı, lig sorumlusu hesabı, ${result.rounds} hafta).` };
}

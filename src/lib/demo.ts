import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { DEFAULT_SLOTS, dateFromYmd, nextMonday, weekName } from "./schedule";
import { applyClose, distribute, generateFixture } from "./weekly";
import { SCORES } from "./rating";

/*
 * Deneme verisi: sistemi gerçek veriye dokunmadan denemek için.
 * 24 deneme oyuncusu, deneme hesapları (şifre Deneme123!), kapanmış bir hafta ve fikstürü oluşmuş,
 * sonuçlarının bir kısmı girilmiş devam eden bir hafta oluşturur. Tüm kayıtlar isDemo ile işaretlidir
 * ve "Deneme verisini sil" ile tamamen kaldırılır.
 */

export const DEMO_PASSWORD = "Deneme123!";

const NAMES = [
  "Ahmet Yıldız", "Mehmet Kaya", "Mustafa Demir", "Ayşe Şahin", "Emre Çelik", "Fatma Arslan",
  "Hüseyin Koç", "Zeynep Kurt", "Burak Aydın", "Elif Öztürk", "Can Polat", "Selin Aksoy",
  "Murat Doğan", "Deniz Güneş", "Okan Erdem", "Ece Tan", "Serkan Bulut", "Gizem Uçar",
  "Tolga Keskin", "Merve Yalçın", "Kerem Sarı", "Büşra Kılıç", "Onur Çakır", "Derya Acar",
];

/** Tekrarlanabilir rastgele sayı (her denemede aynı veri) */
function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export async function demoExists() {
  return (await db.player.count({ where: { isDemo: true } })) > 0;
}

export async function createDemo(): Promise<{ ok: string } | { error: string }> {
  if (await demoExists()) return { error: "Deneme verisi zaten var." };
  if (await db.round.findFirst({ where: { status: { in: ["DRAFT", "ATTENDANCE", "OPEN"] } } })) {
    return { error: "Devam eden gerçek bir hafta varken deneme verisi oluşturulamaz." };
  }
  if (!(await db.groupSlot.count())) {
    await db.groupSlot.createMany({ data: DEFAULT_SLOTS.map((s, i) => ({ ...s, order: i })) });
  }
  const rand = rng();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Oyuncular ve hesaplar
  const players = [];
  for (const [i, name] of NAMES.entries()) {
    const rating = 1760 - i * 14 - Math.floor(rand() * 10);
    const matches = 20 + Math.floor(rand() * 90);
    const p = await db.player.create({
      data: { name, rating, matches, wins: Math.floor(matches * (0.3 + rand() * 0.4)), setAverage: Math.floor(rand() * 40) - 20, isDemo: true },
    });
    players.push(p);
    await db.user.create({ data: { email: `deneme${i + 1}@deneme.local`, name, role: "PLAYER", playerId: p.id, passwordHash: hash, isDemo: true } });
  }
  await db.user.create({ data: { email: "deneme.sorumlu@deneme.local", name: "Deneme Lig Sorumlusu", role: "LEAGUE_MANAGER", passwordHash: hash, isDemo: true } });

  const thisMonday = dateFromYmd(nextMonday(new Date(Date.now() - 7 * 86400000)));
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  const score = () => SCORES[Math.floor(rand() * SCORES.length)]!.split("-").map(Number) as [number, number];

  // 1) Geçen hafta: herkes katıldı, tüm maçlar oynandı, hafta kapandı
  const past = await db.round.create({ data: { name: weekName(lastMonday), weekStart: lastMonday, deadline: new Date(lastMonday.getTime() - 2 * 3600000), isDemo: true, status: "DRAFT" } });
  await distribute(past.id, lastMonday, true);
  await db.groupEntry.updateMany({ where: { group: { roundId: past.id } }, data: { attendance: "YES", attendanceAt: lastMonday } });
  await db.round.update({ where: { id: past.id }, data: { status: "ATTENDANCE" } });
  await generateFixture(past.id);
  for (const m of await db.match.findMany({ where: { group: { roundId: past.id } } })) {
    // Üst sıradaki oyuncu çoğunlukla kazanır
    const [a, b] = rand() < 0.7 ? ([3, Math.floor(rand() * 3)] as [number, number]) : score();
    await db.match.update({ where: { id: m.id }, data: { status: "APPROVED", kind: "NORMAL", setsA: a, setsB: b, confirmedAt: lastMonday } });
  }
  await applyClose(past.id);

  // 2) Bu hafta: bazıları katılmadı/bildirmedi, fikstür oluştu (alt gruptan tamamlama ile), yarısı oynandı
  const cur = await db.round.create({ data: { name: weekName(thisMonday), weekStart: thisMonday, deadline: new Date(), isDemo: true, status: "DRAFT" } });
  await distribute(cur.id, thisMonday, true);
  const entries = await db.groupEntry.findMany({ where: { group: { roundId: cur.id } } });
  for (const [i, e] of entries.entries()) {
    const attendance = i === 2 ? "NO" : i === 9 ? "PENDING" : i === 14 ? "NO" : "YES";
    await db.groupEntry.update({ where: { id: e.id }, data: { attendance, attendanceAt: attendance === "PENDING" ? null : new Date() } });
  }
  await db.round.update({ where: { id: cur.id }, data: { status: "ATTENDANCE" } });
  await generateFixture(cur.id);
  const curMatches = await db.match.findMany({ where: { group: { roundId: cur.id } }, include: { group: true }, orderBy: { id: "asc" } });
  const firstGroup = curMatches[0]?.groupId;
  const userOf = new Map((await db.user.findMany({ where: { isDemo: true, playerId: { not: null } } })).map((u) => [u.playerId!, u.id]));
  for (const [i, m] of curMatches.entries()) {
    // İlk grup tamamen bitsin (haftanın yıldızı örneği), diğerlerinde yaklaşık yarısı
    if (m.groupId !== firstGroup && i % 2) continue;
    const [a, b] = rand() < 0.65 ? ([3, Math.floor(rand() * 3)] as [number, number]) : score();
    await db.match.update({ where: { id: m.id }, data: { status: m.groupId !== firstGroup && i % 4 === 0 ? "SUBMITTED" : "APPROVED", kind: "NORMAL", setsA: a, setsB: b, submittedById: userOf.get(m.playerAId), submittedAt: new Date(), confirmedAt: new Date() } });
  }
  return { ok: `Deneme verisi oluşturuldu: ${players.length} oyuncu, 2 hafta. Hesaplar: deneme1@deneme.local … deneme24@deneme.local ve deneme.sorumlu@deneme.local (şifre ${DEMO_PASSWORD}).` };
}

export async function deleteDemo(): Promise<{ ok: string } | { error: string }> {
  const rounds = await db.round.deleteMany({ where: { isDemo: true } });
  await db.user.deleteMany({ where: { isDemo: true } });
  // Gerçek haftalarda yer almış deneme oyuncusu olmamalı; yine de kayıtlarıyla birlikte silinir
  const players = await db.player.deleteMany({ where: { isDemo: true } });
  return { ok: `Deneme verisi silindi (${players.count} oyuncu, ${rounds.count} hafta).` };
}

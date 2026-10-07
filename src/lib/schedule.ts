/* Haftalık grup takvimi yardımcıları (saatler İstanbul saati, UTC+3). */

/** Maçların oynanabildiği son an: haftanın Cuma günü bittiğinde (Cumartesi 00:00, İstanbul) */
export function playUntil(weekStart: Date) {
  return new Date(weekStart.getTime() + 5 * 86400000);
}

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long", timeZone: "Europe/Istanbul" });
/** "6 Ekim Pazartesi - 10 Ekim Cuma 23:59" */
export function playWindowText(weekStart: Date) {
  return `${dayFmt.format(weekStart)} - ${dayFmt.format(new Date(playUntil(weekStart).getTime() - 60000))} 23:59`;
}

/** Verilen tarihten sonraki (ya da o günkü) pazartesi, "YYYY-MM-DD" */
export function nextMonday(from = new Date()) {
  const local = new Date(from.getTime() + 3 * 3600000);
  const dow = local.getUTCDay() || 7; // 1..7
  const add = dow === 1 ? 0 : 8 - dow;
  return new Date(local.getTime() + add * 86400000).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → o günün İstanbul gece yarısı */
export function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00+03:00`);
}

export function ymdOf(d: Date) {
  return new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 10);
}

/** datetime-local input değeri (İstanbul saati) */
export function toLocalInput(d?: Date | null) {
  if (!d) return "";
  return new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 16);
}
export function fromLocalInput(v: string) {
  return v ? new Date(`${v}:00+03:00`) : null;
}

const monthFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
/** Hafta adı (Pazartesi-Cuma): "6-10 Ekim" ya da "29 Eylül - 3 Ekim" */
export function weekName(weekStart: Date) {
  const end = new Date(weekStart.getTime() + 4 * 86400000);
  const a = monthFmt.format(weekStart).split(" ");
  const b = monthFmt.format(end).split(" ");
  return a[1] === b[1] ? `${a[0]}-${b[0]} ${b[1]}` : `${monthFmt.format(weekStart)} - ${monthFmt.format(end)}`;
}

/** Varsayılan grup düzeni: 6'şar kişilik A-D (gün/saat yok); oyuncu artarsa planGroups yeni grup açar */
export const DEFAULT_SLOTS: { code: string; size: number; place: string | null }[] = ["A", "B", "C", "D"].map((code) => ({ code, size: 6, place: null }));

type SlotPlan = { code: string; size: number; place: string | null };
/**
 * Grup düzenini oyuncu sayısına göre uygular: düzendeki gruplar sırayla dolar; oyuncu artarsa
 * son grubun kişi sayısıyla yeni gruplar (E, F…) eklenir. Grup sayısında üst sınır yoktur.
 */
export function planGroups(slots: SlotPlan[], players: number, code: (i: number) => string): (SlotPlan & { take: number })[] {
  const plan: (SlotPlan & { take: number })[] = [];
  const used = new Set(slots.map((s) => s.code));
  let left = players;
  for (const s of slots) {
    const take = Math.min(s.size, Math.max(0, left));
    plan.push({ ...s, take });
    left -= take;
  }
  const size = slots.at(-1)?.size ?? 6;
  for (let i = 0; left > 0; i++) {
    const c = code(i);
    if (used.has(c)) continue;
    used.add(c);
    const take = Math.min(size, left);
    plan.push({ code: c, size, place: null, take });
    left -= take;
  }
  return plan;
}

/* Haftalık grup takvimi yardımcıları (saatler İstanbul saati, UTC+3). */

export const WEEKDAYS = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

export type SlotLike = { weekday: number; startTime: string; endTime?: string | null; place?: string | null };

export function slotSchedule(s: SlotLike) {
  return `${WEEKDAYS[s.weekday]} ${s.startTime}${s.endTime ? `-${s.endTime}` : ""}${s.place ? ` · ${s.place}` : ""}`;
}

/** "2026-10-05" (pazartesi) → o haftanın ilgili gününün başlama zamanı */
export function playAtFor(weekStart: Date, s: SlotLike) {
  const day = new Date(weekStart.getTime() + (s.weekday - 1) * 86400000);
  const ymd = day.toISOString().slice(0, 10);
  return new Date(`${ymd}T${s.startTime}:00+03:00`);
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
/** Hafta adı: "6-12 Ekim" ya da "29 Eylül - 5 Ekim" */
export function weekName(weekStart: Date) {
  const end = new Date(weekStart.getTime() + 6 * 86400000);
  const a = monthFmt.format(weekStart).split(" ");
  const b = monthFmt.format(end).split(" ");
  return a[1] === b[1] ? `${a[0]}-${b[0]} ${b[1]}` : `${monthFmt.format(weekStart)} - ${monthFmt.format(end)}`;
}

/** Excel'deki (planet mayıs1) grup düzeni */
export const PLANET_DEFAULT_SLOTS: (SlotLike & { code: string; size: number })[] = [
  { code: "A", weekday: 7, startTime: "16:00", endTime: "21:00", place: "1 Numaralı Masa", size: 6 },
  { code: "B", weekday: 7, startTime: "16:00", endTime: "21:00", place: "2 Numaralı Masa", size: 6 },
  { code: "C", weekday: 7, startTime: "16:00", endTime: "21:00", place: "3 Numaralı Masa", size: 6 },
  { code: "D", weekday: 6, startTime: "16:00", endTime: "21:00", place: "2 Numaralı Masa", size: 6 },
  { code: "E", weekday: 6, startTime: "16:00", endTime: "21:00", place: "3 Numaralı Masa", size: 6 },
  { code: "F", weekday: 6, startTime: "16:00", endTime: "21:00", place: "4 Numaralı Masa", size: 6 },
  { code: "G", weekday: 5, startTime: "16:00", endTime: "21:00", place: "3 Numaralı Masa karşısı Stiga masa", size: 6 },
  { code: "H", weekday: 5, startTime: "18:00", endTime: "21:00", place: "Müsait masa", size: 6 },
  { code: "I", weekday: 5, startTime: "18:00", endTime: "21:00", place: "Müsait masa", size: 6 },
  { code: "J", weekday: 1, startTime: "18:00", endTime: "21:00", place: null, size: 6 },
  { code: "K", weekday: 1, startTime: "18:00", endTime: "21:00", place: null, size: 6 },
  { code: "L", weekday: 1, startTime: "18:00", endTime: "21:00", place: null, size: 6 },
  { code: "M", weekday: 1, startTime: "18:00", endTime: "21:00", place: null, size: 6 },
];

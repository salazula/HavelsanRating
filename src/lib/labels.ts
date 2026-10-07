import type { MatchStatus, Role, RoundStatus } from "@prisma/client";

export const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Süper Admin",
  LEAGUE_MANAGER: "Lig Sorumlusu",
  PLAYER: "Oyuncu",
};

export const matchStatusLabel: Record<MatchStatus, string> = {
  PENDING: "Sonuç yok",
  SUBMITTED: "Onay bekliyor",
  DISPUTED: "İtiraz edildi",
  APPROVED: "Kesinleşti",
};

export const roundStatusLabel: Record<RoundStatus, string> = {
  DRAFT: "Hazırlanıyor",
  ATTENDANCE: "Katılım bildirimi",
  OPEN: "Maçlar oynanıyor",
  CLOSED: "Tamamlandı",
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const dateTimeFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

export function formatDate(d?: Date | null) {
  return d ? dateFmt.format(d) : "—";
}
export function formatDateTime(d?: Date | null) {
  return d ? dateTimeFmt.format(d) : "—";
}

/** +12, -8, 0 */
export function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

/** Maç skorunu verilen oyuncunun bakış açısından yazar. */
export function scoreText(m: { kind: string | null; setsA: number | null; setsB: number | null; playerAId: string }, forPlayerId?: string) {
  if (m.kind === "BOTH_ABSENT") return "Hükmen";
  if (m.setsA == null || m.setsB == null) return "–";
  return forPlayerId && forPlayerId !== m.playerAId ? `${m.setsB}-${m.setsA}` : `${m.setsA}-${m.setsB}`;
}

export const attendanceLabel = {
  PENDING: "Bildirmedi",
  YES: "Katılıyor",
  NO: "Katılmıyor",
  AUTO_NO: "Hükmen",
} as const;

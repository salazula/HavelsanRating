/*
 * Masa Tenisi Rating hesaplama kuralları (planet mayıs1.xlsm'deki formüllerin birebir karşılığı).
 *
 * Maç puanı: puan farkı tablosuna göre. Beklenen sonuçta yüksek puanlı "yüksek" sütununu,
 * sürprizde düşük puanlı "düşük" sütununu kazanır; kaybeden aynı puanı kaybeder.
 * Bu puana set averajı eklenir (3-0: 3, 3-1: 2, 3-2: 1; kaybedene eksisi).
 * Hükmen (iki oyuncu da gelmedi): yüksek puanlı, düşük puanlının kazanacağı puan + 3 kaybeder;
 * düşük puanlı, yüksek puanlının kazanacağı puanı kaybeder. İkisinin set averajı da -3.
 * Grup sonu: hiç maç yapmayan -24; 5 maçtan eksik yapana eksik maç başına +8;
 * tüm maçlarını kazanana (haftanın yıldızı) +10.
 * Katılım: katılamayacağını bildiren ve son güne kadar bildirmeyen (hükmen) oyuncu fikstüre girmez,
 * maç yapmamış sayılır ve gelmeme cezası alır.
 *
 * Aşağıdaki sayılar varsayılanlardır; lig sorumlusu ve süper admin "Puan kuralları" sayfasından değiştirebilir.
 */

export type TableRow = { max: number; high: number; low: number };

/** Excel'deki puan farkı tablosu (varsayılan). Son satırın üst sınırı yoktur. */
export const RATING_TABLE: TableRow[] = [
  { max: 12, high: 8, low: 8 },
  { max: 37, high: 7, low: 10 },
  { max: 62, high: 6, low: 13 },
  { max: 87, high: 5, low: 16 },
  { max: 112, high: 4, low: 20 },
  { max: 137, high: 3, low: 25 },
  { max: 162, high: 2, low: 30 },
  { max: 187, high: 2, low: 35 },
  { max: 212, high: 1, low: 40 },
  { max: 237, high: 1, low: 45 },
  { max: Infinity, high: 0, low: 50 },
];

/** "0 - 12", …, "238 ve üzeri" */
export function tableLabel(table: TableRow[], i: number) {
  const from = i === 0 ? 0 : table[i - 1]!.max + 1;
  return i === table.length - 1 ? `${from} ve üzeri` : `${from} - ${table[i]!.max}`;
}

/** Panelden (Puan kuralları) değiştirilebilen değerler; kayıt yoksa varsayılanlar kullanılır. */
export type Rules = {
  declaredAbsentPenalty: number; // Katılamayacağını bildiren
  undeclaredPenalty: number; // Son güne kadar katılım bildirmeyen (hükmen)
  noMatchPenalty: number; // Katıldığı halde hiç maç yapamayan
  expectedMatches: number; // Bu sayıdan eksik maç yapana eksik maç başına bonus
  perMissingMatch: number;
  unbeatenBonus: number; // Haftanın yıldızı
  walkoverSetPenalty: number; // Hükmende yüksek puanlıya ek ceza ve iki oyuncunun set averajı cezası
  setBonus30: number;
  setBonus31: number;
  setBonus32: number;
  table: TableRow[];
};

export const DEFAULT_RULES: Rules = {
  declaredAbsentPenalty: -24,
  undeclaredPenalty: -24,
  noMatchPenalty: -24,
  expectedMatches: 5,
  perMissingMatch: 8,
  unbeatenBonus: 10,
  walkoverSetPenalty: 3,
  setBonus30: 3,
  setBonus31: 2,
  setBonus32: 1,
  table: RATING_TABLE,
};

/** Geçerli set skorları (kazanan 3 set alır). */
export const SCORES = ["3-0", "3-1", "3-2", "2-3", "1-3", "0-3"] as const;

export function tableRow(diff: number, table: TableRow[] = RATING_TABLE) {
  const d = Math.abs(diff);
  return table.find((r) => d <= r.max) ?? table[table.length - 1]!;
}

/** Kazananın set averajı katkısı (varsayılan 3-0 → 3, 3-1 → 2, 3-2 → 1) */
export function setBonus(loserSets: number, rules: Rules = DEFAULT_RULES) {
  return [rules.setBonus30, rules.setBonus31, rules.setBonus32][loserSets] ?? 0;
}

export function isValidScore(a: number, b: number) {
  return (a === 3 && b >= 0 && b <= 2) || (b === 3 && a >= 0 && a <= 2);
}

export type MatchInput = {
  ratingA: number;
  ratingB: number;
  kind: "NORMAL" | "BOTH_ABSENT";
  setsA?: number | null;
  setsB?: number | null;
};

export type MatchOutcome = {
  pointsA: number;
  pointsB: number;
  setAvgA: number;
  setAvgB: number;
  /** Maç sayısına ve galibiyete sayılır mı (hükmen sayılmaz) */
  counted: boolean;
  winner: "A" | "B" | null;
};

/** Tek bir maçın iki oyuncuya etkisi. Eşit puanda A yüksek puanlı sayılır. */
export function scoreMatch(m: MatchInput, rules: Rules = DEFAULT_RULES): MatchOutcome {
  const aHigh = m.ratingA >= m.ratingB;
  const row = tableRow(m.ratingA - m.ratingB, rules.table);

  if (m.kind === "BOTH_ABSENT") {
    const p = rules.walkoverSetPenalty;
    const highLoss = -(row.low + p);
    const lowLoss = -row.high;
    return {
      pointsA: aHigh ? highLoss : lowLoss,
      pointsB: aHigh ? lowLoss : highLoss,
      setAvgA: -p,
      setAvgB: -p,
      counted: false,
      winner: null,
    };
  }

  const a = m.setsA ?? 0;
  const b = m.setsB ?? 0;
  if (!isValidScore(a, b)) throw new Error(`Geçersiz skor: ${a}-${b}`);
  const aWon = a > b;
  const sets = setBonus(aWon ? b : a, rules); // kazananın set averajı
  const highWon = aWon === aHigh;
  const base = highWon ? row.high : row.low;
  const winnerGain = base + sets;
  return {
    pointsA: aWon ? winnerGain : -winnerGain,
    pointsB: aWon ? -winnerGain : winnerGain,
    setAvgA: aWon ? sets : -sets,
    setAvgB: aWon ? -sets : sets,
    counted: true,
    winner: aWon ? "A" : "B",
  };
}

/** Grup sonu ek puanı (manuel ek puan hariç). */
export function groupBonus(played: number, won: number, rules: Rules = DEFAULT_RULES) {
  if (played === 0) return rules.noMatchPenalty;
  const missing = Math.max(0, rules.expectedMatches - played);
  return missing * rules.perMissingMatch + (played === won ? rules.unbeatenBonus : 0);
}

export type EntryInput = {
  playerId: string;
  ratingBefore: number;
  setAvgBefore: number;
  manualBonus: number;
  /** Fikstüre girmedi: "NO" bildirdi, "AUTO_NO" bildirmedi (hükmen) */
  absent?: "NO" | "AUTO_NO" | null;
};
export type ApprovedMatch = {
  playerAId: string;
  playerBId: string;
  kind: "NORMAL" | "BOTH_ABSENT";
  setsA: number | null;
  setsB: number | null;
};

export type EntryResult = {
  playerId: string;
  matchPoints: number;
  bonus: number; // grup bonusu + manuel
  total: number;
  ratingAfter: number;
  setAvgAfter: number;
  played: number;
  won: number;
};

/** Bir grubun tüm sonuçlarını hesaplar. Maç puanları maç öncesi (tur başı) puanlara göre hesaplanır. */
export function computeGroup(entries: EntryInput[], matches: ApprovedMatch[], rules: Rules = DEFAULT_RULES): Map<string, EntryResult> {
  const byId = new Map(entries.map((e) => [e.playerId, e]));
  const acc = new Map(entries.map((e) => [e.playerId, { pts: 0, set: 0, played: 0, won: 0 }]));
  for (const m of matches) {
    const a = byId.get(m.playerAId);
    const b = byId.get(m.playerBId);
    if (!a || !b) continue;
    const o = scoreMatch({ ratingA: a.ratingBefore, ratingB: b.ratingBefore, kind: m.kind, setsA: m.setsA, setsB: m.setsB }, rules);
    const sa = acc.get(a.playerId)!;
    const sb = acc.get(b.playerId)!;
    sa.pts += o.pointsA;
    sb.pts += o.pointsB;
    sa.set += o.setAvgA;
    sb.set += o.setAvgB;
    if (o.counted) {
      sa.played++;
      sb.played++;
      if (o.winner === "A") sa.won++;
      else sb.won++;
    }
  }
  const out = new Map<string, EntryResult>();
  for (const e of entries) {
    const s = acc.get(e.playerId)!;
    const base = e.absent === "AUTO_NO" ? rules.undeclaredPenalty : e.absent === "NO" ? rules.declaredAbsentPenalty : groupBonus(s.played, s.won, rules);
    const bonus = base + e.manualBonus;
    const total = s.pts + bonus;
    out.set(e.playerId, {
      playerId: e.playerId,
      matchPoints: s.pts,
      bonus,
      total,
      ratingAfter: e.ratingBefore + total,
      setAvgAfter: e.setAvgBefore + s.set,
      played: s.played,
      won: s.won,
    });
  }
  return out;
}

/** Round robin eşleşmeleri (her çift bir kez). Liste puan sırasına göre verilir; A her zaman üst sıradaki. */
export function roundRobinPairs<T>(players: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) pairs.push([players[i]!, players[j]!]);
  return pairs;
}

export function groupCode(i: number) {
  // A…Z, sonra AA, AB…
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export type FillEntry = { id: string; groupIndex: number; rating: number; attending: boolean };

/**
 * Eksik grupları alt gruplardan tamamlar. Gruplar yukarıdan aşağı işlenir; eksik grup, altındaki en yakın
 * gruptaki katılan en yüksek puanlı oyuncuyu alır (alt grup da eksilirse o da kendi altından tamamlanır).
 * En alttaki dolu grupta tek oyuncu kalırsa maç yapabilmesi için bir üst gruba eklenir.
 * Dönen harita: oyuncu kaydı id → yeni grup sırası (sadece taşınanlar).
 */
export function fillGroups(entries: FillEntry[], sizes: number[]): Map<string, number> {
  const groups = sizes.map((_, i) =>
    entries.filter((e) => e.attending && e.groupIndex === i).sort((a, b) => b.rating - a.rating),
  );
  const moved = new Map<string, number>();
  for (let i = 0; i < groups.length; i++) {
    while (groups[i]!.length < sizes[i]!) {
      const j = groups.findIndex((g, k) => k > i && g.length > 0);
      if (j === -1) break;
      const pick = groups[j]!.shift()!;
      groups[i]!.push(pick);
      moved.set(pick.id, i);
    }
  }
  const last = groups.findLastIndex((g) => g.length > 0);
  const above = groups.findLastIndex((g, k) => k < last && g.length > 0);
  if (last > 0 && groups[last]!.length === 1 && above >= 0) {
    const lone = groups[last]!.pop()!;
    groups[above]!.push(lone);
    moved.set(lone.id, above);
  }
  return moved;
}

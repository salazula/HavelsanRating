/*
 * Canlı skor (skorbord): maç, sayıların sırası olarak saklanır ("A"/"B" dizisi).
 * Setler, set sayısı, servis sırası ve maçın bitişi bu diziden hesaplanır; geri alma = son sayıyı silmek.
 * Kurallar: set 11 sayıda, 2 fark ile biter; 3 seti alan maçı kazanır (5 setlik maç).
 * Servis: her 2 sayıda bir el değişir, 10-10'dan sonra her sayıda; her sette ilk servisi
 * bir önceki setin ilk servisini karşılayan oyuncu atar.
 */

export type Side = "A" | "B";

export const SET_POINTS = 11;
export const SETS_TO_WIN = 3;

export type LiveScore = {
  /** Biten setler [A, B] */
  sets: [number, number][];
  /** Devam eden setin skoru */
  current: [number, number];
  setsA: number;
  setsB: number;
  finished: boolean;
  winner: Side | null;
  /** Sıradaki sayıda servisi atacak oyuncu (ilk servis seçilmediyse null) */
  server: Side | null;
};

const other = (s: Side): Side => (s === "A" ? "B" : "A");

export function setOver(a: number, b: number) {
  return (a >= SET_POINTS || b >= SET_POINTS) && Math.abs(a - b) >= 2;
}

export function deriveLive(points: Side[], firstServer: Side | null = null): LiveScore {
  const sets: [number, number][] = [];
  let a = 0;
  let b = 0;
  let setsA = 0;
  let setsB = 0;
  for (const p of points) {
    if (setsA >= SETS_TO_WIN || setsB >= SETS_TO_WIN) break; // maç bittikten sonraki sayılar yok sayılır
    if (p === "A") a++;
    else b++;
    if (setOver(a, b)) {
      sets.push([a, b]);
      if (a > b) setsA++;
      else setsB++;
      a = 0;
      b = 0;
    }
  }
  const finished = setsA >= SETS_TO_WIN || setsB >= SETS_TO_WIN;
  let server: Side | null = null;
  if (firstServer && !finished) {
    const setFirst = sets.length % 2 === 0 ? firstServer : other(firstServer);
    const n = a + b;
    const turn = n < 2 * (SET_POINTS - 1) ? Math.floor(n / 2) % 2 : (n - 2 * (SET_POINTS - 1)) % 2;
    server = turn === 0 ? setFirst : other(setFirst);
  }
  return { sets, current: [a, b], setsA, setsB, finished, winner: finished ? (setsA > setsB ? "A" : "B") : null, server };
}

/** Veritabanındaki JSON'u güvenle sayı dizisine çevirir */
export function parsePoints(v: unknown): Side[] {
  return Array.isArray(v) ? v.filter((x): x is Side => x === "A" || x === "B") : [];
}

/** "11-7, 9-11, 11-5" */
export function setScoresText(sets: [number, number][] | null | undefined, flip = false) {
  if (!sets?.length) return "";
  return sets.map(([a, b]) => (flip ? `${b}-${a}` : `${a}-${b}`)).join(", ");
}

export function parseSetScores(v: unknown): [number, number][] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((s): s is [number, number] => Array.isArray(s) && s.length === 2 && s.every((n) => Number.isInteger(n)));
  return out.length ? out : null;
}

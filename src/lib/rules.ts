import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db";
import { DEFAULT_RULES, type Rules, type TableRow } from "./rating";

const int = z.number().int();

const stored = z.object({
  declaredAbsentPenalty: int,
  undeclaredPenalty: int,
  noMatchPenalty: int,
  expectedMatches: int,
  perMissingMatch: int,
  unbeatenBonus: int,
  walkoverSetPenalty: int,
  setBonus30: int,
  setBonus31: int,
  setBonus32: int,
  table: z.array(z.object({ max: int.nullable(), high: int, low: int })).min(1),
});

/** Veritabanına yazılacak hali (Infinity JSON'a yazılamaz, son satır null). */
export function toStored(r: Rules) {
  return { ...r, table: r.table.map((t, i) => ({ ...t, max: i === r.table.length - 1 ? null : t.max })) };
}

export function parseRules(data: unknown): Rules {
  const p = stored.safeParse(data);
  if (!p.success) return DEFAULT_RULES;
  const table: TableRow[] = p.data.table.map((t, i, all) => ({ ...t, max: i === all.length - 1 || t.max == null ? Infinity : t.max }));
  return { ...p.data, table };
}

/** Geçerli puan kuralları (istek başına bir kez okunur). */
export const getRules = cache(async (): Promise<Rules> => {
  const row = await db.ruleSettings.findUnique({ where: { id: 1 } });
  return row ? parseRules(row.data) : DEFAULT_RULES;
});

export async function rulesInfo() {
  return db.ruleSettings.findUnique({ where: { id: 1 }, select: { updatedAt: true, updatedBy: true } });
}

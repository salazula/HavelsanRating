"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toStored } from "@/lib/rules";
import type { Rules, TableRow } from "@/lib/rating";
import type { ActionState } from "@/lib/action-state";

const MANAGERS = ["SUPER_ADMIN", "LEAGUE_MANAGER"] as const;

/** Tek sayı alanları: [ad, etiket, alt sınır, üst sınır] */
const FIELDS: [Exclude<keyof Rules, "table">, string, number, number][] = [
  ["declaredAbsentPenalty", "Katılamayacağını bildiren", -200, 200],
  ["undeclaredPenalty", "Katılım bildirmeyen", -200, 200],
  ["noMatchPenalty", "Hiç maç yapamayan", -200, 200],
  ["expectedMatches", "Beklenen maç sayısı", 1, 20],
  ["perMissingMatch", "Eksik maç başına", -100, 100],
  ["unbeatenBonus", "Haftanın yıldızı", -100, 100],
  ["walkoverSetPenalty", "Hükmen ek cezası", 0, 100],
  ["setBonus30", "3-0 set averajı", 0, 50],
  ["setBonus31", "3-1 set averajı", 0, 50],
  ["setBonus32", "3-2 set averajı", 0, 50],
];

function intOf(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveRules(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser([...MANAGERS]);
  const rules = {} as Rules;
  for (const [key, label, min, max] of FIELDS) {
    const n = intOf(fd.get(key));
    if (n == null || n < min || n > max) return { error: `${label}: ${min} ile ${max} arasında bir tam sayı girin.` };
    rules[key] = n;
  }

  const rows: TableRow[] = [];
  const count = Number(fd.get("rows") ?? 0);
  for (let i = 0; i < count; i++) {
    const [maxS, highS, lowS] = ["max", "high", "low"].map((k) => String(fd.get(`${k}_${i}`) ?? "").trim());
    if (!maxS && !highS && !lowS) continue; // boş satır
    const high = intOf(highS);
    const low = intOf(lowS);
    if (high == null || low == null || high < 0 || low < 0 || high > 200 || low > 200) return { error: `Tablo ${i + 1}. satır: puanlar 0 ile 200 arasında olmalı.` };
    rows.push({ max: intOf(maxS) ?? NaN, high, low });
  }
  if (!rows.length) return { error: "Puan farkı tablosunda en az bir satır olmalı." };
  // Son satırın üst sınırı yoktur ("ve üzeri")
  rows[rows.length - 1]!.max = Infinity;
  let prev = -1;
  for (const [i, r] of rows.slice(0, -1).entries()) {
    if (!Number.isFinite(r.max) || r.max <= prev) return { error: `Tablo ${i + 1}. satır: üst sınır bir önceki satırdan büyük bir tam sayı olmalı.` };
    prev = r.max;
  }
  rules.table = rows;

  const data = toStored(rules);
  await db.ruleSettings.upsert({ where: { id: 1 }, create: { id: 1, data, updatedBy: user.name }, update: { data, updatedBy: user.name } });
  refresh();
  return { ok: "Puan kuralları kaydedildi. Kapanmamış haftalar yeni kurallarla hesaplanır." };
}

export async function resetRules(_p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  await db.ruleSettings.deleteMany({});
  refresh();
  return { ok: "Excel’deki varsayılan kurallara dönüldü." };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SLOTS, dateFromYmd, planGroups, playUntil, playWindowText, weekName } from "../src/lib/schedule";

test("hafta Cuma gecesi (Cumartesi 00:00, İstanbul) biter", () => {
  const monday = dateFromYmd("2026-10-05");
  assert.equal(playUntil(monday).toISOString(), "2026-10-09T21:00:00.000Z");
  assert.ok(playUntil(monday) > new Date("2026-10-09T23:59:00+03:00"));
});

test("hafta adı ve oyun aralığı Pazartesi-Cuma", () => {
  const monday = dateFromYmd("2026-10-05");
  assert.equal(weekName(monday), "5-9 Ekim");
  assert.equal(weekName(dateFromYmd("2026-09-28")), "28 Eylül - 2 Ekim");
  assert.equal(playWindowText(monday), "5 Ekim Pazartesi - 9 Ekim Cuma 23:59");
});

test("oyuncu sayısı grup düzenini aşarsa yeni gruplar açılır", () => {
  const code = (i: number) => String.fromCharCode(65 + i);
  const slots = ["A", "B", "C", "D"].map((c) => ({ code: c, size: 6, place: null }));
  const plan = planGroups(slots, 31, code);
  assert.deepEqual(plan.map((p) => `${p.code}${p.take}`), ["A6", "B6", "C6", "D6", "E6", "F1"]);
  assert.deepEqual(planGroups(slots, 10, code).map((p) => p.take), [6, 4, 0, 0]);
});

test("varsayılan 3'lü düzen 10 oyuncuyu 3-3-3-1 dağıtır", () => {
  const code = (i: number) => String.fromCharCode(65 + i);
  const plan = planGroups(DEFAULT_SLOTS, 10, code);
  assert.deepEqual(plan.map((p) => `${p.code}${p.take}`), ["A3", "B3", "C3", "D1"]);
  assert.equal(planGroups(DEFAULT_SLOTS, 14, code).at(-1)!.code, "E");
});

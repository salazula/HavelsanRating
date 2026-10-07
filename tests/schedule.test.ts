import { test } from "node:test";
import assert from "node:assert/strict";
import { dateFromYmd, playUntil, playWindowText, weekName } from "../src/lib/schedule";

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

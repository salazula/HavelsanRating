// Excel'deki (planet mayıs1.xlsm) G, H, I gruplarının sonuçlarıyla rating motorunu doğrular.
import { test } from "node:test";
import assert from "node:assert/strict";
import fixture from "./excel-fixture.json" with { type: "json" };
import { DEFAULT_RULES, computeGroup, fillGroups, groupBonus, scoreMatch, tableLabel } from "../src/lib/rating";

for (const g of fixture) {
  test(`${g.group} grubu Excel ile aynı`, () => {
    const entries = g.players.map((p) => ({ playerId: p.name, ratingBefore: p.ratingBefore, setAvgBefore: 0, manualBonus: 0 }));
    const res = computeGroup(entries, g.matches.map((m) => ({ playerAId: m.a, playerBId: m.b, kind: "NORMAL" as const, setsA: m.setsA, setsB: m.setsB })));
    for (const p of g.players) assert.equal(res.get(p.name)!.total, p.expectedTotal, p.name);
  });
}

test("puan farkı tablosu", () => {
  // 1798 vs 1656 (fark 142): beklenen 3-0 → 2+3, sürpriz 3-0 → 30+3
  assert.deepEqual([scoreMatch({ ratingA: 1798, ratingB: 1656, kind: "NORMAL", setsA: 3, setsB: 0 }).pointsA], [5]);
  assert.equal(scoreMatch({ ratingA: 1798, ratingB: 1656, kind: "NORMAL", setsA: 0, setsB: 3 }).pointsB, 33);
  assert.equal(scoreMatch({ ratingA: 1656, ratingB: 1798, kind: "NORMAL", setsA: 3, setsB: 2 }).pointsA, 31);
});

test("hükmen: ikisi de gelmedi", () => {
  // fark 35 → yüksek 7, düşük 10
  const o = scoreMatch({ ratingA: 1763, ratingB: 1798, kind: "BOTH_ABSENT" });
  assert.equal(o.pointsB, -13); // yüksek puanlı: -(10+3)
  assert.equal(o.pointsA, -7); // düşük puanlı: -7
  assert.equal(o.counted, false);
});

test("grup bonusu", () => {
  assert.equal(groupBonus(0, 0), -24);
  assert.equal(groupBonus(5, 5), 10);
  assert.equal(groupBonus(4, 2), 8);
  assert.equal(groupBonus(3, 3), 26);
  assert.equal(groupBonus(6, 3), 0);
});

test("hükmen ve katılmama cezası", () => {
  const res = computeGroup(
    [
      { playerId: "a", ratingBefore: 1600, setAvgBefore: 0, manualBonus: 0, absent: "AUTO_NO" },
      { playerId: "b", ratingBefore: 1590, setAvgBefore: 0, manualBonus: 0, absent: "NO" },
    ],
    [],
  );
  assert.equal(res.get("a")!.total, -24);
  assert.equal(res.get("b")!.total, -24);
});

test("eksik gruplar alt gruptan tamamlanır", () => {
  // A: 4 katılan (6 kişilik), B: 6 katılan, C: 3 katılan
  const e = (id: string, g: number, rating: number, attending = true) => ({ id, groupIndex: g, rating, attending });
  const entries = [
    e("a1", 0, 1800), e("a2", 0, 1790), e("a3", 0, 1780), e("a4", 0, 1770), e("a5", 0, 1760, false), e("a6", 0, 1750, false),
    e("b1", 1, 1700), e("b2", 1, 1690), e("b3", 1, 1680), e("b4", 1, 1670), e("b5", 1, 1660), e("b6", 1, 1650),
    e("c1", 2, 1600), e("c2", 2, 1590), e("c3", 2, 1580),
  ];
  const moved = fillGroups(entries, [6, 6, 6]);
  // A, B'nin en iyi iki oyuncusunu alır; B, C'nin en iyi ikisini; C'de tek kalan B'ye eklenir
  assert.deepEqual([...moved.entries()].sort(), [["b1", 0], ["b2", 0], ["c1", 1], ["c2", 1], ["c3", 1]]);
});

test("panelden değiştirilen kurallar", () => {
  const rules = {
    ...DEFAULT_RULES,
    declaredAbsentPenalty: -12,
    unbeatenBonus: 15,
    setBonus30: 4,
    table: [
      { max: 50, high: 10, low: 10 },
      { max: Infinity, high: 5, low: 20 },
    ],
  };
  assert.equal(tableLabel(rules.table, 0), "0 - 50");
  assert.equal(tableLabel(rules.table, 1), "51 ve üzeri");
  // fark 60: yeni tabloda ikinci satır; beklenen sonuç 5 + 3-0 set averajı 4
  const o = scoreMatch({ ratingA: 1600, ratingB: 1540, kind: "NORMAL", setsA: 3, setsB: 0 }, rules);
  assert.equal(o.pointsA, 9);
  assert.equal(o.setAvgA, 4);
  // varsayılanlarda aynı maç: 63-87 değil 38-62 satırı (6) + 3
  assert.equal(scoreMatch({ ratingA: 1600, ratingB: 1540, kind: "NORMAL", setsA: 3, setsB: 0 }).pointsA, 9);
  const res = computeGroup(
    [
      { playerId: "a", ratingBefore: 1600, setAvgBefore: 0, manualBonus: 0 },
      { playerId: "b", ratingBefore: 1540, setAvgBefore: 0, manualBonus: 0 },
      { playerId: "c", ratingBefore: 1500, setAvgBefore: 0, manualBonus: 0, absent: "NO" },
    ],
    [{ playerAId: "a", playerBId: "b", kind: "NORMAL", setsA: 3, setsB: 0 }],
    rules,
  );
  // a: 9 + eksik 4 maç × 8 + yıldız 15
  assert.equal(res.get("a")!.total, 9 + 32 + 15);
  assert.equal(res.get("c")!.total, -12);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveLive, type Side } from "../src/lib/live";

const rep = (s: Side, n: number) => Array<Side>(n).fill(s);

test("set 11'de ve 2 farkla biter", () => {
  let l = deriveLive([...rep("A", 10), ...rep("B", 10)]);
  assert.deepEqual(l.current, [10, 10]);
  assert.equal(l.sets.length, 0);
  l = deriveLive([...rep("A", 10), ...rep("B", 10), "A", "A"]);
  assert.deepEqual(l.sets, [[12, 10]]);
  assert.deepEqual(l.current, [0, 0]);
});

test("3 seti alan kazanır, sonraki sayılar sayılmaz", () => {
  const set = (w: Side) => rep(w, 11);
  const l = deriveLive([...set("A"), ...set("B"), ...set("A"), ...set("A"), "B", "B"]);
  assert.equal(l.finished, true);
  assert.equal(l.winner, "A");
  assert.equal(l.setsA, 3);
  assert.equal(l.setsB, 1);
  assert.deepEqual(l.current, [0, 0]);
});

test("servis sırası", () => {
  assert.equal(deriveLive([], "A").server, "A");
  assert.equal(deriveLive(["A"], "A").server, "A");
  assert.equal(deriveLive(["A", "B"], "A").server, "B");
  assert.equal(deriveLive(["A", "B", "A", "B"], "A").server, "A");
  // 10-10'dan sonra her sayıda değişir
  const deuce = [...rep("A", 10), ...rep("B", 10)];
  assert.equal(deriveLive(deuce, "A").server, "A");
  assert.equal(deriveLive([...deuce, "A"], "A").server, "B");
  // ikinci sette ilk servisi diğer oyuncu atar
  assert.equal(deriveLive(rep("A", 11), "A").server, "B");
});

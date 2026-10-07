import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { GroupWithData } from "./queries";
import type { EntryResult } from "./rating";
import { signed } from "./labels";

/*
 * Telegram mesajına eklenen grup görseli: sitedeki çapraz tablonun (GroupTable) PNG hali.
 * Satori yalnızca flexbox destekler; tablo satır/sütunları sabit genişlikli kutularla çizilir.
 */

const C = {
  ink: "#16132e", soft: "#4a4668", line: "#e6e3f3", paper: "#f6f5fc", t50: "#f1effd", t200: "#c3bbf2", t900: "#110c33",
  ball: "#ffbb4a", gold50: "#fff7e6", win: "#047857", winBg: "#ecfdf5", lose: "#be123c", loseBg: "#fff1f2", pos: "#059669",
};

const dir = join(process.cwd(), "assets/fonts");
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" }[]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ([500, 700, 800] as const).map(async (weight) => ({ name: "Manrope", data: await readFile(join(dir, `Manrope-${weight}.ttf`)), weight, style: "normal" as const })),
  ));

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

const HEAD_H = 192, NAME_W = 340, RATING_W = 96, CELL_W = 74, MG_W = 78, PTS_W = 92, AFTER_W = 104, PAD = 36, ROW_H = 62;

function Star({ size, color = "#ffa41f" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill={color} d="M12 1.8l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.6l-6.2 3.3L7 14l-5-4.9 6.9-1z" />
    </svg>
  );
}

type Props = { group: GroupWithData; roundName: string; results: Map<string, EntryResult>; site: string | null };

export async function renderGroupImage({ group, roundName, results, site }: Props) {
  const playing = group.entries.filter((e) => e.attendance === "YES");
  const absent = group.entries.filter((e) => e.attendance === "NO" || e.attendance === "AUTO_NO");
  const ids = playing.map((e) => e.playerId);
  const isStar = (id: string) => {
    const r = results.get(id);
    return !!r && r.played > 0 && r.played === r.won;
  };
  const stars = playing.filter((e) => isStar(e.playerId));
  const STAR_H = stars.length ? 40 + 150 + (stars.length - 1) * 78 : 0;
  const tableW = NAME_W + RATING_W + ids.length * CELL_W + MG_W + PTS_W + AFTER_W;
  const width = Math.max(1080, tableW + PAD * 2);
  const height = HEAD_H + STAR_H + 52 + playing.length * ROW_H + (absent.length ? 34 + absent.length * 36 : 0) + 76;

  const cell = (rowId: string, colId: string) => {
    if (rowId === colId) return { text: "", color: C.soft, bg: C.line };
    const m = group.matches.find((x) => (x.playerAId === rowId && x.playerBId === colId) || (x.playerAId === colId && x.playerBId === rowId));
    if (!m || m.status !== "APPROVED" || !m.kind) return { text: "", color: C.soft, bg: "transparent" };
    if (m.kind === "BOTH_ABSENT") return { text: "KK", color: C.soft, bg: "transparent" };
    const mine = m.playerAId === rowId ? m.setsA! : m.setsB!;
    const theirs = m.playerAId === rowId ? m.setsB! : m.setsA!;
    return mine > theirs ? { text: `${mine}-${theirs}`, color: C.win, bg: C.winBg } : { text: `${mine}-${theirs}`, color: C.lose, bg: C.loseBg };
  };
  const deltaColor = (n: number) => (n > 0 ? C.pos : n < 0 ? C.lose : C.soft);
  const th = { fontSize: 17, fontWeight: 700, color: C.soft, letterSpacing: 1 };
  const box = (w: number, align: "flex-start" | "center" | "flex-end" = "center") =>
    ({ width: w, display: "flex", justifyContent: align, alignItems: "center", height: "100%" }) as const;

  const res = new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: "column", background: C.paper, fontFamily: "Manrope", color: C.ink }}>
        <div style={{ display: "flex", flexDirection: "column", background: C.t900, padding: `30px ${PAD}px 0`, height: HEAD_H }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 4, color: C.ball }}>MASA TENİSİ RATING · {roundName.toLocaleUpperCase("tr")}</div>
          <div style={{ display: "flex", fontSize: 50, fontWeight: 800, color: "white", marginTop: 8 }}>{group.code} Grubu sonuçları</div>
          {group.schedule && (
            <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: C.t200, marginTop: 6 }}>
              {group.playAt ? `${dayFmt.format(group.playAt)} · ` : ""}{group.schedule}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", margin: `0 ${PAD}px`, marginTop: -14, background: "white", borderRadius: 22, border: `2px solid ${C.line}`, overflow: "hidden" }}>
          <div style={{ display: "flex", height: 52, background: C.t50, borderBottom: `2px solid ${C.line}`, padding: "0 4px" }}>
            <div style={{ ...box(NAME_W, "flex-start"), ...th, paddingLeft: 18 }}>OYUNCU</div>
            <div style={{ ...box(RATING_W, "flex-end"), ...th, paddingRight: 12 }}>MAÇ Ö.</div>
            {ids.map((_, i) => <div key={i} style={{ ...box(CELL_W), ...th }}>{i + 1}</div>)}
            <div style={{ ...box(MG_W), ...th }}>M/G</div>
            <div style={{ ...box(PTS_W, "flex-end"), ...th, paddingRight: 8 }}>PUAN</div>
            <div style={{ ...box(AFTER_W, "flex-end"), ...th, paddingRight: 18 }}>MAÇ S.</div>
          </div>
          {playing.map((e, i) => {
            const r = results.get(e.playerId);
            return (
              <div key={e.id} style={{ display: "flex", height: ROW_H, borderTop: i ? `2px solid ${C.line}` : "none", padding: "0 4px", background: isStar(e.playerId) ? C.gold50 : "white" }}>
                <div style={{ ...box(NAME_W, "flex-start"), paddingLeft: 18 }}>
                  <div style={{ display: "flex", width: 28, fontSize: 18, fontWeight: 800, color: C.soft }}>{i + 1}</div>
                  <div style={{ display: "flex", fontSize: 23, fontWeight: 700 }}>{e.player.name}</div>
                  {isStar(e.playerId) && <div style={{ display: "flex", marginLeft: 8 }}><Star size={24} /></div>}
                  {e.movedFrom && <div style={{ display: "flex", marginLeft: 8, fontSize: 15, fontWeight: 700, color: C.soft, background: C.t50, borderRadius: 99, padding: "2px 8px" }}>{e.movedFrom}↑</div>}
                </div>
                <div style={{ ...box(RATING_W, "flex-end"), paddingRight: 12, fontSize: 21, fontWeight: 500 }}>{e.ratingBefore}</div>
                {ids.map((col) => {
                  const c = cell(e.playerId, col);
                  return (
                    <div key={col} style={{ ...box(CELL_W), padding: "8px 4px" }}>
                      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", borderRadius: 10, background: c.bg, color: c.color, fontSize: 21, fontWeight: 800 }}>{c.text}</div>
                    </div>
                  );
                })}
                <div style={{ ...box(MG_W), fontSize: 19, fontWeight: 500, color: C.soft }}>{r ? `${r.played}/${r.won}` : "–"}</div>
                <div style={{ ...box(PTS_W, "flex-end"), paddingRight: 8, fontSize: 21, fontWeight: 800, color: r ? deltaColor(r.total) : C.soft }}>{r ? signed(r.total) : "–"}</div>
                <div style={{ ...box(AFTER_W, "flex-end"), paddingRight: 18, fontSize: 23, fontWeight: 800 }}>{r?.ratingAfter ?? e.ratingBefore}</div>
              </div>
            );
          })}
          {absent.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", borderTop: `2px solid ${C.line}`, padding: "12px 22px", fontSize: 19, color: C.soft }}>
              {absent.map((e) => {
                const total = results.get(e.playerId)?.total ?? 0;
                return (
                  <div key={e.id} style={{ display: "flex", height: 36, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: C.ink, marginRight: 8 }}>{e.player.name}</span>
                    <span style={{ marginRight: 8 }}>{e.attendance === "AUTO_NO" ? "bildirim yapmadı (hükmen)" : "katılmadı"}</span>
                    <span style={{ fontWeight: 800, color: deltaColor(total) }}>{signed(total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {stars.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", margin: `40px ${PAD}px 0`, padding: "22px 30px", borderRadius: 22, background: "linear-gradient(120deg, #ffa41f 0%, #ffd38c 55%, #ffbb4a 100%)", color: C.t900 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 800, letterSpacing: 5 }}>
              <Star size={30} color={C.t900} />
              <div style={{ display: "flex", margin: "0 12px" }}>HAFTANIN YILDIZI{stars.length > 1 ? "LARI" : ""}</div>
              <Star size={30} color={C.t900} />
            </div>
            {stars.map((e) => {
              const r = results.get(e.playerId)!;
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", height: 70, marginTop: 8 }}>
                  <div style={{ display: "flex", fontSize: 52, fontWeight: 800 }}>{e.player.name}</div>
                  <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>{r.played} maçta {r.won} galibiyet · {signed(r.total)} puan</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${PAD + 4}px`, flex: 1, fontSize: 17, fontWeight: 500, color: C.soft }}>
          <div style={{ display: "flex" }}>Skorlar satırdaki oyuncunun gözünden · Puan bonuslar dahil</div>
          {site && <div style={{ display: "flex", fontWeight: 700 }}>{site.replace(/^https?:\/\//, "")}</div>}
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts() },
  );
  return Buffer.from(await res.arrayBuffer());
}

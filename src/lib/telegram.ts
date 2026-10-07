import "server-only";
import { db } from "./db";
import { groupInclude, groupComplete, groupResults, standings, type GroupWithData } from "./queries";
import { getRules } from "./rules";
import type { Rules } from "./rating";
import { signed } from "./labels";
import { parseSetScores, setScoresText } from "./live";
import { renderGroupImage } from "./group-image";

/*
 * Telegram kanalına grup sonuçlarının gönderimi.
 * Ortam değişkenleri:
 *   TELEGRAM_BOT_TOKEN  – @BotFather'dan alınan bot anahtarı
 *   TELEGRAM_CHAT_ID    – kanal kullanıcı adı (@kanaladi) veya sayısal id (-100...)
 *   SITE_URL            – mesajdaki bağlantı için (boşsa Vercel üretim adresi kullanılır)
 * Bot, kanala yönetici (mesaj gönderebilir) olarak eklenmelidir.
 */

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

export function telegramConfigured() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type SendResult = { ok: true } | { ok: false; error: string };

async function callTelegram(method: string, payload: Record<string, unknown>, file?: { field: string; png: Buffer }): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: "Telegram ayarları yapılmamış (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)." };
  const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";
  try {
    let init: RequestInit;
    if (file) {
      // Dosya yüklemesi multipart ile yapılır
      const form = new FormData();
      for (const [k, v] of Object.entries({ chat_id: chatId, parse_mode: "HTML", ...payload })) form.append(k, typeof v === "string" ? v : JSON.stringify(v));
      form.append(file.field, new Blob([new Uint8Array(file.png)], { type: "image/png" }), "grup.png");
      init = { method: "POST", body: form };
    } else {
      init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, parse_mode: "HTML", ...payload }) };
    }
    const res = await fetch(`${base}/bot${token}/${method}`, init);
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !body.ok) return { ok: false, error: body.description ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bağlantı hatası" };
  }
}

export function sendTelegram(html: string) {
  return callTelegram("sendMessage", { text: html, link_preview_options: { is_disabled: true } });
}

/** Fotoğraflı mesaj (fotoğraf herkese açık bir https adresinde olmalı; açıklama en fazla 1024 karakter). */
export async function sendTelegramPhoto(photoUrl: string, caption: string) {
  const r = await callTelegram("sendPhoto", { photo: photoUrl, caption });
  return r.ok ? r : sendTelegram(caption); // fotoğraf gönderilemezse en azından metin gitsin
}

/** Başvurusu onaylanan oyuncu için kanala "aramıza katıldı" mesajı */
export async function postNewPlayer(playerId: string) {
  const p = await db.player.findUniqueOrThrow({ where: { id: playerId } });
  const rank = (await db.player.count({ where: { active: true, isDemo: false, rating: { gt: p.rating } } })) + 1;
  const total = await db.player.count({ where: { active: true, isDemo: false } });
  const site = siteUrl();
  const lines = [
    "🪐 <b>Aramıza yeni bir oyuncu katıldı!</b>",
    "",
    `👤 <b>${esc(p.name)}</b>`,
    `📈 Başlangıç puanı: <b>${p.rating}</b>`,
    `🏆 Sıralamadaki yeri: <b>${rank}.</b> / ${total}`,
    "",
    "Hoş geldin, bol galibiyetler! 🏓",
  ];
  if (site) lines.push("", `<a href="${site}/oyuncular/${p.id}">Profili görüntüle</a>`);
  const text = lines.join("\n");
  const photo = p.photoUrl?.startsWith("https://") ? p.photoUrl : p.photoUrl && site ? `${site}${p.photoUrl}` : null;
  return photo ? sendTelegramPhoto(photo, text) : sendTelegram(text);
}

const absentLabel: Record<string, string> = { NO: "katılmadı", AUTO_NO: "bildirim yapmadı (hükmen)" };

/** Telegram'ın görsel açıklaması için sınır (etiketler hariç karakter sayısı) */
const CAPTION_LIMIT = 1024;
const visibleLength = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt);/g, "x").length;

/**
 * Grup sonucunu sitedeki tablo görseliyle birlikte gönderir: görsel + altında sıralama (tek mesaj). Metin görsel
 * açıklamasına sığmazsa önce görsel sonra metin gider. Görsel oluşturulamaz ya da gönderilemezse yalnızca metin gider.
 */
async function sendGroupReport(g: ReportGroup, rules: Rules, sample = false) {
  const text = formatGroupReport(g, rules, sample, false);
  let png: Buffer | null = null;
  try {
    png = await renderGroupImage({ group: g, roundName: g.round.name, results: groupResults(g, rules), site: siteUrl() });
  } catch (e) {
    console.error("Grup görseli oluşturulamadı", e);
  }
  const full = () => formatGroupReport(g, rules, sample);
  if (!png) return sendTelegram(full());
  if (visibleLength(text) <= CAPTION_LIMIT) {
    const r = await callTelegram("sendPhoto", { caption: text }, { field: "photo", png });
    return r.ok ? r : sendTelegram(full());
  }
  const title = `🏓 <b>Masa Tenisi Rating · ${esc(g.round.name)} · ${esc(g.code)} Grubu</b>`;
  await callTelegram("sendPhoto", { caption: title }, { field: "photo", png });
  return sendTelegram(text);
}

export async function postGroupReport(groupId: string) {
  const g = await db.group.findUniqueOrThrow({ where: { id: groupId }, include: { ...groupInclude, round: true } });
  return sendGroupReport(g, await getRules());
}

type ReportGroup = GroupWithData & { round: { name: string; status: string } };

/** Yenilmeden grubu bitiren oyuncular (yıldız bonusu alanlar) */
function groupStarsOf(g: ReportGroup, res: ReturnType<typeof groupResults>) {
  return g.entries.filter((e) => {
    const r = res.get(e.playerId)!;
    return e.attendance === "YES" && r.played > 0 && r.played === r.won;
  });
}

/**
 * Grup sonucu metni. Görselle gönderilirken maç sonuçları görselde olduğundan yazılmaz (withMatches=false);
 * görsel gönderilemezse maç sonuçlarıyla birlikte tam metin gider.
 */
function formatGroupReport(g: ReportGroup, rules: Rules, sample = false, withMatches = true) {
  const res = groupResults(g, rules);
  const lines: string[] = [];
  if (sample) lines.push("🧪 <i>Örnek mesaj: gerçek bir sonuç değildir, grup tamamlanınca gelecek mesajın görünümüdür.</i>", "");
  lines.push(`🏓 <b>Masa Tenisi Rating · ${esc(g.round.name)} · ${esc(g.code)} Grubu</b>`);
  if (g.schedule) lines.push(`📅 ${esc(g.schedule)}`);
  const stars = groupStarsOf(g, res);
  // Haftanın yıldızı görselde büyük şeritle gösterilir; yazıda yalnızca görsel gönderilemezse yer alır
  if (stars.length && withMatches) {
    lines.push("", "🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟", `🏆 <b>HAFTANIN YILDIZI${stars.length > 1 ? "LARI" : ""}</b> 🏆`);
    for (const e of stars) {
      const r = res.get(e.playerId)!;
      lines.push(`⭐ <b>${esc(e.player.name.toLocaleUpperCase("tr"))}</b> ⭐`, `<i>${r.played} maçta ${r.won} galibiyet · ${signed(r.total)} puan</i>`);
    }
    lines.push("🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟");
  }
  if (withMatches) {
    lines.push("", "<b>Maç sonuçları</b>");
    for (const m of g.matches.filter((x) => x.status === "APPROVED")) {
      if (m.kind === "BOTH_ABSENT") {
        lines.push(`${esc(m.playerA.name)} – ${esc(m.playerB.name)}  <b>Hükmen</b>`);
      } else {
        const aWon = (m.setsA ?? 0) > (m.setsB ?? 0);
        const sets = setScoresText(parseSetScores(m.setScores));
        lines.push(`${aWon ? "✅ " : ""}${esc(m.playerA.name)}  <b>${m.setsA}-${m.setsB}</b>  ${!aWon ? "✅ " : ""}${esc(m.playerB.name)}${sets ? `  <i>(${sets})</i>` : ""}`);
      }
    }
  }
  const playing = g.entries.filter((e) => e.attendance === "YES");
  lines.push("");
  lines.push("<b>Grup sıralaması</b>");
  standings(playing, res).forEach((e, i) => {
    const r = res.get(e.playerId)!;
    const star = r.played > 0 && r.played === r.won ? " ⭐" : "";
    lines.push(`${i + 1}. ${esc(e.player.name)}${star} — ${r.won}G ${r.played - r.won}M · ${signed(r.total)} → <b>${r.ratingAfter}</b>`);
  });
  const absent = g.entries.filter((e) => e.attendance === "NO" || e.attendance === "AUTO_NO");
  if (absent.length) {
    lines.push("");
    for (const e of absent) lines.push(`➖ ${esc(e.player.name)} ${absentLabel[e.attendance]}: ${signed(res.get(e.playerId)!.total)}`);
  }
  const site = siteUrl();
  if (site) {
    lines.push("");
    lines.push(`<a href="${esc(site)}/gruplar${sample ? "" : `?tur=${g.roundId}`}">Tüm grupları görüntüle</a>`);
  }
  return lines.join("\n");
}

/** Uydurma bir grupla, grup tamamlanınca gidecek mesajın örneğini kanala gönderir (veritabanına dokunmaz). */
export async function postSampleGroupReport() {
  return sendGroupReport(sampleGroup(), await getRules(), true);
}

function sampleGroup() {
  const names = ["Örnek Oyuncu 1", "Örnek Oyuncu 2", "Örnek Oyuncu 3", "Örnek Oyuncu 4", "Örnek Oyuncu 5", "Örnek Oyuncu 6"];
  const ratings = [1798, 1763, 1743, 1735, 1686, 1656];
  const now = new Date();
  const players = names.map((name, i) => ({
    id: `p${i}`, name, rating: ratings[i]!, setAverage: 0, matches: 0, wins: 0, phone: null, photoUrl: null,
    active: true, isDemo: false, isPilot: false, createdAt: now,
  }));
  const entries = players.map((p, i) => ({
    id: `e${i}`, groupId: "g", playerId: p.id, player: p, seed: i, attendance: i === 5 ? "NO" : "YES", attendanceAt: now,
    movedFrom: null, ratingBefore: p.rating, setAvgBefore: 0, manualBonus: 0, note: null,
    matchPoints: null, bonus: null, ratingAfter: null, setAvgAfter: null, played: null, won: null,
  }));
  // [A, B, setsA, setsB, set skorları]
  const results: [number, number, number, number, number[][] | null][] = [
    [0, 1, 3, 1, [[11, 7], [9, 11], [11, 8], [11, 6]]],
    [0, 2, 3, 0, null],
    [0, 3, 3, 2, [[11, 9], [8, 11], [11, 13], [11, 5], [11, 9]]],
    [0, 4, 3, 0, null],
    [1, 2, 3, 2, null],
    [1, 3, 1, 3, null],
    [1, 4, 3, 1, null],
    [2, 3, 3, 0, null],
    [2, 4, 0, 3, null],
    [3, 4, 3, 1, [[11, 4], [11, 9], [6, 11], [12, 10]]],
  ];
  const matches = results.map(([a, b, sa, sb, sets], i) => ({
    id: `m${i}`, groupId: "g", playerAId: players[a]!.id, playerA: players[a]!, playerBId: players[b]!.id, playerB: players[b]!,
    status: "APPROVED", kind: "NORMAL", setsA: sa, setsB: sb, submittedById: null, submittedAt: now, confirmedById: null, confirmedAt: now,
    disputeNote: null, updatedAt: now, setScores: sets, livePoints: null, liveFirstServer: null, liveStartedAt: null, liveUpdatedAt: null,
    liveById: null, liveVersion: 0,
  }));
  const g = {
    id: "g", roundId: "r", code: "A", schedule: "Pazar 16:00-21:00 · 1 Numaralı Masa", playAt: now, size: 6, order: 0,
    telegramSentAt: null, telegramError: null, entries, matches, round: { name: "Örnek hafta", status: "OPEN" },
  } as unknown as ReportGroup;
  return g;
}

/** Grubun tüm maçları kesinleştiyse ve daha önce gönderilmediyse kanala gönderir. Hata sonucu engellemez. */
export async function postGroupIfComplete(groupId: string, force = false) {
  const g = await db.group.findUnique({ where: { id: groupId }, include: { matches: { select: { status: true } }, round: { select: { isDemo: true } } } });
  if (!g || !groupComplete(g)) return;
  if (g.telegramSentAt && !force) return;
  if (g.round.isDemo) {
    const error = "Deneme verisi Telegram kanalına gönderilmez.";
    await db.group.update({ where: { id: groupId }, data: { telegramError: error } });
    return { ok: false as const, error };
  }
  if (!telegramConfigured()) {
    await db.group.update({ where: { id: groupId }, data: { telegramError: "Telegram ayarları yapılmamış." } });
    return;
  }
  // Aynı anda iki onayda çift gönderimi önle
  if (!force) {
    const claimed = await db.group.updateMany({ where: { id: groupId, telegramSentAt: null }, data: { telegramSentAt: new Date() } });
    if (!claimed.count) return;
  }
  const res = await postGroupReport(groupId);
  await db.group.update({
    where: { id: groupId },
    data: res.ok ? { telegramSentAt: new Date(), telegramError: null } : { telegramSentAt: null, telegramError: res.error },
  });
  return res;
}

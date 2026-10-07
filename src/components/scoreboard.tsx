"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { deriveLive, setScoresText, type Side } from "@/lib/live";
import type { LiveResult, LiveView } from "@/app/skor/[id]/actions";

type Player = { name: string; rating: number };

type Props = {
  matchId: string;
  groupCode: string;
  a: Player;
  b: Player;
  initial: LiveView;
  actions: {
    start: (id: string, first: Side) => Promise<LiveResult>;
    point: (id: string, side: Side | null, version: number) => Promise<LiveResult>;
    cancel: (id: string) => Promise<LiveResult>;
    get: (id: string) => Promise<LiveResult>;
  };
};

function Ball({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-3.5 w-3.5 rounded-full bg-ball-400 shadow-[0_0_12px_rgba(255,187,74,.9)] ${className}`} aria-label="Servis" />;
}

/* Tam ekran: Android/masaüstü tarayıcılarında Fullscreen API; iPhone Safari desteklemez, orada "Ana Ekrana Ekle" önerilir. */
function subscribeFs(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}
const noSubscribe = () => () => {};
function useFullscreen() {
  const active = useSyncExternalStore(subscribeFs, () => !!document.fullscreenElement, () => false);
  const supported = useSyncExternalStore(noSubscribe, () => !!document.fullscreenEnabled, () => false);
  const standalone = useSyncExternalStore(
    noSubscribe,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  const enter = useCallback(() => {
    if (document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else enter();
  }, [enter]);
  return { active, supported, standalone, enter, toggle };
}

/** Maç sürerken ekranın kararıp kilitlenmesini engeller (destekleyen tarayıcılarda). */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((l) => {
        if (stopped) l.release().catch(() => {});
        else lock = l;
      }).catch(() => {});
    };
    acquire();
    // Sekme arka plana gidince kilit düşer; geri gelince yeniden al
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

/** Masada kullanılan puan puan skorbord. Dokunuşlar hemen ekranda görünür, sunucuya sırayla gönderilir. */
export function Scoreboard({ matchId, groupCode, a, b, initial, actions }: Props) {
  const [server, setServer] = useState<LiveView>(initial);
  const [queue, setQueue] = useState<(Side | null)[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [swapped, setSwapped] = useState(false);
  const fs = useFullscreen();
  const busy = useRef(false);
  const taps = useRef(0);
  const serverRef = useRef(server);
  useEffect(() => {
    serverRef.current = server;
  }, [server]);

  // Ekrandaki durum = sunucudaki sayılar + henüz gönderilmemiş dokunuşlar
  const points = useMemo(() => {
    const p = [...server.points];
    for (const op of queue) {
      if (op) p.push(op);
      else p.pop();
    }
    return p;
  }, [server.points, queue]);
  const live = deriveLive(points, server.firstServer);

  // Kuyruğu sırayla gönder
  useEffect(() => {
    if (busy.current || !queue.length) return;
    busy.current = true;
    const op = queue[0]!;
    actions
      .point(matchId, op, serverRef.current.version)
      .then((r) => {
        setServer(r.view);
        if (r.error === "conflict") {
          setQueue([]);
          setNotice("Skor başka bir cihazdan güncellendi; ekran yenilendi.");
        } else if (r.error) {
          setQueue([]);
          setNotice(r.error);
        } else {
          setQueue((q) => q.slice(1));
        }
      })
      .catch(() => {
        setQueue([]);
        setNotice("Bağlantı sorunu: son dokunuş kaydedilemedi, tekrar deneyin.");
      })
      .finally(() => {
        busy.current = false;
      });
  }, [queue, actions, matchId]);

  // Başka cihazdan yapılan değişiklikleri al
  useEffect(() => {
    const t = setInterval(() => {
      if (busy.current || document.hidden) return;
      const seq = taps.current;
      actions.get(matchId).then((r) => {
        // Bu arada dokunulduysa ya da yanıt eskiyse yok say (sürüm sadece artar)
        if (busy.current || seq !== taps.current || r.view.version <= serverRef.current.version) return;
        setServer(r.view);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [actions, matchId]);

  const tap = useCallback(
    (side: Side | null) => {
      if (side && live.finished) return;
      if (!side && !points.length) return;
      setNotice(null);
      taps.current++;
      navigator.vibrate?.(12);
      setQueue((q) => [...q, side]);
    },
    [live.finished, points.length],
  );

  async function start(first: Side) {
    fs.enter(); // dokunuşla başladığı için tarayıcı tam ekrana izin verir
    const r = await actions.start(matchId, first);
    setServer(r.view);
    if (r.error) setNotice(r.error);
  }

  const name = (s: Side) => (s === "A" ? a.name : b.name);
  const setNo = live.sets.length + 1;
  const syncing = queue.length > 0;
  useWakeLock(server.started && !live.finished);
  const shell = { groupCode, fs };

  if (!server.started) {
    return (
      <Shell {...shell} label="Hazırlık">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-4 text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-ball-300 uppercase">Canlı skor</p>
          <h1 className="text-3xl font-bold">{a.name} – {b.name}</h1>
          <p className="max-w-sm text-table-100">İlk servisi kim atıyor? Sonra her sayıda kazananın tarafına dokunun. Maç 3 set alan tarafından kazanılınca sonuç kendiliğinden gönderilir.</p>
          <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((s) => (
              <button key={s} onClick={() => start(s)} className="flex items-center justify-center gap-3 rounded-3xl bg-white/10 px-5 py-6 text-lg font-bold ring-1 ring-white/20 hover:bg-white/15">
                <Ball /> {name(s)}
              </button>
            ))}
          </div>
          {notice && <p className="rounded-xl bg-rubber-500/20 px-4 py-2 text-sm">{notice}</p>}
        </div>
      </Shell>
    );
  }

  const order: Side[] = swapped ? ["B", "A"] : ["A", "B"];

  return (
    <Shell {...shell} label={live.finished ? "Maç bitti" : `${setNo}. set`} syncing={syncing}>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2 p-2 landscape:grid-cols-2 landscape:grid-rows-1">
        {order.map((s) => {
          const pts = s === "A" ? live.current[0] : live.current[1];
          const sets = s === "A" ? live.setsA : live.setsB;
          const won = live.winner === s;
          return (
            <button
              key={s}
              onClick={() => tap(s)}
              disabled={live.finished}
              className={`relative flex min-h-0 touch-manipulation flex-col items-center justify-center overflow-hidden rounded-[1.75rem] p-2 text-center transition select-none active:scale-[0.99] ${
                s === "A" ? "bg-table-600/80" : "bg-white/8"
              } ring-1 ring-white/15 ${won ? "ring-4 ring-ball-400" : ""}`}
            >
              <span className="flex max-w-full items-center gap-2 truncate text-base font-bold sm:text-xl">
                {live.server === s && <Ball className="shrink-0" />}
                <span className="truncate">{name(s)}</span>
              </span>
              <span className="mt-1 flex gap-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className={`h-2 w-5 rounded-full ${i < sets ? "bg-ball-400" : "bg-white/15"}`} />
                ))}
              </span>
              {/* Sayı, ekranın kısa kenarına göre küçülür; böylece alttaki butonlar her ekranda görünür kalır */}
              <span className="font-display text-[clamp(3rem,min(19dvh,30vw),11rem)] leading-none font-bold tabular-nums landscape:text-[clamp(3rem,min(42dvh,20vw),11rem)]">
                {live.finished ? sets : pts}
              </span>
              {!live.finished && <span className="text-xs text-table-200 [@media(max-height:620px)]:hidden">Sayı için dokunun</span>}
              {won && <span className="mt-1 chip bg-ball-400 text-table-900">Kazandı</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-none space-y-2 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {live.sets.length > 0 && (
          <div className="flex flex-nowrap justify-center gap-1.5 overflow-x-auto text-xs">
            {live.sets.map(([x, y], i) => {
              const [l, r] = swapped ? [y, x] : [x, y];
              return (
                <span key={i} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 font-display font-semibold tabular-nums">
                  <span className="text-table-200">{i + 1}.</span> {l}-{r}
                </span>
              );
            })}
          </div>
        )}
        {notice && <p className="rounded-xl bg-rubber-500/20 px-3 py-1.5 text-center text-xs">{notice}</p>}
        {live.finished && (
          <p className="text-center text-xs text-table-100">
            {name(live.winner!)} {Math.max(live.setsA, live.setsB)}-{Math.min(live.setsA, live.setsB)} kazandı ({setScoresText(live.sets)}).{" "}
            {server.status === "APPROVED" ? "Sonuç kesinleşti." : server.status === "SUBMITTED" ? "Sonuç gönderildi, rakibin onayı bekleniyor." : "Gönderiliyor…"}
          </p>
        )}
        <div className="flex flex-nowrap justify-center gap-2">
          <button onClick={() => tap(null)} disabled={!points.length || (live.finished && server.status === "APPROVED")} className={`${ctl} flex-1`}>
            ↶ Geri al
          </button>
          {!live.finished && (
            <button onClick={() => setSwapped((v) => !v)} className={`${ctl} flex-1`}>
              ⇄ Taraf değiştir
            </button>
          )}
          {!live.finished && !points.length && (
            <button
              onClick={async () => {
                if (!confirm("Skorbord sıfırlansın mı?")) return;
                const r = await actions.cancel(matchId);
                setServer(r.view);
              }}
              className={ctl}
            >
              İptal
            </button>
          )}
          {live.finished && (
            <Link href="/panel/maclarim" className="btn-accent flex-1 justify-center py-2 text-sm">
              Maçlarıma dön
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}

const ctl = "btn max-w-52 justify-center whitespace-nowrap border border-white/25 px-3 py-2 text-sm text-white hover:bg-white/10";

function Shell({
  groupCode,
  label,
  syncing,
  fs,
  children,
}: {
  groupCode: string;
  label: string;
  syncing?: boolean;
  fs: ReturnType<typeof useFullscreen>;
  children: React.ReactNode;
}) {
  const [tip, setTip] = useState(false);
  return (
    <div className="cosmos relative flex h-dvh flex-col overflow-hidden text-white">
      <div className="stars-far pointer-events-none absolute inset-0 opacity-60" />
      <header className="relative flex flex-none items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 text-sm">
        <Link href="/panel/maclarim" className="shrink-0 font-semibold text-table-100 hover:text-white">
          ← Maçlarım
        </Link>
        <span className="ml-auto chip shrink-0 bg-white/10">{groupCode}</span>
        <span className="chip shrink-0 bg-rubber-500 text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {label}
        </span>
        {!fs.standalone && (
          <button
            onClick={() => (fs.supported ? fs.toggle() : setTip((v) => !v))}
            className="chip shrink-0 bg-white/10 hover:bg-white/20"
            aria-label={fs.active ? "Tam ekrandan çık" : "Tam ekran"}
          >
            {fs.active ? "⤡" : "⛶"}
          </button>
        )}
        <span className={`h-2 w-2 shrink-0 rounded-full ${syncing ? "bg-ball-400" : "bg-emerald-400"}`} title={syncing ? "Kaydediliyor" : "Kaydedildi"} />
      </header>
      {tip && (
        <p className="relative mx-3 mt-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-table-100">
          iPhone’da tam ekran için Safari’de <b>Paylaş</b> › <b>Ana Ekrana Ekle</b>’ye dokunun ve siteyi ana ekrandaki MT Rating simgesinden açın.
        </p>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/* Planet temalı SVG çizimler: masa tenisi topu bir gezegen, raketler onun uyduları. Harici görsel gerektirmez. */

/** Halka yolu (animateMotion için): merkez, yarıçaplar */
function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
}

/** Top-gezegen: turuncu küre, dikiş çizgisi ve parıltı */
function BallPlanet({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-ball`} cx=".34" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset=".35" stopColor="#ffc35a" />
          <stop offset=".8" stopColor="#f08a00" />
          <stop offset="1" stopColor="#b85e00" />
        </radialGradient>
        <radialGradient id={`${id}-night`} cx=".3" cy=".25" r=".95">
          <stop offset=".55" stopColor="#2a1060" stopOpacity="0" />
          <stop offset="1" stopColor="#2a1060" stopOpacity=".45" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-ball)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Topun dikişi */}
        <path
          d={`M${cx - r * 1.1},${cy + r * 0.15} C${cx - r * 0.4},${cy - r * 0.35} ${cx + r * 0.4},${cy + r * 0.55} ${cx + r * 1.1},${cy + r * 0.05}`}
          fill="none"
          stroke="#fff"
          strokeOpacity=".45"
          strokeWidth={Math.max(1, r * 0.035)}
        />
        {/* Gece tarafı */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-night)`} />
      </g>
    </g>
  );
}

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3bbf2" />
          <stop offset="1" stopColor="#8473e6" />
        </linearGradient>
      </defs>
      <g transform="rotate(-22 24 24)">
        {/* Halkanın arka yarısı */}
        <path d="M3 24 a21 6.5 0 0 1 42 0" fill="none" stroke="url(#lg-ring)" strokeWidth="2.6" opacity=".7" />
      </g>
      <BallPlanet id="lg" cx={24} cy={24} r={12} />
      <g transform="rotate(-22 24 24)">
        {/* Halkanın ön yarısı */}
        <path d="M3 24 a21 6.5 0 0 0 42 0" fill="none" stroke="url(#lg-ring)" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <circle cx="40" cy="8" r="3.2" fill="#fb4d6d" />
    </svg>
  );
}

/** Küçük raket silüeti (uydu) */
function PaddleMoon({ fill, scale = 1 }: { fill: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x="-3.5" y="9" width="7" height="15" rx="3" fill="#d9a066" />
      <circle r="13" fill="#f3d3a8" />
      <circle r="11.5" fill={fill} />
      <ellipse cx="-4" cy="-5" rx="5" ry="3" fill="#fff" opacity=".18" transform="rotate(-30 -4 -5)" />
    </g>
  );
}

export function HeroArt({ className = "" }: { className?: string }) {
  const cx = 320;
  const cy = 230;
  const orbits = [
    { rx: 290, ry: 98, dur: "38s" },
    { rx: 220, ry: 74, dur: "26s" },
  ];
  return (
    <svg viewBox="0 0 640 460" className={className} role="img" aria-label="Masa tenisi topundan bir gezegen ve onun yörüngesinde dönen raketler">
      <defs>
        <radialGradient id="ha-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffa41f" stopOpacity=".45" />
          <stop offset=".6" stopColor="#6450d6" stopOpacity=".18" />
          <stop offset="1" stopColor="#6450d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e1ddfa" stopOpacity=".2" />
          <stop offset=".5" stopColor="#ffd38c" stopOpacity=".95" />
          <stop offset="1" stopColor="#c3bbf2" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="ha-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b86" />
          <stop offset="1" stopColor="#b3113a" />
        </linearGradient>
        <linearGradient id="ha-black" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4668" />
          <stop offset="1" stopColor="#16132e" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cy} r="220" fill="url(#ha-glow)" />

      {/* Yörüngeler ve uydular */}
      <g transform={`rotate(-12 ${cx} ${cy})`}>
        {orbits.map((o, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={o.rx} ry={o.ry} fill="none" stroke="#c3bbf2" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 9" />
        ))}
        <g>
          <PaddleMoon fill="url(#ha-red)" scale={1.6} />
          <animateMotion dur={orbits[0]!.dur} repeatCount="indefinite" path={ellipsePath(cx, cy, orbits[0]!.rx, orbits[0]!.ry)} />
        </g>
        <g>
          <PaddleMoon fill="url(#ha-black)" scale={1.15} />
          <animateMotion dur={orbits[1]!.dur} repeatCount="indefinite" begin="-9s" path={ellipsePath(cx, cy, orbits[1]!.rx, orbits[1]!.ry)} />
        </g>
        <g>
          <circle r="5" fill="#8473e6" />
          <animateMotion dur={orbits[1]!.dur} repeatCount="indefinite" begin="-20s" path={ellipsePath(cx, cy, orbits[1]!.rx, orbits[1]!.ry)} />
        </g>
      </g>

      {/* Satürn halkası: arka yarı, gezegen, ön yarı */}
      <g transform={`rotate(-12 ${cx} ${cy})`}>
        <path d={`M${cx - 165},${cy} a165,36 0 0 1 330,0`} fill="none" stroke="url(#ha-ring)" strokeWidth="10" opacity=".55" />
      </g>
      <BallPlanet id="ha" cx={cx} cy={cy} r={96} />
      <g transform={`rotate(-12 ${cx} ${cy})`}>
        <path d={`M${cx - 165},${cy} a165,36 0 0 0 330,0`} fill="none" stroke="url(#ha-ring)" strokeWidth="10" strokeLinecap="round" />
        <path d={`M${cx - 140},${cy} a140,28 0 0 0 280,0`} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      </g>

      {/* Puan rozetleri */}
      <g className="animate-bounce-ball">
        <rect x="452" y="96" width="62" height="30" rx="15" fill="#10b981" />
        <text x="483" y="116" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="var(--font-grotesk), sans-serif">+12</text>
      </g>
      <g className="animate-bounce-ball" style={{ animationDelay: "-1.2s" }}>
        <rect x="118" y="318" width="54" height="28" rx="14" fill="#fff" fillOpacity=".12" stroke="#fff" strokeOpacity=".3" />
        <text x="145" y="337" textAnchor="middle" fontSize="14" fontWeight="700" fill="#e1ddfa" fontFamily="var(--font-grotesk), sans-serif">1798</text>
      </g>

      {/* Parlayan yıldızlar */}
      {[
        [90, 80, 2.2],
        [560, 60, 1.8],
        [600, 360, 2.4],
        [40, 300, 1.6],
        [250, 40, 1.4],
        [420, 420, 1.8],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" className="animate-twinkle" style={{ animationDelay: `${-i * 0.7}s` }} />
      ))}
    </svg>
  );
}

/** Başlık bantlarının sağına yerleşen küçük gezegen */
export function OrbitMini({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden>
      <defs>
        <linearGradient id="om-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3bbf2" stopOpacity=".3" />
          <stop offset=".5" stopColor="#ffd38c" />
          <stop offset="1" stopColor="#c3bbf2" stopOpacity=".4" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="80" rx="100" ry="30" fill="none" stroke="#c3bbf2" strokeOpacity=".35" strokeDasharray="2 7" transform="rotate(-14 110 80)" />
      <g transform="rotate(-14 110 80)">
        <path d="M45 80 a65 14 0 0 1 130 0" fill="none" stroke="url(#om-ring)" strokeWidth="6" opacity=".55" />
      </g>
      <BallPlanet id="om" cx={110} cy={80} r={38} />
      <g transform="rotate(-14 110 80)">
        <path d="M45 80 a65 14 0 0 0 130 0" fill="none" stroke="url(#om-ring)" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="196" cy="54" r="7" fill="#fb4d6d" />
      <circle cx="26" cy="112" r="4" fill="#8473e6" />
    </svg>
  );
}

/** Boş durumlar için yörüngede küçük bir gezegen */
export function EmptyArt({ className = "h-24 w-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <ellipse cx="60" cy="62" rx="50" ry="18" fill="none" stroke="#c3bbf2" strokeWidth="2" strokeDasharray="3 6" transform="rotate(-14 60 62)" />
      <BallPlanet id="ea" cx={60} cy={60} r={20} />
      <circle cx="104" cy="44" r="5" fill="#fb4d6d" />
      <circle cx="18" cy="84" r="3" fill="#8473e6" />
    </svg>
  );
}

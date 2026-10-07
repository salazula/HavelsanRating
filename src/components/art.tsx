/* Havelsan kurumsal görünümü için SVG çizimler: teknik çizim üslubunda masa tenisi masası. Harici görsel gerektirmez. */

/** Lacivert kare içinde "H" ve masa tenisi topu */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="1" y="1" width="46" height="46" rx="9" fill="#1e4b92" stroke="#fff" strokeOpacity=".22" strokeWidth="1.5" />
      <path d="M13 12h5.5v9.5h11V12H35v24h-5.5V26.5h-11V36H13z" fill="#fff" />
      <circle cx="38.5" cy="9.5" r="4.5" fill="#4b9de6" stroke="#1e4b92" strokeWidth="2" />
    </svg>
  );
}

/** Perspektif masa: üst yüzey, file, orta çizgi ve ön kalınlık */
function Table({ stroke = "#fff", strokeOpacity = 0.6, surface = 0.05, legs = true }: { stroke?: string; strokeOpacity?: number; surface?: number; legs?: boolean }) {
  return (
    <g fill="none" stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth="1.5" strokeLinejoin="round">
      {legs && (
        <g strokeOpacity={strokeOpacity * 0.6}>
          <path d="M112 312v70M528 312v70M196 158v52M444 158v52" />
          <path d="M112 352h416" strokeDasharray="2 6" />
        </g>
      )}
      <path d="M170 150h300l90 150H80z" fill={stroke} fillOpacity={surface} />
      <path d="M80 300h480v12H80z" fill={stroke} fillOpacity={surface * 2} />
      <path d="M320 150v150" strokeOpacity={strokeOpacity * 0.7} />
      <path d="M125 225h390" />
      <path d="M125 225v-24h390v24" fill={stroke} fillOpacity={surface * 2.5} />
      <path d="M125 213h390" strokeOpacity={strokeOpacity * 0.5} strokeDasharray="3 4" />
    </g>
  );
}

/** Ana sayfa ve giriş sayfası: ölçü çizgileriyle teknik çizim masa ve top yörüngesi */
export function HeroArt({ className = "" }: { className?: string }) {
  const label = { fill: "#b7c9e3", fontSize: 13, fontFamily: "var(--font-plex-mono), monospace", letterSpacing: ".04em" };
  return (
    <svg viewBox="0 0 640 460" className={className} role="img" aria-label="Teknik çizim üslubunda masa tenisi masası ve topun yörüngesi">
      <Table />

      {/* Ölçü çizgileri */}
      <g stroke="#9cc8f2" strokeOpacity=".7" strokeWidth="1">
        <path d="M80 412h480M80 404v16M560 404v16" />
        <path d="M44 300l90-150M38 296l12 8M128 146l12 8" />
      </g>
      <text x="320" y="436" textAnchor="middle" {...label}>152,5 cm</text>
      <text x="0" y="0" textAnchor="middle" transform="translate(68 214) rotate(-59)" {...label}>274 cm</text>
      <text x="572" y="230" {...label}>15,25 cm</text>
      <path d="M560 201v24M554 201h12M554 225h12" stroke="#9cc8f2" strokeOpacity=".7" strokeWidth="1" />

      {/* Topun yörüngesi */}
      <path d="M430 268 Q 360 70 248 182" fill="none" stroke="#4b9de6" strokeWidth="2" strokeDasharray="5 6" />
      <circle cx="430" cy="268" r="3" fill="#4b9de6" />
      <circle cx="248" cy="182" r="9" fill="#fff" />
      <circle cx="245" cy="179" r="3" fill="#fff" stroke="#b7c9e3" strokeOpacity=".8" />

      {/* Köşe işaretleri */}
      <g stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" fill="none">
        <path d="M12 36V12h24M628 36V12h-24M12 424v24h24M628 424v24h-24" />
      </g>
    </svg>
  );
}

/** Başlık bantlarının sağına yerleşen küçük masa çizimi */
export function HeaderArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="60 130 520 200" className={className} aria-hidden>
      <Table legs={false} strokeOpacity={0.45} surface={0.04} />
      <path d="M430 268 Q 360 120 248 190" fill="none" stroke="#4b9de6" strokeWidth="2.5" strokeDasharray="6 7" />
      <circle cx="248" cy="190" r="10" fill="#fff" />
    </svg>
  );
}

/** Boş durumlar için açık renkli masa çizimi */
export function EmptyArt({ className = "h-16 w-28" }: { className?: string }) {
  return (
    <svg viewBox="60 130 520 200" className={className} aria-hidden>
      <Table legs={false} stroke="#2f5ea8" strokeOpacity={0.45} surface={0.05} />
      <circle cx="400" cy="190" r="12" fill="#1a6fc4" />
    </svg>
  );
}

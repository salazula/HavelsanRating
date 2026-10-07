"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./art";

/** Geliştirici imzasının bağlandığı Instagram kullanıcı adı */
const DEVELOPER_INSTAGRAM = "burakkrttr";

const links = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/siralama", label: "Sıralama" },
  { href: "/gruplar", label: "Gruplar" },
  { href: "/canli", label: "Canlı" },
  { href: "/yildizlar", label: "Yıldızlar" },
  { href: "/istatistik", label: "İstatistik" },
];

export function SiteNav({ userName, live = 0 }: { userName?: string; live?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-table-900/90 text-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" onClick={() => setOpen(false)} aria-label="Ana sayfa">
            <Logo />
          </Link>
          <span className="leading-tight">
            <Link href="/" onClick={() => setOpen(false)} className="block">
              <span className="block font-display text-[15px] font-bold">Havelsan Rating</span>
            </Link>
            <a
              href={`https://instagram.com/${DEVELOPER_INSTAGRAM}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block text-[10px] text-table-200 transition hover:text-white"
              title="Instagram: @burakkrttr"
            >
              by <span className="font-semibold">Burak Karatatar</span>
            </a>
          </span>
        </div>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active(l.href) ? "bg-white/12 text-white" : "text-table-100 hover:bg-white/8 hover:text-white"
              }`}
            >
              {l.label}
              {l.href === "/canli" && live > 0 && <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-rubber-500 align-middle" />}
            </Link>
          ))}
          {!userName && (
            <Link href="/basvuru" className="btn ml-3 border border-white/25 py-2 text-white hover:bg-white/10">
              Başvuru Yap
            </Link>
          )}
          <Link href={userName ? "/panel" : "/giris"} className={`btn-accent py-2 ${userName ? "ml-3" : "ml-1"}`}>
            {userName ? "Panel" : "Giriş Yap"}
          </Link>
        </nav>

        <button
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg hover:bg-white/10 lg:hidden"
          aria-label="Menüyü aç"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 font-semibold ${active(l.href) ? "bg-white/10" : "text-table-100"}`}
            >
              {l.label}
              {l.href === "/canli" && live > 0 && <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-rubber-500 align-middle" />}
            </Link>
          ))}
          <Link href={userName ? "/panel" : "/giris"} onClick={() => setOpen(false)} className="btn-accent mt-2 w-full">
            {userName ? "Panel" : "Giriş Yap"}
          </Link>
          {!userName && (
            <Link href="/basvuru" onClick={() => setOpen(false)} className="btn mt-2 w-full border border-white/25 text-white">
              Başvuru Yap
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

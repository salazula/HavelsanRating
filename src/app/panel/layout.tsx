import { runDueJobs } from "@/lib/weekly";
import Link from "next/link";
import { isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import { Logo } from "@/components/art";
import { PanelNav, type PanelLink } from "@/components/panel-nav";
import { logout } from "../giris/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await runDueJobs();
  const user = await requireUser();
  const links: PanelLink[] = [{ href: "/panel", label: "Özet", icon: "home" }];
  if (user.playerId) links.push({ href: "/panel/maclarim", label: "Maçlarım", icon: "ball" });
  if (isManager(user)) {
    links.push({ href: "/panel/turlar", label: "Haftalar", icon: "trophy" });
    links.push({ href: "/panel/grup-duzeni", label: "Grup düzeni", icon: "table" });
    links.push({ href: "/panel/puan-kurallari", label: "Puan kuralları", icon: "scale" });
    links.push({ href: "/panel/sonuclar", label: "Sonuçlar ve onaylar", icon: "ball" });
    links.push({ href: "/panel/oyuncular", label: "Oyuncular", icon: "users" });
    const waiting = await db.application.count({ where: { status: "PENDING" } });
    links.push({ href: "/panel/basvurular", label: waiting ? `Başvurular (${waiting})` : "Başvurular", icon: "inbox" });
  }
  if (user.role === "SUPER_ADMIN") {
    links.push({ href: "/panel/kullanicilar", label: "Kullanıcılar", icon: "building" });
    links.push({ href: "/panel/ayarlar", label: "Ayarlar", icon: "settings" });
  }
  links.push({ href: "/panel/hesabim", label: "Hesabım", icon: "users" });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="cosmos relative text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="stars-far absolute inset-0 opacity-70" />
        <div className="stars absolute inset-0 animate-twinkle" />
        <div className="relative flex h-full flex-col gap-6 p-4 lg:p-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-display text-sm leading-tight font-bold">
              Masa Tenisi Rating
              <span className="block text-[10px] font-semibold tracking-widest text-ball-300 uppercase">Panel</span>
            </span>
          </Link>
          <PanelNav links={links} />
          <div className="mt-auto hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 lg:block">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-table-100">{roleLabel[user.role]}{user.player && user.role !== "PLAYER" ? " · Oyuncu" : ""}</p>
            <form action={logout} className="mt-3">
              <button className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">Çıkış yap</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <span className="truncate text-sm font-semibold">{user.name} · {roleLabel[user.role]}</span>
          <form action={logout}><button className="text-sm font-semibold text-rubber-600">Çıkış</button></form>
        </div>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

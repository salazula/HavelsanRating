import Link from "next/link";
import { Logo } from "./art";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-table-900 text-table-100">
      <div className="h-1 bg-gradient-to-r from-table-500 via-ball-500 to-rubber-500" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <Logo />
            <span className="font-display font-bold">Masa Tenisi Rating</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-table-200">
            Haftalık grup maçları, puan farkına göre hesaplanan rating ve oyuncu istatistikleri tek yerde.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-white">Rating</p>
          <ul className="space-y-2">
            <li><Link className="hover:text-white" href="/siralama">Oyuncu sıralaması</Link></li>
            <li><Link className="hover:text-white" href="/gruplar">Haftanın grupları</Link></li>
            <li><Link className="hover:text-white" href="/canli">Canlı skor</Link></li>
            <li><Link className="hover:text-white" href="/yildizlar">Haftanın yıldızları</Link></li>
            <li><Link className="hover:text-white" href="/istatistik">İstatistikler</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-white">Oyuncular</p>
          <p className="text-table-200">Maç sonucunu girmek için giriş yapın. Rating’e katılmak için başvuru formunu doldurun.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/giris" className="btn-accent">Giriş yap</Link>
            <Link href="/basvuru" className="btn border border-white/25 text-white hover:bg-white/10">Başvuru yap</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-table-200">
        © {new Date().getFullYear()} Masa Tenisi Rating
      </div>
    </footer>
  );
}

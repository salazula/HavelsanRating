import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runDueJobs } from "@/lib/weekly";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth";
import { liveCount } from "@/lib/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await runDueJobs();
  const [user, live, path] = await Promise.all([
    getCurrentUser(),
    liveCount(),
    headers().then((h) => h.get("x-path")),
  ]);
  // Başvuru sayfası dışındaki her sayfa sadece aktif kullanıcılara açık (proxy.ts ile birlikte)
  if (!user && path !== "/basvuru") redirect("/giris");
  return (
    <>
      <SiteNav userName={user?.name} live={live} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

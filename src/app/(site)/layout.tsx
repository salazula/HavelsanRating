import { runDueJobs } from "@/lib/weekly";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth";
import { liveCount } from "@/lib/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await runDueJobs();
  const [user, live] = await Promise.all([
    getCurrentUser(),
    liveCount(),
  ]);
  return (
    <>
      <SiteNav userName={user?.name} live={live} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

import { runDueJobs } from "@/lib/weekly";

/** Vercel Cron: son katılım zamanı geçen haftaların fikstürünü oluşturur (sayfa ziyaretlerine ek güvence). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Yetkisiz", { status: 401 });
  await runDueJobs(true);
  return Response.json({ ok: true });
}

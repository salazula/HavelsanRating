import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/*
 * Site sadece giriş yapmış Havelsan çalışanlarına açık. Oturumu olmayan her istek giriş sayfasına yönlenir.
 * Herkese açık kalanlar: giriş, başvuru, ilk kurulum, cron ve uygulama simgeleri.
 * Kullanıcının hâlâ aktif olup olmadığı sayfalarda ayrıca kontrol edilir (src/app/(site)/layout.tsx, requireUser).
 */
const PUBLIC = ["/giris", "/basvuru", "/kurulum", "/api/cron"];
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const headers = new Headers(req.headers);
  headers.set("x-path", path);
  if (PUBLIC.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next({ request: { headers } });

  const token = req.cookies.get("pr_session")?.value;
  // Canlıda AUTH_SECRET yoksa hiçbir oturumu kabul etme
  const configured = !!process.env.AUTH_SECRET || process.env.NODE_ENV !== "production";
  if (token && configured) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next({ request: { headers } });
    } catch {
      // süresi dolmuş ya da geçersiz oturum: girişe
    }
  }
  if (req.method !== "GET" && req.method !== "HEAD") return new NextResponse("Giriş gerekli", { status: 401 });
  return NextResponse.redirect(new URL("/giris", req.url));
}

export const config = {
  // Next'in kendi dosyaları ve uygulama simgeleri hariç her istek
  matcher: ["/((?!_next/static|_next/image|_vercel|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|robots\\.txt).*)"],
};

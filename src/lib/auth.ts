import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "pr_session";
const COOKIE = SESSION_COOKIE;
// Canlıda AUTH_SECRET zorunlu: yoksa "dev-secret" ile herkes oturum üretebilirdi
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("AUTH_SECRET ortam değişkeni tanımlı değil.");
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");

type SessionPayload = { userId: string };

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret);
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { player: true },
    });
    return user?.active ? user : null;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Sayfa/aksiyon başında çağrılır; yetkisi yoksa yönlendirir. */
export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (roles && !roles.includes(user.role)) redirect("/panel?yetki=yok");
  return user;
}

export const MANAGERS: Role[] = ["SUPER_ADMIN", "LEAGUE_MANAGER"];

export function isManager(user: { role: Role } | null) {
  return !!user && MANAGERS.includes(user.role);
}

export function isSuperAdmin(user: { role: Role } | null) {
  return user?.role === "SUPER_ADMIN";
}

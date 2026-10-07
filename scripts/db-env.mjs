/*
 * Veritabanı adreslerini tamamlar: Vercel-Neon entegrasyonu projeye göre farklı isimler
 * ekleyebiliyor (DATABASE_URL, DATABASE_URL_UNPOOLED, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING…).
 * Prisma'nın beklediği DATABASE_URL ve DATABASE_URL_UNPOOLED yoksa diğerlerinden doldurulur.
 */
export function fillDbEnv(env = process.env) {
  env.DATABASE_URL ||= env.POSTGRES_PRISMA_URL || env.POSTGRES_URL;
  env.DATABASE_URL_UNPOOLED ||= env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
  return env;
}

// Derleme sırasında tabloları oluşturur/günceller: `prisma migrate deploy`
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fillDbEnv } from "./db-env.mjs";

// Yerelde .env dosyasını oku (Vercel'de değişkenler zaten ortamda)
if (existsSync(".env")) process.loadEnvFile(".env");

const env = fillDbEnv({ ...process.env });
if (!env.DATABASE_URL) {
  console.error("\n✖ DATABASE_URL bulunamadı. Vercel'de projeye Neon veritabanını bağlayın (Storage › Connect Database).\n");
  process.exit(1);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env });

-- Profil fotoğrafı ve Telegram kaldırıldı
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "photoUrl",
DROP COLUMN "telegramError";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "telegramError",
DROP COLUMN "telegramSentAt";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "photoUrl";


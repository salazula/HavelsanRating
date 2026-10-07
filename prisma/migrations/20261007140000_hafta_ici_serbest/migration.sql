-- Gruplara sabit gün/saat atanmıyor: maçlar Pazartesi-Cuma arasında serbestçe oynanır
ALTER TABLE "GroupSlot" DROP COLUMN "weekday",
DROP COLUMN "startTime",
DROP COLUMN "endTime";

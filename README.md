# Havelsan Rating

Havelsan içi masa tenisi rating sistemi: oyuncu sıralaması, haftalık gruplar, oyuncuların girip rakiplerinin onayladığı maç sonuçları ve tur sonunda otomatik hesaplanan rating.

**Teknoloji:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL

**Erişim:** Site sadece giriş yapan kullanıcılara açıktır; giriş yapmamış biri yalnızca giriş ve başvuru sayfalarını görür. Profil fotoğrafı ve Telegram yoktur.

**E-posta kısıtı:** Hesaplar (kurulum, başvuru, panelden açılan kullanıcı/oyuncu hesapları) sadece `@havelsan.com.tr` adresleriyle açılabilir. Alan adı `src/lib/email.ts` içindeki `EMAIL_DOMAIN` sabitindedir.

## Ücretsiz yayına alma (Vercel + Neon)

1. **Vercel projesi:** [vercel.com](https://vercel.com) adresine GitHub hesabıyla girin → *Add New… › Project* → `HavelsanRating` reposunu *Import* edin → *Deploy*. İlk kurulum veritabanı olmadığı için hata verebilir, bu normaldir.
2. **Veritabanı:** Projede *Storage › Create Database › Neon (Serverless Postgres)* → ücretsiz plan, bölge *Frankfurt (eu-central-1)* → projeye bağlayın. `DATABASE_URL` ve `DATABASE_URL_UNPOOLED` otomatik eklenir.
3. **Ortam değişkenleri** (*Settings › Environment Variables*):
   - `AUTH_SECRET`: uzun rastgele bir değer (ör. [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32))
   - `CRON_SECRET` (önerilir): günlük otomatik işleri (fikstür, Cuma hükmen) dışarıdan tetiklenmeye karşı korur
4. *Deployments* sekmesinden son kurulumu **Redeploy** edin. Tablolar derleme sırasında otomatik oluşturulur.
5. Sitede `/kurulum` adresini açıp **süper admin** hesabınızı oluşturun (sadece hiç kullanıcı yokken açılır).
6. *Panel › Oyuncular* sayfasında Excel’deki “Ad Soyad / Puan” sütunlarını kopyalayıp **Excel’den toplu aktar** kutusuna yapıştırın.
7. *Panel › Grup düzeni*’nde “Varsayılan grup düzenini yükle” ile 3’er kişilik A-D gruplarını yükleyin ve gerekirse düzenleyin. Gruplara gün/saat atanmaz; oyuncu sayısı düzeni aşarsa her hafta yeni gruplar (E, F…) kendiliğinden açılır.
8. *Panel › Kullanıcılar*’dan lig sorumlusu hesabını, *Panel › Oyuncular*’dan oyuncu hesaplarını açın.

## Kullanım

**Canlı skor:** Oyuncu *Maçlarım*’da “Masada canlı skor tut”a basar, ilk servisi seçer ve her sayıda kazananın tarafına dokunur (11 sayı, 2 fark, 3 set alan kazanır; servis sırası ve set skorları otomatik). Maç bitince sonuç set skorlarıyla rakibin onayına düşer. Sitedeki *Canlı* sayfası oynanan maçları 5 saniyede bir yenileyerek gösterir.

**Yeni oyuncu başvurusu:** Sitedeki *Başvuru Yap* formuyla aday ad, e-posta, telefon, şifre ve isteğe bağlı tanıtım bırakır (puan sorulmaz). Lig sorumlusu veya süper admin *Panel › Başvurular*’da başlangıç puanını yazıp onaylar ya da reddeder. Onaylanınca oyuncu ve giriş hesabı oluşur.

1. **Grup düzeni** (*Panel › Grup düzeni*): her grubun kişi sayısı ve (isteğe bağlı) yeri; sabit oyun günü yoktur. Sıra numarası küçük grup en yüksek puanlılardan oluşur.
2. **Yeni hafta** (*Panel › Haftalar*): hafta başı ve son katılım zamanı seçilir; aktif oyuncular puan sırasına göre gruplara yerleşir. Gerekirse oyuncu taşınır.
3. **Grupları yayınla, katılımı aç:** oyuncular *Maçlarım*’dan “Katılacağım / Katılamayacağım” bildirir. Lig sorumlusu da her oyuncunun katılımını girebilir.
4. **Otomatik fikstür:** son katılım zamanı geçince (siteye ilk girişte ya da günlük cron’da) bildirim yapmayanlar hükmen sayılır, eksik gruplar alt gruptaki katılan en yüksek puanlı oyuncularla tamamlanır ve herkesle herkes maçları oluşur. “Fikstürü şimdi oluştur” ile beklemeden de oluşturulabilir.
5. **Oyun haftası:** maçlar Pazartesi-Cuma arasında oyuncuların anlaştığı herhangi bir gün oynanır. Cuma gecesi (23:59) sonucu hiç girilmemiş maçlar otomatik hükmen (iki oyuncu da gelmedi) sayılır; onay bekleyen ve itirazlı sonuçları lig sorumlusu kesinleştirir.
6. **Sonuç girişi:** oyuncu skoru girer, rakibi onaylar ya da itiraz eder. Lig sorumlusu her sonucu girebilir/düzeltebilir; hükmen (iki oyuncu da gelmedi) sadece lig sorumlusu tarafından girilir.
7. **Haftayı kapat:** puanlar hesaplanır ve oyunculara işlenir. Süper admin son kapanan haftayı geri alabilir.

**Deneme verisi:** *Panel › Ayarlar*’dan tek tuşla 24 deneme oyuncusu, hesapları (şifre `Deneme123!`), kapanmış bir hafta ve devam eden bir hafta oluşturulur; “Deneme verisini sil” ile tamamen kaldırılır.

**Roller:** Süper admin (her şey + kullanıcılar, silme, hafta geri alma, deneme verisi) · Lig sorumlusu (oyuncular, grup düzeni, haftalar, son katılım zamanı, katılım, sonuç onayı/düzeltme, elle ek puan) · Oyuncu (katılım bildirimi, kendi maçlarının sonucunu girme/onaylama).

## Puanlama

Kurallar `src/lib/rating.ts` dosyasında ve sitedeki *Kurallar* sayfasında. Eski Excel (`planet mayıs1.xlsm`) formüllerinin birebir karşılığıdır; `npm test` Excel’deki G, H, I gruplarının sonuçlarıyla doğrular.

Ceza ve bonus puanları, set averajı değerleri ve puan farkı tablosu *Panel › Puan kuralları* sayfasından lig sorumlusu ve süper admin tarafından değiştirilebilir. Varsayılanlar Excel’deki değerlerdir (`DEFAULT_RULES`). Değişiklik kapanmamış haftalara uygulanır; kapanan her hafta o anki kuralları saklar, geçmiş değişmez.

- Puan farkı tablosu (0-12 → 8/8 … 238+ → 0/50), kazanan alır, kaybeden kaybeder.
- Set averajı: 3-0 → 3, 3-1 → 2, 3-2 → 1.
- Hükmen (iki oyuncu da gelmedi): yüksek puanlı, düşük puanlının kazanacağı puan +3 kaybeder; düşük puanlı, yüksek puanlının kazanacağı puanı kaybeder.
- Hafta sonu: hiç maç yapmayan (katılamayacağını bildiren ya da bildirim yapmayan) −24, 5 maçtan eksik maç başına +8, tüm maçlarını kazanan (haftanın yıldızı) +10.

## Yerel geliştirme

```bash
npm install
cp .env.example .env        # DATABASE_URL / DATABASE_URL_UNPOOLED: bir PostgreSQL adresi
npm run db:push             # tabloları oluşturur (prisma migrate deploy)
npm run dev                 # http://localhost:3000
npm test                    # rating motoru testleri
```

Şema değişikliğinde yeni migration: `npx prisma migrate dev --name aciklama`.

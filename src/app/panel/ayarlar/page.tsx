import { requireUser } from "@/lib/auth";
import { DEMO_PASSWORD, demoExists } from "@/lib/demo";
import { PILOT_MANAGER, PILOT_PASSWORD, PILOT_PLAYERS, pilotAccounts } from "@/lib/pilot";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm } from "@/components/forms/action-form";
import { Notice } from "@/components/ui";
import { createDemoAction, createPilotAction, deleteDemoAction, deletePilotAction } from "./actions";

export default async function SettingsPage() {
  await requireUser(["SUPER_ADMIN"]);
  const demo = await demoExists();
  const pilot = await pilotAccounts();
  const pilotMissing = PILOT_PLAYERS.length + 1 - pilot.length;
  return (
    <>
      <PanelTitle title="Ayarlar" />
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="font-bold">Deneme verisi</h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            Sistemi gerçek veriye dokunmadan denemek için 24 deneme oyuncusu, oyuncu hesapları, kapanmış bir hafta ve sonuçlarının bir kısmı girilmiş devam eden bir hafta oluşturur.
            Hesaplar: <code>deneme1@deneme.local</code> … <code>deneme24@deneme.local</code> ve <code>deneme.sorumlu@deneme.local</code>, şifre <code>{DEMO_PASSWORD}</code>.
            Deneme verisi açıkken gerçek hafta oluşturulamaz.
          </p>
          {demo && <div className="mb-4"><Notice tone="info">Deneme verisi açık.</Notice></div>}
          {/* Tek form: oluşturup silerken sonuç mesajı kaybolmasın */}
          <ActionForm
            action={demo ? deleteDemoAction : createDemoAction}
            submitLabel={demo ? "Deneme verisini sil" : "Deneme verisi oluştur"}
            submitClass={demo ? "btn-danger" : "btn-primary"}
            className="space-y-2"
            confirm={demo ? "Tüm deneme oyuncuları, hesapları ve haftaları silinsin mi?" : undefined}
          >
            <span />
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Pilot uygulama (A ve B grubu)</h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            Excel’deki A grubu (6) ve B grubu ({PILOT_PLAYERS.filter((p) => p.group === "B").length}) oyuncularını puanlarıyla gerçek oyuncu olarak ekler, her birine giriş hesabı açar ve lig sorumlusu testi için {PILOT_MANAGER.name} adına bir lig sorumlusu hesabı oluşturur.
            E-postalar <code>adsoyad@deneme.local</code> biçiminde, şifre <code>{PILOT_PASSWORD}</code>; telefon numaraları uydurmadır.
            Pilot bitince “Pilot verisini sil” oyuncuları, hesaplarını ve yalnızca pilot oyuncuların oynadığı haftaları topluca kaldırır.
          </p>
          {pilot.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-table-50 text-left text-xs text-ink-soft">
                  <tr><th className="px-3 py-2">Oyuncu</th><th className="px-3 py-2">E-posta</th><th className="px-3 py-2">Telefon</th><th className="px-3 py-2 text-right">Puan</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pilot.map((u) => (
                    <tr key={u.email}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{u.name} {u.role === "LEAGUE_MANAGER" && <span className="chip ml-1 bg-table-50 text-table-700">Lig sorumlusu</span>}</td>
                      <td className="px-3 py-2"><code>{u.email}</code></td>
                      <td className="px-3 py-2 whitespace-nowrap">{u.phone}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{u.player?.rating ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pilot.length > 0 && pilotMissing > 0 && (
            <div className="mb-3">
              <ActionForm action={createPilotAction} submitLabel={`Eksik pilot hesaplarını ekle (${pilotMissing})`} submitClass="btn-primary" className="space-y-2">
                <span />
              </ActionForm>
            </div>
          )}
          <ActionForm
            action={pilot.length ? deletePilotAction : createPilotAction}
            submitLabel={pilot.length ? "Pilot verisini sil" : "Pilot verisini yükle"}
            submitClass={pilot.length ? "btn-danger" : "btn-primary"}
            className="space-y-2"
            confirm={pilot.length ? "Pilot oyuncuları, hesapları ve yalnızca onların oynadığı haftalar silinsin mi?" : undefined}
          >
            <span />
          </ActionForm>
        </section>
      </div>
    </>
  );
}

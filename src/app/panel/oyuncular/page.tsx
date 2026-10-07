import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Player } from "@prisma/client";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Avatar } from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";
import { removePlayerPhoto, uploadPlayerPhoto } from "../foto/actions";
import { createAccount, createPlayer, deletePlayer, importPlayers, resetPlayerPassword, updatePlayer } from "./actions";

function PlayerFields({ p }: { p?: Player }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-2"><Field label="Ad soyad"><input name="name" required defaultValue={p?.name} className="input" /></Field></div>
      <Field label="Rating puanı"><input name="rating" type="number" required defaultValue={p?.rating ?? 1500} className="input" /></Field>
      <Field label="Set averajı"><input name="setAverage" type="number" defaultValue={p?.setAverage ?? 0} className="input" /></Field>
      <Field label="Toplam maç"><input name="matches" type="number" min={0} defaultValue={p?.matches ?? 0} className="input" /></Field>
      <Field label="Toplam galibiyet"><input name="wins" type="number" min={0} defaultValue={p?.wins ?? 0} className="input" /></Field>
      <Field label="Telefon"><input name="phone" type="tel" defaultValue={p?.phone ?? ""} className="input" /></Field>
    </div>
  );
}

export default async function PlayersPage({ searchParams }: PageProps<"/panel/oyuncular">) {
  const me = await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const q = String((await searchParams).q ?? "").trim();
  const players = await db.player.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { user: true },
    orderBy: [{ active: "desc" }, { rating: "desc" }],
  });
  const withoutAccount = players.filter((p) => !p.user && p.active).length;

  return (
    <>
      <PanelTitle title="Oyuncular" subtitle={`${players.filter((p) => p.active).length} aktif oyuncu${withoutAccount ? ` · ${withoutAccount} oyuncunun giriş hesabı yok` : ""}`}>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="İsim ara" className="input w-48" />
          <button className="btn-ghost">Ara</button>
        </form>
      </PanelTitle>

      <div className="card divide-y divide-line">
        {players.map((p) => (
          <details key={p.id} className={`px-4 py-3 ${p.active ? "" : "opacity-60"}`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
              <Avatar name={p.name} photoUrl={p.photoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name} {!p.active && <span className="chip ml-1 bg-line text-ink-soft">Pasif</span>}
                  {p.isDemo && <span className="chip ml-1 bg-amber-50 text-amber-700">Deneme</span>}
                  {p.isPilot && <span className="chip ml-1 bg-table-50 text-table-700">Pilot</span>}
                </p>
                <p className="truncate text-xs text-ink-soft">{p.user ? p.user.email : "Hesap yok"} · {p.matches} maç · {p.wins} galibiyet</p>
              </div>
              <span className="font-display text-lg font-bold tabular-nums">{p.rating}</span>
            </summary>
            <div className="mt-4 space-y-5">
              <PhotoUpload name={p.name} photoUrl={p.photoUrl} upload={uploadPlayerPhoto.bind(null, p.id)} remove={removePlayerPhoto.bind(null, p.id)} />
              <ActionForm action={updatePlayer.bind(null, p.id)} submitLabel="Kaydet">
                <PlayerFields p={p} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} /> Aktif (yeni turlarda gruplara alınır)</label>
              </ActionForm>
              <div className="border-t border-line pt-4">
                {p.user ? (
                  p.user.role === "PLAYER" && (
                    <ActionForm action={resetPlayerPassword.bind(null, p.id)} submitLabel="Şifreyi değiştir" submitClass="btn-ghost" className="flex flex-wrap items-end gap-3">
                      <div className="w-56"><Field label="Yeni şifre"><input name="password" type="text" minLength={8} required className="input" /></Field></div>
                    </ActionForm>
                  )
                ) : (
                  <ActionForm action={createAccount.bind(null, p.id)} submitLabel="Giriş hesabı aç" submitClass="btn-ghost" className="flex flex-wrap items-end gap-3">
                    <div className="w-64"><Field label="E-posta"><input name="email" type="email" required className="input" /></Field></div>
                    <div className="w-48"><Field label="Geçici şifre"><input name="password" type="text" minLength={8} required className="input" /></Field></div>
                  </ActionForm>
                )}
              </div>
              {me.role === "SUPER_ADMIN" && (
                <ActionForm action={deletePlayer.bind(null, p.id)} submitLabel="Oyuncuyu sil" submitClass="btn-danger" className="space-y-2" confirm={`${p.name} silinsin mi?`}>
                  <span />
                </ActionForm>
              )}
            </div>
          </details>
        ))}
        {!players.length && <p className="px-4 py-8 text-center text-sm text-ink-soft">Oyuncu bulunamadı.</p>}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">+ Yeni oyuncu</h2>
          <ActionForm action={createPlayer} submitLabel="Oyuncuyu ekle" resetOnSuccess>
            <PlayerFields />
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Excel’den toplu aktar</h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            Excel’den sütunları kopyalayıp yapıştırın. Her satır: <b>Ad Soyad, Puan</b> ve isteğe bağlı <b>Set averajı, Maç, Galibiyet</b>. Aynı isimdeki oyuncunun bilgileri güncellenir.
          </p>
          <ActionForm action={importPlayers} submitLabel="Aktar" resetOnSuccess>
            <textarea name="text" rows={8} required className="input font-mono text-xs" placeholder={"Alp Kayman\t1798\nAlperen Kuzu\t1763"} />
          </ActionForm>
        </section>
      </div>
    </>
  );
}

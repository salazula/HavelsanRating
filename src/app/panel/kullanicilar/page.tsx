import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import type { Player, User } from "@prisma/client";
import { createUser, deleteUser, resetPassword, toggleUser, updateUser } from "./actions";

const roleTone = { SUPER_ADMIN: "bg-ball-500/15 text-ball-600", LEAGUE_MANAGER: "bg-table-100 text-table-700", PLAYER: "bg-emerald-50 text-emerald-700" } as const;

function UserFields({ u, players, withPassword }: { u?: User; players: Player[]; withPassword?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Ad soyad"><input name="name" required defaultValue={u?.name} className="input" /></Field>
      <Field label="E-posta"><input name="email" type="email" required defaultValue={u?.email} className="input" /></Field>
      <Field label="Telefon"><input name="phone" type="tel" defaultValue={u?.phone ?? ""} className="input" /></Field>
      {withPassword && <Field label="Geçici şifre" hint="En az 8 karakter"><input name="password" type="text" minLength={8} required className="input" /></Field>}
      <Field label="Rol">
        <select name="role" className="input" defaultValue={u?.role ?? "LEAGUE_MANAGER"}>
          <option value="PLAYER">Oyuncu</option>
          <option value="LEAGUE_MANAGER">Lig Sorumlusu</option>
          <option value="SUPER_ADMIN">Süper Admin</option>
        </select>
      </Field>
      <Field label="Bağlı oyuncu" hint="Oyuncu hesapları için zorunlu; yöneticiler de oynuyorsa seçilebilir">
        <select name="playerId" className="input" defaultValue={u?.playerId ?? ""}>
          <option value="">—</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

export default async function PanelUsers() {
  const me = await requireUser(["SUPER_ADMIN"]);
  const [users, players] = await Promise.all([
    db.user.findMany({ include: { player: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    db.player.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PanelTitle title="Kullanıcılar" subtitle="Yönetici ve oyuncu hesapları. Oyuncu hesapları Oyuncular sayfasından da açılabilir." />
      <div className="card divide-y divide-line">
        {users.map((u) => (
          <details key={u.id} className={`group px-4 py-3 ${u.active ? "" : "opacity-60"}`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-table-50 text-xs font-bold text-table-700">
                {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {u.name} {!u.active && <span className="chip ml-1 bg-line text-ink-soft">Pasif</span>}
                </p>
                <p className="truncate text-xs text-ink-soft">{u.email}{u.player && u.role !== "PLAYER" ? ` · Oyuncu: ${u.player.name}` : ""}</p>
              </div>
              <span className={`chip ${roleTone[u.role]}`}>{roleLabel[u.role]}</span>
            </summary>
            <div className="mt-4">
              <ActionForm action={updateUser.bind(null, u.id)} submitLabel="Bilgileri kaydet">
                <UserFields u={u} players={players} />
              </ActionForm>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-line pt-4">
              <ActionForm action={resetPassword.bind(null, u.id)} submitLabel="Şifreyi değiştir" submitClass="btn-ghost" className="flex flex-wrap items-end gap-3">
                <div className="w-56"><Field label="Yeni şifre"><input name="password" type="text" minLength={8} required className="input" /></Field></div>
              </ActionForm>
              {u.id !== me.id && (
                <form action={toggleUser.bind(null, u.id)}>
                  <button className={u.active ? "btn-danger" : "btn-ghost"}>{u.active ? "Hesabı pasife al" : "Hesabı aktif et"}</button>
                </form>
              )}
              {u.id !== me.id && (
                <ActionForm action={deleteUser.bind(null, u.id)} submitLabel="Hesabı sil" submitClass="btn-danger" className="space-y-2" confirm={`${u.name} hesabı kalıcı olarak silinsin mi?`}>
                  <span />
                </ActionForm>
              )}
            </div>
          </details>
        ))}
      </div>
      <section className="card mt-8 p-5">
        <h2 className="mb-4 font-bold">+ Yeni kullanıcı</h2>
        <ActionForm action={createUser} submitLabel="Kullanıcıyı oluştur" resetOnSuccess>
          <UserFields players={players} withPassword />
        </ActionForm>
      </section>
    </>
  );
}

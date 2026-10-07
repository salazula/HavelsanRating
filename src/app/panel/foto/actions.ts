"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isManager, requireUser } from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";

/** Oyuncu kendi fotoğrafını, lig sorumlusu/süper admin herkesin fotoğrafını değiştirebilir. */
async function canEdit(playerId: string) {
  const user = await requireUser();
  return user.playerId === playerId || isManager(user);
}

export async function uploadPlayerPhoto(playerId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await canEdit(playerId))) return { error: "Bu oyuncunun fotoğrafını değiştiremezsiniz." };
  const file = fd.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Fotoğraf seçin." };
  const saved = await saveImage(file);
  if ("error" in saved) return { error: saved.error };
  const prev = await db.player.findUnique({ where: { id: playerId }, select: { photoUrl: true } });
  await db.player.update({ where: { id: playerId }, data: { photoUrl: saved.url } });
  if (prev?.photoUrl) await deleteImage(prev.photoUrl);
  revalidatePath("/", "layout");
  return { ok: "Fotoğraf güncellendi." };
}

export async function removePlayerPhoto(playerId: string, _p: ActionState): Promise<ActionState> {
  if (!(await canEdit(playerId))) return { error: "Bu oyuncunun fotoğrafını değiştiremezsiniz." };
  const prev = await db.player.findUnique({ where: { id: playerId }, select: { photoUrl: true } });
  await db.player.update({ where: { id: playerId }, data: { photoUrl: null } });
  if (prev?.photoUrl) await deleteImage(prev.photoUrl);
  revalidatePath("/", "layout");
  return { ok: "Fotoğraf kaldırıldı." };
}

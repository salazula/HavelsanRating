"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createDemo, deleteDemo } from "@/lib/demo";
import { createPilot, deletePilot } from "@/lib/pilot";
import { postSampleGroupReport, sendTelegram } from "@/lib/telegram";
import type { ActionState } from "@/lib/action-state";

export async function createDemoAction(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await createDemo();
  revalidatePath("/", "layout");
  return "error" in res ? { error: res.error } : { ok: res.ok };
}

export async function deleteDemoAction(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await deleteDemo();
  revalidatePath("/", "layout");
  return "error" in res ? { error: res.error } : { ok: res.ok };
}

export async function createPilotAction(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await createPilot();
  revalidatePath("/", "layout");
  return "error" in res ? { error: res.error } : { ok: res.ok };
}

export async function deletePilotAction(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await deletePilot();
  revalidatePath("/", "layout");
  return "error" in res ? { error: res.error } : { ok: res.ok };
}

export async function testTelegram(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await sendTelegram("🏓 <b>Masa Tenisi Rating</b>\nTelegram bağlantısı çalışıyor. Grup sonuçları bu kanala gönderilecek.");
  return res.ok ? { ok: "Deneme mesajı gönderildi." } : { error: res.error };
}

export async function sendSampleReport(_p: ActionState): Promise<ActionState> {
  await requireUser(["SUPER_ADMIN"]);
  const res = await postSampleGroupReport();
  return res.ok ? { ok: "Örnek grup sonucu kanala gönderildi." } : { error: res.error };
}

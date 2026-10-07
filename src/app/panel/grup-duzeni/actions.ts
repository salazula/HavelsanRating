"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SLOTS } from "@/lib/schedule";
import type { ActionState } from "@/lib/action-state";

const MANAGERS = ["SUPER_ADMIN", "LEAGUE_MANAGER"] as const;
const schema = z.object({
  code: z.string().trim().toUpperCase().min(1, "Grup kodu girin").max(3),
  place: z.string().trim().max(80).transform((v) => v || null),
  size: z.coerce.number().int().min(2, "Kişi sayısı en az 2").max(12, "Kişi sayısı en fazla 12"),
  order: z.coerce.number().int().min(0).max(99),
});

function refresh() {
  revalidatePath("/panel", "layout");
}

export async function saveSlot(id: string | null, _p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const other = await db.groupSlot.findUnique({ where: { code: parsed.data.code } });
  if (other && other.id !== id) return { error: `${parsed.data.code} grubu zaten var.` };
  if (id) await db.groupSlot.update({ where: { id }, data: parsed.data });
  else await db.groupSlot.create({ data: parsed.data });
  refresh();
  return { ok: id ? "Kaydedildi. Değişiklik bir sonraki haftadan itibaren geçerli." : `${parsed.data.code} grubu eklendi.` };
}

export async function deleteSlot(id: string, _p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  await db.groupSlot.delete({ where: { id } }).catch(() => null);
  refresh();
  return { ok: "Grup silindi." };
}

export async function loadDefaultSlots(_p: ActionState): Promise<ActionState> {
  await requireUser([...MANAGERS]);
  if (await db.groupSlot.count()) return { error: "Grup düzeni zaten tanımlı." };
  await db.groupSlot.createMany({ data: DEFAULT_SLOTS.map((s, i) => ({ ...s, order: i })) });
  refresh();
  return { ok: "Varsayılan grup düzeni yüklendi." };
}

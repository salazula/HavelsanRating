"use client";

import { useRef, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Avatar, Notice } from "./ui";

const SIDE = 600;

/** Fotoğrafı tarayıcıda ortadan kare kırpar ve 600px JPEG'e küçültür. */
export async function squareShrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const out = Math.min(SIDE, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoUpload({
  name,
  photoUrl,
  upload,
  remove,
}: {
  name: string;
  photoUrl: string | null;
  upload: (p: ActionState, fd: FormData) => Promise<ActionState>;
  remove: (p: ActionState) => Promise<ActionState>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<ActionState>(undefined);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setMsg(undefined);
    const fd = new FormData();
    fd.append("photo", await squareShrink(f));
    setMsg(await upload(undefined, fd));
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} photoUrl={photoUrl} size="xl" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className={`btn-primary cursor-pointer ${busy ? "opacity-50" : ""}`}>
            {busy ? "Yükleniyor…" : photoUrl ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
            <input ref={input} type="file" accept="image/*" className="hidden" disabled={busy} onChange={onPick} />
          </label>
          {photoUrl && (
            <button type="button" className="btn-ghost" disabled={busy} onClick={async () => setMsg(await remove(undefined))}>
              Kaldır
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft">Fotoğraf kare olarak kırpılır.</p>
        {msg?.error && <Notice tone="error">{msg.error}</Notice>}
        {msg?.ok && <Notice tone="success">{msg.ok}</Notice>}
      </div>
    </div>
  );
}

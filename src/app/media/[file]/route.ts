import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

const types: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file);
  const type = types[path.extname(name).toLowerCase()];
  if (!type || name !== file) return new Response("Bulunamadı", { status: 404 });
  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}

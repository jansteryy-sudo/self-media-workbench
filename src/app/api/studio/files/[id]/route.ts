import { dataRoot } from "@/lib/storage-path";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });
  try {
    const root = path.join(dataRoot, "studio-files");
    const m = JSON.parse(
      await fs.readFile(path.join(root, id + ".json"), "utf8"),
    );
    const data = await fs.readFile(path.join(root, id));
    const inline =
      /^(image\/(png|jpeg|gif|webp)|video\/(mp4|webm)|application\/pdf)$/.test(
        m.mime,
      ) && !req.nextUrl.searchParams.has("download");
    return new Response(data, {
      headers: {
        "Content-Type": inline ? m.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(m.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

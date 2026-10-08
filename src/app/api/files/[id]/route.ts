import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { db, storageRoot } from "@/db";
import { files } from "@/db/schema";
import { guard, errorResponse } from "@/lib/server";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    guard(request);
    const { id } = await params;
    const f = db.select().from(files).where(eq(files.id, id)).get();
    if (!f) return new NextResponse("文件不存在", { status: 404 });
    const safe =
      /^(image\/(png|jpeg|gif|webp)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf|text\/plain)$/.test(
        f.mime,
      );
    const content = await fs.readFile(path.join(storageRoot, f.path));
    return new NextResponse(content, {
      headers: {
        "Content-Type": safe ? f.mime : "application/octet-stream",
        "Content-Disposition": `${request.nextUrl.searchParams.has("download") || !safe ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

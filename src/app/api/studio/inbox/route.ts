import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import { incoming, studioRoot } from "@/lib/studio-mcp";
import fs from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    guard(req);
    return NextResponse.json({ items: await incoming() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length > 10000) throw Error("记录无效");
    await fs.mkdir(studioRoot, { recursive: true, mode: 0o700 });
    const p = path.join(studioRoot, crypto.randomUUID() + ".tmp");
    await fs.writeFile(p, JSON.stringify(items), { mode: 0o600 });
    await fs.rename(p, path.join(studioRoot, "snapshot.json"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

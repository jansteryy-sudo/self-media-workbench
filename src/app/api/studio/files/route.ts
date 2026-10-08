import { dataRoot } from "@/lib/storage-path";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { guard, errorResponse } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw Error("请选择非空文件");
    if (file.size > 100 * 1024 * 1024) throw Error("单个文件最大 100MB");
    const id = crypto.randomUUID();
    const root = path.join(dataRoot, "studio-files");
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const meta = {
      id,
      name: path.basename(file.name),
      mime: file.type || "application/octet-stream",
      size: file.size,
      url: "/api/studio/files/" + id,
    };
    await fs.writeFile(
      path.join(root, id),
      Buffer.from(await file.arrayBuffer()),
      { mode: 0o600 },
    );
    await fs.writeFile(path.join(root, id + ".json"), JSON.stringify(meta), {
      mode: 0o600,
    });
    return NextResponse.json(meta);
  } catch (e) {
    return errorResponse(e);
  }
}

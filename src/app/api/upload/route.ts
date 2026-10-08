import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, id, now, storageRoot } from "@/db";
import { files, projects } from "@/db/schema";
import { guard, errorResponse } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    guard(request);
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") || "");
    if (!(file instanceof File) || !file.size) throw Error("请选择非空文件");
    if (file.size > 100 * 1024 * 1024) throw Error("单个文件不能超过 100 MB");
    if (!db.select().from(projects).where(eq(projects.id, projectId)).get())
      throw Error("项目不存在");
    const key = id();
    const name = path.basename(file.name);
    const relative = path.join("projects", projectId, "files", key);
    const dest = path.join(storageRoot, relative);
    await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
    await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()), {
      mode: 0o600,
    });
    try {
      db.insert(files)
        .values({
          id: key,
          projectId,
          name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          path: relative,
          createdAt: now(),
        })
        .run();
    } catch (e) {
      await fs.unlink(dest);
      throw e;
    }
    return NextResponse.json({ id: key, name });
  } catch (e) {
    return errorResponse(e);
  }
}

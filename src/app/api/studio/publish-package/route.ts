import { dataRoot } from "@/lib/storage-path";
import { NextRequest } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import { itemSchema } from "@/lib/studio-records";
import { studioAccounts } from "@/lib/studio-mcp";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
export const runtime = "nodejs";
const run = promisify(execFile);
export async function POST(req: NextRequest) {
  let temp = "";
  try {
    guard(req);
    const item = itemSchema.parse(await req.json());
    const a = (await studioAccounts()).find((a) => a.id === item.account);
    if (!a) throw Error("账号不存在");
    temp = await fs.mkdtemp(path.join(os.tmpdir(), "workbench-publish-"));
    const folder = path.join(temp, "发布包");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "标题.txt"), item.title);
    await fs.writeFile(path.join(folder, "正文.md"), item.body);
    await fs.writeFile(path.join(folder, "标签.txt"), item.tags || "");
    await fs.writeFile(
      path.join(folder, "发布说明.json"),
      JSON.stringify(
        {
          title: item.title,
          account: a.name,
          platform: a.platform,
          date: item.date,
          tags: item.tags || "",
          manualPublishing: true,
          files: item.files || [],
        },
        null,
        2,
      ),
    );
    await fs.writeFile(
      path.join(folder, "使用说明.txt"),
      "请检查标题、正文和物料后，手动前往社交平台发布。正文.md 保留 Markdown 格式，带格式复制请在工作台正文预览中操作。发布后在工作台回填链接和实际时间。\n",
    );
    for (const [index, f] of (item.files || []).entries()) {
      if (!/^[a-f0-9-]{36}$/.test(f.id)) throw Error("附件标识无效");
      const source = path.join(
        dataRoot,
        "studio-files",
        f.id,
      );
      try {
        await fs.copyFile(
          source,
          path.join(
            folder,
            `${index + 1}-${path.basename(f.name).replace(/[\\/:*?"<>|]/g, "-")}`,
          ),
        );
      } catch {
        throw Error("附件缺失，发布包未导出，请重新上传：" + f.name);
      }
    }
    const zip = path.join(temp, "package.zip");
    await run("/usr/bin/zip", ["-q", "-r", zip, "发布包"], { cwd: temp });
    return new Response(await fs.readFile(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.title.slice(0, 60) + "-发布包.zip")}`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  } finally {
    if (temp) await fs.rm(temp, { recursive: true, force: true });
  }
}

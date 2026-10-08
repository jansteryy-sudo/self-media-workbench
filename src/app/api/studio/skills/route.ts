import { dataRoot } from "@/lib/storage-path";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { guard, errorResponse } from "@/lib/server";
const run = promisify(execFile);
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const { id } = await req.json();
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
      throw Error("文件标识无效");
    const root = path.join(dataRoot, "studio-files"),
      filename = path.join(root, id);
    const meta = JSON.parse(await fs.readFile(filename + ".json", "utf8"));
    if (!/\.(md|zip)$/i.test(meta.name))
      throw Error("Skill 只接受 .md 或 .zip");
    let text = "",
      entries: string[] = [],
      entry = meta.name;
    if (/\.zip$/i.test(meta.name)) {
      const list = await run("/usr/bin/unzip", ["-Z1", filename], {
        maxBuffer: 1024 * 1024,
      });
      entries = list.stdout.split("\n").filter(Boolean);
      if (
        entries.length > 1000 ||
        entries.some(
          (e) =>
            e.startsWith("/") ||
            e.split("/").includes("..") ||
            e.startsWith("-"),
        )
      )
        throw Error("压缩包路径或文件数量不合法");
      const skills = entries.filter(
        (e) => /(^|\/)SKILL\.md$/i.test(e) && !e.includes("__MACOSX"),
      );
      if (skills.length !== 1)
        throw Error("ZIP 中必须包含且只包含一个 SKILL.md");
      entry = skills[0];
      text = (
        await run("/usr/bin/unzip", ["-p", filename, entry], {
          maxBuffer: 1024 * 1024,
        })
      ).stdout;
    } else {
      text = await fs.readFile(filename, "utf8");
      if (Buffer.byteLength(text) > 1024 * 1024)
        throw Error("Skill 文档最大 1MB");
    }
    if (text.includes("\0") || text.trim().length < 30)
      throw Error("Skill 内容为空、过短或不是文本");
    const front = text.match(/^---\s*\n([\s\S]*?)\n---/);
    const name =
      front?.[1].match(/^name:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, "") ||
      text.match(/^#\s+(.+)$/m)?.[1];
    const description =
      front?.[1]
        .match(/^description:\s*(.+)$/m)?.[1]
        ?.replace(/^['"]|['"]$/g, "") || "";
    const warnings: string[] = [];
    if (!front) warnings.push("缺少 YAML 元数据，采用 Markdown 标题识别");
    if (!description) warnings.push("未声明 description，执行前需补充适用条件");
    const body = front ? text.slice(front[0].length).trim() : text.trim();
    if (!name || body.length < 20)
      throw Error("需要 Skill 名称（name 或一级标题）及有效的操作说明");
    const references = [...text.matchAll(/\]\(([^)]+)\)/g)]
      .map((m) => m[1])
      .filter((x) => !/^https?:|^#/.test(x));
    if (references.length)
      warnings.push("存在本地文件引用，执行前需检查依赖是否齐全");
    return NextResponse.json({
      name,
      description,
      entry,
      files: entries.length || 1,
      valid: true,
      warnings,
      preview: body.slice(0, 700),
      execution: "未验证模型、工具及脚本依赖；通过格式识别不代表可直接执行",
    });
  } catch (e) {
    return errorResponse(e);
  }
}

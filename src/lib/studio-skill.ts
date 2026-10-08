import { dataRoot } from "@/lib/storage-path";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
export async function readSkill(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("Skill 文件标识无效");
  const file = path.join(dataRoot, "studio-files", id);
  const meta = JSON.parse(await fs.readFile(file + ".json", "utf8"));
  let text = "";
  if (/\.md$/i.test(meta.name)) {
    const stat = await fs.stat(file);
    if (stat.size > 1024 * 1024) throw Error("Skill 文档过大");
    text = await fs.readFile(file, "utf8");
  } else if (/\.zip$/i.test(meta.name)) {
    const entries = (
      await run("/usr/bin/unzip", ["-Z1", file], { maxBuffer: 1024 * 1024 })
    ).stdout
      .split("\n")
      .filter(Boolean);
    if (
      entries.length > 1000 ||
      entries.some(
        (e) =>
          e.startsWith("/") || e.startsWith("-") || e.split("/").includes(".."),
      )
    )
      throw Error("Skill ZIP 路径无效");
    const md = entries.filter(
      (e) => /(^|\/)SKILL\.md$/i.test(e) && !e.includes("__MACOSX"),
    );
    if (md.length !== 1) throw Error("Skill ZIP 需要一个 SKILL.md");
    text = (
      await run("/usr/bin/unzip", ["-p", file, md[0]], {
        maxBuffer: 1024 * 1024,
      })
    ).stdout;
    if (
      entries.some(
        (e) => !e.endsWith("/") && !/__MACOSX/.test(e) && e !== md[0],
      )
    )
      throw Error(
        "这个 Skill 包含额外依赖；当前文本执行器只支持独立 SKILL.md，请先提供无依赖版本",
      );
  } else throw Error("Skill 只支持 MD 或 ZIP");
  if (text.length < 30 || text.includes("\0")) throw Error("Skill 内容无效");
  if (/\]\((?!https?:|#)[^)]+\)/.test(text))
    throw Error("Skill 有本地文件依赖，当前文本执行器尚不支持");
  return text;
}

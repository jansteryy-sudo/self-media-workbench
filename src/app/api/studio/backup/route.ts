import { dataRoot } from "@/lib/storage-path";
import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import {
  readState,
  stateSchema,
  serialize,
  writeState,
} from "@/lib/studio-state";
import { studioAccounts, studioRoot, incoming } from "@/lib/studio-mcp";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
const filesRoot = path.join(dataRoot, "studio-files");
const accountSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  platform: z.enum(["小红书", "抖音", "公众号"]),
  initial: z.string(),
  color: z.string(),
  direction: z.string(),
  goal: z.string(),
  family: z.string(),
  homepage: z.string().optional(),
  platformId: z.string().optional(),
  avatar: z.string().optional(),
});
const backupSchema = z.object({
  format: z.literal("personal-workbench-v1"),
  state: stateSchema,
  accounts: z.array(accountSchema).max(1000),
  files: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().max(500),
        mime: z.string().max(200),
        data: z.string().max(140000000),
      }),
    )
    .max(10000),
});
export async function GET(req: NextRequest) {
  try {
    guard(req);
    const state = await readState();
    if (!state) throw Error("请先保存工作台数据");
    const received = await incoming();
    state.items.push(
      ...received.filter((r) => !state.items.some((i) => i.id === r.id)),
    );
    const ids = new Set<string>(
      state.items.flatMap((i) => (i.files || []).map((f) => f.id)),
    );
    for (const job of state.jobs) {
      const skill = job.skill as { id?: string } | undefined;
      if (skill?.id) ids.add(skill.id);
    }
    for (const skill of state.skills) {
      if (typeof skill.id === "string") ids.add(skill.id);
    }
    const files = [];
    let total = 0;
    for (const id of ids) {
      if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("附件标识无效");
      let bytes: Buffer, meta;
      try {
        bytes = await fs.readFile(path.join(filesRoot, id));
        meta = JSON.parse(
          await fs.readFile(path.join(filesRoot, id + ".json"), "utf8"),
        );
      } catch {
        throw Error("备份附件缺失，请重新上传或移除无效附件");
      }
      total += bytes.length;
      if (total > 200 * 1024 * 1024)
        throw Error(
          "当前整包备份支持附件合计 200MB，请另行复制本机数据目录保存大文件",
        );
      files.push({
        id,
        name: meta.name,
        mime: meta.mime,
        data: bytes.toString("base64"),
      });
    }
    return NextResponse.json(
      {
        format: "personal-workbench-v1",
        createdAt: new Date().toISOString(),
        state,
        accounts: await studioAccounts(),
        files,
      },
      {
        headers: {
          "Content-Disposition": "attachment; filename=workbench-backup.json",
        },
      },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File) || f.size > 300 * 1024 * 1024)
      throw Error("请选择 300MB 以内的工作台 JSON 备份");
    const value = backupSchema.parse(JSON.parse(await f.text()));
    const ids = value.accounts.map((a) => a.id);
    if (value.state.items.some((i) => !ids.includes(i.account)))
      throw Error("备份中有内容引用不存在的账号");
    const decoded = value.files.map((f) => ({
      ...f,
      bytes: Buffer.from(f.data, "base64"),
    }));
    if (decoded.reduce((s, f) => s + f.bytes.length, 0) > 200 * 1024 * 1024)
      throw Error("附件合计超过 200MB");
    const restoredIds = new Set(decoded.map((f) => f.id));
    if (
      value.state.items.some((i) =>
        i.files?.some((f) => !restoredIds.has(f.id)),
      )
    )
      throw Error("备份缺少内容附件");
    return await serialize(async () => {
      const current = await readState();
      await fs.mkdir(studioRoot, { recursive: true, mode: 0o700 });
      if (current)
        await fs.writeFile(
          path.join(studioRoot, "before-restore-" + Date.now() + ".json"),
          JSON.stringify({ state: current, accounts: await studioAccounts() }),
          { mode: 0o600 },
        );
      await fs.mkdir(filesRoot, { recursive: true, mode: 0o700 });
      for (const f of decoded) {
        const metadata = {
          id: f.id,
          name: f.name,
          mime: f.mime,
          size: f.bytes.length,
          url: "/api/studio/files/" + f.id,
        };
        await fs.writeFile(path.join(filesRoot, f.id), f.bytes, {
          mode: 0o600,
        });
        await fs.writeFile(
          path.join(filesRoot, f.id + ".json"),
          JSON.stringify(metadata),
          { mode: 0o600 },
        );
      }
      await fs.writeFile(
        path.join(studioRoot, "accounts.json"),
        JSON.stringify(value.accounts),
        { mode: 0o600 },
      );
      // Preserve incoming results as an archive so restoring does not re-insert old records.
      try {
        await fs.rename(
          path.join(studioRoot, "inbox"),
          path.join(studioRoot, "inbox-before-restore-" + Date.now()),
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      const state = await writeState(value.state);
      return NextResponse.json({ state, accounts: value.accounts });
    });
  } catch (e) {
    return errorResponse(e);
  }
}

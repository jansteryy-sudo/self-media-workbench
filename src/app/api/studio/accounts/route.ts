import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import { studioAccounts, studioRoot } from "@/lib/studio-mcp";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
const schema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z.string().trim().min(1, "请填写账号名称").max(100),
  platform: z.string().trim().min(1, "请填写平台名称").max(100),
  homepage: z
    .string()
    .max(1000)
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "主页链接须以 https:// 或 http:// 开头",
    ),
  platformId: z.string().max(200),
  avatar: z.string().max(2000000),
  direction: z.string().max(5000),
  goal: z.string().max(2000),
  family: z.string().max(500),
});
export async function GET(req: NextRequest) {
  try {
    guard(req);
    return NextResponse.json({ accounts: await studioAccounts() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const input = schema.parse(await req.json());
    const accounts = await studioAccounts();
    if (input.id && !accounts.some((a) => a.id === input.id))
      throw Error("账号不存在");
    if (
      accounts.some(
        (a) =>
          a.id !== input.id &&
          a.platform === input.platform &&
          ((input.platformId && a.platformId === input.platformId) ||
            a.name === input.name),
      )
    )
      throw Error("该平台已有同名或同 ID 账号，请编辑已有账号");
    const old = accounts.find((a) => a.id === input.id);
    const account = {
      ...input,
      id: old?.id || crypto.randomUUID(),
      initial: input.name.slice(0, 1),
      color:
        old?.color ||
        ["#c85a6f", "#627294", "#42976c", "#c18a4f"][accounts.length % 4],
    };
    const next = old
      ? accounts.map((a) => (a.id === old.id ? account : a))
      : [...accounts, account];
    await fs.mkdir(studioRoot, { recursive: true, mode: 0o700 });
    const temp = path.join(studioRoot, crypto.randomUUID() + ".tmp");
    await fs.writeFile(temp, JSON.stringify(next), { mode: 0o600 });
    await fs.rename(temp, path.join(studioRoot, "accounts.json"));
    return NextResponse.json({ accounts: next, account });
  } catch (e) {
    return errorResponse(e);
  }
}

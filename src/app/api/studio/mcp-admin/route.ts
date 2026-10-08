import { NextRequest, NextResponse } from "next/server";
import { config, writeConfig } from "@/lib/studio-mcp";
import { guard, errorResponse } from "@/lib/server";
import { randomBytes, createHash } from "node:crypto";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    guard(req);
    const c = await config();
    return NextResponse.json({
      enabled: c.enabled,
      clients: c.clients.map(({ hash, ...v }) => {
        void hash;
        return v;
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const { action, name, id } = await req.json();
    const c = await config();
    if (action === "enable") c.enabled = true;
    else if (action === "disable") c.enabled = false;
    else if (action === "revoke")
      c.clients = c.clients.filter((v) => v.id !== id);
    else if (action === "client") {
      if (!c.enabled) throw Error("请先启用 MCP");
      const token = randomBytes(32).toString("hex");
      const client = {
        id: crypto.randomUUID(),
        name: String(name || "AI 工具").slice(0, 80),
        hash: createHash("sha256").update(token).digest("hex"),
        createdAt: new Date().toISOString(),
      };
      c.clients.push(client);
      await writeConfig(c);
      return NextResponse.json({ id: client.id, token });
    } else throw Error("操作无效");
    await writeConfig(c);
    return NextResponse.json({ enabled: c.enabled });
  } catch (e) {
    return errorResponse(e);
  }
}

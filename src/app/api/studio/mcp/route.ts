import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config, incoming, studioRoot, studioAccounts } from "@/lib/studio-mcp";

import { readState } from "@/lib/studio-state";
import { recordChange } from "@/lib/studio-records";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const c = await config();
  if (!c.enabled) return new Response("MCP disabled", { status: 503 });
  const token =
    req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  const digest = createHash("sha256").update(token).digest();
  const client = c.clients.find((v) =>
    timingSafeEqual(Buffer.from(v.hash, "hex"), digest),
  );
  if (!client) return new Response("Unauthorized", { status: 401 });
  const server = new McpServer({ name: "creator-workbench", version: "0.1.0" });
  const result = (v: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(v) }],
  });
  server.registerTool(
    "list_accounts",
    { description: "列出工作台账号及平台" },
    async () => result(await studioAccounts()),
  );
  server.registerTool(
    "list_work_items",
    {
      description: "读取工作台内容和任务",
      inputSchema: { accountId: z.string().optional() },
    },
    async ({ accountId }) => {
      let local: { id: string; account: string }[] = [];
      try {
        local = (await readState())?.items || [];
      } catch {}
      const received = await incoming();
      const all = [
        ...local,
        ...received.filter((r) => !local.some((v) => v.id === r.id)),
      ];
      return result(
        accountId ? all.filter((v) => v.account === accountId) : all,
      );
    },
  );
  server.registerTool(
    "push_content",
    {
      description: "将成果写入账号工作区；不会向社交平台发布",
      inputSchema: {
        accountId: z.string(),
        title: z.string().min(1).max(500),
        body: z.string().max(200000),
        stage: z.enum([
          "灵感收集",
          "热点与爆款调研",
          "选题池",
          "内容制作",
          "内容审核",
          "发布计划",
          "数据复盘",
          "发布资产库",
          "商品与赠品",
          "知识与经验",
        ]),
        format: z.string().optional(),
      },
    },
    async ({ accountId, title, body, stage, format }) => {
      if (!(await studioAccounts()).some((a) => a.id === accountId))
        return {
          isError: true,
          ...result({ error: "账号不存在，请先调用 list_accounts" }),
        };
      const id = crypto.randomUUID();
      const item = recordChange(
        {
          id,
          account: accountId,
          title,
          body,
          kind: stage,
          status: stage === "发布计划" ? "待手动发布" : "新收到",
          source: client.name + " · MCP",
          date: "",
          createdAt: new Date().toISOString(),
          url: "",
          type: format || "标题正文",
        },
        undefined,
        "外部 AI 写入",
      );
      const root = path.join(studioRoot, "inbox");
      await fs.mkdir(root, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(root, id + ".json"), JSON.stringify(item), {
        mode: 0o600,
      });
      return result({ id, saved: true, stage });
    },
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

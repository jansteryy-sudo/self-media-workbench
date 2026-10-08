import { eq } from "drizzle-orm";
import { db } from "../db";
import { settings } from "../db/schema";
import type { Connection, ProviderId } from "../types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
const definitions = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "思考、写作与日常探索",
    url: "https://chatgpt.com/",
    modes: ["external"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "深度推理与代码伙伴",
    url: "https://chat.deepseek.com/",
    modes: ["external", "api"],
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  {
    id: "qwen",
    name: "千问",
    description: "中文创作与知识问答",
    url: "https://www.qianwen.com/",
    modes: ["external", "api"],
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  {
    id: "lovart",
    name: "Lovart",
    description: "把灵感变成视觉作品",
    url: "https://www.lovart.ai/",
    modes: ["external"],
  },
  {
    id: "jimeng",
    name: "即梦",
    description: "图片与视频创作",
    url: "https://jimeng.jianying.com/",
    modes: ["external"],
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    description: "连接你的本地 AI 工具",
    url: "",
    modes: ["mcp"],
  },
] as const;
export function getSecret(provider: string) {
  return provider === "deepseek"
    ? process.env.DEEPSEEK_API_KEY
    : provider === "qwen"
      ? process.env.QWEN_API_KEY
      : provider === "openclaw"
        ? process.env.OPENCLAW_MCP_TOKEN
        : undefined;
}
export function connections(): Connection[] {
  return definitions.map((d) => {
    const row = db.select().from(settings).where(eq(settings.id, d.id)).get();
    const s = row ? JSON.parse(row.value) : {};
    const configured =
      d.id === "openclaw"
        ? Boolean(s.baseUrl && s.toolName)
        : Boolean(getSecret(d.id));
    return {
      baseUrl: "",
      model: "",
      transport: "streamable-http",
      toolName: "",
      argumentTemplate:
        '{"message":"{{message}}","context":"{{context}}","sessionId":"{{sessionId}}"}',
      lastTest: "",
      error: "",
      ...d,
      ...s,
      configured,
      capabilities:
        d.id === "openclaw"
          ? configured
            ? ["sendText", "sessions"]
            : []
          : [...["launch"], ...(configured ? ["sendText", "sessions"] : [])],
      status: s.error
        ? "Error"
        : s.lastTest && configured
          ? "Connected"
          : configured
            ? "待测试"
            : d.id === "openclaw"
              ? "Not configured"
              : "External",
    } as Connection;
  });
}
export function getConnection(provider: string) {
  const c = connections().find((c) => c.id === provider);
  if (!c) throw Error("未知 AI 应用");
  return c;
}
export function saveConnection(
  provider: ProviderId,
  value: Partial<Connection>,
) {
  const current = getConnection(provider);
  const merged = {
    url: current.url,
    baseUrl: current.baseUrl,
    model: current.model,
    transport: current.transport,
    toolName: current.toolName,
    argumentTemplate: current.argumentTemplate,
    lastTest: current.lastTest,
    error: current.error,
    ...value,
  };
  db.insert(settings)
    .values({ id: provider, value: JSON.stringify(merged) })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value: JSON.stringify(merged) },
    })
    .run();
}
export async function apiChat(
  provider: string,
  messages: { role: string; content: string }[],
) {
  const c = getConnection(provider);
  const secret = getSecret(provider);
  if (!secret)
    throw Error("尚未配置 API Key，请在 .env.local 中添加密钥并重启服务。");
  let response: Response;
  try {
    response = await fetch(`${c.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: c.model, messages, stream: false }),
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    throw Error("连接超时或网络不可用，请检查服务地址后重试。");
  }
  if (!response.ok)
    throw Error(
      response.status === 401 || response.status === 403
        ? "认证失败，请检查 API Key 和该模型的访问权限。"
        : response.status === 429
          ? "调用过于频繁或额度不足，请稍后重试。"
          : `AI 服务返回错误（${response.status}），请检查模型配置。`,
    );
  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw Error("服务未返回文本结果，请检查所选模型。");
  return text;
}
async function withMcp<T>(fn: (client: Client) => Promise<T>) {
  const c = getConnection("openclaw");
  if (!c.baseUrl)
    throw Error(
      "请先配置真实的 MCP Server 地址；OpenClaw 网关地址不能直接作为 MCP 地址。",
    );
  const client = new Client({
    name: "personal-ai-workbench",
    version: "0.1.0",
  });
  const token = getSecret("openclaw");
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const options = {
    requestInit: { headers, signal: AbortSignal.timeout(90000) },
  };
  const transport =
    c.transport === "sse"
      ? new SSEClientTransport(new URL(c.baseUrl), options)
      : new StreamableHTTPClientTransport(new URL(c.baseUrl), options);
  try {
    await client.connect(transport, { timeout: 15000 });
    return await fn(client);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("请")) throw e;
    throw Error(
      "MCP 连接或工具调用失败，请检查地址、认证、transport 和工具参数。",
    );
  } finally {
    await client.close().catch(() => {});
  }
}
export async function listMcpTools() {
  return withMcp(async (client) => (await client.listTools()).tools);
}
function substitute(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value === "string")
    return value.replace(
      /\{\{(message|context|sessionId)\}\}/g,
      (_, key) => vars[key],
    );
  if (Array.isArray(value)) return value.map((v) => substitute(v, vars));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substitute(v, vars)]),
    );
  return value;
}
export async function mcpChat(
  message: string,
  context: string,
  sessionId: string,
) {
  const c = getConnection("openclaw");
  if (!c.toolName)
    throw Error("请先测试 MCP 连接并选择 Server 实际提供的消息工具。");
  return withMcp(async (client) => {
    const args = substitute(JSON.parse(c.argumentTemplate), {
      message,
      context,
      sessionId,
    }) as Record<string, unknown>;
    const result = await client.callTool(
      { name: c.toolName, arguments: args },
      undefined,
      { timeout: 90000 },
    );
    if (result.isError)
      throw Error("请检查 MCP 工具参数，服务端返回了工具执行错误。");
    return JSON.stringify(result, null, 2);
  });
}

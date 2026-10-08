import { sealSecret } from "@/lib/studio-secrets";
import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import fs from "node:fs/promises";
import path from "node:path";
import { studioRoot } from "@/lib/studio-mcp";
export const runtime = "nodejs";
const endpoints: Record<string, string> = {
  openai: "https://api.openai.com/v1/models",
  anthropic: "https://api.anthropic.com/v1/models?limit=1000",
  gemini:
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
  deepseek: "https://api.deepseek.com/models",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
  siliconflow: "https://api.siliconflow.cn/v1/models?sub_type=chat",
  moonshot: "https://api.moonshot.cn/v1/models",
};
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const { apiKey, provider, action, model } = await req.json();
    if (
      typeof apiKey !== "string" ||
      apiKey.length < 15 ||
      apiKey.length > 500 ||
      /\s/.test(apiKey)
    )
      throw Error("密钥格式无效");
    if (!Object.hasOwn(endpoints, provider))
      throw Error("该服务商尚未支持自动获取模型，请选择已支持的 API");
    const headers: Record<string, string> =
      provider === "anthropic"
        ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
        : provider === "gemini"
          ? { "x-goog-api-key": apiKey }
          : { Authorization: "Bearer " + apiKey };
    const r = await fetch(endpoints[provider], {
      headers,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "error",
    });
    if (!r.ok)
      throw Error(
        r.status === 401 || r.status === 403
          ? "密钥无效、服务商不匹配或没有访问权限"
          : r.status === 404
            ? "该服务当前不提供模型列表，尚不支持自动配置"
            : "服务商返回错误 " + r.status + "，请稍后重试",
      );
    const data = await r.json();
    const models = provider === "gemini" ? data.models : data.data;
    if (!Array.isArray(models) || !models.length)
      throw Error("未获得可用模型列表");
    if (action === "save") {
      const valid = models.some(
        (m: { id?: string; name?: string }) =>
          (m.id || m.name?.replace(/^models\//, "")) === model,
      );
      if (!valid) throw Error("模型不在服务商返回的列表中");
      await fs.mkdir(path.join(studioRoot, "models"), {
        recursive: true,
        mode: 0o700,
      });
      await fs.writeFile(
        path.join(studioRoot, "models", provider + ".json"),
        JSON.stringify({ provider, model, apiKey: sealSecret(apiKey) }),
        { mode: 0o600 },
      );
      return NextResponse.json({ saved: true, provider, model });
    }
    return NextResponse.json({
      provider,
      models: models
        .filter(
          (m: { supportedGenerationMethods?: string[] }) =>
            provider !== "gemini" ||
            m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map(
          (m: {
            id?: string;
            name?: string;
            display_name?: string;
            displayName?: string;
          }) => ({
            id: m.id || m.name?.replace(/^models\//, ""),
            name: m.display_name || m.displayName || m.id || m.name,
          }),
        ),
    });
  } catch (e) {
    const msg =
      e instanceof Error && /timeout|fetch failed/i.test(e.message)
        ? Error("无法连接服务商，请检查网络或服务区域")
        : e;
    return errorResponse(msg);
  }
}

export async function GET(req: NextRequest) {
  try {
    guard(req);
    let names: string[] = [];
    try {
      names = await fs.readdir(path.join(studioRoot, "models"));
    } catch {}
    const connections = await Promise.all(
      names
        .filter((n) => /^[a-z]+\.json$/.test(n))
        .map(async (n) => {
          const data = JSON.parse(
            await fs.readFile(path.join(studioRoot, "models", n), "utf8"),
          );
          return { provider: data.provider, model: data.model };
        }),
    );
    return NextResponse.json({ connections });
  } catch (e) {
    return errorResponse(e);
  }
}

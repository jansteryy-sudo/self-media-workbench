import { unsealSecret } from "./studio-secrets";
import fs from "node:fs/promises";
import path from "node:path";
import { studioRoot } from "./studio-mcp";
const compatible: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  siliconflow: "https://api.siliconflow.cn/v1/chat/completions",
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
};
export async function generate(
  provider: string,
  system: string,
  prompt: string,
  fetcher: typeof fetch = fetch,
) {
  if (
    !Object.hasOwn(compatible, provider) &&
    !["anthropic", "gemini"].includes(provider)
  )
    throw Error("请选择已配置的服务商");
  let config: { apiKey: string; model: string };
  try {
    config = JSON.parse(
      await fs.readFile(
        path.join(studioRoot, "models", provider + ".json"),
        "utf8",
      ),
    );
  } catch {
    throw Error("请先在 AI 配置中保存 API 和具体模型");
  }
  config.apiKey = unsealSecret(config.apiKey);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let url = compatible[provider],
    body: unknown;
  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: config.model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: prompt }],
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
    headers["x-goog-api-key"] = config.apiKey;
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };
  } else {
    headers.Authorization = "Bearer " + config.apiKey;
    body = {
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...(provider === "openai"
        ? { max_completion_tokens: 4096 }
        : { max_tokens: 4096 }),
    };
  }
  let r: Response;
  try {
    r = await fetcher(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
      redirect: "error",
    });
  } catch {
    throw Error("模型连接失败或超时，请检查网络后重试");
  }
  if (!r.ok)
    throw Error(
      r.status === 401 || r.status === 403
        ? "模型密钥无效或无调用权限"
        : r.status === 429
          ? "模型额度不足或请求过快"
          : `模型请求失败（${r.status}），请检查模型是否支持文本对话`,
    );
  const d = await r.json();
  const text =
    provider === "anthropic"
      ? d.content
          ?.filter((v: { type: string }) => v.type === "text")
          .map((v: { text: string }) => v.text)
          .join("\n")
      : provider === "gemini"
        ? d.candidates?.[0]?.content?.parts
            ?.filter((v: { thought?: boolean }) => !v.thought)
            .map((v: { text?: string }) => v.text || "")
            .join("\n")
        : d.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw Error("模型未返回有效正文，请更换模型");
  return text;
}

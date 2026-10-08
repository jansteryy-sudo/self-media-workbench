"use client";
import { useEffect, useState } from "react";
export function McpSetup() {
  const [enabled, setEnabled] = useState(false),
    [clients, setClients] = useState<{ id: string; name: string }[]>([]),
    [name, setName] = useState(""),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [url, setUrl] = useState("");
  async function refresh() {
    const r = await fetch("/api/studio/mcp-admin");
    const d = await r.json();
    setEnabled(d.enabled);
    setClients(d.clients || []);
  }
  useEffect(() => {
    setTimeout(() => {
      setUrl(location.origin + "/api/studio/mcp");
      void refresh();
    }, 0);
  }, []);
  async function action(action: string, id?: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/studio/mcp-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, name, id }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (d.token) {
        setToken(d.token);
        setMessage("已生成独立凭证，请复制到对应 AI 工具。");
      } else setMessage(action === "enable" ? "本机 MCP 已启用" : "设置已更新");
      await refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sv-mcp-guide">
      <strong>一个工作台，连接多个 AI 工具 / Agent</strong>
      <p>状态：{enabled ? "本机服务已启用" : "尚未启用"}</p>
      <button
        className="sv-primary"
        disabled={busy}
        onClick={() => action(enabled ? "disable" : "enable")}
      >
        {enabled ? "停止本机 MCP" : "一键启用本机 MCP"}
      </button>
      {enabled && (
        <>
          <label>
            接入地址
            <input readOnly value={url} />
          </label>
          <label>
            AI 工具 / Agent 名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：写作助手、调研 Agent"
            />
          </label>
          <button
            disabled={busy || !name.trim()}
            onClick={() => action("client")}
          >
            生成独立访问凭证
          </button>
          {token && (
            <div>
              <label>
                访问凭证（仅此次显示）
                <input readOnly type="password" value={token} />
              </label>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(
                        { url, headers: { Authorization: "Bearer " + token } },
                        null,
                        2,
                      ),
                    );
                    setMessage("已复制地址与 Bearer 凭证");
                  } catch {
                    setMessage("复制失败，请手动复制");
                  }
                }}
              >
                复制接入信息
              </button>
            </div>
          )}
          {clients.map((c) => (
            <div className="sv-job" key={c.id}>
              <strong>{c.name}</strong>
              <button onClick={() => action("revoke", c.id)}>撤销访问</button>
            </div>
          ))}
        </>
      )}
      <p role="status">{message}</p>
      <p className="sv-note">
        本机 Streamable HTTP
        服务提供账号查询、任务读取和成果写入；工作台运行时可用。外部 AI
        应用负责添加连接与调用工具。远程访问另需部署或隧道；当前不会自动暴露公网。
      </p>
    </div>
  );
}
const providers = [
  ["openai", "OpenAI"],
  ["anthropic", "Anthropic"],
  ["gemini", "Google Gemini"],
  ["deepseek", "DeepSeek"],
  ["qwen", "通义千问 · 国内区"],
  ["moonshot", "月之暗面 / Kimi"],
  ["siliconflow", "硅基流动"],
  ["unsupported", "其他服务 / 尚未适配"],
] as const;
export function ModelSetup() {
  const [key, setKey] = useState(""),
    [provider, setProvider] = useState(""),
    [models, setModels] = useState<{ id: string; name: string }[]>([]),
    [choice, setChoice] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState("");
  useEffect(() => {
    void fetch("/api/studio/model-connect")
      .then((r) => r.json())
      .then((d) => {
        if (d.connections?.length)
          setSaved(
            d.connections
              .map(
                (v: { provider: string; model: string }) =>
                  v.provider + " · " + v.model,
              )
              .join("；"),
          );
      })
      .catch(() => {});
  }, []);
  function change(v: string) {
    setKey(v);
    setModels([]);
    setProvider(
      v.startsWith("sk-ant-")
        ? "anthropic"
        : v.startsWith("AIza")
          ? "gemini"
          : v.startsWith("sk-proj-") || v.startsWith("sk-svcacct-")
            ? "openai"
            : "",
    );
    setMessage("");
  }
  return (
    <>
      <label>
        API Key
        <input
          aria-label="模型 API Key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => change(e.target.value)}
          placeholder="粘贴 API Key"
        />
      </label>
      {key && (
        <>
          <label>
            {provider
              ? "服务商（可修正）"
              : "该密钥格式不能唯一识别，请确认服务商"}
            <select
              aria-label="API 服务商"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModels([]);
                setMessage(
                  e.target.value === "unsupported"
                    ? "该 API 暂不支持，不能自动配置。"
                    : "",
                );
              }}
            >
              <option value="">请选择服务商</option>
              {providers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <p className="sv-note">
            验证只请求所选服务商的模型列表；不会向多个平台试投密钥，不产生内容生成。
          </p>
          <button
            className="sv-primary"
            disabled={busy || !provider || provider === "unsupported"}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const r = await fetch("/api/studio/model-connect", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ apiKey: key, provider }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setModels(d.models);
                setChoice(d.models[0]?.id || "");
                setMessage("验证通过，请选择具体模型");
              } catch (e) {
                setMessage(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "正在识别与验证…" : "验证 API 并获取模型"}
          </button>
        </>
      )}
      {message && <p role="alert">{message}</p>}
      {models.length > 0 && (
        <div
          className="sv-model-choice"
          role="dialog"
          aria-label="选择 API 模型"
        >
          <h3>选择具体模型</h3>
          <select
            aria-label="具体模型"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            className="sv-primary"
            onClick={async () => {
              try {
                const r = await fetch("/api/studio/model-connect", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "save",
                    apiKey: key,
                    provider,
                    model: choice,
                  }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setSaved(
                  providers.find((p) => p[0] === provider)?.[1] +
                    " · " +
                    choice,
                );
                setKey("");
                setModels([]);
                setMessage("配置已保存在本机；任务执行器尚未接入");
              } catch (e) {
                setMessage(String(e));
              }
            }}
          >
            保存模型配置
          </button>
        </div>
      )}
      {saved && <p>已配置：{saved}</p>}
      <p className="sv-note">
        支持上述服务商的直连
        API；企业代理、其他区域端点及未适配服务会提示。模型列表来自服务商实际响应，列出模型不保证所有调用权限。
      </p>
    </>
  );
}

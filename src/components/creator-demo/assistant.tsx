"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, X, ArrowUp } from "lucide-react";
import {
  applyProposal,
  type Proposal,
  type WorkItem,
} from "@/lib/studio-records";
import { useAccounts } from "./account-manager";
export function Assistant({
  items,
  page,
  account,
  onApply,
  onConfigure,
}: {
  items: WorkItem[];
  page: string;
  account: string;
  onApply: (items: WorkItem[]) => void;
  onConfigure: () => void;
}) {
  const accounts = useAccounts(),
    [open, setOpen] = useState(false),
    [connections, setConnections] = useState<
      { provider: string; model: string }[]
    >([]),
    [provider, setProvider] = useState(""),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [messages, setMessages] = useState<
      { role: "user" | "assistant"; content: string }[]
    >([]),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [scope, setScope] = useState(""),
    [baseline, setBaseline] = useState("");
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ask = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string") {
        setPrompt(text);
        setOpen(true);
      }
    };
    window.addEventListener("studio-ask", ask);
    return () => window.removeEventListener("studio-ask", ask);
  }, []);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/studio/model-connect")
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setConnections(d.connections || []);
          setProvider((p) => p || d.connections?.[0]?.provider || "");
        }
      })
      .catch(() => {
        if (alive) setError("读取模型配置失败");
      });
    return () => {
      alive = false;
    };
  }, [open]);
  useEffect(() => {
    tail.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function send() {
    if (!prompt.trim() || !provider || busy) return;
    setBusy(true);
    setError("");
    setProposal(null);
    const message = prompt;
    setPrompt("");
    setMessages((v) => [...v, { role: "user", content: message }]);
    try {
      const r = await fetch("/api/studio/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          message,
          page,
          account,
          items,
          history: messages.slice(-12),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessages((v) => [
        ...v,
        {
          role: "assistant",
          content:
            d.proposal.answer +
            (d.truncated
              ? "\n\n当前数据较多，本次只读取部分内容，请缩小账号或任务范围。"
              : ""),
        },
      ]);
      setProposal(d.proposal);
      setScope(account);
      setBaseline(JSON.stringify(items));
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
      setPrompt(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="sv-ai-trigger" onClick={() => setOpen(true)}>
        <Sparkles size={16} /> AI 助手
      </button>
      {open && (
        <div className="sv-backdrop" onClick={() => setOpen(false)}>
          <section
            className="sv-drawer sv-assistant"
            role="dialog"
            aria-modal="true"
            aria-label="全局 AI 助手"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>
                <Sparkles size={19} /> AI 助手
              </h2>
              <button aria-label="关闭 AI 助手" onClick={() => setOpen(false)}>
                <X size={19} />
              </button>
            </div>
            <p className="sv-assistant-context">
              {accounts.find((a) => a.id === account)?.name || "全部账号"} ·{" "}
              {page}
            </p>
            {!connections.length ? (
              <div className="sv-assistant-empty">
                <h3>先连接一个模型</h3>
                <p>
                  复用工作台的 API
                  配置，接入后可以查询内容、生成草稿和提出修改方案。
                </p>
                <button
                  className="sv-primary"
                  onClick={() => {
                    setOpen(false);
                    onConfigure();
                  }}
                >
                  配置 AI 模型
                </button>
              </div>
            ) : (
              <>
                <select
                  aria-label="助手模型"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {connections.map((c) => (
                    <option key={c.provider} value={c.provider}>
                      {c.provider} · {c.model}
                    </option>
                  ))}
                </select>
                <p className="sv-note">
                  发送后，会将当前账号的部分内容及相关知识交给所选模型处理。
                </p>
                <div className="sv-chat">
                  {!messages.length && (
                    <>
                      <h3>从一句话开始</h3>
                      {[
                        "列出本周待处理的内容",
                        "为当前账号提出三个选题草稿",
                        "根据知识与经验总结内容规范",
                      ].map((t) => (
                        <button key={t} onClick={() => setPrompt(t)}>
                          {t}
                        </button>
                      ))}
                    </>
                  )}
                  {messages.map((m, i) => (
                    <article className={"sv-chat-" + m.role} key={i}>
                      <small>{m.role === "user" ? "你" : "AI 助手"}</small>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </article>
                  ))}
                  {busy && <p role="status">正在处理…</p>}
                  <div ref={tail} />
                </div>
                {!!proposal?.actions.length && (
                  <div className="sv-proposal">
                    <strong>待确认操作 · {proposal.actions.length} 项</strong>
                    {proposal.actions.map((a, i) => (
                      <details key={i}>
                        <summary>
                          {a.type === "create"
                            ? `新建 ${a.kind}：${a.title}`
                            : `修改：${items.find((v) => v.id === a.id)?.title || a.id}`}
                        </summary>
                        <p>
                          {a.type === "create"
                            ? accounts.find((v) => v.id === a.account)?.name
                            : "修改现有内容"}
                        </p>
                        <pre>{JSON.stringify(a, null, 2)}</pre>
                      </details>
                    ))}
                    <div className="sv-buttons">
                      <button
                        disabled={busy || scope !== account}
                        onClick={() => {
                          try {
                            if (baseline !== JSON.stringify(items))
                              throw Error(
                                "内容在方案生成后发生变化，请重新生成方案",
                              );
                            onApply(
                              applyProposal(
                                items,
                                proposal,
                                accounts.map((a) => a.id),
                              ),
                            );
                            setProposal(null);
                            setMessages((v) => [
                              ...v,
                              {
                                role: "assistant",
                                content: "操作已确认，已写入工作台。",
                              },
                            ]);
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "执行失败",
                            );
                          }
                        }}
                      >
                        确认执行
                      </button>
                      <button onClick={() => setProposal(null)}>
                        取消方案
                      </button>
                    </div>
                  </div>
                )}
                {error && (
                  <p className="sv-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="sv-chat-input">
                  <textarea
                    aria-label="向 AI 助手提问"
                    placeholder="整理选题、改写内容、安排排期…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <button
                    className="sv-primary"
                    disabled={busy || !prompt.trim()}
                    onClick={() => void send()}
                  >
                    <ArrowUp size={16} />
                    发送
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

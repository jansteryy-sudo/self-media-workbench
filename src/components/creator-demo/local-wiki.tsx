"use client";
import { useState } from "react";
import { AccountBadge } from "./account-badge";
export function LocalWiki({
  docs,
  account,
  onOpen,
  onMode,
  onAsk,
}: {
  docs: { id: string; title: string; body: string; account: string }[];
  account: string;
  onOpen: (id: string) => void;
  onMode: (mode: string) => void;
  onAsk?: (question: string) => void;
}) {
  const [mode, setMode] = useState("文档"),
    [question, setQuestion] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [results, setResults] = useState<
      { id: string; title: string; snippet: string; account: string }[]
    >([]);
  async function index() {
    const r = await fetch("/api/studio/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docs }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "索引失败");
    return d;
  }
  return (
    <section className="sv-wiki">
      <div className="sv-tabs">
        {["文档", "检索与问答"].map((t) => (
          <button
            className={mode === t ? "active" : ""}
            key={t}
            onClick={() => {
              setMode(t);
              onMode(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="sv-note">
          {message}
        </p>
      )}
      {mode === "检索与问答" && (
        <>
          <div className="sv-toolbar">
            <input
              aria-label="检索知识"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：图文开头、账号定位"
            />
            <button
              disabled={busy || !question.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await index();
                  const r = await fetch(
                    "/api/studio/wiki?q=" +
                      encodeURIComponent(question) +
                      "&account=" +
                      account,
                  );
                  if (!r.ok) throw Error("检索失败");
                  const d = await r.json();
                  setResults(d.results);
                  setMessage(
                    d.results.length
                      ? "找到以下原文证据"
                      : "没有找到相关证据，请补充文档或更换关键词",
                  );
                } catch (e) {
                  setMessage(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              检索原文
            </button>
            <button
              disabled={!question.trim() || busy}
              onClick={() =>
                onAsk?.(
                  "请基于知识与经验回答，并列出引用的文档标题：" + question,
                )
              }
            >
              AI 根据知识回答
            </button>
          </div>
          {results.map((r) => (
            <button
              className="sv-wikiresult"
              key={r.id}
              onClick={() => onOpen(r.id)}
            >
              <strong>{r.title}</strong>
              <AccountBadge id={r.account} />
              <p>{r.snippet}</p>
              <small>查看来源文档 →</small>
            </button>
          ))}
          <p className="sv-note">
            检索结果来自本机文档原文。配置模型后可交给 AI
            助手回答并引用来源；向量检索与 PDF / Word 文本解析尚未接入。
          </p>
        </>
      )}
      {mode === "知识关联" && (
        <>
          <p className="sv-note">
            在正文里使用 [[文档标题]] 建立关联；点击即可打开对应知识。
          </p>
          {docs
            .filter((d) => account === "all" || d.account === account)
            .map((d) => {
              const links = [...d.body.matchAll(/\[\[([^\]]+)\]\]/g)].map(
                (m) => m[1],
              );
              return (
                <div className="sv-job" key={d.id}>
                  <button onClick={() => onOpen(d.id)}>{d.title}</button>
                  <span>→</span>
                  {links.length ? (
                    links.map((l, i) => {
                      const target = docs.find((x) => x.title === l);
                      return (
                        <button
                          key={i}
                          disabled={!target}
                          onClick={() => target && onOpen(target.id)}
                        >
                          {l}
                          {!target ? "（未创建）" : ""}
                        </button>
                      );
                    })
                  ) : (
                    <small>暂无关联</small>
                  )}
                </div>
              );
            })}
        </>
      )}
    </section>
  );
}

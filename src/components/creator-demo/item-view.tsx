"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { AccountBadge } from "./account-badge";
import type { WorkItem } from "@/lib/studio-records";
type RecordView = WorkItem;
export function ItemView({
  item,
  onClose,
  onEdit,
  related = [],
  onRelated,
  onRestore,
}: {
  item: RecordView;
  onClose: () => void;
  onEdit: () => void;
  related?: { id: string; title: string; account: string }[];
  onRelated?: (id: string) => void;
  onRestore?: (version: { title: string; body: string }) => void;
}) {
  const close = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Tab") {
        const nodes =
          dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="sv-backdrop sv-viewbackdrop" onClick={onClose}>
      <section
        ref={dialog}
        className="sv-readview"
        role="dialog"
        aria-modal="true"
        aria-label="任务完整视图"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sv-modalhead">
          <span>{item.kind} · 完整视图</span>
          <button ref={close} aria-label="关闭完整视图" onClick={onClose}>
            ✕
          </button>
        </div>
        <h1>{item.title}</h1>
        <AccountBadge id={item.account} />
        <dl className="sv-viewmeta">
          {[
            ["状态", item.todoState || item.status],
            ["内容类型", item.type],
            ["来源", item.source],
            ...(item.createdAt ? [["创建时间", item.createdAt]] : []),
            ...(item.kind === "发布计划" || item.date
              ? [["计划时间", item.date || "未安排"]]
              : []),
            ...(item.actualDate ? [["实际发布时间", item.actualDate]] : []),
            ...(item.kind === "商品与赠品"
              ? [
                  ["价格", (item.price || "0") + " 元"],
                  ["规格", item.specification || "未填写"],
                ]
              : []),
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {item.reviewNote && (
          <div className="sv-review-note">
            <strong>审核意见</strong>
            <p>{item.reviewNote}</p>
          </div>
        )}
        {item.tags && <p>标签：{item.tags}</p>}
        {item.url && (
          <p>
            链接：
            <a
              href={/^https?:\/\//i.test(item.url) ? item.url : undefined}
              target="_blank"
              rel="noreferrer"
            >
              {item.url}
            </a>
          </p>
        )}
        <article className="sv-markdown sv-viewbody">
          <ReactMarkdown>{item.body || "暂无正文"}</ReactMarkdown>
        </article>
        {item.delivery && (
          <>
            <h3>交付说明</h3>
            <ReactMarkdown>{item.delivery}</ReactMarkdown>
          </>
        )}
        {(item.views || item.reflection || item.metrics) && (
          <>
            <h3>数据与复盘</h3>
            <div className="sv-metrics-grid">
              {[
                ["浏览 / 播放", item.views],
                ["点赞", item.likes],
                ["评论", item.comments],
                ["分享", item.shares],
                ["转化", item.conversions],
              ].map(([name, value]) =>
                value ? (
                  <div key={name}>
                    <small>{name}</small>
                    <strong>{value}</strong>
                  </div>
                ) : null,
              )}
            </div>
            <ReactMarkdown>
              {item.reflection || item.metrics || ""}
            </ReactMarkdown>
          </>
        )}
        {item.files?.length ? (
          <section>
            <h3>附件与物料</h3>
            {item.files.map((f) => (
              <div className="sv-viewfile" key={f.id}>
                {f.mime.startsWith("image/") && (
                  <Image
                    src={f.url}
                    alt={f.name}
                    width={650}
                    height={400}
                    unoptimized
                  />
                )}
                {f.mime.startsWith("video/") && (
                  <video src={f.url} controls preload="metadata" />
                )}
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
                <a href={f.url + "?download=1"} download>
                  下载原文件
                </a>
                <small>{(f.size / 1024).toFixed(1)} KB</small>
              </div>
            ))}
          </section>
        ) : null}
        {!!related.length && (
          <section>
            <h3>关联内容</h3>
            {related.map((i) => (
              <button
                className="sv-related"
                key={i.id}
                onClick={() => onRelated?.(i.id)}
              >
                <AccountBadge id={i.account} />
                {i.title}
              </button>
            ))}
          </section>
        )}
        {!!item.history?.length && (
          <section className="sv-history">
            <h3>流转与版本记录</h3>
            {item.history
              .slice()
              .reverse()
              .map((h, index) => (
                <details key={index}>
                  <summary>
                    <span>{h.action}</span>
                    <small>{new Date(h.at).toLocaleString()}</small>
                  </summary>
                  <p>
                    {h.kind} · {h.status}
                  </p>
                  <h4>{h.title}</h4>
                  <ReactMarkdown>{h.body}</ReactMarkdown>
                  {onRestore && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "恢复此版本的标题和正文？当前内容会保留在版本记录中。",
                          )
                        )
                          onRestore(h);
                      }}
                    >
                      恢复此版本正文
                    </button>
                  )}
                </details>
              ))}
          </section>
        )}
        <div className="sv-buttons">
          <button onClick={onClose}>关闭</button>
          <button className="sv-primary" onClick={onEdit}>
            编辑
          </button>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";

function ContentLink({href = "", children}: {href?: string; children?: React.ReactNode}) {
  const [message, setMessage] = useState("");
  const local = href.startsWith("/Users/") || href.startsWith("/Volumes/") || href.startsWith("/tmp/") || href.startsWith("file:///");
  if (local) return <span className="sv-local-file"><button type="button" title={href} onClick={async () => {
    const bridge = (window as Window & {xiaoyuFiles?: {reveal: (path: string) => Promise<string>}}).xiaoyuFiles;
    if (bridge) setMessage(await bridge.reveal(href));
    else { try { await navigator.clipboard.writeText(href); setMessage("路径已复制，请在 Finder 中前往此路径"); } catch { setMessage(href); } }
  }}>↗ {children}</button>{message && <small role="status">{message}</small>}</span>;
  const allowed = /^https?:\/\//i.test(href) || href.startsWith("/api/studio/files/");
  return allowed ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <span title="此链接无法打开">{children}</span>;
}
export function StudioMarkdown({children}: {children: string}) {
  return <ReactMarkdown urlTransform={url => url.startsWith("file:///") ? url : defaultUrlTransform(url)} components={{a: ({href, children}) => <ContentLink href={href}>{children}</ContentLink>}}>{children}</ReactMarkdown>;
}

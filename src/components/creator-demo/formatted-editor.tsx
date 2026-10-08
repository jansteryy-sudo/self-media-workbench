"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
export function FormattedEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null),
    preview = useRef<HTMLDivElement>(null),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState("编辑");
  function insert(before: string, after = "") {
    const e = area.current;
    if (!e) return;
    const start = e.selectionStart,
      end = e.selectionEnd;
    onChange(
      value.slice(0, start) +
        before +
        (value.slice(start, end) || "文字") +
        after +
        value.slice(end),
    );
    e.focus();
  }
  return (
    <div className="sv-formatted">
      <div className="sv-editorbar">
        <button onClick={() => insert("**", "**")}>
          <b>B</b>
        </button>
        <button onClick={() => insert("*", "*")}>
          <i>I</i>
        </button>
        <button onClick={() => insert("\n## ")}>标题</button>
        <button onClick={() => insert("\n- ")}>列表</button>
        <button onClick={() => insert("\n> ")}>引用</button>
        <button onClick={() => insert("[", "](https://)")}>链接</button>
        <button onClick={() => setMode(mode === "编辑" ? "预览" : "编辑")}>
          {mode === "编辑" ? "预览" : "编辑"}
        </button>
        <button
          onClick={async () => {
            try {
              const html = preview.current?.innerHTML || "";
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/html": new Blob([html], { type: "text/html" }),
                  "text/plain": new Blob(
                    [preview.current?.innerText || value],
                    { type: "text/plain" },
                  ),
                }),
              ]);
              setMessage("已复制带格式正文");
            } catch {
              try {
                await navigator.clipboard.writeText(value);
                setMessage("已复制 Markdown，浏览器不支持带格式复制");
              } catch {
                setMessage("复制失败，请手动复制");
              }
            }
          }}
        >
          复制带格式正文
        </button>
      </div>
      <textarea
        ref={area}
        aria-label="带格式正文编辑"
        style={{ display: mode === "编辑" ? "block" : "none" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div
        ref={preview}
        className="sv-markdown"
        style={
          mode === "编辑"
            ? { position: "absolute", left: "-99999px", width: 500 }
            : undefined
        }
      >
        <ReactMarkdown>{value}</ReactMarkdown>
      </div>
      {message && <small role="status">{message}</small>}
    </div>
  );
}

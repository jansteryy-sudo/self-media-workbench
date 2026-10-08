"use client";
import { useState } from "react";
import { Download, Upload, X } from "lucide-react";
export function Backup({ saved }: { saved: boolean }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [file, setFile] = useState<File | null>(null);
  return (
    <>
      <button onClick={() => setOpen(true)}>备份与恢复</button>
      {open && (
        <div
          className="sv-backdrop"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <section
            className="sv-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="备份与恢复"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>备份与恢复</h2>
              <button disabled={busy} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <h3>导出完整备份</h3>
            <p>
              包含账号、内容、版本记录、自动化配置、Skill 和附件。API 密钥与 MCP
              访问凭证不导出。
            </p>
            <p className="sv-note">
              当前附件合计上限 200MB。更大的媒体库可复制 workbench-data
              文件夹另行备份。
            </p>
            <button
              disabled={!saved || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await fetch("/api/studio/backup");
                  if (!r.ok) throw Error((await r.json()).error);
                  const url = URL.createObjectURL(await r.blob());
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `工作台备份-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "备份失败");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download size={15} /> 导出备份
            </button>
            <h3>从备份恢复</h3>
            <input
              aria-label="选择工作台备份"
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="sv-proposal">
                <p>
                  恢复「{file.name}
                  」会替换当前账号、内容与自动化配置。恢复前会自动保留一份本机数据快照。
                </p>
                <button
                  disabled={busy || !saved}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const form = new FormData();
                      form.append("file", file);
                      const r = await fetch("/api/studio/backup", {
                        method: "POST",
                        body: form,
                      });
                      const d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      localStorage.setItem(
                        "studio-skill-library",
                        JSON.stringify(d.state.skills),
                      );
                      location.reload();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "恢复失败");
                      setBusy(false);
                    }
                  }}
                >
                  <Upload size={15} />
                  确认替换并恢复
                </button>
              </div>
            )}
            {error && (
              <p className="sv-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

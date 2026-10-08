"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { AccountBadge } from "./account-badge";
import { useAccounts } from "./account-manager";

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
};
export function Uploads({
  files,
  onChange,
  onText,
}: {
  files: Attachment[];
  onChange: (f: Attachment[]) => void;
  onText?: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="sv-upload">
      <label>
        上传文字、图片、视频或文档
        <input
          aria-label="上传附件"
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.txt,.md,.csv,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.yaml,.yml,.json"
          disabled={busy}
          onChange={async (e) => {
            const chosen = [...(e.target.files || [])];
            setBusy(true);
            setError("");
            const added: Attachment[] = [];
            try {
              for (const file of chosen) {
                const form = new FormData();
                form.append("file", file);
                const r = await fetch("/api/studio/files", {
                  method: "POST",
                  body: form,
                });
                const data = await r.json();
                if (!r.ok) throw Error(data.error || "上传失败");
                added.push(data);
                if (onText && /\.(txt|md)$/i.test(file.name))
                  onText(await file.text());
              }
            } catch (err) {
              setError(String(err));
            } finally {
              onChange([...files, ...added]);
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <small>
        {busy
          ? "正在上传…"
          : "原文件保存到本机工作台目录，单个文件最大 100MB；TXT / Markdown 可读入正文。"}
      </small>
      {error && <p role="alert">{error}</p>}
      {files.map((f) => (
        <div className="sv-file" key={f.id}>
          {f.mime.startsWith("image/") && (
            <Image
              src={f.url}
              alt={f.name}
              width={110}
              height={100}
              unoptimized
            />
          )}{" "}
          {f.mime.startsWith("video/") && (
            <video src={f.url} controls preload="metadata" />
          )}
          <div>
            <strong>{f.name}</strong>
            <small>{(f.size / 1024).toFixed(1)} KB</small>
            <a href={f.url} target="_blank" rel="noreferrer">
              预览
            </a>{" "}
            ·{" "}
            <a href={f.url + "?download=1"} download>
              下载原文件
            </a>
            <button
              onClick={() => onChange(files.filter((x) => x.id !== f.id))}
            >
              移除关联
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export type Automation = {
  id: string;
  account: string;
  stage: string;
  name: string;
  skill: Attachment;
  description?: string;
  mode: string;
  frequency: string;
  time: string;
  enabled: boolean;
  last?: string;
  provider?: string;
  lastRunAt?: string;
  runs?: { at: string; status: string; message: string; itemId?: string }[];
};
export type SkillInfo = Attachment & {
  skillName?: string;
  description?: string;
  valid?: boolean;
  warnings?: string[];
  preview?: string;
};
export function AutomationPanel({
  stage,
  account,
  jobs,
  onChange,
  onRun,
  busy: running = false,
  connections = [],
}: {
  stage: string;
  account: string;
  jobs: Automation[];
  onChange: (j: Automation[]) => void;
  onRun: (j: Automation) => void;
  busy?: boolean;
  connections?: { provider: string; model: string }[];
}) {
  const accounts = useAccounts();
  const [mode, setMode] = useState("手动"),
    [skillMode, setSkillMode] = useState("共享 Skill"),
    [draft, setDraft] = useState<Automation | null>(null),
    [library, setLibrary] = useState<SkillInfo[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setLibrary(
          JSON.parse(localStorage.getItem("studio-skill-library") || "[]"),
        );
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const related = jobs.filter(
    (j) => j.stage === stage && (account === "all" || j.account === account),
  );

  function newJob() {
    setDraft({
      id: crypto.randomUUID(),
      account: account === "all" ? (accounts[0]?.id || "") : account,
      stage,
      name: "",
      skill: { id: "", name: "", mime: "", size: 0, url: "" },
      mode: "Skill 自动化",
      frequency: "单次运行",
      time: "09:00",
      enabled: true,
    });
    setError("");
  }
  function modify(j: Automation) {
    setSkillMode("共享 Skill");
    setDraft({ ...j });
    setMode("自动化配置");
    setError("");
  }
  return (
    <section className="sv-automation">
      <div className="sv-automation-toolbar">
      <div className="sv-tabs sv-segment" role="group" aria-label="处理方式">
        {["手动", "自动化配置"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m);
              setDraft(null);
            }}
          >
            {m}
          </button>
        ))}
      </div>
      {mode === "自动化配置" && (
        <button className="sv-primary" onClick={newJob}>
          新建自动化任务
        </button>
      )}
      </div>
      {mode === "自动化配置" && (
        <>
          <p className="sv-note">
            统一管理文本 Skill
            任务；产物保存为待确认草稿。定时运行需保持工作台页面打开。
          </p>
          {related.map((j) => (
            <div className="sv-job" key={j.id}>
              <div>
                <strong>{j.name}</strong>
                <small>
                  {j.description || "暂无简介"} · {j.skill.name} · {j.frequency}{" "}
                  {j.frequency === "单次运行" ? "" : j.time}
                </small>
              </div>
              <AccountBadge id={j.account} />
              <button
                className={
                  j.enabled ? "sv-runstate running" : "sv-runstate stopped"
                }
                aria-label={
                  j.name +
                  (j.enabled ? "：运行中，点击停止" : "：停止，点击启用")
                }
                title="启用或停止；定时仅在工作台页面打开时运行"
                onClick={() =>
                  onChange(
                    jobs.map((x) =>
                      x.id === j.id ? { ...x, enabled: !x.enabled } : x,
                    ),
                  )
                }
              >
                {j.enabled ? "✓" : "✕"}
              </button>
              <details className="sv-runlog">
                <summary>
                  运行记录{j.runs?.length ? ` · ${j.runs.length}` : ""}
                </summary>
                {j.runs?.length ? (
                  j.runs
                    .slice()
                    .reverse()
                    .map((r, i) => (
                      <p key={i}>
                        <strong>{r.status}</strong> ·{" "}
                        {new Date(r.at).toLocaleString()}
                        <br />
                        {r.message}
                      </p>
                    ))
                ) : (
                  <p>尚未运行</p>
                )}
              </details>
              <button onClick={() => modify(j)}>管理</button>
              <button disabled={!j.enabled || running} onClick={() => onRun(j)}>
                运行一次
              </button>
              <button
                onClick={() => onChange(jobs.filter((x) => x.id !== j.id))}
              >
                删除
              </button>
            </div>
          ))}
          {!related.length && (
            <p className="sv-note">暂无自动化任务，点击上方新建自动化任务。</p>
          )}
        </>
      )}
      {mode === "自动化配置" && draft && (
        <div className="sv-backdrop" onClick={() => setDraft(null)}>
          <div
            className="sv-config sv-autoform"
            role="dialog"
            aria-modal="true"
            aria-label="自动化任务配置"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>
                {jobs.some((j) => j.id === draft.id)
                  ? "管理自动化任务"
                  : "新建自动化任务"}
              </h2>
              <button
                aria-label="关闭自动化配置"
                onClick={() => setDraft(null)}
              >
                ✕
              </button>
            </div>
            <label>
              任务名称
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              简介
              <textarea
                value={draft.description || ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="这个任务解决什么问题，预期输出什么"
              />
            </label>
            <label>
              归属账号
              <select
                value={draft.account}
                onChange={(e) =>
                  setDraft({ ...draft, account: e.target.value })
                }
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.platform}
                  </option>
                ))}
              </select>
            </label>
            <div className="sv-tabs sv-segment" role="group" aria-label="Skill 来源">
              {["共享 Skill", "上传 Skill"].map((m) => (
                <button
                  key={m}
                  className={skillMode === m ? "active" : ""}
                  onClick={() => setSkillMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {skillMode === "共享 Skill" && (
              <label>
                共享 Skill
                <select
                  aria-label="选择共享 Skill"
                  value={draft.skill.id}
                  onChange={(e) => {
                    const skill = library.find((s) => s.id === e.target.value);
                    if (skill) setDraft({ ...draft, skill });
                  }}
                >
                  <option value="">上传新 Skill 或选择已有 Skill</option>
                  {library.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.skillName || s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {skillMode === "上传 Skill" && (
              <label>
                上传独立 Skill（仅 MD / ZIP）
                <input
                  aria-label="上传 Skill"
                  type="file"
                  accept=".md,.zip"
                  disabled={busy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setError("");
                    setBusy(true);
                    try {
                      if (!/\.(md|zip)$/i.test(f.name))
                        throw Error("只接受 .md 或 .zip");
                      const form = new FormData();
                      form.append("file", f);
                      const upload = await fetch("/api/studio/files", {
                        method: "POST",
                        body: form,
                      });
                      const meta = await upload.json();
                      if (!upload.ok) throw Error(meta.error || "上传失败");
                      const r = await fetch("/api/studio/skills", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: meta.id }),
                      });
                      const result = await r.json();
                      if (!r.ok) throw Error(result.error || "无法识别 Skill");
                      const skill = {
                        ...meta,
                        ...result,
                        skillName: result.name,
                        name: f.name,
                      };
                      const next = [...library, skill];
                      setLibrary(next);
                      localStorage.setItem(
                        "studio-skill-library",
                        JSON.stringify(next),
                      );
                      setDraft((v) => (v ? { ...v, skill } : v));
                    } catch (err) {
                      setError(String(err));
                    } finally {
                      setBusy(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            )}
            {busy && <p>正在解析 Skill…</p>}
            {error && (
              <p role="alert" className="sv-error">
                {error}
              </p>
            )}
            {draft.skill.id && (
              <div className="sv-skillresult">
                <strong>
                  格式识别通过：
                  {(draft.skill as SkillInfo).skillName || draft.skill.name}
                </strong>
                <p>{(draft.skill as SkillInfo).description}</p>
                {(draft.skill as SkillInfo).warnings?.map((w) => (
                  <small key={w}>⚠ {w}</small>
                ))}
                <a href={draft.skill.url + "?download=1"} download>
                  下载 Skill 原文件
                </a>
                <details>
                  <summary>查看操作说明</summary>
                  <pre>{(draft.skill as SkillInfo).preview}</pre>
                </details>
                <small>
                  工具与脚本依赖尚未验证，通过格式识别不代表可直接执行。
                </small>
              </div>
            )}
            <label>
              执行模型
              <select
                value={draft.provider || ""}
                onChange={(e) =>
                  setDraft({ ...draft, provider: e.target.value })
                }
              >
                <option value="">使用首个已配置模型</option>
                {connections.map((c) => (
                  <option key={c.provider} value={c.provider}>
                    {c.provider} · {c.model}
                  </option>
                ))}
              </select>
            </label>
            <div className="sv-inline">
              <label>
                运行方式
                <select
                  value={draft.frequency}
                  onChange={(e) =>
                    setDraft({ ...draft, frequency: e.target.value })
                  }
                >
                  <option>单次运行</option>
                  <option>每天</option>
                  <option>每周一</option>
                </select>
              </label>
              {draft.frequency !== "单次运行" && (
                <label>
                  定时时间
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(e) =>
                      setDraft({ ...draft, time: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
            <div className="sv-buttons">
              <button
                className="sv-primary"
                disabled={
                  busy ||
                  !draft.name.trim() ||
                  !(draft.skill as SkillInfo).valid
                }
                onClick={() => {
                  onChange(
                    jobs.some((j) => j.id === draft.id)
                      ? jobs.map((j) => (j.id === draft.id ? draft : j))
                      : [...jobs, draft],
                  );

                  setDraft(null);
                }}
              >
                保存任务配置
              </button>
              <button onClick={() => setDraft(null)}>取消</button>
            </div>
            <small>
              当前支持独立文本
              Skill，通过已配置模型生成待确认草稿。定时仅在此页面打开时运行；不支持脚本、浏览器操作或媒体生成。
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
export function CalendarView({
  items,
  month,
  onMonth,
  onOpen,
  onCreate,
}: {
  items: {
    id: string;
    title: string;
    date: string;
    account: string;
    status: string;
  }[];
  month: string;
  onMonth: (m: string) => void;
  onOpen: (id: string) => void;
  onCreate: (day: string) => void;
}) {
  const [y, m] = month.split("-").map(Number),
    offset = (new Date(y, m - 1, 1).getDay() + 6) % 7,
    days = new Date(y, m, 0).getDate();
  return (
    <div>
      <div className="sv-calendarhead">
        <button
          onClick={() =>
            onMonth(
              new Date(y, m - 2, 1).toLocaleDateString("sv-SE").slice(0, 7),
            )
          }
        >
          上一月
        </button>
        <input
          aria-label="日历月份"
          type="month"
          value={month}
          onChange={(e) => onMonth(e.target.value)}
        />
        <button
          onClick={() =>
            onMonth(new Date(y, m, 1).toLocaleDateString("sv-SE").slice(0, 7))
          }
        >
          下一月
        </button>
      </div>
      <div className="sv-calendar-scroll">
        <div className="sv-calendar">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <strong key={d}>{d}</strong>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="sv-day blank" key={"b" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = month + "-" + String(i + 1).padStart(2, "0");
            return (
              <div
                className={
                  "sv-day" +
                  (date === new Date().toLocaleDateString("sv-SE")
                    ? " is-today"
                    : "")
                }
                key={date}
              >
                <button className="sv-daynumber" onClick={() => onCreate(date)}>
                  {i + 1} <span>＋</span>
                </button>
                {items
                  .filter((x) => x.date.startsWith(date))
                  .map((x) => (
                    <button
                      className={
                        "sv-event " +
                        (x.status === "已发布"
                          ? "event-done"
                          : x.status === "需修改"
                            ? "event-error"
                            : "event-wait")
                      }
                      title={x.title + " · " + x.status}
                      aria-label={x.title + " · " + x.status}
                      key={x.id}
                      onClick={() => onOpen(x.id)}
                    >
                      <span className="sv-event-icon" aria-hidden="true">
                        {x.status === "已发布"
                          ? "✓"
                          : x.status === "需修改"
                            ? "✕"
                            : "!"}
                      </span>
                      <span className="sv-event-time">{x.date.slice(11)}</span>
                      <span className="sv-event-account">
                        <AccountBadge id={x.account} />
                      </span>
                      <span className="sv-event-title">{x.title}</span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="sv-note">
        点击日期新建排期；点击内容查看、修改时间或回填发布记录。未排期内容可在列表查看。
      </p>
    </div>
  );
}

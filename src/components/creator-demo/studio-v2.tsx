"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Home,
  Lightbulb,
  TrendingUp,
  Archive,
  PenLine,
  ShieldCheck,
  CalendarDays,
  BarChart3,
  Folder,
  Gift,
  BookOpen,
  Settings,
  Plus,
  X,
  Download,
  Menu,
  Search,
  ChevronRight,
  FileText,
  Palette,
  Check,
} from "lucide-react";
import "./studio-v2.css";
import "./studio-design.css";
import "./studio-themes.css";
import "./studio-art.css";
import "./studio-matte.css";
import "./studio-gallery.css";
import "./studio-signatures.css";
import { themes, themeGroups, themeVariables, previewVariables } from "./visual-themes";
import { StudioCollection, StudioTaskPreview } from "./studio-collection";
import {
  Uploads,
  AutomationPanel,
  CalendarView,
  type Automation,
} from "./studio-extras";
import { AccountBadge } from "./account-badge";
import { LocalWiki } from "./local-wiki";
import { FormattedEditor } from "./formatted-editor";
import { McpSetup, ModelSetup } from "./ai-connections";
import { ItemView } from "./item-view";
import {
  AccountManager,
  AccountProvider,
  useAccounts,
} from "./account-manager";
import { recordChange, type WorkItem } from "@/lib/studio-records";
import { useStudioPersistence } from "./studio-persistence";
import { Assistant } from "./assistant";
import { Backup } from "./backup";
import { parseMetrics } from "@/lib/studio-metrics";
type Item = WorkItem;
const nav = [
  ["今日待办", Home],
  ["灵感收集", Lightbulb],
  ["热点与爆款调研", TrendingUp],
  ["选题池", Archive],
  ["内容制作", PenLine],
  ["内容审核", ShieldCheck],
  ["发布计划", CalendarDays],
  ["数据复盘", BarChart3],
  ["发布资产库", Folder],
  ["商品与赠品", Gift],
  ["知识与经验", BookOpen],
  ["AI 配置", Settings],
] as const;
const pageCopy: Record<string, [string, string]> = {
  今日待办: ["工作概览", "从这里开始，把想法一步步变成发布的内容。"],
  灵感收集: ["发现与策划", "随时记下问题、灵感和值得继续探索的内容角度。"],
  热点与爆款调研: [
    "发现与策划",
    "观察热点与优秀内容，留下证据，找到自己的切入点。",
  ],
  选题池: ["发现与策划", "挑选值得做的选题，明确受众、角度和内容形式。"],
  内容制作: ["创作与发布", "专注打磨标题、正文与物料，准备好一份完整内容。"],
  内容审核: ["创作与发布", "确认事实、表达和发布物料，让内容进入下一步。"],
  发布计划: ["创作与发布", "安排各账号的发布节奏，手动发布后在这里记录。"],
  数据复盘: ["创作与发布", "从真实反馈中找到规律，把经验用在下一篇内容。"],
  发布资产库: ["内容资源", "整理可发布的正文、图片、视频和文档，随时复用。"],
  商品与赠品: ["内容资源", "准备商品信息与用户交付物，方便复制到平台上架。"],
  知识与经验: ["知识沉淀", "让参考资料、账号规范和运营经验成为你的长期积累。"],
  "AI 配置": ["工作台设置", "管理模型与外部 AI 连接，让工具为你的创作服务。"],
};
const seed: Item[] = [];
const today = () => new Date().toLocaleDateString("sv-SE");
function itemTime(item: Item) {
  if (item.status === "已发布" && item.actualDate)
    return { value: item.actualDate, label: "实际发布" };
  if (item.date) return { value: item.date, label: "计划时间" };
  if (item.createdAt) return { value: item.createdAt, label: "创建时间" };
  if (item.history?.length)
    return { value: item.history[0].at, label: "首次记录" };
  return {
    value: "",
    label: item.status === "已发布" ? "发布时间未回填" : "时间未记录",
  };
}
function displayTime(value: string) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
const autoStages = [
  "数据复盘",
  "热点与爆款调研",
  "选题池",
  "内容制作",
  "内容审核",
];
function download(item: Item, accountName: string) {
  const b = new Blob(
    [
      `# ${item.title}\n\n${item.body}\n\n账号：${accountName}\n计划时间：${item.date || "未安排"}\n\n请自行前往平台手动发布。`,
    ],
    { type: "text/markdown;charset=utf-8" },
  );
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = item.title.replace(/[\\/:*?"<>|]/g, "-") + ".md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}
export default function StudioV2() {
  return (
    <AccountProvider>
      <StudioWorkspace />
    </AccountProvider>
  );
}
function StudioWorkspace() {
  const accounts = useAccounts();
  const [theme, setTheme] = useState("frost"),
    [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const [themeGroup, setThemeGroup] = useState("essential");
  const [peekId, setPeekId] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    try {
      const saved = localStorage.getItem("studio-visual-theme");
      if (localStorage.getItem("studio-design-generation") !== "signature-eight-v1") {
        localStorage.setItem("studio-design-generation", "signature-eight-v1");
        localStorage.setItem("studio-visual-theme", "frost");
      } else if (themes.some((t) => t.id === saved))
        frame = requestAnimationFrame(() => setTheme(saved!));
    } catch {}
    function outside(e: PointerEvent) {
      if (!themeRef.current?.contains(e.target as Node)) setThemeOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setThemeOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const [items, setItems] = useState<Item[]>(seed),
    [account, setAccount] = useState("all"),
    [page, setPage] = useState("今日待办"),
    [filter, setFilter] = useState("全部"),
    [group, setGroup] = useState("按内容类型"),
    [assetAccount, setAssetAccount] = useState("当前账号"),
    [edit, setEdit] = useState<Item | null>(null),
    [viewItem, setViewItem] = useState<Item | null>(null),
    [tab, setTab] = useState("正文"),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [aiTab, setAiTab] = useState("外部 AI 接入"),
    [config, setConfig] = useState(false),
    [period, setPeriod] = useState("全部时间"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [query, setQuery] = useState(""),
    [layout, setLayout] = useState("列表"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [jobs, setJobs] = useState<Automation[]>([]),
    [wikiMode, setWikiMode] = useState("文档");
  const {
    ready,
    status: saveStatus,
    error: saveError,
  } = useStudioPersistence(items, jobs, setItems, setJobs);
  const [reuse, setReuse] = useState<string[]>([]),
    [runBusy, setRunBusy] = useState(false);
  const running = useRef(false);
  const [connections, setConnections] = useState<
    { provider: string; model: string }[]
  >([]);
  useEffect(() => {
    fetch("/api/studio/model-connect")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch(() => {});
  }, [page]);
  const runJob = useCallback(
    async (j: Automation, scheduled = false) => {
      if (running.current) {
        setToast("已有任务运行中，请稍后重试");
        return;
      }
      const provider = j.provider || connections[0]?.provider;
      if (!provider) {
        setToast("请先在 AI 配置中连接模型，再选择自动化使用的模型");
        return;
      }
      running.current = true;
      setRunBusy(true);
      setJobs((v) =>
        v.map((x) =>
          x.id === j.id
            ? { ...x, last: "运行中", lastRunAt: new Date().toISOString() }
            : x,
        ),
      );
      try {
        const r = await fetch("/api/studio/run-skill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, job: j, items, scheduled }),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        const result = recordChange(
          {
            id: crypto.randomUUID(),
            account: j.account,
            title: d.result.title,
            body: d.result.body,
            kind: j.stage,
            status: "AI 草稿 · 待确认",
            source: ("Skill · " + j.name).slice(0, 200),
            date: "",
            url: "",
            type: "标题正文",
          },
          undefined,
          "Skill 生成草稿",
        );
        setItems((v) => [result, ...v]);
        setJobs((v) =>
          v.map((x) =>
            x.id === j.id
              ? {
                  ...x,
                  last: "成功 · " + new Date().toLocaleTimeString(),
                  runs: [
                    ...(x.runs || []),
                    {
                      at: new Date().toISOString(),
                      status: "成功",
                      message: result.title,
                      itemId: result.id,
                    },
                  ].slice(-30),
                }
              : x,
          ),
        );
        setToast("Skill 已生成草稿，请人工检查");
      } catch (e) {
        const message = e instanceof Error ? e.message : "执行失败";
        setJobs((v) =>
          v.map((x) =>
            x.id === j.id
              ? {
                  ...x,
                  last: "失败 · " + message,
                  runs: [
                    ...(x.runs || []),
                    { at: new Date().toISOString(), status: "失败", message },
                  ].slice(-30),
                }
              : x,
          ),
        );
        setToast(message);
      } finally {
        running.current = false;
        setRunBusy(false);
      }
    },
    [connections, items],
  );
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      if (running.current || !connections.length || saveStatus !== "已保存本机")
        return;
      const now = new Date(),
        day = now.toLocaleDateString("sv-SE"),
        clock = now.toTimeString().slice(0, 5);
      const due = jobs.find(
        (j) =>
          j.enabled &&
          j.frequency !== "单次运行" &&
          clock >= j.time &&
          (j.frequency !== "每周一" || now.getDay() === 1) &&
          (!j.lastRunAt ||
            new Date(j.lastRunAt).toLocaleDateString("sv-SE") !== day),
      );
      if (due) void runJob(due, true);
    }, 30000);
    return () => clearInterval(t);
  }, [jobs, ready, saveStatus, connections, runJob]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!edit && !config && !viewItem) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEdit(null);
        setViewItem(null);
        setConfig(false);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [edit, config, viewItem]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    async function receive() {
      try {
        const r = await fetch("/api/studio/inbox");
        const d = await r.json();
        if (alive && Array.isArray(d.items) && d.items.length)
          setItems((current) => {
            const added = d.items.filter(
              (v: Item) => !current.some((i) => i.id === v.id),
            );
            return added.length ? [...added, ...current] : current;
          });
      } catch {}
    }
    void receive();
    const t = setInterval(receive, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [ready]);
  const visible = items
    .filter(
      (i) =>
        (account === "all" ||
          (page === "发布资产库" && assetAccount === "全部账号") ||
          i.account === account) &&
        (page === "今日待办"
          ? ["选题池", "内容制作", "内容审核", "发布计划"].includes(i.kind) &&
            i.status !== "已发布" &&
            (filter === "已完成"
              ? i.todoState === "完成"
              : filter === "已废弃"
                ? i.todoState === "废弃"
                : !i.todoState)
          : page === "数据复盘"
            ? i.status === "已发布" || i.kind === "数据复盘"
            : i.kind === page),
    )
    .filter(
      (i) =>
        filter === "全部" ||
        (page === "今日待办" && ["已完成", "已废弃"].includes(filter)) ||
        (filter === "待确认"
          ? i.kind === "内容审核"
          : filter === "待处理"
            ? i.kind !== "内容审核"
            : i.type === filter || i.status === filter),
    )
    .filter((i) => !query || i.title.includes(query) || i.body.includes(query))
    .filter((i) => {
      if (period === "全部时间") return true;
      const date = displayTime(itemTime(i).value).slice(0, 10);
      if (!date) return false;
      if (period === "自定义")
        return (!start || date >= start) && (!end || date <= end);
      const now = new Date(today() + "T00:00:00");
      const d = new Date(date + "T00:00:00");
      if (period === "今天") return date === today();
      if (period === "本月") return date.slice(0, 7) === today().slice(0, 7);
      const days = period === "近7天" ? 7 : 30;
      return d <= now && d.getTime() >= now.getTime() - (days - 1) * 86400000;
    });
  function save(i: Item, close = true) {
    if (!i.title.trim()) {
      setToast("请先填写标题");
      return;
    }
    const previous = items.find((x) => x.id === i.id);
    i = recordChange(
      i,
      previous,
      !previous
        ? "新建内容"
        : previous.kind !== i.kind
          ? "进入" + i.kind
          : "保存内容",
    );
    setItems((s) =>
      s.some((x) => x.id === i.id)
        ? s.map((x) => (x.id === i.id ? i : x))
        : [i, ...s],
    );
    if (close) setEdit(null);
    else setEdit(i);
    setToast("内容已更新，正在保存本机");
  }
  function move(kind: string, status: string) {
    if (!edit || !edit.title.trim()) {
      setToast("请先填写标题");
      return;
    }
    save({ ...edit, kind, status });
    setPage(kind);
    setFilter("全部");
    setToast("已进入" + kind);
  }
  function advance(i: Item) {
    const stages: Record<string, [string, string]> = {
      热点与爆款调研: ["选题池", "待评估"],
      选题池: ["内容制作", "草稿"],
      内容制作: ["内容审核", "待确认"],
      内容审核: ["发布计划", "待手动发布"],
    };
    const next = stages[i.kind];
    if (next) {
      save({ ...i, kind: next[0], status: next[1], todoState: undefined });
      setPage(next[0]);
      setFilter("全部");
      setToast("已进入" + next[0]);
    }
  }
  function published(i: Item) {
    save({
      ...i,
      status: "已发布",
      actualDate:
        i.actualDate ||
        new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "T"),
    });
    setToast("已标记手动发布完成；可编辑补充发布链接");
  }
  async function exportPackage(i: Item) {
    try {
      const r = await fetch("/api/studio/publish-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(i),
      });
      if (!r.ok) throw Error((await r.json()).error);
      const u = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = u;
      a.download = i.title + "-发布包.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      setToast("已导出完整发布包");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "导出失败");
    }
  }
  function create() {
    if (!accounts.length) { setToast("请先点击左侧账号管理，添加你运营的第一个账号"); return; }
    setEdit({
      id: crypto.randomUUID(),
      account: account === "all" ? (accounts[0]?.id || "") : account,
      createdAt: new Date().toISOString(),
      title: "",
      body: "",
      kind: page === "今日待办" ? "内容制作" : page,
      status: "草稿",
      source: "人工创建",
      date: "",
      url: "",
      type: page === "商品与赠品" ? "赠品" : "标题正文",
    });
    setTab("正文");
  }
  return (
    <div className="sv sv-redesign" data-studio-theme={theme} data-page={page} style={themeVariables(theme)}>
      {menu && (
        <button
          className="sv-nav-veil"
          aria-label="关闭导航"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={menu ? "sv-side open" : "sv-side"}>
        <div className="sv-brand" aria-label="小鱼自媒体工作台">
          <h2 className="sv-wordmark"><strong>小鱼</strong><span>自媒体工作台</span></h2>
        </div>
        <div className="sv-account-heading">
          <label className="sv-label">账号工作区</label>
          <AccountManager />
        </div>
        <select
          aria-label="切换账号"
          value={account}
          onChange={(e) => {
            setAccount(e.target.value);
            setFilter("全部");
            setMenu(false);
          }}
        >
          <option value="all">全部账号（全选）</option>
          {accounts.map((a) => (
            <option value={a.id} key={a.id}>
              {a.name} · {a.platform}
            </option>
          ))}
        </select>
        <div className="sv-account-add-entry"><AccountManager variant="add" /></div>
        <nav>
          {nav.map(([name, Icon], idx) => (
            <div key={name}>
              {[1, 8, 10, 11].includes(idx) && (
                <p className="sv-group">
                  {idx === 1
                    ? "内容运营"
                    : idx === 8
                      ? "资产与商品"
                      : idx === 10
                        ? "知识沉淀"
                        : "AI 能力"}
                </p>
              )}
              <button
                className={page === name ? "selected" : ""}
                onClick={() => {
                  setPage(name);
                  setWikiMode("文档");
                  setQuery("");
                  setFilter("全部");
                  setMenu(false);
                }}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name !== "AI 配置" && (
                  <span className="sv-nav-count">
                    {
                      items.filter(
                        (i) =>
                          (account === "all" || i.account === account) &&
                          (name === "今日待办"
                            ? [
                                "选题池",
                                "内容制作",
                                "内容审核",
                                "发布计划",
                              ].includes(i.kind) &&
                              !i.todoState &&
                              i.status !== "已发布"
                            : i.kind === name),
                      ).length
                    }
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>
        <footer>
          个人工作空间 <span className="sv-save-state">{saveStatus}</span>
          <Backup saved={saveStatus === "已保存本机"} />

        </footer>
      </aside>
      <main>
        <div className="sv-locationbar">
          <span>
            个人工作空间 <ChevronRight size={13} />{" "}
            <span>{pageCopy[page]?.[0]}</span>
          </span>
          <div className="sv-location-tools">
            <span className="sv-location-date">
              {new Date().toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            <div className="sv-theme-control" ref={themeRef}>
              <button
                aria-expanded={themeOpen}
                aria-label="切换工作台主题"
                onClick={() => {
                  if (!themeOpen)
                    setThemeGroup(
                      themes.find((t) => t.id === theme)?.group || "essential",
                    );
                  setThemeOpen(!themeOpen);
                }}
              >
                <Palette size={15} />
                <span>{themes.find((t) => t.id === theme)?.name}</span>
              </button>
              {themeOpen && (
                <div className="sv-theme-menu" aria-label="工作台主题">
                  <div className="sv-theme-heading">
                    <strong>主题</strong>
                    <small>{themes.length} 种主题</small>
                  </div>
                  <div
                    className="sv-theme-categories"
                    role="tablist"
                    aria-label="主题分类"
                  >
                    {themeGroups.map((g) => (
                      <button
                        key={g.id}
                        role="tab"
                        aria-selected={themeGroup === g.id}
                        aria-controls="theme-gallery"
                        id={`theme-group-${g.id}`}
                        onClick={() => setThemeGroup(g.id)}
                      >
                        {g.name}
                        <span>
                          {themes.filter((t) => t.group === g.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div
                    className="sv-theme-gallery"
                    id="theme-gallery"
                    role="tabpanel"
                    aria-labelledby={`theme-group-${themeGroup}`}
                  >
                    {themes
                      .filter((t) => t.group === themeGroup)
                      .map((t) => (
                        <button
                          key={t.id}
                          className="sv-theme-card"
                          aria-pressed={theme === t.id}
                          onClick={() => {
                            setTheme(t.id);
                            try {
                              localStorage.setItem("studio-visual-theme", t.id);
                            } catch {}
                            setThemeOpen(false);
                          }}
                        >
                          <span
                            className="sv-theme-preview"
                            data-preview={t.id}
                            style={previewVariables(t.id)}
                            aria-hidden="true"
                          >
                            <i className="sv-preview-sidebar">

                            </i>
                            <i className="sv-preview-heading" />
                            <i className="sv-preview-content">
                              <i />
                              <i />
                              <i />
                            </i>
                          </span>
                          <span className="sv-theme-caption">
                            <b>{t.name}</b>
                            <small>{t.description}</small>
                          </span>
                          {theme === t.id && (
                            <span className="sv-theme-check">
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          className="sv-menu"
          aria-label="展开导航"
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>

        <header>
          <div>
            <div className="sv-page-eyebrow">
              {account === "all" ? "全部账号" : <AccountBadge id={account} />}
            </div>
            <h1>{page}</h1>

          </div>
          <div className="sv-header-actions">
            <Assistant
              items={items}
              page={page}
              account={account}
              onApply={setItems}
              onConfigure={() => {
                setPage("AI 配置");
                setAiTab("模型 API");
                setConfig(true);
              }}
            />
            {page !== "AI 配置" && (
              <button className="sv-primary" onClick={create}>
                <Plus size={16} />{" "}
                {page === "今日待办"
                  ? "新建任务"
                  : page === "知识与经验"
                    ? "新建文档"
                    : page === "发布资产库"
                      ? "添加资产"
                      : page === "商品与赠品"
                        ? "添加商品 / 赠品"
                        : "新建"}
              </button>
            )}
          </div>
        </header>
        {page === "今日待办" && (
          <div className="sv-focus-strip">
            {(
              [
                ["内容制作", "继续创作", PenLine],
                ["内容审核", "等待审核", ShieldCheck],
                ["发布计划", "准备发布", CalendarDays],
              ] as const
            ).map(([stage, label, Icon]) => (
              <button
                key={stage}
                onClick={() => {
                  setPage(stage);
                  setFilter("全部");
                  setQuery("");
                }}
              >
                <span className={"sv-focus-icon sv-focus-" + stage}>
                  <Icon size={18} />
                </span>
                <span>
                  <small>{label}</small>
                  <strong>
                    {
                      items.filter(
                        (i) =>
                          (account === "all" || i.account === account) &&
                          i.kind === stage &&
                          !i.todoState &&
                          i.status !== "已发布",
                      ).length
                    }
                    <em>篇内容</em>
                  </strong>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
        {saveError && (
          <div className="sv-save-error" role="alert">
            {saveError}
            <button onClick={() => location.reload()}>重新载入本机数据</button>
          </div>
        )}
        <div
          className="sv-toolbar"
          style={
            page === "AI 配置" || (page === "知识与经验" && wikiMode !== "文档")
              ? { display: "none" }
              : undefined
          }
        >
          <label className="sv-search-control">
            <Search size={16} />
            <input
              aria-label="搜索当前工作区"
              placeholder="搜索标题或正文"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="时间尺度筛选"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {["全部时间", "今天", "近7天", "近30天", "本月", "自定义"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
          {period === "自定义" && (
            <>
              <input
                aria-label="开始日期"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <span>至</span>
              <input
                aria-label="结束日期"
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
              />
            </>
          )}
        </div>
        {autoStages.includes(page) && (
          <AutomationPanel
            key={page + account}
            stage={page}
            account={account}
            jobs={jobs}
            onChange={setJobs}
            onRun={(j) => void runJob(j)}
            busy={runBusy}
            connections={connections}
          />
        )}
        {page === "发布计划" && (
          <div className="sv-tabs sv-view-switch sv-segment">
            {["列表", "日历"].map((v) => (
              <button
                className={layout === v ? "active" : ""}
                key={v}
                onClick={() => setLayout(v)}
              >
                {v}视图
              </button>
            ))}
          </div>
        )}
        {page === "知识与经验" && (
          <LocalWiki
            onMode={setWikiMode}
            onAsk={(question) =>
              window.dispatchEvent(
                new CustomEvent("studio-ask", { detail: question }),
              )
            }
            docs={items.filter((i) => i.kind === "知识与经验")}
            account={account}
            onOpen={(id) => {
              setViewItem(items.find((i) => i.id === id)!);
              setTab("正文");
            }}
          />
        )}
        {page === "AI 配置" ? (
          <>
            <div className="sv-tabs">
              {["外部 AI 接入", "模型 API"].map((t) => (
                <button
                  className={aiTab === t ? "active" : ""}
                  onClick={() => setAiTab(t)}
                  key={t}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="sv-list">
              <div className="sv-ai-card">
                <div>
                  <strong>
                    {aiTab === "外部 AI 接入"
                      ? "工作台 MCP"
                      : aiTab === "模型 API"
                        ? "模型 API 配置"
                        : "账号任务模板"}
                  </strong>
                  <small>
                    {aiTab === "外部 AI 接入"
                      ? "外部 AI 将成果写入对应工作区"
                      : aiTab === "模型 API"
                        ? "供工作台内部处理任务使用"
                        : "保存账号背景、任务要求与输出格式"}
                  </small>
                </div>
                <span className="sv-status">查看配置</span>
                <button onClick={() => setConfig(true)}>配置</button>
              </div>
            </div>
            <p className="sv-note">
              本机 MCP 可一键启用，支持多个 AI 工具接入；模型 API
              可验证并保存在本机，供 AI 助手和文本 Skill 使用。
            </p>
          </>
        ) : (
          <>
            <div
              hidden={
                page === "AI 配置" ||
                (page === "知识与经验" && wikiMode !== "文档")
              }
            >
              <div className="sv-tabs">
                {(page === "今日待办"
                  ? ["全部", "待处理", "待确认", "已完成", "已废弃"]
                  : page === "发布资产库"
                    ? ["全部", "标题正文", "图片", "视频", "文档"]
                    : page === "商品与赠品"
                      ? ["全部", "商品", "赠品"]
                      : page === "知识与经验"
                        ? ["全部", "运营经验", "参考资料", "账号规范"]
                        : page === "选题池"
                          ? ["全部", "待评估", "草稿"]
                          : page === "内容制作"
                            ? ["全部", "草稿", "需修改", "待确认"]
                            : page === "内容审核"
                              ? ["全部", "待确认"]
                              : page === "发布计划"
                                ? ["全部", "待手动发布", "已发布"]
                                : ["全部"]
                ).map((f) => (
                  <button
                    className={filter === f ? "active" : ""}
                    key={f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                    {f === "全部" ? " " + visible.length : ""}
                  </button>
                ))}
                {page === "发布资产库" && (
                  <div className="sv-filters">
                    <select
                      aria-label="资产查看方式"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option>按内容类型</option>
                      <option>按账号</option>
                    </select>
                    <select
                      aria-label="资产账号范围"
                      value={assetAccount}
                      onChange={(e) => setAssetAccount(e.target.value)}
                    >
                      <option>当前账号</option>
                      <option>全部账号</option>
                    </select>
                  </div>
                )}
              </div>
              {["发布资产库", "商品与赠品"].includes(page) ? (
                <StudioCollection items={visible} goods={page === "商品与赠品"}
                  onView={setViewItem} onEdit={(item) => {setEdit(item);setTab("正文");}}
                  onDownload={(item) => download(item, accounts.find(a => a.id === item.account)?.name || "")} />
              ) : page === "发布计划" && layout === "日历" ? (
                <CalendarView
                  items={visible}
                  month={month}
                  onMonth={setMonth}
                  onOpen={(id) => setViewItem(items.find((i) => i.id === id)!)}
                  onCreate={(day) => {
                    setEdit({
                      id: crypto.randomUUID(),
                      account: account === "all" ? (accounts[0]?.id || "") : account,
                      title: "",
                      body: "",
                      kind: "发布计划",
                      status: "待手动发布",
                      source: "人工创建",
                      date: day + "T09:00",
                      url: "",
                      type: "图文",
                      createdAt: new Date().toISOString(),
                    });
                    setTab("正文");
                  }}
                />
              ) : (
                <div className={visible.length ? "sv-operating-desk" : ""}>
                <div
                  className={
                    "sv-list " +
                    (page === "今日待办" || page === "发布资产库"
                      ? ""
                      : "sv-focused-list")
                  }
                >
                  <div className="sv-tablehead">
                    <span>
                      {page === "商品与赠品"
                        ? "商品 / 赠品"
                        : page === "知识与经验"
                          ? "文档"
                          : "内容 / 任务"}
                    </span>
                    <span>
                      {page === "发布资产库"
                        ? group === "按账号"
                          ? "账号"
                          : "内容类型"
                        : "环节"}
                    </span>
                    <span>平台 / 账号</span>
                    <span>状态</span>
                    <span>
                      {page === "发布计划"
                        ? "发布 / 记录时间"
                        : "计划 / 创建时间"}
                    </span>
                    <span className="sv-actions-heading">操作</span>
                  </div>
                  {visible.map((i) => (
                    <div
                      className="sv-row sv-clickrow"
                      key={i.id}
                      tabIndex={0}
                      aria-label={"查看完整内容：" + i.title}
                      onFocus={() => setPeekId(i.id)}
                      onClick={() => {setPeekId(i.id); setViewItem(i);}}
                      onKeyDown={(e) => {
                        if (
                          e.target === e.currentTarget &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          setViewItem(i);
                        }
                      }}
                    >
                      <div className="sv-record-heading">
                        <span
                          className={
                            "sv-record-icon " +
                            (i.kind === "知识与经验" ? "sv-document-icon" : "")
                          }
                        >
                          {i.kind === "知识与经验" ? (
                            <BookOpen size={19} />
                          ) : i.kind === "商品与赠品" ? (
                            <Gift size={19} />
                          ) : (
                            <FileText size={19} />
                          )}
                        </span>
                        <div className="sv-record-copy">
                          <strong title={i.title}>{i.title}</strong>
                          <small>
                            <span className="sv-inline-account">
                              <AccountBadge id={i.account} />
                            </span>{" "}
                            {page !== "今日待办" && i.type
                              ? i.type + " · "
                              : ""}
                            {i.source}
                            {i.status === "新收到" && <em>新收到</em>}
                          </small>
                        </div>
                      </div>
                      <span>
                        {page === "发布资产库"
                          ? group === "按账号"
                            ? accounts.find((a) => a.id === i.account)?.platform
                            : i.type
                          : i.kind}
                      </span>
                      <span className="sv-account-column">
                        <AccountBadge id={i.account} />
                      </span>
                      <span
                        className={
                          "sv-status " +
                          (i.status === "待确认" ? "amber " : "") +
                          (["已发布", "可使用", "已保存"].includes(i.status) ||
                          i.todoState === "完成"
                            ? "sv-status-success"
                            : i.status === "需修改" || i.todoState === "废弃"
                              ? "sv-status-error"
                              : "")
                        }
                      >
                        {i.todoState || i.status}
                      </span>
                      <span className="sv-record-time">
                        <time>
                          {displayTime(itemTime(i).value) || itemTime(i).label}
                        </time>
                        {itemTime(i).value && (
                          <small>{itemTime(i).label}</small>
                        )}
                      </span>
                      <span
                        className="sv-row-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEdit(i);
                            setTab("正文");
                          }}
                        >
                          编辑
                        </button>
                        {[
                          "热点与爆款调研",
                          "选题池",
                          "内容制作",
                          "内容审核",
                        ].includes(page) && (
                          <button onClick={() => advance(i)}>
                            {
                              {
                                热点与爆款调研: "整理为选题",
                                选题池: "采用并制作",
                                内容制作: "提交审核",
                                内容审核: "通过",
                              }[page]
                            }
                          </button>
                        )}
                        {page === "发布计划" && (
                          <button
                            disabled={i.status === "已发布"}
                            onClick={() => published(i)}
                          >
                            标记发布
                          </button>
                        )}
                        {page === "今日待办" &&
                          (!i.todoState ? (
                            <>
                              <button
                                onClick={() => {
                                  setItems((v) =>
                                    v.map((x) =>
                                      x.id === i.id
                                        ? recordChange(
                                            { ...x, todoState: "完成" },
                                            x,
                                            "完成待办",
                                          )
                                        : x,
                                    ),
                                  );
                                  setToast("已完成，可在已完成筛选中恢复");
                                }}
                              >
                                完成
                              </button>
                              <button
                                onClick={() => {
                                  setItems((v) =>
                                    v.map((x) =>
                                      x.id === i.id
                                        ? recordChange(
                                            { ...x, todoState: "废弃" },
                                            x,
                                            "废弃待办",
                                          )
                                        : x,
                                    ),
                                  );
                                  setToast("已废弃，可在已废弃筛选中恢复");
                                }}
                              >
                                废弃
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                setItems((v) =>
                                  v.map((x) =>
                                    x.id === i.id
                                      ? recordChange(
                                          { ...x, todoState: undefined },
                                          x,
                                          "恢复待办",
                                        )
                                      : x,
                                  ),
                                )
                              }
                            >
                              恢复
                            </button>
                          ))}
                      </span>
                    </div>
                  ))}
                  {!visible.length && (
                    <div className="sv-empty sv-empty-designed">
                      <div className="sv-empty-art" aria-hidden="true"><i /><i /><i /><FileText size={32} /></div>
                      <h2>{accounts.length ? "还没有" + (page === "今日待办" ? "待办任务" : "内容") : "添加你的第一个运营账号"}</h2>
                      <p>{accounts.length ? "新建内容，或通过 MCP 接收外部 AI 的成果。" : "先添加小红书、抖音或公众号账号，再开始管理内容与发布计划。"}</p>
                      {!accounts.length && <AccountManager variant="add" />}
                    </div>
                  )}
                </div>
                {!!visible.length && <StudioTaskPreview item={visible.find(i => i.id === peekId) || visible[0]}
                  onView={() => setViewItem(visible.find(i => i.id === peekId) || visible[0])}
                  onEdit={() => {setEdit(visible.find(i => i.id === peekId) || visible[0]);setTab("正文");}} />}
                </div>
              )}

            </div>
          </>
        )}
      </main>
      {toast && (
        <div className="sv-toast" role="status">
          {toast}
        </div>
      )}
      {viewItem && (
        <ItemView
          item={viewItem}
          related={items
            .filter(
              (i) =>
                i.id !== viewItem.id &&
                (i.parentId === (viewItem.parentId || viewItem.id) ||
                  i.id === viewItem.parentId),
            )
            .map((i) => ({ id: i.id, title: i.title, account: i.account }))}
          onRelated={(id) =>
            setViewItem(items.find((i) => i.id === id) || null)
          }
          onRestore={(version) => {
            save({ ...viewItem, title: version.title, body: version.body });
            setViewItem(null);
          }}
          onClose={() => setViewItem(null)}
          onEdit={() => {
            setEdit(viewItem);
            setViewItem(null);
            setTab("正文");
          }}
        />
      )}
      {edit && (
        <div className="sv-backdrop" onClick={() => setEdit(null)}>
          <section
            className="sv-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="内容详情"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>{edit.kind} · 编辑</h2>
              <button aria-label="关闭详情" onClick={() => setEdit(null)}>
                <X size={20} />
              </button>
            </div>
            <label>
              标题
              <input
                autoFocus
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label>
              归属账号
              <select
                aria-label="内容归属账号"
                value={edit.account}
                onChange={(e) => setEdit({ ...edit, account: e.target.value })}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.platform}
                  </option>
                ))}
              </select>
            </label>
            <small className="sv-note">
              {edit.source} · {edit.status}
            </small>
            {["选题池", "内容制作"].includes(edit.kind) && (
              <details className="sv-reuse">
                <summary>复用到其他账号</summary>
                <p className="sv-note">
                  分别创建关联草稿，后续可根据平台调整表达。
                </p>
                {accounts
                  .filter((a) => a.id !== edit.account)
                  .map((a) => (
                    <label className="sv-check" key={a.id}>
                      <input
                        type="checkbox"
                        checked={reuse.includes(a.id)}
                        onChange={(e) =>
                          setReuse((v) =>
                            e.target.checked
                              ? [...v, a.id]
                              : v.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.name} · {a.platform}
                    </label>
                  ))}
                <button
                  disabled={!reuse.length || !edit.title.trim()}
                  onClick={() => {
                    const source = recordChange(
                      edit,
                      items.find((i) => i.id === edit.id),
                    );
                    const copies = reuse.map((id) =>
                      recordChange(
                        {
                          ...edit,
                          id: crypto.randomUUID(),
                          account: id,
                          parentId: edit.parentId || edit.id,
                          history: [],
                          status: "草稿",
                          kind: "内容制作",
                          date: "",
                          url: "",
                          actualDate: undefined,
                          todoState: undefined,
                          source: "跨账号复用",
                          createdAt: new Date().toISOString(),
                        },
                        undefined,
                        "从关联选题创建草稿",
                      ),
                    );
                    setItems((v) => [
                      ...copies,
                      source,
                      ...v.filter((i) => i.id !== source.id),
                    ]);
                    setReuse([]);
                    setToast("已创建关联账号草稿");
                  }}
                >
                  为所选账号创建草稿
                </button>
              </details>
            )}
            <Uploads
              files={edit.files || []}
              onChange={(files) =>
                setEdit((current) =>
                  current ? { ...current, files } : current,
                )
              }
              onText={(text) =>
                setEdit((current) =>
                  current
                    ? {
                        ...current,
                        body: current.body
                          ? current.body + "\n\n" + text
                          : text,
                      }
                    : current,
                )
              }
            />
            {edit.kind === "商品与赠品" && (
              <>
                <div className="sv-inline">
                  <label>
                    价格（元）
                    <input
                      aria-label="商品价格"
                      type="number"
                      min="0"
                      step="0.01"
                      value={edit.price || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, price: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    规格 / 版本
                    <input
                      value={edit.specification || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, specification: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  交付说明
                  <textarea
                    value={edit.delivery || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, delivery: e.target.value })
                    }
                    placeholder="商品包含什么、如何领取、使用说明"
                  />
                </label>
                <div className="sv-buttons">
                  {[
                    ["复制标题", edit.title],
                    ["复制正文", edit.body],
                    [
                      "复制上架信息",
                      `${edit.title}\n${edit.body}\n价格：${edit.price || "0"} 元\n规格：${edit.specification || ""}\n${edit.delivery || ""}`,
                    ],
                  ].map(([label, value]) => (
                    <button
                      key={label}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(value);
                          setToast("已复制");
                        } catch {
                          setToast("复制失败，请手动选择文本复制");
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="sv-note">
                  上传图片和视频后，可下载原文件并手动添加到平台店铺。
                </p>
              </>
            )}
            {edit.kind === "热点与爆款调研" && (
              <label>
                参考来源链接
                <input
                  value={edit.url}
                  onChange={(e) => setEdit({ ...edit, url: e.target.value })}
                  placeholder="粘贴参考内容链接"
                />
              </label>
            )}
            {edit.kind === "选题池" && (
              <label>
                内容角度 / 目标读者
                <input
                  value={edit.specification || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, specification: e.target.value })
                  }
                />
              </label>
            )}
            {edit.kind === "内容制作" && (
              <div className="sv-tabs">
                {["正文", "配图与物料"].map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {tab === "配图与物料" && edit.kind === "内容制作" ? (
              <>
                <p>本账号可使用的发布物料</p>
                {items
                  .filter(
                    (i) =>
                      i.account === edit.account && i.kind === "发布资产库",
                  )
                  .map((i) => (
                    <div className="sv-material" key={i.id}>
                      <span>
                        {i.title} · {i.files?.length || 0} 个附件
                      </span>
                      <button
                        onClick={() => {
                          setEdit({
                            ...edit,
                            files: [
                              ...new Map(
                                [...(edit.files || []), ...(i.files || [])].map(
                                  (f) => [f.id, f],
                                ),
                              ).values(),
                            ],
                          });
                          setToast("物料已关联，保存后可随发布包导出");
                        }}
                      >
                        关联物料
                      </button>
                      <button
                        onClick={() =>
                          download(
                            i,
                            accounts.find((a) => a.id === i.account)?.name ||
                              i.account,
                          )
                        }
                      >
                        下载正文
                      </button>
                    </div>
                  ))}
                <p className="sv-note">
                  关联已有图片、视频等附件，确认后与正文一同手动发布。
                </p>
              </>
            ) : (
              <label>
                {edit.kind === "数据复盘" ? "复盘记录" : "正文 / 说明"}
                {["内容制作", "发布资产库", "商品与赠品", "发布计划"].includes(
                  edit.kind,
                ) ? (
                  <FormattedEditor
                    value={edit.body}
                    onChange={(body) => setEdit({ ...edit, body })}
                  />
                ) : (
                  <textarea
                    value={edit.body}
                    onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                  />
                )}
              </label>
            )}
            {["发布资产库", "商品与赠品", "知识与经验"].includes(edit.kind) && (
              <label>
                分类
                <select
                  value={edit.type}
                  onChange={(e) => setEdit({ ...edit, type: e.target.value })}
                >
                  {(edit.kind === "发布资产库"
                    ? ["标题正文", "图片", "视频", "文档"]
                    : edit.kind === "商品与赠品"
                      ? ["商品", "赠品"]
                      : ["运营经验", "参考资料", "账号规范"]
                  ).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
            {["内容制作", "发布资产库", "发布计划"].includes(edit.kind) && (
              <label>
                发布标签
                <input
                  placeholder="#AI #工作效率"
                  value={edit.tags || ""}
                  onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
                />
              </label>
            )}
            {edit.kind === "内容审核" && (
              <label>
                审核意见
                <textarea
                  value={edit.reviewNote || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, reviewNote: e.target.value })
                  }
                />
                <button onClick={() => move("内容制作", "待修改")}>
                  退回制作
                </button>
              </label>
            )}
            {edit.kind === "发布计划" && (
              <>
                <label>
                  计划发布时间
                  <input
                    type="datetime-local"
                    value={edit.date}
                    onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                  />
                </label>
                <label>
                  实际发布时间
                  <input
                    type="datetime-local"
                    value={edit.actualDate || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, actualDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  发布链接
                  <input
                    placeholder="手动发布后粘贴链接"
                    value={edit.url}
                    onChange={(e) => setEdit({ ...edit, url: e.target.value })}
                  />
                </label>
                <p className="sv-note">
                  导出为 Markdown 正文与发布说明；不自动向社交平台发布。
                </p>
              </>
            )}
            {page === "数据复盘" && (
              <>
                <label>
                  上传复盘数据（CSV / JSON）
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        if (f.size > 2 * 1024 * 1024)
                          throw Error("数据文件最大 2MB");
                        const rows = parseMetrics(await f.text());
                        const row =
                          rows.find((r) => r.id === edit.id) ||
                          rows.find((r) => r.title === edit.title);
                        if (!row)
                          throw Error("未找到当前内容的 id 或标题，请检查文件");
                        const { id, title, ...metrics } = row;
                        void id;
                        void title;
                        setEdit({ ...edit, ...metrics });
                        setToast("数据已填入编辑表单，检查后保存");
                      } catch (error) {
                        setToast(
                          error instanceof Error ? error.message : "导入失败",
                        );
                      }
                    }}
                  />
                  <small>
                    列名：id 或 标题、浏览量、点赞、评论、分享、转化
                  </small>
                </label>
                <label>
                  浏览 / 播放量
                  <input
                    value={edit.views || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, views: e.target.value })
                    }
                    placeholder="手动记录平台数据"
                  />
                </label>
                <div className="sv-metrics-grid">
                  {(
                    [
                      ["likes", "点赞"],
                      ["comments", "评论"],
                      ["shares", "分享"],
                      ["conversions", "转化 / 成交"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input
                        type="number"
                        min="0"
                        value={edit[field] || ""}
                        onChange={(e) =>
                          setEdit({ ...edit, [field]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  复盘记录
                  <textarea
                    value={edit.reflection || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, reflection: e.target.value })
                    }
                    placeholder="表现怎样？下一次要改什么？"
                  />
                </label>
                <button
                  onClick={() => {
                    const note = {
                      ...edit,
                      id: crypto.randomUUID(),
                      title: edit.title + " · 复盘经验",
                      body: edit.reflection || "待补充复盘经验",
                      kind: "知识与经验",
                      type: "运营经验",
                      status: "已保存",
                    };
                    save({ ...note, parentId: edit.id, history: [] }, false);
                    setToast("已沉淀到知识与经验");
                  }}
                >
                  沉淀为运营经验
                </button>
              </>
            )}
            <div className="sv-buttons">
              <button disabled={!edit.title.trim()} onClick={() => save(edit)}>
                保存
              </button>
              <button
                disabled={!edit.title.trim()}
                onClick={() =>
                  download(
                    edit,
                    accounts.find((a) => a.id === edit.account)?.name ||
                      edit.account,
                  )
                }
              >
                <Download size={16} />
                下载内容
              </button>
              {["内容制作", "发布计划", "发布资产库"].includes(edit.kind) && (
                <button
                  disabled={!edit.title.trim()}
                  onClick={() => void exportPackage(edit)}
                >
                  导出发布包 ZIP
                </button>
              )}
              {edit.kind === "灵感收集" && (
                <button
                  className="sv-primary"
                  onClick={() => move("选题池", "待评估")}
                >
                  加入选题池
                </button>
              )}
              {edit.kind === "选题池" && (
                <button
                  className="sv-primary"
                  onClick={() => move("内容制作", "草稿")}
                >
                  采用并开始制作
                </button>
              )}
              {edit.kind === "内容制作" && (
                <button
                  className="sv-primary"
                  onClick={() => move("内容审核", "待确认")}
                >
                  提交审核
                </button>
              )}
              {edit.kind === "热点与爆款调研" && (
                <button
                  className="sv-primary"
                  onClick={() => move("选题池", "待评估")}
                >
                  整理为选题
                </button>
              )}
              {edit.kind === "内容审核" && (
                <button onClick={() => move("内容制作", "需修改")}>
                  退回修改
                </button>
              )}
              {edit.kind === "内容审核" && (
                <button
                  className="sv-primary"
                  onClick={() => move("发布计划", "待手动发布")}
                >
                  确认通过，进入排期
                </button>
              )}
              {edit.kind === "发布计划" && (
                <button
                  className="sv-primary"
                  disabled={!edit.url.trim() || !edit.actualDate}
                  onClick={() => {
                    save({ ...edit, status: "已发布" });
                    setToast("已记录手动发布，可在数据复盘查看");
                  }}
                >
                  标记已发布
                </button>
              )}
              {edit.status === "已发布" && (
                <button
                  className="sv-primary"
                  onClick={() => {
                    save(edit);
                    setPage("数据复盘");
                  }}
                >
                  查看复盘列表
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {config && (
        <div className="sv-backdrop" onClick={() => setConfig(false)}>
          <section
            className="sv-config"
            role="dialog"
            aria-modal="true"
            aria-label="AI 配置详情"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>{aiTab}</h2>
              <button aria-label="关闭配置" onClick={() => setConfig(false)}>
                <X />
              </button>
            </div>
            {aiTab === "外部 AI 接入" ? (
              <McpSetup />
            ) : aiTab === "模型 API" ? (
              <ModelSetup />
            ) : (
              <label>
                任务模板
                <textarea placeholder="账号背景、执行要求、输出格式" />
              </label>
            )}
            {aiTab === "任务模板" && (
              <button
                className="sv-primary"
                onClick={() => {
                  setConfig(false);
                  setToast("任务模板仅为演示");
                }}
              >
                确认
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

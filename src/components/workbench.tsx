"use client";
/* Native image previews serve private local files without the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Home,
  Folder,
  CheckSquare,
  Layers,
  Grid2X2,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Video,
  BookOpen,
  Sun,
  Code2,
  FileText,
  File,
  Link as LinkIcon,
  Image as ImageIcon,
  Music,
  Archive,
  MoreHorizontal,
  Check,
  X,
  Copy,
  Upload,
  Send,
  ExternalLink,
  Clock,
  HardDrive,
  CheckCircle2,
  Circle,
  CircleDot,
  Loader2,
  RefreshCw,
  MessageSquare,
  Download,
  Paperclip,
  Monitor,
  Moon,
  SlidersHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type {
  Project,
  Task,
  Asset,
  Activity,
  Connection,
  Snapshot,
  ContextOptions,
  StoredFile,
  Session,
} from "@/types";
const nav = [
  { id: "home", label: "工作台", icon: Home },
  { id: "projects", label: "项目", icon: Folder },
  { id: "tasks", label: "任务", icon: CheckSquare },
  { id: "assets", label: "产物库", icon: Layers },
  { id: "apps", label: "AI 应用", icon: Grid2X2 },
];
const iconMap = {
  folder: Folder,
  sparkles: Sparkles,
  video: Video,
  book: BookOpen,
  sun: Sun,
  code: Code2,
};
const providerMarks: Record<string, string> = {
  chatgpt: "◎",
  deepseek: "D",
  qwen: "Q",
  lovart: "L",
  jimeng: "即",
  openclaw: "⌘",
};
const typeIcons: Record<string, typeof FileText> = {
  Text: FileText,
  Document: FileText,
  Image: ImageIcon,
  Video,
  Audio: Music,
  Code: Code2,
  Archive,
  URL: LinkIcon,
  Other: File,
};
const typeNames: Record<string, string> = {
  Text: "文本",
  Document: "文档",
  Image: "图片",
  Video: "视频",
  Audio: "音频",
  Code: "代码",
  Archive: "压缩包",
  URL: "链接",
  Other: "其他",
};
const statusNames: Record<string, string> = {
  todo: "待开始",
  doing: "进行中",
  done: "已完成",
};
const emptyData: Snapshot = {
  projects: [],
  tasks: [],
  assets: [],
  files: [],
  activities: [],
  sessions: [],
  messages: [],
  connections: [],
  storage: "",
};
type Modal = {
  type: string;
  project?: Project;
  task?: Task;
  asset?: Asset;
  provider?: string;
  session?: Session;
  activity?: Activity;
  file?: StoredFile;
};
async function request(action: string, value: unknown) {
  const response = await fetch("/api/workbench", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, value }),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "操作失败，请重试");
  return data;
}
function relative(date: string) {
  const d = Math.max(0, Date.now() - new Date(date).getTime());
  if (d < 60000) return "刚刚";
  if (d < 3600000) return `${Math.floor(d / 60000)} 分钟前`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} 小时前`;
  return `${Math.floor(d / 86400000)} 天前`;
}
function ProjectIcon({
  project,
  small = false,
}: {
  project: Project;
  small?: boolean;
}) {
  const Icon = iconMap[project.icon as keyof typeof iconMap] || Folder;
  return (
    <span className={`project-icon ${project.color} ${small ? "small" : ""}`}>
      <Icon size={small ? 15 : 22} />
    </span>
  );
}
function AppMark({ id, small = false }: { id: string; small?: boolean }) {
  return (
    <span className={`app-mark ${id} ${small ? "small" : ""}`}>
      {providerMarks[id] || "AI"}
    </span>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Layers size={29} />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        components={{
          img: ({ src, alt }) => (
            <a
              href={typeof src === "string" ? src : undefined}
              target="_blank"
              rel="noreferrer"
            >
              查看图片：{alt || "图片链接"}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
export default function Workbench() {
  const [data, setData] = useState<Snapshot>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState("home");
  const [projectId, setProjectId] = useState("");
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("system");
  const [themeReady, setThemeReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workbench");
      const d = await res.json();
      if (!res.ok) throw Error(d.error);
      setData(d);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
      try {
        setTheme(localStorage.getItem("workbench-theme") || "system");
      } catch {
        setTheme("system");
      }
      setThemeReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setQuery("");
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setModal(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    try {
      localStorage.setItem("workbench-theme", theme);
    } catch {}
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, themeReady]);
  const mutate = async (action: string, value: unknown, success = "已保存") => {
    try {
      const result = await request(action, value);
      await refresh();
      if (success) notify(success);
      return result;
    } catch (e) {
      notify((e as Error).message);
      throw e;
    }
  };
  const go = (target: string) => {
    setPage(target);
    setFilter("all");
    setQuery("");
  };
  const openProject = (p: Project) => {
    setProjectId(p.id);
    setPage("project");
    setTab("overview");
    void request("visit", { id: p.id })
      .then(refresh)
      .catch((e) => notify(e.message));
  };
  const currentProject = data.projects.find((p) => p.id === projectId);
  const active = data.projects.filter((p) => p.status === "active");
  const openAI = (provider?: string, p?: Project, t?: Task) =>
    setModal({
      type: "context",
      provider: provider || t?.preferredApp || "chatgpt",
      project: p || currentProject || active[0],
      task: t,
    });
  const newTask = (p?: Project) =>
    setModal({ type: "task", project: p || currentProject || active[0] });
  const newAsset = (p?: Project) =>
    setModal({ type: "asset", project: p || currentProject || active[0] });
  const taskRows = (rows: Task[], showProject = true) =>
    rows.length ? (
      <div className="task-list">
        {rows.map((t) => (
          <div className="task-row" key={t.id}>
            <button
              className={`task-check ${t.status}`}
              aria-label={`${t.status === "done" ? "重新打开" : "完成"}：${t.title}`}
              onClick={() =>
                void mutate(
                  "task",
                  { ...t, status: t.status === "done" ? "todo" : "done" },
                  t.status === "done" ? "任务已重新打开" : "任务已完成",
                ).catch(() => {})
              }
            >
              {t.status === "done" ? (
                <Check size={13} />
              ) : t.status === "doing" ? (
                <CircleDot size={17} />
              ) : (
                <Circle size={17} />
              )}
            </button>
            <button
              className={`task-main ${t.status === "done" ? "done" : ""}`}
              onClick={() =>
                setModal({
                  type: "task",
                  task: t,
                  project: data.projects.find((p) => p.id === t.projectId),
                })
              }
            >
              <span>{t.title}</span>
              {showProject && (
                <small>
                  {data.projects.find((p) => p.id === t.projectId)?.name}
                </small>
              )}
            </button>
            <span
              className={`priority ${t.priority}`}
              title={`${t.priority === "high" ? "高" : t.priority === "low" ? "低" : "中"}优先级`}
            >
              {t.priority === "high" ? "↑↑" : t.priority === "low" ? "↓" : "—"}
            </span>
            <span className={`task-status ${t.status}`}>
              {statusNames[t.status]}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <Empty
        title="这里暂时没有任务"
        description="把下一步拆成一个小任务。"
        action={
          <button className="button secondary" onClick={() => newTask()}>
            <Plus size={15} />
            新建任务
          </button>
        }
      />
    );
  const projectCards = (rows: Project[]) =>
    rows.length ? (
      <div className="project-grid">
        {rows.map((p) => {
          const ts = data.tasks.filter((t) => t.projectId === p.id);
          const done = ts.filter((t) => t.status === "done").length;
          return (
            <button
              className={`project-card ${p.color}`}
              key={p.id}
              onClick={() => openProject(p)}
            >
              <div className="card-top">
                <ProjectIcon project={p} />
                <span className="tag">
                  {p.id.startsWith("demo-")
                    ? "示例项目"
                    : p.status === "archived"
                      ? "已归档"
                      : "进行中"}
                </span>
                <ArrowUpRight size={16} className="card-arrow" />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description || "为这个项目添加一点背景。"}</p>
              <div className="card-tags">
                {p.tags
                  .split(",")
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t}>{t}</span>
                  ))}
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${ts.length ? (done / ts.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="card-foot">
                <span>
                  <CheckSquare size={13} />
                  {done} / {ts.length} 个任务
                </span>
                <span>{relative(p.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    ) : (
      <Empty
        title="你的第一个项目，从这里开始"
        description="为一个想法命名，剩下的慢慢完成。"
        action={
          <button
            className="button primary"
            onClick={() => setModal({ type: "project" })}
          >
            <Plus size={15} />
            新建项目
          </button>
        }
      />
    );
  const assetRows = (rows: Asset[]) =>
    rows.length ? (
      <div className="asset-list">
        {rows.map((a) => {
          const Icon = typeIcons[a.type] || FileText;
          return (
            <button
              className="asset-row"
              key={a.id}
              onClick={() => setModal({ type: "preview", asset: a })}
            >
              <span className={`asset-type ${a.type.toLowerCase()}`}>
                <Icon size={20} />
              </span>
              <span className="asset-info">
                <strong>{a.title}</strong>
                <small>
                  {data.projects.find((p) => p.id === a.projectId)?.name}
                  <i>·</i>
                  {a.sourceApp === "manual"
                    ? "手动添加"
                    : data.connections.find((c) => c.id === a.sourceApp)
                        ?.name || a.sourceApp}
                </small>
              </span>
              <span className="muted asset-format">{typeNames[a.type]}</span>
              <span className="muted asset-time">{relative(a.createdAt)}</span>
              <ChevronRight size={15} />
            </button>
          );
        })}
      </div>
    ) : (
      <Empty
        title="给好结果一个归处"
        description="粘贴 AI 回复、上传文件，或收藏一个链接。"
        action={
          <button className="button secondary" onClick={() => newAsset()}>
            <Plus size={15} />
            添加产物
          </button>
        }
      />
    );
  const appCards = (compact = false) => (
    <div className={compact ? "apps-grid compact" : "apps-grid"}>
      {data.connections.map((c) => (
        <button className="app-card" key={c.id} onClick={() => openAI(c.id)}>
          <div className="app-card-top">
            <AppMark id={c.id} />
            <ArrowUpRight size={14} />
          </div>
          <strong>{c.name}</strong>
          {!compact && <p>{c.description}</p>}
          <span
            className={`connection-state ${c.status === "Connected" ? "connected" : ""}`}
          >
            <span />
            {c.status === "External"
              ? "网页使用"
              : c.status === "Not configured"
                ? "待配置"
                : c.status === "Connected"
                  ? "已连接"
                  : c.status === "Error"
                    ? "连接异常"
                    : c.status}
          </span>
        </button>
      ))}
    </div>
  );
  const activitiesList = (rows: Activity[]) =>
    rows.length ? (
      <div className="activity-list">
        {rows.map((a) => (
          <button
            key={a.id}
            className="activity-row"
            onClick={() => setModal({ type: "activity", activity: a })}
          >
            <AppMark id={a.provider} small />
            <span>
              <strong>
                {data.connections.find((c) => c.id === a.provider)?.name}
              </strong>
              <small>
                {a.status === "prepared"
                  ? "已准备上下文"
                  : a.status === "completed"
                    ? "完成 AI 对话"
                    : a.status === "failed"
                      ? "调用失败"
                      : "请求已发起"}{" "}
                · {data.projects.find((p) => p.id === a.projectId)?.name}
              </small>
              <time>{relative(a.createdAt)}</time>
            </span>
          </button>
        ))}
      </div>
    ) : (
      <div className="activity-empty">
        <span className="activity-empty-icon">
          <MessageSquare size={21} />
        </span>
        <strong>下一次灵感，从这里开始</strong>
        <p>
          带着项目上下文使用 AI，
          <br />
          工作记录会自动保留在这里。
        </p>
        <button className="text-button" onClick={() => openAI()}>
          开始 AI 协作 <ArrowRight size={14} />
        </button>
      </div>
    );
  const breadcrumbs =
    page === "project"
      ? ["项目", currentProject?.name || ""]
      : [nav.find((n) => n.id === page)?.label || "设置"];
  return (
    <div className={`shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-symbol">
            <Layers size={21} />
          </span>
          <span className="brand-text">
            自媒体工作台<span>本地创作空间</span>
          </span>
        </button>
        <button className="workspace-picker" onClick={() => go("projects")}>
          <span className="avatar">鱼</span>
          <span>
            我的工作空间<small>Personal workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button
          className="sidebar-search"
          onClick={() => {
            setSearchOpen(true);
            setQuery("");
          }}
        >
          <Search size={16} />
          <span>搜索一切…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-label">工作空间</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id || (n.id === "projects" && page === "project") ? "active" : ""}`}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "tasks" && (
                <span className="nav-count">
                  {
                    data.tasks.filter(
                      (t) =>
                        t.status !== "done" &&
                        active.some((p) => p.id === t.projectId),
                    ).length
                  }
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label projects-label">
          <span>最近项目</span>
          <button
            aria-label="新建项目"
            onClick={() => setModal({ type: "project" })}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="sidebar-projects">
          {active.slice(0, 5).map((p) => (
            <button
              onClick={() => openProject(p)}
              className={
                currentProject?.id === p.id && page === "project"
                  ? "selected"
                  : ""
              }
              key={p.id}
            >
              <span className={`project-dot ${p.color}`} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-led" />
            <span>
              灵感在云端，成果在本地<small>数据保存在这台 Mac 上</small>
            </span>
            <HardDrive size={15} />
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings size={18} />
            <span>设置</span>
          </button>
          <div className="profile">
            <span className="avatar">鱼</span>
            <span>
              老鱼<small>个人工作空间</small>
            </span>
            <button
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="切换侧栏"
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <Home size={15} />
            <span>/</span>
            {breadcrumbs.map((b, i) => (
              <span
                key={i}
                className={i === breadcrumbs.length - 1 ? "current" : ""}
              >
                {b}
                {i < breadcrumbs.length - 1 && <ChevronRight size={13} />}
              </span>
            ))}
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span />
              本地工作空间
            </span>
            <span className="top-divider" />
            <button
              title="搜索 · ⌘K"
              aria-label="打开搜索"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
            </button>
            <button
              className="avatar small"
              onClick={() => go("settings")}
              aria-label="个人设置"
            >
              鱼
            </button>
          </div>
        </header>
        <main
          className={`content ${page === "settings" ? "settings-content" : ""}`}
        >
          {loading ? (
            <div className="loading">
              <Loader2 className="spin" />
              正在打开你的工作空间…
            </div>
          ) : loadError ? (
            <Empty
              title="暂时无法读取工作台"
              description={loadError}
              action={
                <button className="button primary" onClick={refresh}>
                  <RefreshCw size={15} />
                  重试
                </button>
              }
            />
          ) : (
            <>
              {page === "home" && (
                <>
                  <div className="page-heading home-heading">
                    <div>
                      <div className="eyebrow">
                        <span className="tiny-sun">
                          <Sun size={14} />
                        </span>
                        {new Intl.DateTimeFormat("zh-CN", {
                          timeZone: "Asia/Shanghai",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        }).format(new Date())}
                      </div>
                      <h1>
                        你好，老鱼<span className="greeting-dot">。</span>
                      </h1>
                      <p>让每一个想法，都有一个继续的地方。</p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => setModal({ type: "project" })}
                    >
                      <Plus size={16} />
                      新建项目
                    </button>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => setModal({ type: "project" })}>
                      <span className="quick-icon">
                        <Folder size={18} />
                      </span>
                      <span>
                        <strong>开启一个项目</strong>
                        <small>给新想法一个空间</small>
                      </span>
                      <Plus size={16} />
                    </button>
                    <button onClick={() => newTask()}>
                      <span className="quick-icon">
                        <CheckSquare size={18} />
                      </span>
                      <span>
                        <strong>记下一个任务</strong>
                        <small>把下一步变得清晰</small>
                      </span>
                      <Plus size={16} />
                    </button>
                    <button onClick={() => openAI()}>
                      <span className="quick-icon">
                        <Sparkles size={18} />
                      </span>
                      <span>
                        <strong>与 AI 一起工作</strong>
                        <small>带上背景，即刻开始</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                    <button onClick={() => newAsset()}>
                      <span className="quick-icon">
                        <Upload size={18} />
                      </span>
                      <span>
                        <strong>保存一份产物</strong>
                        <small>留下有价值的结果</small>
                      </span>
                      <Plus size={16} />
                    </button>
                  </div>
                  <section className="home-projects">
                    <div className="section-heading">
                      <h2>
                        继续工作 <span>{active.length}</span>
                      </h2>
                      <button
                        className="text-button muted"
                        onClick={() => go("projects")}
                      >
                        全部项目 <ArrowRight size={14} />
                      </button>
                    </div>
                    {projectCards(active.slice(0, 4))}
                  </section>
                  <section>
                    <div className="section-heading">
                      <h2>你的 AI 伙伴</h2>
                      <button
                        className="text-button muted"
                        onClick={() => go("apps")}
                      >
                        管理应用 <ArrowRight size={14} />
                      </button>
                    </div>
                    {appCards(true)}
                    <div className="section-caption">
                      <span className="subtle-dot" />{" "}
                      选一个项目，带上上下文，让合适的 AI 帮你向前一步。
                    </div>
                  </section>
                  <div className="home-bottom">
                    <section>
                      <div className="section-heading">
                        <h2>最近产物</h2>
                        <button
                          className="text-button muted"
                          onClick={() => go("assets")}
                        >
                          查看全部 <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="panel">
                        {assetRows(data.assets.slice(0, 4))}
                      </div>
                    </section>
                    <section>
                      <div className="section-heading">
                        <h2>最近动态</h2>
                        <Clock size={15} className="muted" />
                      </div>
                      <div className="panel activity-panel">
                        {activitiesList(data.activities.slice(0, 3))}
                      </div>
                    </section>
                  </div>
                  <footer className="page-footer">
                    <span>
                      <Layers size={13} /> 为你的想法，留一张工作台。
                    </span>
                    <span>
                      LOCAL FIRST <span>·</span> V1.0
                    </span>
                  </footer>
                </>
              )}
              {page === "projects" && (
                <>
                  <PageHeading
                    title="项目"
                    subtitle="把零散的想法，组织成持续推进的事情。"
                    action={
                      <button
                        className="button primary"
                        onClick={() => setModal({ type: "project" })}
                      >
                        <Plus size={16} />
                        新建项目
                      </button>
                    }
                  />
                  <div className="list-toolbar">
                    <div className="segmented">
                      {[
                        ["all", "进行中"],
                        ["archived", "已归档"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={filter === v ? "active" : ""}
                          onClick={() => setFilter(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <SearchInput
                      query={query}
                      onChange={setQuery}
                      placeholder="搜索项目…"
                    />
                  </div>
                  {projectCards(
                    data.projects.filter(
                      (p) =>
                        (filter === "archived"
                          ? p.status === "archived"
                          : p.status === "active") &&
                        `${p.name} ${p.description} ${p.tags}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    ),
                  )}
                </>
              )}
              {page === "project" && currentProject && (
                <>
                  <div className="project-heading">
                    <ProjectIcon project={currentProject} />
                    <div>
                      <div className="eyebrow">
                        {currentProject.id.startsWith("demo-")
                          ? "示例项目 · 可自由编辑"
                          : currentProject.status === "archived"
                            ? "已归档项目"
                            : "PROJECT WORKSPACE"}
                      </div>
                      <h1>{currentProject.name}</h1>
                      <p>{currentProject.description}</p>
                    </div>
                    <button
                      className="icon-button"
                      title="编辑项目"
                      onClick={() =>
                        setModal({ type: "project", project: currentProject })
                      }
                    >
                      <MoreHorizontal size={21} />
                    </button>
                  </div>
                  <div className="project-actions">
                    <div className="card-tags">
                      {currentProject.tags
                        .split(",")
                        .filter(Boolean)
                        .map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                    </div>
                    <div>
                      <button
                        className="button secondary"
                        onClick={() => newTask(currentProject)}
                      >
                        <Plus size={15} />
                        新建任务
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => newAsset(currentProject)}
                      >
                        <Layers size={15} />
                        添加产物
                      </button>
                      <button
                        className="button primary"
                        onClick={() => openAI(undefined, currentProject)}
                      >
                        <Sparkles size={15} />
                        使用 AI
                      </button>
                    </div>
                  </div>
                  <div className="tabs">
                    {[
                      ["overview", "概览"],
                      ["tasks", "任务"],
                      ["files", "资料文件"],
                      ["history", "AI 记录"],
                      ["assets", "产物"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        className={tab === v ? "active" : ""}
                        onClick={() => setTab(v)}
                      >
                        {l}
                        {v === "tasks" && (
                          <span>
                            {
                              data.tasks.filter(
                                (t) => t.projectId === projectId,
                              ).length
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {tab === "overview" && (
                    <>
                      <div className="overview-grid">
                        <div>
                          <section className="panel goal-panel">
                            <div className="section-heading">
                              <h2>
                                <span className="goal-icon">◎</span>当前目标
                              </h2>
                              <button
                                className="text-button muted"
                                onClick={() =>
                                  setModal({
                                    type: "project",
                                    project: currentProject,
                                  })
                                }
                              >
                                编辑 <SlidersHorizontal size={13} />
                              </button>
                            </div>
                            <p>
                              {currentProject.goal ||
                                "为这个项目设定一个清晰的目标。"}
                            </p>
                            <div className="goal-stats">
                              <span>
                                <strong>
                                  {
                                    data.tasks.filter(
                                      (t) =>
                                        t.projectId === projectId &&
                                        t.status !== "done",
                                    ).length
                                  }
                                </strong>{" "}
                                待办任务
                              </span>
                              <span>
                                <strong>
                                  {
                                    data.assets.filter(
                                      (a) => a.projectId === projectId,
                                    ).length
                                  }
                                </strong>{" "}
                                工作产物
                              </span>
                              <span>
                                <strong>
                                  {
                                    data.activities.filter(
                                      (a) => a.projectId === projectId,
                                    ).length
                                  }
                                </strong>{" "}
                                AI 协作
                              </span>
                            </div>
                          </section>
                          <section>
                            <div className="section-heading">
                              <h2>接下来做什么</h2>
                              <button
                                className="text-button muted"
                                onClick={() => newTask(currentProject)}
                              >
                                <Plus size={14} />
                                添加任务
                              </button>
                            </div>
                            <div className="panel">
                              {taskRows(
                                data.tasks.filter(
                                  (t) =>
                                    t.projectId === projectId &&
                                    t.status !== "done",
                                ),
                                false,
                              )}
                            </div>
                          </section>
                          <section>
                            <div className="section-heading">
                              <h2>项目产物</h2>
                              <button
                                className="text-button muted"
                                onClick={() => setTab("assets")}
                              >
                                查看全部 <ArrowRight size={14} />
                              </button>
                            </div>
                            <div className="panel">
                              {assetRows(
                                data.assets
                                  .filter((a) => a.projectId === projectId)
                                  .slice(0, 3),
                              )}
                            </div>
                          </section>
                        </div>
                        <div>
                          <Notes
                            key={currentProject.id}
                            project={currentProject}
                            save={async (notes) => {
                              await mutate(
                                "notes",
                                { id: currentProject.id, notes },
                                "",
                              );
                            }}
                          />
                          <section>
                            <div className="section-heading">
                              <h2>AI 动态</h2>
                            </div>
                            <div className="panel">
                              {activitiesList(
                                data.activities
                                  .filter((a) => a.projectId === projectId)
                                  .slice(0, 3),
                              )}
                            </div>
                          </section>
                        </div>
                      </div>
                    </>
                  )}
                  {tab === "tasks" && (
                    <div className="panel">
                      {taskRows(
                        data.tasks.filter((t) => t.projectId === projectId),
                        false,
                      )}
                    </div>
                  )}
                  {tab === "files" && (
                    <>
                      <div className="upload-zone">
                        <Paperclip size={24} />
                        <div>
                          <strong>为项目补充背景资料</strong>
                          <p>文档、图片、音视频与压缩包 · 单文件最大 100 MB</p>
                        </div>
                        <label className="button secondary">
                          {uploading ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Upload size={15} />
                          )}
                          {uploading ? "正在上传…" : "上传文件"}
                          <input
                            type="file"
                            disabled={uploading}
                            hidden
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f)
                                try {
                                  setUploading(true);
                                  notify("正在上传文件…");
                                  await upload(f, currentProject.id);
                                  await refresh();
                                  notify("文件已保存到本机");
                                } catch (err) {
                                  notify((err as Error).message);
                                }
                              setUploading(false);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div className="panel">
                        {data.files.filter((f) => f.projectId === projectId)
                          .length ? (
                          data.files
                            .filter((f) => f.projectId === projectId)
                            .map((f) => (
                              <div className="file-row" key={f.id}>
                                <FileText size={22} />
                                <button
                                  onClick={() =>
                                    setModal({ type: "file", file: f })
                                  }
                                >
                                  <strong>{f.name}</strong>
                                  <small>
                                    {formatSize(f.size)} ·{" "}
                                    {relative(f.createdAt)}
                                  </small>
                                </button>
                                <a
                                  aria-label={`下载 ${f.name}`}
                                  href={`/api/files/${f.id}?download=1`}
                                >
                                  <Download size={16} />
                                </a>
                              </div>
                            ))
                        ) : (
                          <Empty
                            title="还没有项目资料"
                            description="上传后可在本地预览、下载，并加入上下文的文件清单。"
                          />
                        )}
                      </div>
                    </>
                  )}
                  {tab === "history" && (
                    <>
                      {data.sessions.filter((s) => s.projectId === projectId)
                        .length > 0 && (
                        <section>
                          <div className="section-heading">
                            <h2>继续对话</h2>
                          </div>
                          {data.sessions
                            .filter((s) => s.projectId === projectId)
                            .map((s) => (
                              <button
                                className="session-row panel"
                                key={s.id}
                                onClick={() =>
                                  setModal({ type: "chat", session: s })
                                }
                              >
                                <AppMark id={s.provider} small />
                                <span>
                                  {
                                    data.connections.find(
                                      (c) => c.id === s.provider,
                                    )?.name
                                  }{" "}
                                  会话 · {relative(s.createdAt)}
                                </span>
                                <ArrowRight size={16} />
                              </button>
                            ))}
                        </section>
                      )}
                      <div className="panel">
                        {activitiesList(
                          data.activities.filter(
                            (a) => a.projectId === projectId,
                          ),
                        )}
                      </div>
                    </>
                  )}
                  {tab === "assets" && (
                    <div className="panel">
                      {assetRows(
                        data.assets.filter((a) => a.projectId === projectId),
                      )}
                    </div>
                  )}
                </>
              )}
              {page === "tasks" && (
                <>
                  <PageHeading
                    title="任务"
                    subtitle="专注于下一步，一件一件完成。"
                    action={
                      <button
                        className="button primary"
                        onClick={() => newTask()}
                      >
                        <Plus size={16} />
                        新建任务
                      </button>
                    }
                  />
                  <div className="list-toolbar">
                    <div className="segmented">
                      {[
                        ["all", "全部"],
                        ["todo", "待开始"],
                        ["doing", "进行中"],
                        ["done", "已完成"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={filter === v ? "active" : ""}
                          onClick={() => setFilter(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <SearchInput
                      query={query}
                      onChange={setQuery}
                      placeholder="搜索任务…"
                    />
                  </div>
                  <div className="panel">
                    {taskRows(
                      data.tasks.filter(
                        (t) =>
                          (filter === "all" || t.status === filter) &&
                          active.some((p) => p.id === t.projectId) &&
                          t.title.toLowerCase().includes(query.toLowerCase()),
                      ),
                    )}
                  </div>
                </>
              )}
              {page === "assets" && (
                <>
                  <PageHeading
                    title="产物库"
                    subtitle="好想法有来处，好结果有归处。"
                    action={
                      <button
                        className="button primary"
                        onClick={() => newAsset()}
                      >
                        <Plus size={16} />
                        添加产物
                      </button>
                    }
                  />
                  <div className="list-toolbar">
                    <div className="segmented">
                      {[
                        ["all", "全部"],
                        ["Document", "文档"],
                        ["Text", "文本"],
                        ["Image", "图片"],
                        ["URL", "链接"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={filter === v ? "active" : ""}
                          onClick={() => setFilter(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <SearchInput
                      query={query}
                      onChange={setQuery}
                      placeholder="搜索产物…"
                    />
                  </div>
                  <div className="panel">
                    {assetRows(
                      data.assets.filter(
                        (a) =>
                          (filter === "all" || a.type === filter) &&
                          `${a.title} ${a.content}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      ),
                    )}
                  </div>
                </>
              )}
              {page === "apps" && (
                <>
                  <PageHeading
                    title="AI 应用"
                    subtitle="一个工作空间，与你熟悉的 AI 一起工作。"
                    action={
                      <button
                        className="button secondary"
                        onClick={() => go("settings")}
                      >
                        <Settings size={15} />
                        连接设置
                      </button>
                    }
                  />
                  {appCards()}
                  <div className="connection-explainer">
                    <span className="quick-icon">
                      <Sparkles size={22} />
                    </span>
                    <div>
                      <h3>带着背景去，带着成果回</h3>
                      <p>
                        选择项目 → 组装上下文 → 使用 AI →
                        保存到项目。网页模式保留你已有的会员使用方式；API 与 MCP
                        连接单独配置。
                      </p>
                      <button className="text-button" onClick={() => openAI()}>
                        开始一次 AI 协作 <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
              {page === "settings" && (
                <>
                  <PageHeading
                    title="设置"
                    subtitle="让工作台，以你习惯的方式运行。"
                  />
                  <section className="settings-panel panel">
                    <h2>外观与本地存储</h2>
                    <div className="setting-row">
                      <div>
                        <strong>主题</strong>
                        <small>让工作空间适应你的环境</small>
                      </div>
                      <div className="segmented">
                        {[
                          ["system", "跟随系统", Monitor],
                          ["light", "浅色", Sun],
                          ["dark", "深色", Moon],
                        ].map(([v, l, Icon]) => {
                          const I = Icon as typeof Sun;
                          return (
                            <button
                              key={v as string}
                              className={theme === v ? "active" : ""}
                              onClick={() => setTheme(v as string)}
                            >
                              <I size={14} />
                              {l as string}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>数据位置</strong>
                        <small className="storage-path">{data.storage}</small>
                      </div>
                      <span className="status-chip">
                        <span />
                        SQLite 已就绪
                      </span>
                    </div>
                    <p className="settings-note">
                      项目与文件仅保存在本机。定期备份整个 workbench-data
                      文件夹，可保留你的完整工作空间。
                    </p>
                  </section>
                  <div className="section-heading">
                    <h2>AI 连接</h2>
                    <span className="muted">密钥仅在服务端读取</span>
                  </div>
                  <div className="settings-connections">
                    {data.connections.map((c) => (
                      <ConnectionSettings
                        key={c.id}
                        connection={c}
                        onSave={async (v) => {
                          await mutate("connection", v, "连接配置已保存");
                        }}
                        onTest={async () => {
                          try {
                            const r = await request("test", { id: c.id });
                            await refresh();
                            notify("连接测试成功");
                            return r;
                          } catch (e) {
                            await refresh();
                            throw e;
                          }
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            {
              project: modal.project ? "编辑项目" : "开启一个新项目",
              task: modal.task ? "任务详情" : "记下下一步",
              asset: modal.asset?.id ? "编辑产物" : "保存一份产物",
              preview: "产物详情",
              context: "带着上下文，开始协作",
              chat: "AI 工作空间",
              activity: "AI 使用记录",
              file: "文件预览",
            }[modal.type] || ""
          }
          wide={["context", "chat", "preview", "file"].includes(modal.type)}
          drawer={modal.type === "task"}
          onClose={() => setModal(null)}
        >
          {modal.type === "project" && (
            <ProjectForm
              project={modal.project}
              onSave={async (value) => {
                const r = await mutate("project", value, "项目已保存");
                setModal(null);
                setProjectId(r.id);
                setPage("project");
                setTab("overview");
              }}
            />
          )}
          {modal.type === "task" && (
            <TaskForm
              task={modal.task}
              project={modal.project}
              data={data}
              onSave={async (value) => {
                await mutate("task", value);
                setModal(null);
              }}
              onAI={(t) =>
                openAI(
                  t.preferredApp,
                  data.projects.find((p) => p.id === t.projectId),
                  t,
                )
              }
            />
          )}
          {modal.type === "asset" && (
            <AssetForm
              asset={modal.asset}
              project={modal.project}
              data={data}
              onSave={async (value) => {
                await mutate("asset", value, "产物已保存到项目");
                setModal(null);
              }}
            />
          )}
          {modal.type === "preview" && modal.asset && (
            <AssetPreview
              asset={modal.asset}
              data={data}
              onEdit={() =>
                setModal({
                  ...modal,
                  type: "asset",
                  project: data.projects.find(
                    (p) => p.id === modal.asset?.projectId,
                  ),
                })
              }
              notify={notify}
            />
          )}
          {modal.type === "context" && (
            <ContextBuilder
              data={data}
              project={modal.project}
              task={modal.task}
              provider={modal.provider}
              notify={notify}
              onRefresh={refresh}
              onSession={(s) => setModal({ type: "chat", session: s })}
              onSettings={() => {
                setModal(null);
                go("settings");
              }}
            />
          )}
          {modal.type === "chat" && modal.session && (
            <Chat
              session={modal.session}
              data={data}
              refresh={refresh}
              notify={notify}
              onAsset={(a) =>
                setModal({
                  type: "asset",
                  asset: a as Asset,
                  project: data.projects.find((p) => p.id === a.projectId),
                })
              }
            />
          )}
          {modal.type === "activity" && modal.activity && (
            <div className="activity-detail">
              <div className="detail-meta">
                <AppMark id={modal.activity.provider} small />
                {
                  data.connections.find(
                    (c) => c.id === modal.activity?.provider,
                  )?.name
                }
                <span className="tag">{modal.activity.mode}</span>
                <span>
                  {new Date(modal.activity.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="notice">
                {modal.activity.status === "prepared"
                  ? "已准备并记录上下文。网页内的实际对话与结果，需要手动保存回项目。"
                  : modal.activity.status === "running"
                    ? "此请求记录尚无完成结果，可能仍在执行或服务曾被中断。"
                    : modal.activity.status === "failed"
                      ? "此次调用失败，可回到会话重试。"
                      : "对话已完成。"}
              </p>
              <h3>上下文快照</h3>
              <pre className="context-preview">{modal.activity.context}</pre>
              {modal.activity.result && (
                <>
                  <h3>结果</h3>
                  <Markdown text={modal.activity.result} />
                </>
              )}
            </div>
          )}
          {modal.type === "file" && modal.file && (
            <FilePreview file={modal.file} />
          )}
        </Dialog>
      )}
      {searchOpen && (
        <Dialog title="搜索与命令" wide onClose={() => setSearchOpen(false)}>
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              placeholder="搜索项目、任务、产物、资料，或执行命令…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {[
              {
                label: "新建项目",
                run: () => setModal({ type: "project" }),
                icon: Folder,
              },
              { label: "新建任务", run: () => newTask(), icon: CheckSquare },
              { label: "添加产物", run: () => newAsset(), icon: Layers },
              ...data.connections.map((c) => ({
                label: `使用 ${c.name}`,
                run: () => openAI(c.id),
                icon: Sparkles,
              })),
            ]
              .filter(
                (c) =>
                  !query || c.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.label}
                  onClick={() => {
                    setSearchOpen(false);
                    c.run();
                  }}
                >
                  <c.icon size={17} />
                  <span>{c.label}</span>
                  <small>命令</small>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {data.projects
              .filter((p) =>
                `${p.name} ${p.description} ${p.tags}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSearchOpen(false);
                    openProject(p);
                  }}
                >
                  <ProjectIcon project={p} small />
                  <span>{p.name}</span>
                  <small>项目</small>
                </button>
              ))}
            {query &&
              data.tasks
                .filter((t) =>
                  `${t.title} ${t.description}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setModal({
                        type: "task",
                        task: t,
                        project: data.projects.find(
                          (p) => p.id === t.projectId,
                        ),
                      });
                    }}
                  >
                    <CheckSquare size={17} />
                    <span>{t.title}</span>
                    <small>任务</small>
                  </button>
                ))}
            {query &&
              data.assets
                .filter((a) =>
                  `${a.title} ${a.content}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setModal({ type: "preview", asset: a });
                    }}
                  >
                    <Layers size={17} />
                    <span>{a.title}</span>
                    <small>产物</small>
                  </button>
                ))}
            {query &&
              data.files
                .filter((f) =>
                  f.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setModal({ type: "file", file: f });
                    }}
                  >
                    <FileText size={17} />
                    <span>{f.name}</span>
                    <small>资料</small>
                  </button>
                ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">YOUR PERSONAL WORKSPACE</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function SearchInput({
  query,
  onChange,
  placeholder,
}: {
  query: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-input">
      <Search size={15} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
  drawer = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first =
      ref.current?.querySelector<HTMLElement>(
        "input:not([type=checkbox]),textarea,select",
      ) || ref.current?.querySelector<HTMLElement>("button");
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]",
        ) || [],
      ).filter((el) => el.offsetParent !== null);
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={`modal-backdrop ${drawer ? "drawer-backdrop" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`dialog ${wide ? "wide" : ""} ${drawer ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function SaveButton({
  busy,
  label = "保存",
}: {
  busy: boolean;
  label?: string;
}) {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
      {busy ? "正在保存…" : label}
    </button>
  );
}
function ErrorNote({ error }: { error: string }) {
  return error ? (
    <div className="error-note" role="alert">
      {error}
    </div>
  ) : null;
}
function ProjectForm({
  project,
  onSave,
}: {
  project?: Project;
  onSave: (value: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [color, setColor] = useState(project?.color || "green");
  const [icon, setIcon] = useState(project?.icon || "folder");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const f = Object.fromEntries(new FormData(e.currentTarget));
          await onSave({ ...project, ...f, color, icon });
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="project-customize">
        <div className="icon-options">
          {Object.entries(iconMap).map(([k, Icon]) => (
            <button
              type="button"
              key={k}
              aria-label={`项目图标 ${k}`}
              className={icon === k ? "selected" : ""}
              onClick={() => setIcon(k)}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
        <div className="color-options">
          {["green", "orange", "blue", "purple"].map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`${c} 颜色`}
              className={`project-dot ${c} ${color === c ? "selected" : ""}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <Field label="项目名称">
        <input
          name="name"
          required
          maxLength={100}
          placeholder="给正在做的事情起个名字"
          defaultValue={project?.name}
        />
      </Field>
      <Field label="项目描述">
        <textarea
          name="description"
          rows={2}
          placeholder="这个项目是关于什么的？"
          defaultValue={project?.description}
        />
      </Field>
      <Field label="当前目标">
        <textarea
          name="goal"
          rows={2}
          placeholder="这一阶段，你希望完成什么？"
          defaultValue={project?.goal}
        />
      </Field>
      <Field label="标签" hint="多个标签用英文逗号分隔">
        <input
          name="tags"
          placeholder="工作,创作,学习"
          defaultValue={project?.tags}
        />
      </Field>
      {project && (
        <Field label="项目状态">
          <select name="status" defaultValue={project.status}>
            <option value="active">进行中</option>
            <option value="archived">已归档</option>
          </select>
        </Field>
      )}
      <ErrorNote error={error} />
      <div className="form-footer">
        <span className="muted">
          <HardDrive size={13} />
          保存在本机
        </span>
        <SaveButton busy={busy} label={project ? "保存项目" : "创建项目"} />
      </div>
    </form>
  );
}
function TaskForm({
  task,
  project,
  data,
  onSave,
  onAI,
}: {
  task?: Task;
  project?: Project;
  data: Snapshot;
  onSave: (v: unknown) => Promise<void>;
  onAI: (t: Task) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave({
            ...task,
            ...Object.fromEntries(new FormData(e.currentTarget)),
          });
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="任务名称">
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={task?.title}
          placeholder="下一步，需要做什么？"
        />
      </Field>
      <Field label="所属项目">
        <select
          name="projectId"
          defaultValue={task?.projectId || project?.id}
          required
        >
          {data.projects
            .filter((p) => !task || p.id === task.projectId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      <div className="form-columns">
        <Field label="状态">
          <select name="status" defaultValue={task?.status || "todo"}>
            {Object.entries(statusNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="优先级">
          <select name="priority" defaultValue={task?.priority || "medium"}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </Field>
      </div>
      <Field label="任务描述">
        <textarea
          name="description"
          rows={3}
          defaultValue={task?.description}
          placeholder="补充背景、具体要求与完成标准…"
        />
      </Field>
      <Field label="优先使用的 AI">
        <select
          name="preferredApp"
          defaultValue={task?.preferredApp || "chatgpt"}
        >
          {data.connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="任务笔记">
        <textarea
          name="notes"
          rows={4}
          defaultValue={task?.notes}
          placeholder="记录进展与想法，支持 Markdown"
        />
      </Field>
      {task && (
        <>
          <div className="related">
            <h4>关联产物</h4>
            {data.assets
              .filter((a) => a.taskId === task.id)
              .map((a) => (
                <p key={a.id}>
                  <FileText size={14} />
                  {a.title}
                </p>
              ))}
            {!data.assets.some((a) => a.taskId === task.id) && (
              <p>暂无关联产物</p>
            )}
            <h4>项目资料</h4>
            {data.files
              .filter((f) => f.projectId === task.projectId)
              .map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.name}
                </a>
              ))}
            <h4>AI 记录</h4>
            <p>
              {data.activities.filter((a) => a.taskId === task.id).length}{" "}
              次协作
            </p>
          </div>
          <button
            className="button secondary full-width"
            type="button"
            onClick={() => onAI(task)}
          >
            <Sparkles size={15} />
            使用已保存的任务上下文
          </button>
        </>
      )}
      <ErrorNote error={error} />
      {!data.projects.length && (
        <p className="notice">请先创建一个项目，再添加任务。</p>
      )}
      <div className="form-footer">
        <span />
        <SaveButton busy={busy || !data.projects.length} label="保存任务" />
      </div>
    </form>
  );
}
async function upload(file: File, projectId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("projectId", projectId);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const result = await res.json();
  if (!res.ok) throw Error(result.error);
  return result;
}
function formatSize(size: number) {
  return size < 1024
    ? `${size} B`
    : size < 1048576
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1048576).toFixed(1)} MB`;
}
function AssetForm({
  asset,
  project,
  data,
  onSave,
}: {
  asset?: Asset;
  project?: Project;
  data: Snapshot;
  onSave: (v: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pid, setPid] = useState(
    asset?.projectId || project?.id || data.projects[0]?.id || "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState(asset?.type || "Text");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const value = {
            ...asset,
            ...Object.fromEntries(new FormData(e.currentTarget)),
            projectId: pid,
            type: kind,
          };
          let fileId = asset?.fileId;
          if (file) fileId = (await upload(file, pid)).id;
          await onSave({
            ...value,
            fileId: fileId || null,
            taskId: value.taskId || null,
          });
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="产物名称">
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={asset?.title}
          placeholder="一个容易找到的名字"
        />
      </Field>
      <div className="form-columns">
        <Field label="所属项目">
          <select
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            disabled={!!asset?.id || !!asset?.activityId}
            required
          >
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="类型">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(typeNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="关联任务">
        <select key={pid} name="taskId" defaultValue={asset?.taskId || ""}>
          <option value="">无关联任务</option>
          {data.tasks
            .filter((t) => t.projectId === pid)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      </Field>
      <Field label="内容 / 粘贴 AI 结果">
        <textarea
          name="content"
          rows={7}
          defaultValue={asset?.content}
          placeholder="把值得留下的内容粘贴到这里，支持 Markdown…"
        />
      </Field>
      <Field label="来源链接">
        <input
          name="url"
          type="url"
          defaultValue={asset?.url}
          placeholder="https://"
        />
      </Field>
      <Field label="来源应用">
        <select name="sourceApp" defaultValue={asset?.sourceApp || "manual"}>
          <option value="manual">手动添加</option>
          {asset?.sourceApp === "示例模板" && (
            <option value="示例模板">示例模板</option>
          )}
          {data.connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="生成指令 / Prompt">
        <textarea
          name="prompt"
          rows={2}
          defaultValue={asset?.prompt}
          placeholder="保留生成背景，方便下次继续"
        />
      </Field>
      <Field label="备注">
        <textarea name="notes" rows={2} defaultValue={asset?.notes} />
      </Field>
      <label className="upload-label">
        <Upload size={17} />
        {file
          ? file.name
          : asset?.fileId
            ? "替换附件"
            : "添加本地文件（可选，最大 100 MB）"}
        <input
          type="file"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <ErrorNote error={error} />
      <div className="form-footer">
        <span className="muted">保存后可在项目产物中找到</span>
        <SaveButton busy={busy || !pid} label="保存到项目" />
      </div>
    </form>
  );
}
function AssetPreview({
  asset,
  data,
  onEdit,
  notify,
}: {
  asset: Asset;
  data: Snapshot;
  onEdit: () => void;
  notify: (s: string) => void;
}) {
  const file = data.files.find((f) => f.id === asset.fileId);
  return (
    <div>
      <div className="preview-title">
        <h2>{asset.title}</h2>
        <span className="tag">{typeNames[asset.type]}</span>
      </div>
      <div className="detail-meta">
        {data.projects.find((p) => p.id === asset.projectId)?.name}
        <span>·</span>
        {data.connections.find((c) => c.id === asset.sourceApp)?.name ||
          asset.sourceApp}
        <span>·</span>
        {relative(asset.createdAt)}
      </div>
      {asset.taskId && (
        <p className="muted">
          关联任务：{data.tasks.find((t) => t.id === asset.taskId)?.title}
        </p>
      )}
      {asset.content && (
        <div className="preview-content">
          <Markdown text={asset.content} />
        </div>
      )}
      {file && <FilePreview file={file} />}
      {asset.url && (
        <a
          className="button secondary"
          href={asset.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={15} />
          打开来源链接
        </a>
      )}
      {asset.prompt && (
        <details>
          <summary>生成指令</summary>
          <pre>{asset.prompt}</pre>
        </details>
      )}
      {asset.notes && <p>{asset.notes}</p>}
      <div className="form-footer">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(asset.content || asset.url);
              notify("已复制产物内容");
            } catch {
              notify("复制失败，请手动选择内容复制");
            }
          }}
        >
          <Copy size={15} />
          复制内容
        </button>
        <button className="button primary" onClick={onEdit}>
          编辑产物
        </button>
      </div>
    </div>
  );
}
function FilePreview({ file }: { file: StoredFile }) {
  const url = `/api/files/${file.id}`;
  return (
    <div className="file-preview">
      <div className="detail-meta">
        <FileText size={17} />
        {file.name}
        <span>{formatSize(file.size)}</span>
        <a className="button secondary" href={`${url}?download=1`}>
          <Download size={14} />
          下载
        </a>
      </div>
      {/^image\/(png|jpeg|gif|webp)$/.test(file.mime) ? (
        <img src={url} alt={file.name} />
      ) : file.mime.startsWith("video/") ? (
        <video src={url} controls />
      ) : file.mime.startsWith("audio/") ? (
        <audio src={url} controls />
      ) : file.mime === "application/pdf" || file.mime === "text/plain" ? (
        <iframe title={file.name} src={url} />
      ) : (
        <Empty
          title="文件已安全保存在本地"
          description="该格式暂不支持内嵌预览，请下载后使用本机应用打开。"
        />
      )}
    </div>
  );
}
function Notes({
  project,
  save,
}: {
  project: Project;
  save: (s: string) => Promise<void>;
}) {
  const [value, setValue] = useState(project.notes);
  const [status, setStatus] = useState("已保存");
  const [preview, setPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  const saved = useRef(value);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  const pending = useRef(Promise.resolve());
  const persist = useCallback((text: string) => {
    pending.current = pending.current.then(async () => {
      if (text === saved.current) return;
      setStatus("保存中…");
      try {
        await saveRef.current(text);
        saved.current = text;
        setStatus("已保存");
      } catch {
        setStatus("保存失败，点击重试");
      }
    });
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current !== saved.current) persist(latest.current);
    },
    [persist],
  );
  return (
    <section className="panel notes-panel">
      <div className="section-heading">
        <h2>
          <FileText size={15} />
          项目笔记
        </h2>
        <button
          className="text-button muted"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "编辑" : "预览"}
        </button>
      </div>
      {preview ? (
        <Markdown text={value || "还没有笔记。"} />
      ) : (
        <textarea
          aria-label="项目笔记"
          onBlur={() => persist(value)}
          value={value}
          placeholder="记录想法与进展…\n支持 Markdown，修改会自动保存。"
          onChange={(e) => {
            const text = e.target.value;
            setValue(text);
            latest.current = text;
            setStatus("等待保存…");
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => persist(text), 700);
          }}
        />
      )}
      <div className="notes-footer">
        <span>Markdown</span>
        <button onClick={() => persist(value)}>
          {status === "已保存" && <Check size={12} />}
          {status}
        </button>
      </div>
    </section>
  );
}
const defaultOptions: ContextOptions = {
  description: true,
  goal: true,
  notes: false,
  task: true,
  assets: false,
  files: false,
};
function ContextBuilder({
  data,
  project,
  task,
  provider,
  notify,
  onRefresh,
  onSession,
  onSettings,
}: {
  data: Snapshot;
  project?: Project;
  task?: Task;
  provider?: string;
  notify: (s: string) => void;
  onRefresh: () => Promise<void>;
  onSession: (s: Session) => void;
  onSettings: () => void;
}) {
  const [pid, setPid] = useState(project?.id || data.projects[0]?.id || "");
  const [tid, setTid] = useState(task?.id || "");
  const [app, setApp] = useState(provider || "chatgpt");
  const [options, setOptions] = useState(defaultOptions);
  const [instruction, setInstruction] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [mode, setMode] = useState(app === "openclaw" ? "mcp" : "external");
  const c = data.connections.find((c) => c.id === app);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!pid) return;
    const timer = setTimeout(() => {
      setPreviewing(true);
      request("context", {
        projectId: pid,
        taskId: tid || null,
        provider: app,
        options,
        instruction,
      })
        .then((r) => {
          if (!cancelled) {
            setText(r.text);
            setError("");
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pid, tid, app, options, instruction]);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const value = {
        projectId: pid,
        taskId: tid || null,
        provider: app,
        options,
        instruction,
      };
      if (mode === "external") {
        const r = await request("external", value);
        setText(r.text);
        try {
          await navigator.clipboard.writeText(r.text);
          notify("上下文已复制，打开 AI 后直接粘贴");
        } catch {
          notify("浏览器未允许复制，请使用右侧文本手动复制");
        }
        setPrepared(true);
        await onRefresh();
      } else {
        const r = await request("session", value);
        await onRefresh();
        onSession({
          id: r.id,
          projectId: pid,
          taskId: tid || null,
          provider: app,
          context: r.context,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className="dialog-intro">
        选择要带给 AI 的信息。你始终决定分享什么，以及保存什么。
      </p>
      <div className="context-layout">
        <div>
          <Field label="当前项目">
            <select
              value={pid}
              onChange={(e) => {
                setPid(e.target.value);
                setTid("");
                setPrepared(false);
              }}
            >
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="关联任务">
            <select
              value={tid}
              onChange={(e) => {
                setTid(e.target.value);
                setPrepared(false);
              }}
            >
              <option value="">不关联任务</option>
              {data.tasks
                .filter((t) => t.projectId === pid)
                .map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </Field>
          <h4>带上这些上下文</h4>
          <div className="context-options">
            {Object.entries({
              description: "项目背景",
              goal: "当前目标",
              notes: "项目笔记",
              task: "当前任务",
              assets: "最近 5 份产物",
              files: "资料文件清单",
            }).map(([k, v]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={options[k as keyof ContextOptions]}
                  onChange={(e) => {
                    setOptions({ ...options, [k]: e.target.checked });
                    setPrepared(false);
                  }}
                />
                <span>{v}</span>
                {k === "files" && <small>不包含文件内容</small>}
              </label>
            ))}
          </div>
          <Field label="交给哪位 AI 伙伴">
            <select
              value={app}
              onChange={(e) => {
                setApp(e.target.value);
                setMode(e.target.value === "openclaw" ? "mcp" : "external");
                setPrepared(false);
              }}
            >
              {data.connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {c && c.modes.length > 1 && (
            <div className="segmented mode-picker">
              {c.modes.map((m) => (
                <button
                  key={m}
                  className={mode === m ? "active" : ""}
                  onClick={() => {
                    setMode(m);
                    setPrepared(false);
                  }}
                >
                  {m === "external" ? "网页使用" : "API 对话"}
                </button>
              ))}
            </div>
          )}
          {mode !== "external" && !c?.configured && (
            <div className="notice">
              尚未配置{mode === "mcp" ? " MCP 桥接服务" : " API Key"}。
              <button className="text-button" onClick={onSettings}>
                前往连接设置 <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="context-right">
          <Field label="这次，想让 AI 帮你做什么？">
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value);
                setPrepared(false);
              }}
              placeholder="例如：根据项目背景，帮我整理一份内容策划方案。"
            />
          </Field>
          <div className="preview-label">
            <span>上下文预览</span>
            <small>{previewing ? "正在更新…" : `${text.length} 字符`}</small>
          </div>
          <pre className="context-preview">
            {text || "选择一个项目，生成本次上下文。"}
          </pre>
        </div>
      </div>
      <ErrorNote error={error} />
      {!pid && <p className="notice">请先创建项目，再开始 AI 协作。</p>}
      <div className="form-footer">
        <span className="muted">
          {mode === "external"
            ? "复制后打开官网，粘贴即可继续"
            : "内容将发送至你配置的服务"}
        </span>
        {prepared && c ? (
          <a
            className="button primary"
            href={c.url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            打开 {c.name}
          </a>
        ) : (
          <button
            className="button primary"
            disabled={
              busy ||
              previewing ||
              !pid ||
              (mode !== "external" && !c?.configured)
            }
            onClick={run}
          >
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : mode === "external" ? (
              <Copy size={15} />
            ) : (
              <MessageSquare size={15} />
            )}
            {mode === "external" ? "复制上下文，准备打开" : "开始工作台内对话"}
          </button>
        )}
      </div>
    </>
  );
}
function Chat({
  session,
  data,
  refresh,
  notify,
  onAsset,
}: {
  session: Session;
  data: Snapshot;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  onAsset: (a: Partial<Asset>) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messages = data.messages.filter((m) => m.sessionId === session.id);
  const c = data.connections.find((c) => c.id === session.provider);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError("");
    try {
      await request("message", { sessionId: session.id, content: value });
      setValue("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="chat-context">
        <AppMark id={session.provider} small />
        <strong>{c?.name}</strong>
        <span>
          {data.projects.find((p) => p.id === session.projectId)?.name}
        </span>
        {session.taskId && (
          <span>
            {" "}
            / {data.tasks.find((t) => t.id === session.taskId)?.title}
          </span>
        )}
      </div>
      <details className="chat-context-details">
        <summary>本次附加的项目上下文</summary>
        <pre>{session.context}</pre>
      </details>
      <div className="messages">
        {!messages.length && (
          <Empty
            title="背景已准备好，开始聊聊吧"
            description="你的对话会保存在这个项目里。"
          />
        )}
        {messages.map((m) => (
          <div className={`message ${m.role}`} key={m.id}>
            <div className="message-label">
              {m.role === "user" ? "你" : c?.name}
            </div>
            <Markdown text={m.content} />
            {m.role === "assistant" && (
              <div className="message-actions">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(m.content);
                      notify("已复制回复");
                    } catch {
                      notify("复制失败，请手动复制");
                    }
                  }}
                >
                  <Copy size={13} />
                  复制
                </button>
                <button
                  onClick={() => {
                    const a = data.activities.find(
                      (a) =>
                        a.projectId === session.projectId &&
                        a.taskId === session.taskId &&
                        a.provider === session.provider &&
                        a.result === m.content,
                    );
                    onAsset({
                      projectId: session.projectId,
                      taskId: session.taskId,
                      title: `${c?.name} · ${new Date(m.createdAt).toLocaleDateString("zh-CN")}`,
                      type: "Text",
                      content: m.content,
                      sourceApp: session.provider,
                      activityId: a?.id || null,
                      prompt: a?.context || session.context,
                    });
                  }}
                >
                  <Layers size={13} />
                  保存到项目
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-thinking">
            <Loader2 className="spin" size={16} />
            正在等待 {c?.name} 回复…
          </div>
        )}
        <div ref={end} />
      </div>
      <ErrorNote error={error} />
      <form className="chat-input" onSubmit={send}>
        <textarea
          aria-label="发送消息"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="写下你的问题…"
          rows={2}
        />
        <button
          aria-label={error ? "重试发送" : "发送消息"}
          className="button primary"
          disabled={busy || !value.trim()}
        >
          {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
        </button>
      </form>
      <p className="settings-note">
        {session.provider === "openclaw"
          ? "此连接调用你配置的 MCP 工具；响应将按服务端返回内容显示。"
          : "API 调用使用独立的服务额度，不使用网页会员额度。"}
      </p>
    </>
  );
}
function ConnectionSettings({
  connection: c,
  onSave,
  onTest,
}: {
  connection: Connection;
  onSave: (v: unknown) => Promise<void>;
  onTest: () => Promise<{ result: unknown }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tools, setTools] = useState<unknown>(null);
  return (
    <section className="panel connection-settings">
      <button
        className="connection-header"
        onClick={() => setExpanded(!expanded)}
      >
        <AppMark id={c.id} small />
        <span>
          <strong>{c.name}</strong>
          <small>
            {c.modes
              .map((m) =>
                m === "external"
                  ? "网页入口"
                  : m === "api"
                    ? "REST API"
                    : "标准 MCP 桥接",
              )
              .join(" + ")}
          </small>
        </span>
        <span
          className={`connection-state ${c.status === "Connected" ? "connected" : ""}`}
        >
          <span />
          {c.status}
        </span>
        <ChevronDown size={16} className={expanded ? "rotate" : ""} />
      </button>
      {expanded && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await onSave({
                ...c,
                ...Object.fromEntries(new FormData(e.currentTarget)),
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="connection-fields">
            {c.modes.includes("external") && (
              <Field label="官网入口 URL">
                <input name="url" type="url" defaultValue={c.url} required />
              </Field>
            )}
            {c.modes.includes("api") && (
              <>
                <div className="form-columns">
                  <Field label="API Base URL">
                    <input name="baseUrl" type="url" defaultValue={c.baseUrl} />
                  </Field>
                  <Field label="模型">
                    <input name="model" defaultValue={c.model} />
                  </Field>
                </div>
                <p className="notice">
                  {c.configured
                    ? "已从服务端环境读取 API Key。"
                    : "尚未配置 API Key。"}
                  在项目的 .env.local 中填写{" "}
                  <code>
                    {c.id === "qwen" ? "QWEN_API_KEY" : "DEEPSEEK_API_KEY"}
                  </code>
                  ，重启后生效。密钥不会进入浏览器。
                </p>
              </>
            )}
            {c.id === "openclaw" && (
              <>
                <p className="notice">
                  需要一个实际提供消息工具的 MCP Server / 桥接服务。OpenClaw
                  原生 WebSocket 网关不能直接填在这里。
                </p>
                <Field label="MCP Server URL">
                  <input
                    name="baseUrl"
                    type="url"
                    defaultValue={c.baseUrl}
                    placeholder="http://127.0.0.1:端口/mcp"
                  />
                </Field>
                <Field label="Transport">
                  <select name="transport" defaultValue={c.transport}>
                    <option value="streamable-http">Streamable HTTP</option>
                    <option value="sse">SSE</option>
                  </select>
                </Field>
                <Field
                  label="消息工具名称"
                  hint="先保存地址，再测试连接。根据发现的工具名称与 schema 填写。"
                >
                  <input
                    name="toolName"
                    defaultValue={c.toolName}
                    placeholder="填写服务端实际提供的工具名"
                  />
                </Field>
                <Field
                  label="工具参数模板"
                  hint="支持 {{message}}、{{context}}、{{sessionId}} 占位符；字段名以 Server schema 为准。"
                >
                  <textarea
                    name="argumentTemplate"
                    rows={4}
                    defaultValue={c.argumentTemplate}
                  />
                </Field>
                <p className="settings-note">
                  如需认证，请在 .env.local 设置
                  OPENCLAW_MCP_TOKEN。本版支持文本工具结果与本地会话记录；远端会话是否持久取决于桥接服务。
                </p>
                {tools && (
                  <details open>
                    <summary>发现的工具与输入 schema</summary>
                    <pre className="tools-json">
                      {JSON.stringify(tools, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            )}
            {["lovart", "jimeng"].includes(c.id) && (
              <p className="notice">
                当前提供网页使用。创作 API
                需要明确的接口文档与独立凭证，尚未启用图片或视频生成接口。
              </p>
            )}
            <ErrorNote error={error || c.error} />
            <div className="form-footer">
              <span className="muted">
                {c.lastTest
                  ? `测试通过：${new Date(c.lastTest).toLocaleString("zh-CN")}`
                  : "配置变更后请重新测试"}
              </span>
              <div>
                {c.modes.some((m) => m !== "external") && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const r = await onTest();
                        if (c.id === "openclaw") setTools(r.result);
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <RefreshCw size={14} className={busy ? "spin" : ""} />
                    测试已保存的连接
                  </button>
                )}
                <SaveButton busy={busy} />
              </div>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

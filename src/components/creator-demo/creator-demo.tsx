"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  X,
  Search,
  LayoutGrid,
  CalendarDays,
  Layers,
  FileText,
  CheckCircle2,
  Sparkles,
  Send,
  Copy,
  Download,
  BookOpen,
  FolderOpen,
  PanelLeftOpen,
  SlidersHorizontal,
  MessageSquare,
  Link2,
  Target,
  Sun,
  Moon,
  Import,
  CheckSquare,
  Circle,
  RefreshCw,
  Film,
  Gift,
  Workflow,
  FolderInput,
  Bookmark,
  ChartNoAxesCombined,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  accounts,
  initialData,
  importSample,
  parseImport,
  type Account,
  type CreatorTask,
  type CreatorAsset,
  type CreatorContent,
  type DemoData,
  type ImportItem,
} from "./data";
import "./creator-demo.css";
const storeKey = "creator-workbench-visual-demo-v1";
type View =
  "overview" | "topics" | "content" | "assets" | "calendar" | "review" | "ai";
type Overlay = {
  kind:
    | "import"
    | "newtask"
    | "task"
    | "asset"
    | "content"
    | "account"
    | "search"
    | "method";
  task?: CreatorTask;
  asset?: CreatorAsset;
  content?: CreatorContent;
  title?: string;
};
const navigation = [
  { id: "overview" as View, name: "账号工作区", icon: LayoutGrid },
  { id: "topics" as View, name: "选题与调研", icon: Search },
  { id: "content" as View, name: "内容与发布", icon: FileText },
  { id: "assets" as View, name: "账号资产", icon: Layers },
  { id: "calendar" as View, name: "发布计划", icon: CalendarDays },
  { id: "review" as View, name: "复盘与方法", icon: ChartNoAxesCombined },
];
const platformClass = (platform: string) =>
  platform === "小红书" ? "xhs" : platform === "抖音" ? "douyin" : "wechat";
function Platform({
  account,
  short = false,
}: {
  account: Account;
  short?: boolean;
}) {
  return (
    <span className={`cd-platform ${platformClass(account.platform)}`}>
      {short
        ? account.platform === "小红书"
          ? "红"
          : account.platform === "抖音"
            ? "抖"
            : "微"
        : account.platform}
    </span>
  );
}
function AccountAvatar({
  account,
  large = false,
}: {
  account: Account;
  large?: boolean;
}) {
  return (
    <span className={`cd-avatar ${account.color} ${large ? "large" : ""}`}>
      <span>{account.initial}</span>
      <i className={platformClass(account.platform)}>
        {account.platform === "小红书"
          ? "红"
          : account.platform === "抖音"
            ? "♪"
            : "微"}
      </i>
    </span>
  );
}
function Tag({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`cd-tag ${tone}`}>{children}</span>;
}
function Button({
  children,
  onClick,
  primary = false,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`cd-button ${primary ? "primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Cover({
  content,
  small = false,
}: {
  content: CreatorContent;
  small?: boolean;
}) {
  const text: Record<CreatorContent["cover"], string[]> = {
    sage: ["这 5 件工作小事", "我交给 AI 做了"],
    apricot: ["先别急着写 Prompt", "把任务说清楚"],
    ink: ["同一份资料", "换一种讲法"],
    lemon: ["周末，慢一点", "给自己留半天"],
  };
  return (
    <div className={`cd-cover ${content.cover} ${small ? "small" : ""}`}>
      <div className="cd-cover-top">
        <span>
          {content.cover === "lemon" ? "WEEKEND NOTES" : "AI · IN REAL LIFE"}
        </span>
        <span>
          0{content.cover === "sage" ? 1 : content.cover === "apricot" ? 2 : 3}
        </span>
      </div>
      <div className="cd-cover-text">
        {text[content.cover].map((t, i) => (
          <span key={t} className={i === 1 ? "highlight" : ""}>
            {t}
          </span>
        ))}
      </div>
      <div className="cd-cover-decoration">
        <span />
        <span />
        <span />
      </div>
      <div className="cd-cover-foot">
        <span>
          {content.cover === "lemon"
            ? "把日子过成喜欢的样子"
            : "从一个真实场景开始"}
        </span>
        <ArrowUpRight size={18} />
      </div>
    </div>
  );
}
function SectionTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="cd-section-title">
      <h2>
        {title}
        {count !== undefined && <span>{count}</span>}
      </h2>
      {action}
    </div>
  );
}
export default function CreatorDemo() {
  const [accountId, setAccountId] = useState("xhs-ai");
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<DemoData>(initialData);
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [toast, setToast] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("全部");
  const [contentFilter, setContentFilter] = useState("全部");
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allAccounts, setAllAccounts] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
        if (saved?.tasks && saved?.assets && saved?.contents) setData(saved);
      } catch {}
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storeKey, JSON.stringify(data));
      } catch {}
  }, [data, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay({ kind: "search" });
      }
      if (e.key === "Escape") {
        setOverlay(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const account = accounts.find((a) => a.id === accountId)!;
  const tasks = data.tasks.filter((t) => t.accountId === accountId);
  const content = data.contents.filter((c) => c.accountId === accountId);
  const assets = data.assets.filter((a) => a.accountId === accountId);
  const sharedAssets = data.assets.filter((a) =>
    a.sharedWith.includes(accountId),
  );
  const pending = tasks.filter((t) => t.status === "todo");
  const nextContent =
    content.find((c) => c.stage === "待发布") ||
    content.find((c) => c.stage === "制作中");
  const navigate = (v: View) => {
    setView(v);
    setMenuOpen(false);
    setAllAccounts(false);
    setTaskFilter("all");
  };
  const switchAccount = (id: string) => {
    setAccountId(id);
    setView("overview");
    setAllAccounts(false);
    setMenuOpen(false);
    setTaskFilter("all");
    setAssetFilter("全部");
    setContentFilter("全部");
  };
  const updateTask = (task: CreatorTask, patch: Partial<CreatorTask>) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, ...patch } : t)),
    }));
    if (overlay?.task?.id === task.id)
      setOverlay((o) => (o ? { ...o, task: { ...task, ...patch } } : o));
  };
  const taskRows = (items: CreatorTask[], compact = false) =>
    items.length ? (
      <div className={`cd-task-list ${compact ? "compact" : ""}`}>
        {items.map((t) => (
          <div
            className={`cd-task-row ${t.status === "done" ? "done" : ""}`}
            key={t.id}
          >
            <button
              className={`cd-task-toggle ${t.status}`}
              aria-label={`${t.status === "done" ? "重新打开" : "完成"} ${t.title}`}
              onClick={() => {
                if (t.status === "review") {
                  setOverlay({ kind: "task", task: t });
                  return;
                }
                updateTask(t, {
                  status: t.status === "done" ? "todo" : "done",
                });
                setToast(
                  t.status === "done"
                    ? "任务已重新打开（Demo）"
                    : "任务已完成（Demo）",
                );
              }}
            >
              {t.status === "done" ? (
                <Check size={13} />
              ) : t.status === "review" ? (
                <span />
              ) : (
                <Circle size={17} />
              )}
            </button>
            <button
              className="cd-task-copy"
              onClick={() => setOverlay({ kind: "task", task: t })}
            >
              <strong>{t.title}</strong>
              {!compact && <span>{t.note}</span>}
              <div>
                <Tag tone={t.category === "用户交付" ? "amber" : ""}>
                  {t.category}
                </Tag>
                <span className="cd-task-executor">
                  {t.executor === "工作台 AI" ? (
                    <Sparkles size={12} />
                  ) : t.executor === "ChatGPT 导入" ? (
                    <Import size={12} />
                  ) : (
                    <CheckSquare size={12} />
                  )}
                  {t.executor}
                </span>
                {allAccounts && (
                  <span>
                    {accounts.find((a) => a.id === t.accountId)?.name}
                  </span>
                )}
              </div>
            </button>
            <span className="cd-due">{t.due}</span>
            <button
              className={`cd-task-action ${t.status === "review" ? "review" : ""}`}
              onClick={() => setOverlay({ kind: "task", task: t })}
            >
              {t.status === "review"
                ? "查看成果"
                : t.status === "done"
                  ? "已完成"
                  : t.executor === "工作台 AI"
                    ? "开始处理"
                    : "查看任务"}
              <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="cd-empty">
        <CheckCircle2 size={26} />
        <strong>这一组任务已经处理好了</strong>
        <span>你可以切换状态，或添加下一件事。</span>
      </div>
    );
  const assetRows = (items: CreatorAsset[]) =>
    items.length ? (
      <div className="cd-asset-table">
        {items.map((a) => (
          <button
            key={a.id}
            onClick={() => setOverlay({ kind: "asset", asset: a })}
          >
            <span
              className={`cd-file-icon ${a.use === "用户交付" ? "amber" : a.use === "研究参考" ? "blue" : ""}`}
            >
              {a.use === "用户交付" ? (
                <Gift size={19} />
              ) : a.use === "研究参考" ? (
                <BookOpen size={19} />
              ) : (
                <FileText size={19} />
              )}
            </span>
            <span>
              <strong>{a.title}</strong>
              <small>{a.note}</small>
            </span>
            <Tag tone={a.use === "用户交付" ? "amber" : ""}>{a.use}</Tag>
            <span className="cd-asset-version">{a.version}</span>
            <span
              className={`cd-asset-status ${a.status === "可使用" ? "ready" : ""}`}
            >
              <i />
              {a.status}
            </span>
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
    ) : (
      <div className="cd-empty">
        <FolderOpen size={26} />
        <strong>这个分类还没有资产</strong>
        <span>从 ChatGPT 导入，或把任务成果保存到这里。</span>
      </div>
    );
  return (
    <div
      className={`creator-demo ${dark ? "cd-dark" : ""} ${menuOpen ? "cd-menu-open" : ""}`}
    >
      <aside className="cd-sidebar">
        <button className="cd-brand" onClick={() => navigate("overview")}>
          <span className="cd-brand-icon">
            <span />
            <span />
            <span />
          </span>
          <span>
            Creator Desk<small>自媒体运营工作台</small>
          </span>
        </button>
        <button
          className="cd-search-launch"
          onClick={() => setOverlay({ kind: "search" })}
        >
          <Search size={16} />
          <span>搜索内容、任务与资产</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="cd-nav-caption">工作空间</div>
        <button
          className={`cd-global-nav ${allAccounts ? "active" : ""}`}
          onClick={() => {
            setAllAccounts(true);
            setView("overview");
            setMenuOpen(false);
          }}
        >
          <LayoutGrid size={17} />
          <span>今日总览</span>
          <span className="cd-count">
            {data.tasks.filter((t) => t.status === "review").length}
          </span>
        </button>
        <div className="cd-nav-caption cd-account-caption">
          <span>我的账号</span>
          <button
            aria-label="查看账号配置"
            onClick={() => setOverlay({ kind: "account" })}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
        <div className="cd-account-list">
          {accounts.map((a) => (
            <button
              key={a.id}
              className={a.id === accountId && !allAccounts ? "active" : ""}
              onClick={() => switchAccount(a.id)}
            >
              <AccountAvatar account={a} />
              <span>
                <strong>{a.name}</strong>
                <small>
                  {a.platform}
                  <i>·</i>
                  {a.family === "独立运营" ? "独立方向" : "AI 内容"}
                </small>
              </span>
              {a.id === accountId && !allAccounts && (
                <span className="cd-active-dot" />
              )}
            </button>
          ))}
        </div>
        <div className="cd-sidebar-divider" />
        <nav>
          {navigation.map((n) => (
            <button
              key={n.id}
              className={view === n.id && !allAccounts ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={17} />
              <span>{n.name}</span>
              {n.id === "assets" && (
                <small>{assets.length + sharedAssets.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="cd-sidebar-bottom">
          <button
            className={`cd-ai-nav ${view === "ai" ? "active" : ""}`}
            onClick={() => navigate("ai")}
          >
            <Sparkles size={17} />
            <span>AI 能力管理</span>
            <ChevronRight size={13} />
          </button>
          <div className="cd-demo-note">
            <span />
            <div>
              视觉与交互 Demo<small>示例账号 · 本机演示数据</small>
            </div>
          </div>
          <div className="cd-profile">
            <span>鱼</span>
            <div>
              老鱼的工作空间<small>个人创作，一处管理</small>
            </div>
            <button
              aria-label={dark ? "切换浅色" : "切换深色"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="cd-main">
        <header className="cd-topbar">
          <div>
            <button
              className="cd-mobile-menu"
              aria-label="打开导航"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <span>工作空间</span>
            <ChevronRight size={12} />
            <button onClick={() => setOverlay({ kind: "account" })}>
              {allAccounts ? "全部账号" : account.name}
            </button>
            {!allAccounts && (
              <>
                <ChevronRight size={12} />
                <strong>
                  {view === "ai"
                    ? "AI 能力管理"
                    : navigation.find((n) => n.id === view)?.name}
                </strong>
              </>
            )}
          </div>
          <div className="cd-top-tools">
            <span className="cd-prototype-label">DEMO / 01</span>
            <button
              title="重置本地演示数据"
              aria-label="重置演示"
              onClick={() => {
                setData(initialData);
                setToast("已恢复初始演示数据");
              }}
            >
              <RefreshCw size={15} />
            </button>
            <span className="cd-top-avatar">鱼</span>
          </div>
        </header>
        <main className="cd-workspace">
          <div className="cd-heading">
            <div className="cd-heading-main">
              {allAccounts ? (
                <span className="cd-global-avatar">
                  <LayoutGrid size={27} />
                </span>
              ) : (
                <AccountAvatar account={account} large />
              )}
              <div>
                <div className="cd-heading-meta">
                  {allAccounts ? (
                    <Tag>四个示例账号</Tag>
                  ) : (
                    <>
                      <Platform account={account} />
                      <span>
                        {account.family === "独立运营" ? (
                          "独立运营"
                        ) : (
                          <>
                            AI 内容系列 <Link2 size={12} />
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
                <h1>
                  {allAccounts
                    ? "今天，先推进这些事"
                    : view === "overview"
                      ? account.name
                      : navigation.find((n) => n.id === view)?.name ||
                        "AI 能力管理"}
                </h1>
                <p>
                  {allAccounts
                    ? "跨账号查看待办与待确认成果，决定今天的工作顺序。"
                    : view === "overview"
                      ? account.direction
                      : view === "topics"
                        ? "保留来源与观察，把参考内容变成可以验证的选题。"
                        : view === "content"
                          ? "每一条内容，都有自己的制作进度与发布版本。"
                          : view === "assets"
                            ? "发布要用的，交给用户的，值得复用的，分别找得到。"
                            : view === "calendar"
                              ? "先安排好内容，再按各平台的节奏发布。"
                              : view === "review"
                                ? "从一次发布中学到的东西，留给下一次创作。"
                                : "统一连接与创作方法，在任务里选择具体的执行方式。"}
                </p>
              </div>
            </div>
            <div className="cd-heading-actions">
              <Button onClick={() => setOverlay({ kind: "newtask" })}>
                <Plus size={15} />
                新建任务
              </Button>
              <Button primary onClick={() => setOverlay({ kind: "import" })}>
                <Import size={16} />
                导入 ChatGPT 内容
              </Button>
            </div>
          </div>
          {view === "overview" && (
            <>
              <div className="cd-summary-strip">
                {[
                  {
                    name: "待处理任务",
                    value: (allAccounts ? data.tasks : tasks).filter(
                      (t) => t.status === "todo",
                    ).length,
                    icon: CheckSquare,
                    key: "todo",
                  },
                  {
                    name: "需要你确认",
                    value: (allAccounts ? data.tasks : tasks).filter(
                      (t) => t.status === "review",
                    ).length,
                    icon: CheckCircle2,
                    key: "review",
                  },
                  {
                    name: "待发布内容",
                    value: (allAccounts ? data.contents : content).filter(
                      (c) => c.stage === "待发布",
                    ).length,
                    icon: Send,
                    key: "publish",
                  },
                  {
                    name: "用户交付品",
                    value: (allAccounts ? data.assets : assets).filter(
                      (a) => a.use === "用户交付",
                    ).length,
                    icon: Gift,
                    key: "gift",
                  },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={s.key === "review" ? "focus" : ""}
                    onClick={() => {
                      if (s.key === "publish") {
                        navigate("content");
                        setContentFilter("待发布");
                      } else if (s.key === "gift") {
                        navigate("assets");
                        setAssetFilter("用户交付");
                      } else setTaskFilter(s.key);
                    }}
                  >
                    <s.icon size={17} />
                    <span>{s.name}</span>
                    <strong>{s.value.toString().padStart(2, "0")}</strong>
                    {s.key === "review" && (
                      <span className="cd-summary-action">
                        查看 <ArrowRight size={12} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="cd-overview-grid">
                <div className="cd-work-column">
                  <div className="cd-today-goal">
                    <Target size={18} />
                    <span>这一阶段</span>
                    <strong>
                      {allAccounts
                        ? "优先确认待发布内容与用户交付品，再推进新的创作。"
                        : account.goal}
                    </strong>
                    <button
                      title="查看账号目标"
                      aria-label="查看账号目标"
                      onClick={() => setOverlay({ kind: "account" })}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="cd-task-toolbar">
                    <h2>接下来要做的事</h2>
                    <div className="cd-filter-tabs">
                      {[
                        ["all", "全部"],
                        ["review", "待确认"],
                        ["todo", "待处理"],
                        ["done", "已完成"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={taskFilter === v ? "active" : ""}
                          onClick={() => setTaskFilter(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {taskFilter === "all" ? (
                    <>
                      <div className="cd-group-label">
                        <span className="amber-dot" />
                        需要你确认
                        <span>
                          {
                            (allAccounts ? data.tasks : tasks).filter(
                              (t) => t.status === "review",
                            ).length
                          }
                        </span>
                        <small>确认后，再进入下一步</small>
                      </div>
                      <div className="cd-panel review-panel">
                        {taskRows(
                          (allAccounts ? data.tasks : tasks).filter(
                            (t) => t.status === "review",
                          ),
                        )}
                      </div>
                      <div className="cd-group-label">
                        <span className="sage-dot" />
                        继续推进
                        <span>
                          {
                            (allAccounts ? data.tasks : tasks).filter(
                              (t) => t.status === "todo",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="cd-panel">
                        {taskRows(
                          (allAccounts ? data.tasks : tasks).filter(
                            (t) => t.status === "todo",
                          ),
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="cd-panel">
                      {taskRows(
                        (allAccounts ? data.tasks : tasks).filter(
                          (t) => t.status === taskFilter,
                        ),
                      )}
                    </div>
                  )}
                  <div className="cd-recent-assets">
                    <SectionTitle
                      title="最近沉淀的资产"
                      action={
                        <button
                          className="cd-text-button"
                          onClick={() => navigate("assets")}
                        >
                          查看全部 <ArrowRight size={13} />
                        </button>
                      }
                    />
                    <div className="cd-panel">
                      {assetRows(
                        (allAccounts ? data.assets : assets).slice(0, 3),
                      )}
                    </div>
                  </div>
                </div>
                <aside className="cd-context-column">
                  <div className="cd-next-publish">
                    <SectionTitle
                      title="下一次发布"
                      action={
                        <button
                          className="cd-icon-button"
                          title="查看发布计划"
                          onClick={() => navigate("calendar")}
                        >
                          <CalendarDays size={16} />
                        </button>
                      }
                    />
                    {nextContent ? (
                      <>
                        <button
                          className="cd-cover-button"
                          onClick={() =>
                            setOverlay({
                              kind: "content",
                              content: nextContent,
                            })
                          }
                        >
                          <Cover content={nextContent} />
                        </button>
                        <div className="cd-next-copy">
                          <Tag tone="green">{nextContent.stage}</Tag>
                          <h3>{nextContent.title}</h3>
                          <div>
                            <span>
                              <CalendarDays size={12} />
                              {nextContent.date}
                            </span>
                            <span>{nextContent.format}</span>
                          </div>
                          <button
                            className="cd-text-button"
                            onClick={() =>
                              setOverlay({
                                kind: "content",
                                content: nextContent,
                              })
                            }
                          >
                            查看发布物料 <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="cd-empty">
                        <CalendarDays size={25} />
                        <strong>还没有发布安排</strong>
                      </div>
                    )}
                  </div>
                  <div className="cd-delivery-card">
                    <div className="cd-delivery-icon">
                      <Gift size={19} />
                    </div>
                    <div>
                      <h3>交给用户的，也要有归处</h3>
                      <p>
                        商品、赠品与奖励单独管理，
                        <br />
                        确认版本后再交付。
                      </p>
                      <button
                        className="cd-text-button"
                        onClick={() => {
                          navigate("assets");
                          setAssetFilter("用户交付");
                        }}
                      >
                        查看用户交付品 <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="cd-linked-accounts">
                    <div>
                      <Link2 size={15} />
                      <strong>
                        {account.family === "独立运营"
                          ? "这个账号独立运营"
                          : "相关账号，共享研究"}
                      </strong>
                    </div>
                    <p>
                      {account.family === "独立运营"
                        ? "选题、任务和资产在自己的空间里。"
                        : "共用一份研究，各自做出适合平台的内容。"}
                    </p>
                    {account.family !== "独立运营" &&
                      accounts
                        .filter(
                          (a) =>
                            a.id !== account.id && a.family === account.family,
                        )
                        .map((a) => (
                          <button
                            key={a.id}
                            onClick={() => switchAccount(a.id)}
                          >
                            <Platform account={a} />
                            <span>{a.name}</span>
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "topics" && (
            <>
              <div className="cd-view-toolbar">
                <span>
                  选题池{" "}
                  <strong>
                    {content.filter((c) => c.stage === "选题").length}
                  </strong>
                </span>
                <Button
                  onClick={() => {
                    const id = crypto.randomUUID();
                    setData((d) => ({
                      ...d,
                      contents: [
                        {
                          id,
                          accountId,
                          title: "一个新的内容想法",
                          subtitle: "点击编辑，把具体问题写下来",
                          stage: "选题",
                          format: "待确定",
                          date: "待安排",
                          cover: "apricot",
                          shared: "",
                          body: "请补充这个选题要解决的问题、参考资料和内容角度。",
                        },
                        ...d.contents,
                      ],
                    }));
                    setToast("已添加一个示例选题，可点开继续编辑");
                  }}
                >
                  <Plus size={15} />
                  记录选题
                </Button>
              </div>
              <div className="cd-topic-list">
                {content
                  .filter((c) => c.stage === "选题")
                  .map((c) => (
                    <button
                      key={c.id}
                      className="cd-panel cd-topic-card"
                      onClick={() =>
                        setOverlay({ kind: "content", content: c })
                      }
                    >
                      <span className="cd-topic-number">IDEA</span>
                      <div>
                        <h3>{c.title}</h3>
                        <p>{c.body}</p>
                        <div>
                          <Tag>待研究</Tag>
                          {c.shared && <Tag tone="blue">可跨账号延展</Tag>}
                        </div>
                      </div>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
              </div>
              <SectionTitle
                title="参考与方法"
                action={<Tag>示例观察框架 · 待补真实来源</Tag>}
              />
              <div className="cd-research-grid">
                {[
                  {
                    title: "先给问题，再给可见结果",
                    body: "观察开头是否让读者知道：这条内容能解决什么。",
                    type: "开头结构",
                  },
                  {
                    title: "让读者带走一个小成果",
                    body: "把一段信息变成清单、模板或能复用的操作方法。",
                    type: "内容价值",
                  },
                  {
                    title: "同一个选题，分别组织表达",
                    body: "图文、视频和长文引用共同研究，保留各自的内容版本。",
                    type: "跨平台方法",
                  },
                ].map((m) => (
                  <button
                    className="cd-panel cd-method-card"
                    key={m.title}
                    onClick={() =>
                      setOverlay({ kind: "method", title: m.title })
                    }
                  >
                    <BookOpen size={19} />
                    <Tag>{m.type}</Tag>
                    <h3>{m.title}</h3>
                    <p>{m.body}</p>
                    <span>
                      查看方法 <ArrowRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="cd-soft-note">
                <Bookmark size={15} />
                热门调研需要保留原始链接、观察日期与数据来源。这里展示结构示例。
              </div>
            </>
          )}
          {view === "content" && (
            <>
              <div className="cd-view-toolbar">
                <div className="cd-filter-tabs">
                  {["全部", "选题", "制作中", "待发布", "已发布"].map((f) => (
                    <button
                      key={f}
                      className={contentFilter === f ? "active" : ""}
                      onClick={() => setContentFilter(f)}
                    >
                      {f}
                      <span>
                        {
                          content.filter((c) => f === "全部" || c.stage === f)
                            .length
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <span className="cd-subtle">每个平台保留独立版本</span>
              </div>
              <div className="cd-content-grid">
                {content
                  .filter(
                    (c) =>
                      contentFilter === "全部" || c.stage === contentFilter,
                  )
                  .map((c) => (
                    <button
                      className="cd-content-card cd-panel"
                      key={c.id}
                      onClick={() =>
                        setOverlay({ kind: "content", content: c })
                      }
                    >
                      <Cover content={c} />
                      <div>
                        <div>
                          <Tag
                            tone={
                              c.stage === "待发布"
                                ? "green"
                                : c.stage === "制作中"
                                  ? "amber"
                                  : ""
                            }
                          >
                            {c.stage}
                          </Tag>
                          <span>{c.format}</span>
                        </div>
                        <h3>{c.title}</h3>
                        <p>{c.subtitle}</p>
                        <footer>
                          <span>
                            <CalendarDays size={13} />
                            {c.date}
                          </span>
                          <ArrowUpRight size={15} />
                        </footer>
                      </div>
                    </button>
                  ))}
              </div>
              {!content.some(
                (c) => contentFilter === "全部" || c.stage === contentFilter,
              ) && (
                <div className="cd-empty">
                  <FileText size={25} />
                  <strong>这个阶段暂无内容</strong>
                  <span>从选题池开始，或导入已有内容。</span>
                </div>
              )}
            </>
          )}
          {view === "assets" && (
            <>
              <div className="cd-view-toolbar">
                <div className="cd-filter-tabs">
                  {["全部", "发布物料", "用户交付", "研究参考"].map((f) => (
                    <button
                      key={f}
                      className={assetFilter === f ? "active" : ""}
                      onClick={() => setAssetFilter(f)}
                    >
                      {f}
                      <span>
                        {
                          assets.filter((a) => f === "全部" || a.use === f)
                            .length
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <span className="cd-subtle">用途清楚，版本可追溯</span>
              </div>
              <div className="cd-panel">
                {assetRows(
                  assets.filter(
                    (a) => assetFilter === "全部" || a.use === assetFilter,
                  ),
                )}
              </div>
              {sharedAssets.length > 0 && (
                <div className="cd-shared-section">
                  <SectionTitle
                    title="从相关账号引用"
                    count={sharedAssets.length}
                    action={<Tag tone="blue">保留原始归属</Tag>}
                  />
                  <div className="cd-panel">
                    {assetRows(
                      sharedAssets.filter(
                        (a) => assetFilter === "全部" || a.use === assetFilter,
                      ),
                    )}
                  </div>
                </div>
              )}
              <div className="cd-soft-note">
                <Gift size={15} />
                用户交付品包括商品、赠品与奖励；确认内容、使用说明与版本后再交付。
              </div>
            </>
          )}
          {view === "calendar" && (
            <>
              <div className="cd-view-toolbar">
                <div className="cd-calendar-title">
                  <CalendarDays size={18} />
                  <h2>10 月 8 日 — 14 日</h2>
                  <Tag>示例周计划</Tag>
                </div>
                <Button onClick={() => navigate("content")}>
                  从内容中安排 <ArrowRight size={14} />
                </Button>
              </div>
              <div className="cd-calendar-grid">
                {[
                  ["周四", "08"],
                  ["周五", "09"],
                  ["周六", "10"],
                  ["周日", "11"],
                  ["周一", "12"],
                  ["周二", "13"],
                  ["周三", "14"],
                ].map(([day, date]) => (
                  <div
                    className={`cd-calendar-day ${date === "08" ? "today" : ""}`}
                    key={date}
                  >
                    <header>
                      <span>{day}</span>
                      <strong>{date}</strong>
                      {date === "08" && <small>今天</small>}
                    </header>
                    {content
                      .filter((c) => c.date.includes(`10 月 ${date} 日`))
                      .map((c) => (
                        <button
                          className={`cd-calendar-item ${c.cover}`}
                          key={c.id}
                          onClick={() =>
                            setOverlay({ kind: "content", content: c })
                          }
                        >
                          <span>{c.date.split("·")[1]}</span>
                          <strong>{c.title}</strong>
                          <Tag>{c.stage}</Tag>
                        </button>
                      ))}
                    {!content.some((c) =>
                      c.date.includes(`10 月 ${date} 日`),
                    ) && <span className="cd-no-plan">留一点创作空间</span>}
                  </div>
                ))}
              </div>
              <div className="cd-soft-note">
                <Send size={15} />
                这是发布安排演示；确认物料后，由你在对应平台完成发布。
              </div>
            </>
          )}
          {view === "review" && (
            <>
              <div className="cd-review-intro">
                <span>
                  <ChartNoAxesCombined size={22} />
                </span>
                <div>
                  <h2>让下一条内容，有上一次的经验</h2>
                  <p>记录表现，也记录你对选题、表达和用户反馈的判断。</p>
                </div>
                <Tag>示例复盘 · 无真实平台数据</Tag>
              </div>
              <div className="cd-review-layout">
                <div className="cd-panel cd-review-sheet">
                  <SectionTitle title="单条内容复盘" />
                  <div className="cd-form-field">
                    <span>这条内容想解决什么问题？</span>
                    <textarea defaultValue="帮助初学者从一个具体工作任务开始使用 AI。" />
                  </div>
                  <div className="cd-form-field">
                    <span>哪些地方有效？哪些需要调整？</span>
                    <textarea
                      rows={4}
                      defaultValue="待填写真实发布结果和读者反馈。\n请把观察到的事实与自己的判断分开记录。"
                    />
                  </div>
                  <div className="cd-form-field">
                    <span>下一条内容准备试什么？</span>
                    <textarea defaultValue="缩小场景，把输入与检查步骤讲得更具体。" />
                  </div>
                  <Button
                    primary
                    onClick={() =>
                      setToast(
                        "复盘布局已体验；正式的数据保存将在选定设计后接入",
                      )
                    }
                  >
                    保存复盘示意 <Check size={14} />
                  </Button>
                </div>
                <div>
                  <SectionTitle title="可复用的创作方法" />
                  {[
                    "具体问题 → 操作演示 → 结果检查",
                    "同一研究 → 三个平台版本",
                    "内容入口 → 配套用户交付品",
                  ].map((title) => (
                    <button
                      className="cd-panel cd-method-row"
                      key={title}
                      onClick={() => setOverlay({ kind: "method", title })}
                    >
                      <BookOpen size={18} />
                      <span>{title}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  <p className="cd-subtle cd-review-note">
                    方法可以来自爆款调研和自己的复盘。
                    <br />
                    保留适用条件，继续验证。
                  </p>
                </div>
              </div>
            </>
          )}
          {view === "ai" && (
            <>
              <div className="cd-ai-banner">
                <Workflow size={23} />
                <div>
                  <h2>外部 AI 能接入，任务也能在这里处理</h2>
                  <p>同一套账号背景、任务和资产，支持两种工作方式。</p>
                </div>
                <Tag>能力配置界面示意</Tag>
              </div>
              <div className="cd-ai-routes">
                <div className="cd-panel">
                  <MessageSquare size={22} />
                  <h3>从 ChatGPT 整理导入</h3>
                  <p>粘贴方案，预览任务与资产，确认账号后归档。</p>
                  <Button onClick={() => setOverlay({ kind: "import" })}>
                    体验导入 <ArrowRight size={14} />
                  </Button>
                </div>
                <div className="cd-panel">
                  <Sparkles size={22} />
                  <h3>在任务里调用 AI</h3>
                  <p>自动带上账号背景与资料，结果先交给你确认。</p>
                  <Button
                    onClick={() => {
                      setView("overview");
                      setOverlay({
                        kind: "task",
                        task: pending[0] || tasks[0],
                      });
                    }}
                  >
                    体验任务流程 <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
              <SectionTitle title="连接与执行方法" />
              <div className="cd-panel cd-connection-list">
                {[
                  {
                    name: "外部 AI / MCP",
                    desc: "允许支持 MCP 的应用读取任务、写回成果",
                    label: "对外接口待实现",
                    icon: Link2,
                  },
                  {
                    name: "模型 API",
                    desc: "DeepSeek、千问等，可在任务内选择",
                    label: "Demo 不调用 API",
                    icon: Sparkles,
                  },
                  {
                    name: "创作开放能力",
                    desc: "图片、视频等服务按实际接口配置",
                    label: "待接入",
                    icon: Film,
                  },
                ].map((c) => (
                  <div key={c.name}>
                    <c.icon size={21} />
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.desc}</small>
                    </span>
                    <Tag>{c.label}</Tag>
                    <button
                      className="cd-text-button"
                      onClick={() =>
                        setToast("这是能力管理示意，正式连接在布局确认后实现")
                      }
                    >
                      查看配置 <ChevronRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="cd-soft-note">
                <CheckCircle2 size={15} />
                外部导入与内部执行都回到同一个任务，重要成果由你确认采用。
              </div>
            </>
          )}
          <footer className="cd-footer">
            <span>
              <span />
              所有账号、内容与数字均为演示示例
            </span>
            <span>
              CREATOR DESK <i>/</i> ACCOUNT FIRST
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="cd-toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {overlay && (
        <Modal
          title={
            overlay.kind === "import"
              ? "把 ChatGPT 的成果带回来"
              : overlay.kind === "newtask"
                ? "记下账号的下一件事"
                : overlay.kind === "task"
                  ? "任务工作区"
                  : overlay.kind === "asset"
                    ? "账号资产"
                    : overlay.kind === "content"
                      ? "内容与发布物料"
                      : overlay.kind === "account"
                        ? "账号运营档案"
                        : overlay.kind === "search"
                          ? "搜索工作空间"
                          : "创作方法"
          }
          drawer={["task", "asset", "content"].includes(overlay.kind)}
          wide={overlay.kind === "import"}
          onClose={() => setOverlay(null)}
        >
          {overlay.kind === "import" && (
            <ImportFlow
              accountId={accountId}
              onDone={(target, items) => {
                const stamp = Date.now();
                setData((d) => {
                  const next = {
                    ...d,
                    tasks: [...d.tasks],
                    contents: [...d.contents],
                    assets: [...d.assets],
                  };
                  items
                    .filter((i) => i.selected)
                    .forEach((item, i) => {
                      const id = `user-import-${stamp}-${i}`;
                      if (item.kind === "任务")
                        next.tasks.unshift({
                          id,
                          accountId: target,
                          title: item.title,
                          note: item.body,
                          category: "运营任务",
                          status: "todo",
                          executor: "ChatGPT 导入",
                          due: "待安排",
                          result: "",
                        });
                      else if (item.kind === "选题")
                        next.contents.unshift({
                          id,
                          accountId: target,
                          title: item.title,
                          subtitle: "从 ChatGPT 导入",
                          stage: "选题",
                          format: "待确定",
                          date: "待安排",
                          cover: "apricot",
                          shared: "",
                          body: item.body,
                        });
                      else
                        next.assets.unshift({
                          id,
                          accountId: target,
                          title: item.title,
                          use: item.kind as CreatorAsset["use"],
                          format: "Markdown",
                          version: "v1",
                          status: "待检查",
                          source: "ChatGPT 导入",
                          note: "本次导入 · 已保留原文",
                          body: item.body,
                          sharedWith: [],
                        });
                    });
                  return next;
                });
                switchAccount(target);
                setOverlay(null);
                setToast(
                  `已导入 ${items.filter((i) => i.selected).length} 项至演示工作区，保存在本机浏览器`,
                );
              }}
            />
          )}
          {overlay.kind === "newtask" && (
            <form
              className="cd-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const t: CreatorTask = {
                  id: crypto.randomUUID(),
                  accountId: String(form.get("account")),
                  title: String(form.get("title")),
                  note: String(form.get("note")),
                  category: String(form.get("category")),
                  executor: String(
                    form.get("executor"),
                  ) as CreatorTask["executor"],
                  due: "待安排",
                  status: "todo",
                  result: "",
                };
                setData((d) => ({ ...d, tasks: [t, ...d.tasks] }));
                switchAccount(t.accountId);
                setOverlay(null);
                setToast("任务已加入演示工作区");
              }}
            >
              <label className="cd-form-field">
                <span>任务名称</span>
                <input
                  name="title"
                  required
                  maxLength={150}
                  placeholder="具体要完成什么？"
                />
              </label>
              <label className="cd-form-field">
                <span>所属账号</span>
                <select name="account" defaultValue={accountId}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.platform} · {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cd-form-columns">
                <label className="cd-form-field">
                  <span>任务类型</span>
                  <select name="category">
                    <option>选题策划</option>
                    <option>内容制作</option>
                    <option>用户交付</option>
                    <option>发布计划</option>
                    <option>运营任务</option>
                  </select>
                </label>
                <label className="cd-form-field">
                  <span>处理方式</span>
                  <select name="executor">
                    <option>人工</option>
                    <option>工作台 AI</option>
                    <option>ChatGPT 导入</option>
                  </select>
                </label>
              </div>
              <label className="cd-form-field">
                <span>要求与完成标准</span>
                <textarea
                  name="note"
                  rows={4}
                  placeholder="需要什么资料，最后交付什么结果？"
                />
              </label>
              <div className="cd-modal-footer">
                <span>仅写入 Demo 本机数据</span>
                <Button type="submit" primary>
                  <Plus size={15} />
                  添加任务
                </Button>
              </div>
            </form>
          )}
          {overlay.kind === "task" && overlay.task && (
            <TaskDetail
              key={overlay.task.id}
              task={overlay.task}
              account={accounts.find((a) => a.id === overlay.task?.accountId)!}
              asset={data.assets.find((a) => a.id === overlay.task?.assetId)}
              onChange={(patch) => updateTask(overlay.task!, patch)}
              onAsset={(a) => setOverlay({ kind: "asset", asset: a })}
              onSave={(body) => {
                const a: CreatorAsset = {
                  id: crypto.randomUUID(),
                  accountId: overlay.task!.accountId,
                  title: overlay.task!.title + " · 成果",
                  use:
                    overlay.task!.category === "用户交付"
                      ? "用户交付"
                      : "发布物料",
                  format: "Markdown",
                  version: "v1",
                  status: "待检查",
                  source: "Demo 示例",
                  note: "关联任务 · 演示结果",
                  body,
                  sharedWith: [],
                };
                setData((d) => ({
                  ...d,
                  assets: [a, ...d.assets],
                  tasks: d.tasks.map((t) =>
                    t.id === overlay.task?.id
                      ? { ...t, status: "review", result: body, assetId: a.id }
                      : t,
                  ),
                }));
                setOverlay((o) =>
                  o
                    ? {
                        ...o,
                        task: {
                          ...overlay.task!,
                          status: "review",
                          result: body,
                          assetId: a.id,
                        },
                      }
                    : o,
                );
                setToast("演示结果已保存为待检查资产");
              }}
              onApprove={() => {
                const task = overlay.task!;
                setData((d) => ({
                  ...d,
                  tasks: d.tasks.map((t) =>
                    t.id === task.id ? { ...t, status: "done" } : t,
                  ),
                  assets: d.assets.map((a) =>
                    a.id === task.assetId ? { ...a, status: "可使用" } : a,
                  ),
                }));
                setOverlay(null);
                setToast("已确认采用，任务与关联资产状态已更新（Demo）");
              }}
            />
          )}
          {overlay.kind === "asset" && overlay.asset && (
            <AssetDetail
              asset={overlay.asset}
              account={accounts.find((a) => a.id === overlay.asset?.accountId)!}
              onReady={() => {
                const asset = overlay.asset!;
                setData((d) => ({
                  ...d,
                  assets: d.assets.map((a) =>
                    a.id === asset.id ? { ...a, status: "可使用" } : a,
                  ),
                }));
                setOverlay((o) =>
                  o ? { ...o, asset: { ...asset, status: "可使用" } } : o,
                );
                setToast("资产已标记可使用（Demo）");
              }}
            />
          )}
          {overlay.kind === "content" && overlay.content && (
            <ContentDetail
              content={overlay.content}
              account={accounts.find(
                (a) => a.id === overlay.content?.accountId,
              )!}
              related={data.contents.filter(
                (c) =>
                  c.id !== overlay.content?.id &&
                  c.shared &&
                  c.shared === overlay.content?.shared,
              )}
              assets={data.assets.filter(
                (a) =>
                  a.accountId === overlay.content?.accountId &&
                  a.use === "发布物料",
              )}
              onStage={(stage) => {
                const c = overlay.content!;
                setData((d) => ({
                  ...d,
                  contents: d.contents.map((x) =>
                    x.id === c.id ? { ...x, stage } : x,
                  ),
                }));
                setOverlay((o) => (o ? { ...o, content: { ...c, stage } } : o));
                setToast("内容阶段已更新（Demo）");
              }}
              onDate={(date) => {
                const c = overlay.content!;
                setData((d) => ({
                  ...d,
                  contents: d.contents.map((x) =>
                    x.id === c.id ? { ...x, date } : x,
                  ),
                }));
                setOverlay((o) => (o ? { ...o, content: { ...c, date } } : o));
                setToast("发布安排已保存（Demo）");
              }}
              onAsset={(a) => setOverlay({ kind: "asset", asset: a })}
            />
          )}
          {overlay.kind === "account" && (
            <div className="cd-account-detail">
              <div className="cd-account-detail-heading">
                <AccountAvatar account={account} large />
                <div>
                  <Platform account={account} />
                  <h2>{account.name}</h2>
                </div>
              </div>
              <h3>内容方向</h3>
              <p>{account.direction}</p>
              <h3>当前目标</h3>
              <p>{account.goal}</p>
              <h3>账号关系</h3>
              <p>
                {account.family === "独立运营"
                  ? "独立账号，研究与内容资产独立归属。"
                  : "属于 AI 内容系列，与相关账号共享研究资料，分别制作内容。"}
              </p>
              <h3>AI 工作时带上的背景</h3>
              <div className="cd-context-chips">
                {["账号定位", "当前目标", "任务要求", "选定资产"].map((s) => (
                  <Tag key={s} tone="green">
                    <Check size={11} />
                    {s}
                  </Tag>
                ))}
              </div>
              <p className="cd-inline-notice">
                这是示例运营档案，正式版可配置自己的账号定位、栏目、风格与审核规则。
              </p>
            </div>
          )}
          {overlay.kind === "search" && (
            <SearchDialog
              data={data}
              onAccount={(id) => {
                switchAccount(id);
                setOverlay(null);
              }}
              onTask={(t) => setOverlay({ kind: "task", task: t })}
              onAsset={(a) => setOverlay({ kind: "asset", asset: a })}
              onContent={(c) => setOverlay({ kind: "content", content: c })}
            />
          )}
          {overlay.kind === "method" && (
            <div className="cd-method-detail">
              <Tag tone="blue">可试的方法 · 演示</Tag>
              <h2>{overlay.title}</h2>
              <h3>怎么用</h3>
              <p>
                先明确这条内容要解决的具体问题，再组织能看见的例子，最后给出检查标准或可带走的成果。
              </p>
              <h3>适用条件</h3>
              <p>有具体场景和可靠资料；不把单次成功视作所有平台通用的规律。</p>
              <h3>验证与沉淀</h3>
              <p>发布后记录读者反馈与内容表现，确认哪些方法值得继续用。</p>
              <div className="cd-inline-notice">
                来源、平台与表现证据在正式版中逐条填写；Demo
                不提供虚构的爆款案例。
              </div>
              <Button
                primary
                onClick={() => {
                  setOverlay({ kind: "newtask" });
                }}
              >
                用这个思路创建任务 <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  drawer = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first =
      ref.current?.querySelector<HTMLElement>(
        "input:not([type=checkbox]),textarea,select",
      ) || ref.current?.querySelector<HTMLElement>("button");
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = [
        ...ref.current!.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),textarea,select,a[href]",
        ),
      ].filter((x) => x.offsetParent !== null);
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className={`cd-modal-backdrop ${drawer ? "drawer" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`cd-modal ${drawer ? "drawer" : ""} ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <span>
            {drawer ? <FolderOpen size={17} /> : <Import size={17} />}
          </span>
          <h2>{title}</h2>
          <button
            className="cd-icon-button"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="cd-modal-body">{children}</div>
      </div>
    </div>
  );
}
function ImportFlow({
  accountId,
  onDone,
}: {
  accountId: string;
  onDone: (account: string, items: ImportItem[]) => void;
}) {
  const [target, setTarget] = useState(accountId);
  const [text, setText] = useState("");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [stage, setStage] = useState(1);
  const selected = items.filter((i) => i.selected);
  return (
    <div className="cd-import-flow">
      <div className="cd-import-steps">
        <span className={stage === 1 ? "active" : "complete"}>
          <i>{stage === 1 ? "1" : <Check size={12} />}</i>带回整理结果
        </span>
        <ChevronRight size={13} />
        <span className={stage === 2 ? "active" : ""}>
          <i>2</i>确认归属与分类
        </span>
      </div>
      {stage === 1 ? (
        <>
          <p className="cd-dialog-lead">
            把 ChatGPT 整理的选题、Todo、正文或用户资料粘贴进来。
          </p>
          <label className="cd-form-field">
            <span>归入哪个账号</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.platform} · {a.name}
                </option>
              ))}
            </select>
          </label>
          <div className="cd-import-text-label">
            <span>ChatGPT 整理结果</span>
            <button
              className="cd-text-button"
              onClick={() => setText(importSample)}
            >
              填入演示内容 <ArrowDownIcon />
            </button>
          </div>
          <textarea
            aria-label="ChatGPT 整理结果"
            rows={11}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "把内容粘贴到这里…\n\n可用这些标题分段：\n# 任务：任务名称\n# 选题：选题名称\n# 发布物料：正文名称\n# 用户交付：资料包名称\n\n没有分段标题的内容会保留为一份研究笔记。"
            }
          />
          <p className="cd-form-help">
            本 Demo 按标题分段预览，不调用 AI，也不自动读取 ChatGPT 会话。
          </p>
          <div className="cd-modal-footer">
            <span>保留原文，确认后才归档</span>
            <Button
              primary
              disabled={!text.trim()}
              onClick={() => {
                const result = parseImport(text);
                setItems(
                  result.length
                    ? result
                    : [
                        {
                          id: "note",
                          kind: "研究参考",
                          title: "ChatGPT 导入笔记",
                          body: text,
                          selected: true,
                        },
                      ],
                );
                setStage(2);
              }}
            >
              预览导入 <ArrowRight size={15} />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="cd-dialog-lead">
            这些内容将归入{" "}
            <strong>
              {accounts.find((a) => a.id === target)?.platform} ·{" "}
              {accounts.find((a) => a.id === target)?.name}
            </strong>
            。你可以调整分类或取消条目。
          </p>
          <div className="cd-import-preview">
            {items.map((item) => (
              <div key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) =>
                      setItems((list) =>
                        list.map((x) =>
                          x.id === item.id
                            ? { ...x, selected: e.target.checked }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <div>
                  <input
                    aria-label="导入条目名称"
                    value={item.title}
                    onChange={(e) =>
                      setItems((list) =>
                        list.map((x) =>
                          x.id === item.id
                            ? { ...x, title: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  <p>{item.body || "暂无补充内容"}</p>
                </div>
                <select
                  aria-label="导入条目类型"
                  value={item.kind}
                  onChange={(e) =>
                    setItems((list) =>
                      list.map((x) =>
                        x.id === item.id
                          ? { ...x, kind: e.target.value as ImportItem["kind"] }
                          : x,
                      ),
                    )
                  }
                >
                  {["任务", "选题", "发布物料", "用户交付", "研究参考"].map(
                    (k) => (
                      <option key={k}>{k}</option>
                    ),
                  )}
                </select>
              </div>
            ))}
          </div>
          <div className="cd-import-destination">
            <FolderInput size={20} />
            <div>
              <strong>{selected.length} 项内容，分别进入相应位置</strong>
              <p>任务 → Todo　选题 → 选题池　物料 / 交付品 → 账号资产</p>
            </div>
          </div>
          <div className="cd-modal-footer">
            <Button onClick={() => setStage(1)}>返回修改</Button>
            <Button
              primary
              disabled={
                !selected.length || selected.some((i) => !i.title.trim())
              }
              onClick={() => onDone(target, items)}
            >
              <Check size={15} />
              确认导入 {selected.length} 项
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function ArrowDownIcon() {
  return <ChevronDown size={13} />;
}
function TaskDetail({
  task,
  account,
  asset,
  onChange,
  onAsset,
  onSave,
  onApprove,
}: {
  task: CreatorTask;
  account: Account;
  asset?: CreatorAsset;
  onChange: (patch: Partial<CreatorTask>) => void;
  onAsset: (asset: CreatorAsset) => void;
  onSave: (body: string) => void;
  onApprove: () => void;
}) {
  const [result, setResult] = useState(task.result);
  const [instruction, setInstruction] = useState(task.note);
  const [mode, setMode] = useState(task.executor);
  return (
    <div className="cd-task-detail">
      <div className="cd-detail-meta">
        <Platform account={account} />
        <span>{account.name}</span>
        <Tag
          tone={
            task.status === "review"
              ? "amber"
              : task.status === "done"
                ? "green"
                : ""
          }
        >
          {task.status === "review"
            ? "待你确认"
            : task.status === "done"
              ? "已完成"
              : "待处理"}
        </Tag>
      </div>
      <h2>{task.title}</h2>
      <div className="cd-detail-description">{task.note}</div>
      <div className="cd-task-context">
        <h3>
          <Target size={15} />
          本次任务带上的背景
        </h3>
        <p>{account.direction}</p>
        <p>
          <strong>当前目标：</strong>
          {account.goal}
        </p>
        <div className="cd-context-chips">
          <Tag>
            <Check size={11} />
            账号定位
          </Tag>
          <Tag>
            <Check size={11} />
            当前任务
          </Tag>
          <Tag>{asset ? "关联资产 1 份" : "可选择参考资料"}</Tag>
        </div>
      </div>
      <div className="cd-form-field">
        <span>处理方式</span>
        <div className="cd-execution-tabs">
          {(["ChatGPT 导入", "工作台 AI", "人工"] as const).map((m) => (
            <button
              className={mode === m ? "active" : ""}
              key={m}
              onClick={() => setMode(m)}
            >
              {m === "工作台 AI" ? (
                <Sparkles size={14} />
              ) : m === "ChatGPT 导入" ? (
                <Import size={14} />
              ) : (
                <CheckSquare size={14} />
              )}
              {m}
            </button>
          ))}
        </div>
      </div>
      {!result && (
        <>
          <label className="cd-form-field">
            <span>
              {mode === "ChatGPT 导入"
                ? "粘贴处理结果"
                : mode === "人工"
                  ? "记录处理结果"
                  : "本次执行要求"}
            </span>
            <textarea
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </label>
          <div className="cd-inline-notice">
            {mode === "工作台 AI"
              ? "演示任务内执行界面：点击下方可查看示例结果，不会调用真实模型。"
              : "记录在同一个任务里，方便继续审核和保存成果。"}
          </div>
          <Button
            primary
            disabled={!instruction.trim()}
            onClick={() => {
              const body =
                mode === "工作台 AI"
                  ? `# ${task.title}\n\n## 任务背景\n${account.direction}\n\n## 执行要求\n${instruction}\n\n## 示例工作结构\n1. 补充具体输入与参考来源。\n2. 围绕账号读者的问题组织内容。\n3. 给出可以检查与采用的结果。\n\n这是一份用于体验流程的演示结果，尚未进行实际调研或模型调用。`
                  : instruction;
              setResult(body);
              onChange({ result: body, status: "review", executor: mode });
            }}
          >
            {mode === "工作台 AI" ? (
              <Sparkles size={15} />
            ) : (
              <Check size={15} />
            )}
            {mode === "工作台 AI" ? "生成演示结果" : "记录结果，进入待确认"}
          </Button>
        </>
      )}
      {result && (
        <>
          <div className="cd-result-heading">
            <h3>任务成果</h3>
            <Tag>
              {task.executor === "ChatGPT 导入" ? "外部整理导入" : "待检查"}
            </Tag>
          </div>
          <div className="cd-result-paper">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
          {asset && (
            <button className="cd-linked-asset" onClick={() => onAsset(asset)}>
              <FileText size={19} />
              <span>
                <strong>{asset.title}</strong>
                <small>
                  {asset.use} · {asset.version} · {asset.status}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          )}
          <div className="cd-modal-footer">
            <Button onClick={() => onSave(result)}>
              <Layers size={15} />
              另存为账号资产
            </Button>
            <Button
              primary
              onClick={onApprove}
              disabled={task.status === "done"}
            >
              <Check size={15} />
              {task.status === "done" ? "已完成" : "确认采用，完成任务"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function AssetDetail({
  asset,
  account,
  onReady,
}: {
  asset: CreatorAsset;
  account: Account;
  onReady: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cd-asset-detail">
      <div className="cd-detail-meta">
        <Platform account={account} />
        <span>{account.name}</span>
        <Tag tone={asset.use === "用户交付" ? "amber" : ""}>{asset.use}</Tag>
      </div>
      <h2>{asset.title}</h2>
      <div className="cd-detail-facts">
        <div>
          <span>当前版本</span>
          <strong>{asset.version}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>{asset.source}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>{asset.status}</strong>
        </div>
      </div>
      {asset.use === "用户交付" && (
        <div className="cd-inline-notice">
          <Gift size={16} />
          演示交付品，请检查内容、使用说明与权利来源后再实际提供给用户。
        </div>
      )}
      <div className="cd-result-paper">
        <ReactMarkdown>{asset.body}</ReactMarkdown>
      </div>
      {asset.sharedWith.length > 0 && (
        <div className="cd-shared-links">
          <h3>引用到相关账号</h3>
          {asset.sharedWith.map((id) => {
            const a = accounts.find((a) => a.id === id)!;
            return (
              <span key={id}>
                <Platform account={a} />
                {a.name}
              </span>
            );
          })}
        </div>
      )}
      <div className="cd-asset-tools">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(asset.body);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy size={14} />
          {copied ? "已复制" : "复制内容"}
        </Button>
        <Button
          onClick={() => {
            const link = document.createElement("a");
            const url = URL.createObjectURL(
              new Blob([asset.body], { type: "text/markdown;charset=utf-8" }),
            );
            link.href = url;
            link.download = asset.title + ".md";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download size={14} />
          下载示例 .md
        </Button>
      </div>
      <div className="cd-modal-footer">
        <span>演示文本 · 非已发布或已售商品</span>
        <Button primary disabled={asset.status === "可使用"} onClick={onReady}>
          <Check size={15} />
          {asset.status === "可使用" ? "已标记可使用" : "检查完成，标记可使用"}
        </Button>
      </div>
    </div>
  );
}
function ContentDetail({
  content,
  account,
  related,
  assets,
  onStage,
  onDate,
  onAsset,
}: {
  content: CreatorContent;
  account: Account;
  related: CreatorContent[];
  assets: CreatorAsset[];
  onStage: (stage: CreatorContent["stage"]) => void;
  onDate: (date: string) => void;
  onAsset: (asset: CreatorAsset) => void;
}) {
  return (
    <div className="cd-content-detail">
      <div className="cd-detail-meta">
        <Platform account={account} />
        <span>{account.name}</span>
        <Tag>{content.stage}</Tag>
      </div>
      <Cover content={content} small />
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <label className="cd-form-field">
        <span>当前制作阶段</span>
        <select
          value={content.stage}
          onChange={(e) => onStage(e.target.value as CreatorContent["stage"])}
        >
          {["选题", "制作中", "待发布", "已发布"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <form
        className="cd-publish-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const date = String(f.get("date"));
          const [, , day] = date.split("-");
          const month = date.split("-")[1];
          onDate(`${Number(month)} 月 ${day} 日 · ${f.get("time")}`);
        }}
      >
        <div className="cd-form-columns">
          <label className="cd-form-field">
            <span>计划日期</span>
            <input name="date" type="date" defaultValue="2026-10-09" required />
          </label>
          <label className="cd-form-field">
            <span>计划时间</span>
            <input name="time" type="time" defaultValue="12:30" required />
          </label>
        </div>
        <div>
          <span>{content.date}</span>
          <Button type="submit">
            <CalendarDays size={14} />
            保存安排
          </Button>
        </div>
      </form>
      <h3>账号发布物料</h3>
      {assets.map((a) => (
        <button
          className="cd-linked-asset"
          key={a.id}
          onClick={() => onAsset(a)}
        >
          <FileText size={18} />
          <span>
            <strong>{a.title}</strong>
            <small>
              {a.version} · {a.status}
            </small>
          </span>
          <ArrowUpRight size={14} />
        </button>
      ))}
      {related.length > 0 && (
        <>
          <h3>同一主题的其他平台版本</h3>
          {related.map((c) => {
            const a = accounts.find((a) => a.id === c.accountId)!;
            return (
              <div className="cd-related-content" key={c.id}>
                <Platform account={a} />
                <div>
                  <strong>{c.title}</strong>
                  <span>{c.stage} · 独立制作与发布</span>
                </div>
              </div>
            );
          })}
        </>
      )}
      <div className="cd-inline-notice">
        阶段与日期仅更新演示计划，不会在真实平台发布内容。
      </div>
    </div>
  );
}
function SearchDialog({
  data,
  onAccount,
  onTask,
  onAsset,
  onContent,
}: {
  data: DemoData;
  onAccount: (id: string) => void;
  onTask: (t: CreatorTask) => void;
  onAsset: (a: CreatorAsset) => void;
  onContent: (c: CreatorContent) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = (s: string) => s.toLowerCase().includes(query.toLowerCase());
  const results =
    accounts.filter((a) => matches(a.name + " " + a.platform)).length +
    (query
      ? data.tasks.filter((t) => matches(t.title)).length +
        data.contents.filter((c) => matches(c.title)).length +
        data.assets.filter((a) => matches(a.title)).length
      : 0);
  return (
    <div className="cd-search-dialog">
      <label>
        <Search size={20} />
        <input
          autoFocus
          value={query}
          placeholder="搜索账号、任务、内容或资产…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>⌘ K</kbd>
      </label>
      <div>
        {accounts
          .filter((a) => matches(a.name + " " + a.platform))
          .map((a) => (
            <button key={a.id} onClick={() => onAccount(a.id)}>
              <AccountAvatar account={a} />
              <span>{a.name}</span>
              <small>{a.platform}账号</small>
            </button>
          ))}
        {query &&
          data.tasks
            .filter((t) => matches(t.title))
            .map((t) => (
              <button key={t.id} onClick={() => onTask(t)}>
                <CheckSquare size={18} />
                <span>{t.title}</span>
                <small>任务</small>
              </button>
            ))}
        {query &&
          data.contents
            .filter((c) => matches(c.title))
            .map((c) => (
              <button key={c.id} onClick={() => onContent(c)}>
                <FileText size={18} />
                <span>{c.title}</span>
                <small>内容</small>
              </button>
            ))}
        {query &&
          data.assets
            .filter((a) => matches(a.title))
            .map((a) => (
              <button key={a.id} onClick={() => onAsset(a)}>
                <Layers size={18} />
                <span>{a.title}</span>
                <small>{a.use}</small>
              </button>
            ))}
        {!results && (
          <div className="cd-empty">
            <Search size={23} />
            <strong>还没有找到相关内容</strong>
            <span>换个关键词试试。</span>
          </div>
        )}
      </div>
    </div>
  );
}

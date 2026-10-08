/* eslint-disable @next/next/no-img-element -- Local uploaded avatars are rendered without a remote image service. */
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Settings, Plus } from "lucide-react";
import { accounts as defaults, type Account } from "./data";
const Context = createContext<{
  accounts: Account[];
  update: (a: Account[]) => void;
}>({ accounts: defaults, update: () => {} });
export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, update] = useState(defaults);
  useEffect(() => {
    let active = true;
    fetch("/api/studio/accounts")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (active) update(d.accounts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <Context.Provider value={{ accounts, update }}>{children}</Context.Provider>
  );
}
export function useAccounts() {
  return useContext(Context).accounts;
}
const blank = {
  name: "",
  platform: "小红书" as Account["platform"],
  homepage: "",
  platformId: "",
  avatar: "",
  direction: "",
  goal: "",
  family: "",
};
export function AccountManager({ variant = "manage" }: { variant?: "manage" | "add" }) {
  const { accounts, update } = useContext(Context);
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<(typeof blank & { id?: string }) | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setDraft(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/studio/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      update(d.accounts);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={variant === "add" ? "sv-account-add sv-primary" : "sv-account-manage"}
        aria-label={variant === "add" ? "添加账号" : "账号管理"}
        title={variant === "add" ? "添加账号" : "账号管理"}
        onClick={(event) => {
          // Escape the sticky sidebar stacking context while retaining theme variables.
          setPortalRoot(event.currentTarget.closest(".sv"));
          setDraft(variant === "add" ? { ...blank } : null);
          setOpen(true);
          setError("");
        }}
      >
        {variant === "add" ? <Plus size={16} /> : <Settings size={14} />}
        {variant === "add" ? "添加账号" : "管理"}
      </button>
      {open && portalRoot && createPortal(
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
            aria-label="账号管理"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modalhead">
              <h2>
                {draft ? (draft.id ? "编辑账号" : "添加账号") : "账号管理"}
              </h2>
              <button
                aria-label="关闭账号管理"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setDraft(null);
                }}
              >
                ×
              </button>
            </div>
            <p className="sv-note">
              登记运营账号，用于内容归属。无需平台密码或登录授权。
            </p>
            {!draft ? (
              <>
                <button
                  onClick={() => {
                    setDraft({ ...blank });
                    setError("");
                  }}
                >
                  ＋ 添加账号
                </button>
                <div className="sv-account-list">
                  {accounts.map((a) => (
                    <div key={a.id}>
                      <span>
                        <strong>{a.name}</strong>
                        <small>
                          {a.platform} · {a.direction || "未设置定位"}
                        </small>
                        {a.family && <small>关联主题：{a.family}</small>}
                      </span>
                      <button
                        onClick={() => {
                          setDraft({ ...blank, ...a });
                          setError("");
                        }}
                      >
                        编辑
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <label className="sv-label">平台 *</label>
                <select
                  value={draft.platform}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      platform: e.target.value as Account["platform"],
                    })
                  }
                >
                  {["小红书", "抖音", "公众号"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <label className="sv-label">账号名称 *</label>
                <input
                  required
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <label className="sv-label">主页链接</label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={draft.homepage}
                  onChange={(e) =>
                    setDraft({ ...draft, homepage: e.target.value })
                  }
                />
                <label className="sv-label">平台账号 ID</label>
                <input
                  value={draft.platformId}
                  onChange={(e) =>
                    setDraft({ ...draft, platformId: e.target.value })
                  }
                />
                <label className="sv-label">头像（可选）</label>
                {draft.avatar && (
                  <img
                    src={draft.avatar}
                    alt="账号头像"
                    width={48}
                    height={48}
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (
                      f.size > 1024 * 1024 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        f.type,
                      )
                    ) {
                      setError("头像支持 PNG、JPEG、WebP，最大 1MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      setDraft({ ...draft, avatar: String(reader.result) });
                    reader.readAsDataURL(f);
                  }}
                />
                <label className="sv-label">内容定位</label>
                <textarea
                  placeholder="内容方向、受众、表达风格"
                  value={draft.direction}
                  onChange={(e) =>
                    setDraft({ ...draft, direction: e.target.value })
                  }
                />
                <label className="sv-label">运营目标</label>
                <input
                  value={draft.goal}
                  onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                />
                <label className="sv-label">关联主题</label>
                <input
                  list="account-themes"
                  placeholder="例如：AI 工作与效率"
                  value={draft.family}
                  onChange={(e) =>
                    setDraft({ ...draft, family: e.target.value })
                  }
                />
                <datalist id="account-themes">
                  {[
                    ...new Set(accounts.map((a) => a.family).filter(Boolean)),
                  ].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <p className="sv-note">
                  相同关联主题可标记相关账号，各账号的内容和任务仍独立管理。
                </p>
                {error && <p role="alert">{error}</p>}
                <div className="sv-account-buttons">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDraft(null)}
                  >
                    返回列表
                  </button>
                  <button type="submit" disabled={busy}>
                    {busy ? "保存中…" : "保存账号"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>,
        portalRoot,
      )}
    </>
  );
}

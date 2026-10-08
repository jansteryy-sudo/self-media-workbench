/* eslint-disable @next/next/no-img-element -- Local uploaded avatars are rendered without a remote image service. */
import { useAccounts } from "./account-manager";
export function AccountBadge({ id }: { id: string }) {
  const accounts = useAccounts();
  const a = accounts.find((a) => a.id === id);
  if (!a) return null;
  const kind =
    a.platform === "小红书" ? "xhs" : ["抖音", "TikTok"].includes(a.platform) ? "dy" : ["公众号", "视频号"].includes(a.platform) ? "wx" : "other";
  return (
    <span
      className={
        "sv-account sv-account-" +
        kind +
        " " +
        (id === "xhs-life" ? "sv-account-life" : "")
      }
    >
      <span className="sv-platform" role="img" aria-label={a.platform}>
        {kind === "dy" ? (
          <svg viewBox="0 0 24 24">
            <path
              d="M14 3v12.5a4.7 4.7 0 1 1-4-4.6v3a1.8 1.8 0 1 0 1 1.6V3h3c.5 2.5 2 4 5 4.4v3c-2-.2-3.6-1-5-2.2"
              fill="white"
            />
            <path d="M12 3v12.5a4 4 0 0 1-6 3" fill="none" stroke="#25f4ee" />
            <path d="M15 3c.4 2 2 3.3 4 3.6" stroke="#fe2c55" fill="none" />
          </svg>
        ) : kind === "wx" ? (
          <svg viewBox="0 0 24 24">
            <ellipse cx="9" cy="10" rx="7" ry="5.5" fill="white" />
            <ellipse
              cx="16"
              cy="15"
              rx="6"
              ry="4.5"
              fill="white"
              stroke="#17a86b"
            />
            <circle cx="7" cy="9" r="1" fill="#17a86b" />
            <circle cx="11" cy="9" r="1" fill="#17a86b" />
            <circle cx="14" cy="14" r=".8" fill="#17a86b" />
            <circle cx="18" cy="14" r=".8" fill="#17a86b" />
            <path d="m5 14-1 4 4-2m11 2 2 3-4-1" fill="white" />
          </svg>
        ) : (
          <span>{kind === "xhs" ? "小红书" : a.platform === "YouTube" ? "▶" : a.platform === "B站" ? "B" : a.platform === "X" ? "𝕏" : a.platform.slice(0, 2)}</span>
        )}
      </span>
      {a.avatar && (
        <img
          src={a.avatar}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
      )}
      {a.name}
    </span>
  );
}

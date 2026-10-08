import { dataRoot } from "@/lib/storage-path";
import fs from "node:fs/promises";
import path from "node:path";
export const studioRoot = path.join(
  dataRoot,
  "studio-service",
);
export type McpConfig = {
  enabled: boolean;
  clients: { id: string; name: string; hash: string; createdAt: string }[];
};
export async function config(): Promise<McpConfig> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(studioRoot, "mcp.json"), "utf8"),
    );
  } catch {
    return { enabled: false, clients: [] };
  }
}
export async function writeConfig(c: McpConfig) {
  await fs.mkdir(studioRoot, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(studioRoot, "mcp.json"), JSON.stringify(c), {
    mode: 0o600,
  });
}
export async function incoming() {
  try {
    const files = await fs.readdir(path.join(studioRoot, "inbox"));
    return await Promise.all(
      files
        .filter((f) => /^[a-f0-9-]+\.json$/.test(f))
        .map(async (f) =>
          JSON.parse(
            await fs.readFile(path.join(studioRoot, "inbox", f), "utf8"),
          ),
        ),
    );
  } catch {
    return [];
  }
}

export async function studioAccounts() {
  try {
    return JSON.parse(
      await fs.readFile(path.join(studioRoot, "accounts.json"), "utf8"),
    ) as import("@/components/creator-demo/data").Account[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return (await import("@/components/creator-demo/data")).accounts;
  }
}

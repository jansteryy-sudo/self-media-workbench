import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
export const storageRoot = path.resolve(
  /*turbopackIgnore: true*/ process.env.WORKBENCH_DATA_DIR ||
    path.join(process.cwd(), "workbench-data"),
);
fs.mkdirSync(storageRoot, { recursive: true, mode: 0o700 });
const sqlite = new Database(path.join(storageRoot, "workbench.db"));
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
for (const name of fs
  .readdirSync(path.join(process.cwd(), "migrations"))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  sqlite.transaction(() => {
    if (sqlite.prepare("SELECT name FROM schema_migrations WHERE name = ?").get(name)) return;
    sqlite.exec(fs.readFileSync(path.join(process.cwd(), "migrations", name), "utf8"));
    sqlite.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(name, new Date().toISOString());
  }).immediate();
}
export const db = drizzle(sqlite, { schema });
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();

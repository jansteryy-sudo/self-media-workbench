import fs from "node:fs/promises";
import path from "node:path";
import { studioRoot } from "./studio-mcp";
import { itemSchema } from "./studio-records";
import { z } from "zod";
export const stateSchema = z.object({
  items: z.array(itemSchema).max(10000),
  jobs: z.array(z.record(z.string(), z.unknown())).max(1000),
  skills: z.array(z.record(z.string(), z.unknown())).max(1000),
});
export type StudioState = z.infer<typeof stateSchema> & { revision: string };
let queue: Promise<unknown> = Promise.resolve();
export function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => {});
  return result;
}
export async function readState(): Promise<StudioState | null> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(studioRoot, "state.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  try {
    const items = JSON.parse(
      await fs.readFile(path.join(studioRoot, "snapshot.json"), "utf8"),
    ) as z.infer<typeof itemSchema>[];
    return { items, jobs: [], skills: [], revision: "legacy" };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return null;
  }
}
export async function writeState(input: z.infer<typeof stateSchema>) {
  const value = { ...input, revision: crypto.randomUUID() };
  await fs.mkdir(studioRoot, { recursive: true, mode: 0o700 });
  const p = path.join(studioRoot, crypto.randomUUID() + ".tmp");
  await fs.writeFile(p, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(p, path.join(studioRoot, "state.json"));
  return value;
}

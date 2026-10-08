import { dataRoot } from "@/lib/storage-path";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { guard, errorResponse } from "@/lib/server";
export const runtime = "nodejs";
const root = path.join(dataRoot, "studio-wiki");
export async function POST(req: NextRequest) {
  try {
    guard(req);
    const data = await req.json();
    if (!Array.isArray(data.docs) || data.docs.length > 2000)
      throw Error("文档数量无效");
    const docs = data.docs.map(
      (d: { id: string; title: string; body: string; account: string }) => ({
        id: String(d.id),
        title: String(d.title).slice(0, 500),
        body: String(d.body).slice(0, 200000),
        account: String(d.account),
      }),
    );
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const temporary = path.join(root, crypto.randomUUID() + ".tmp");
    await fs.writeFile(temporary, JSON.stringify(docs), { mode: 0o600 });
    await fs.rename(temporary, path.join(root, "index.json"));
    return NextResponse.json({
      count: docs.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "",
      account = req.nextUrl.searchParams.get("account") || "all";
    let docs: { id: string; title: string; body: string; account: string }[] =
      [];
    try {
      docs = JSON.parse(
        await fs.readFile(path.join(root, "index.json"), "utf8"),
      );
    } catch {
      return NextResponse.json({ results: [], indexed: 0 });
    }
    const terms = [
      ...new Set(q.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g) || []),
    ];
    const results = docs
      .filter((d) => account === "all" || d.account === account)
      .map((d) => {
        const text = (d.title + " " + d.body).toLowerCase();
        const matches = terms.filter((t) => text.includes(t));
        const score = matches.length + (text.includes(q.toLowerCase()) ? 3 : 0);
        const pos = d.body.toLowerCase().indexOf(matches[0] || q.toLowerCase());
        return {
          ...d,
          body: undefined,
          score,
          snippet: d.body.slice(
            Math.max(0, pos - 40),
            Math.max(0, pos - 40) + 400,
          ),
        };
      })
      .filter((d) => q && d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return NextResponse.json({
      results,
      indexed: docs.length,
      method: "本地关键词检索，未调用 LLM",
    });
  } catch (e) {
    return errorResponse(e);
  }
}

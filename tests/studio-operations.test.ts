import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  applyProposal,
  recordChange,
  proposalSchema,
  type WorkItem,
} from "../src/lib/studio-records";
import { parseMetrics } from "../src/lib/studio-metrics";
import { retrieveKnowledge } from "../src/lib/studio-knowledge";
const original = process.cwd();
const temp = mkdtempSync(path.join(os.tmpdir(), "studio-operations-"));
process.chdir(temp);
let stateRoute: typeof import("../src/app/api/studio/state/route");
let backupRoute: typeof import("../src/app/api/studio/backup/route");
let publishRoute: typeof import("../src/app/api/studio/publish-package/route");
let generate: typeof import("../src/lib/studio-model").generate;
let readSkill: typeof import("../src/lib/studio-skill").readSkill;
before(async () => {
  const root = path.join(temp, "workbench-data", "studio-service");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, "accounts.json"), JSON.stringify([{ id: "xhs-ai", name: "测试账号", platform: "小红书", initial: "测", color: "#345", direction: "", goal: "", family: "" }]));
  stateRoute = await import("../src/app/api/studio/state/route");
  backupRoute = await import("../src/app/api/studio/backup/route");
  publishRoute = await import("../src/app/api/studio/publish-package/route");
  generate = (await import("../src/lib/studio-model")).generate;
  readSkill = (await import("../src/lib/studio-skill")).readSkill;
});
const item: WorkItem = {
  id: "item-1",
  account: "xhs-ai",
  title: "原始标题",
  body: "原始正文",
  kind: "选题池",
  status: "待评估",
  source: "手动",
  date: "",
  url: "",
  type: "标题正文",
};
function request(url: string, method = "GET", body?: unknown) {
  return new NextRequest("http://localhost:3212" + url, {
    method,
    headers: {
      host: "localhost:3212",
      origin: "http://localhost:3212",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
after(async () => {
  process.chdir(original);
  await fs.rm(temp, { recursive: true, force: true });
});
test("history keeps original content and restores body without resetting workflow", () => {
  const next = recordChange(
    { ...item, kind: "内容制作", body: "新版" },
    item,
    "采用选题",
  );
  assert.equal(next.history?.[0].body, "原始正文");
  assert.equal(next.history?.[1].kind, "内容制作");
  const restored = recordChange(
    { ...next, body: next.history![0].body },
    next,
    "恢复正文",
  );
  assert.equal(restored.kind, "内容制作");
  assert.equal(restored.history?.length, 3);
  assert.equal(restored.body, "原始正文");
});
test("AI plans are bounded, immutable and cannot publish or delete", () => {
  const proposal = proposalSchema.parse({
    answer: "建议",
    actions: [
      {
        type: "create",
        account: "xhs-ai",
        title: "草稿",
        body: "内容",
        kind: "内容制作",
        parentId: item.id,
      },
      { type: "update", id: item.id, body: "修改" },
    ],
  });
  const next = applyProposal([item], proposal, ["xhs-ai"]);
  assert.equal(item.body, "原始正文");
  assert.equal(next[0].status, "AI 草稿 · 待确认");
  assert.equal(next[1].body, "修改");
  assert.throws(() =>
    applyProposal(
      [item],
      { answer: "", actions: [{ type: "update", id: "missing", body: "x" }] },
      ["xhs-ai"],
    ),
  );
  assert.throws(() =>
    proposalSchema.parse({
      answer: "",
      actions: [{ type: "publish", id: item.id }],
    }),
  );
});
test("CSV quoted titles, numeric validation and JSON metric records", () => {
  const rows = parseMetrics('标题,浏览量,点赞\n"标题,有逗号",100,12\n');
  assert.equal(rows[0].title, "标题,有逗号");
  assert.equal(rows[0].views, "100");
  assert.throws(() => parseMetrics("标题,点赞\n测试,-1"));
  assert.throws(() => parseMetrics('标题,点赞\n"未闭合,2'));
  assert.equal(parseMetrics('{"id":"item-1","分享":4}')[0].shares, "4");
});
test("knowledge retrieval matches Chinese phrases and isolates accounts", () => {
  const docs = [
    { ...item, kind: "知识与经验", body: "公众号文章规范", account: "wx-ai" },
    {
      ...item,
      id: "k2",
      kind: "知识与经验",
      title: "图文开头规范",
      body: "小红书开头要说明具体收益",
    },
  ];
  assert.equal(
    retrieveKnowledge(docs, "帮我总结图文开头的规范", "xhs-ai")[0].id,
    "k2",
  );
  assert.equal(retrieveKnowledge(docs, "公众号文章", "xhs-ai").length, 0);
});
test("local save rejects stale revisions instead of silently overwriting", async () => {
  const r = await stateRoute.PUT(
    request("/api/studio/state", "PUT", {
      items: [item],
      jobs: [],
      skills: [],
      revision: null,
    }),
  );
  assert.equal(r.status, 200);
  const { state } = await r.json();
  const conflict = await stateRoute.PUT(
    request("/api/studio/state", "PUT", {
      items: [],
      jobs: [],
      skills: [],
      revision: null,
    }),
  );
  assert.equal(conflict.status, 409);
  const latest = await (
    await stateRoute.GET(request("/api/studio/state"))
  ).json();
  assert.equal(latest.state.revision, state.revision);
  assert.equal(latest.state.items.length, 1);
});
test("model adapters use saved keys server-side and normalize all three protocols", async () => {
  const folder = path.join(temp, "workbench-data", "studio-service", "models");
  await fs.mkdir(folder, { recursive: true });
  for (const provider of [
    "openai",
    "anthropic",
    "gemini",
    "deepseek",
    "qwen",
    "moonshot",
    "siliconflow",
  ]) {
    await fs.writeFile(
      path.join(folder, provider + ".json"),
      JSON.stringify({
        apiKey: "fake-test-key-never-transmitted",
        model: "test-model",
      }),
    );
    let called = false;
    const mock: typeof fetch = async (url, options) => {
      called = true;
      assert.match(String(url), /^https:\/\//);
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model || "test-model", "test-model");
      return Response.json(
        provider === "anthropic"
          ? { content: [{ type: "text", text: "ok" }] }
          : provider === "gemini"
            ? { candidates: [{ content: { parts: [{ text: "ok" }] } }] }
            : { choices: [{ message: { content: "ok" } }] },
      );
    };
    assert.equal(await generate(provider, "system", "prompt", mock), "ok");
    assert.equal(called, true);
  }
  await assert.rejects(generate("unsupported", "s", "p"), /请选择/);
});
test("publication ZIP includes actual attachments and missing attachments fail visibly", async () => {
  const id = crypto.randomUUID(),
    root = path.join(temp, "workbench-data", "studio-files");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, id), "actual attachment");
  const record = {
    ...item,
    tags: "#AI",
    files: [
      {
        id,
        name: "素材.txt",
        mime: "text/plain",
        size: 17,
        url: "/api/studio/files/" + id,
      },
    ],
  };
  const r = await publishRoute.POST(
    request("/api/studio/publish-package", "POST", record),
  );
  assert.equal(r.status, 200);
  const zip = Buffer.from(await r.arrayBuffer());
  assert.equal(zip.subarray(0, 2).toString(), "PK");
  await fs.unlink(path.join(root, id));
  const bad = await publishRoute.POST(
    request("/api/studio/publish-package", "POST", record),
  );
  assert.equal(bad.status, 400);
});
test("backup excludes credentials and restore round-trip retains records", async () => {
  const r = await backupRoute.GET(request("/api/studio/backup"));
  assert.equal(r.status, 200);
  const value = await r.json();
  assert.equal(JSON.stringify(value).includes("fake-test-key"), false);
  assert.equal(value.state.items[0].id, item.id);
  const form = new FormData();
  form.append(
    "file",
    new File([JSON.stringify(value)], "backup.json", {
      type: "application/json",
    }),
  );
  const restored = await backupRoute.POST(
    new NextRequest("http://localhost:3212/api/studio/backup", {
      method: "POST",
      headers: { host: "localhost:3212", origin: "http://localhost:3212" },
      body: form,
    }),
  );
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).state.items[0].body, item.body);
});
test("Skill execution reads real Markdown and refuses unresolved dependencies", async () => {
  const root = path.join(temp, "workbench-data", "studio-files"),
    id = crypto.randomUUID();
  await fs.writeFile(
    path.join(root, id + ".json"),
    JSON.stringify({ name: "SKILL.md" }),
  );
  await fs.writeFile(
    path.join(root, id),
    "# Skill\n\n整理输入内容，提出三个清晰的选题，并说明每个选题的内容角度。",
  );
  assert.match(await readSkill(id), /三个/);
  await fs.writeFile(
    path.join(root, id),
    "# Skill\n\n请读取 [本地文件](references/input.md) 并总结完整的参考内容。",
  );
  await assert.rejects(readSkill(id), /本地文件依赖/);
});
test("scheduled Skill runs reject duplicate triggers from another open page", async () => {
  const { POST } = await import("../src/app/api/studio/run-skill/route");
  const id = crypto.randomUUID(),
    root = path.join(temp, "workbench-data", "studio-files");
  await fs.writeFile(
    path.join(root, id + ".json"),
    JSON.stringify({ name: "SKILL.md" }),
  );
  await fs.writeFile(
    path.join(root, id),
    "# Skill\n\n整理输入内容，提出三个清晰的选题，并说明每个选题的内容角度。",
  );
  const body = {
    provider: "unsupported",
    scheduled: true,
    job: {
      id: "job-dedup-test",
      name: "每日选题",
      account: "xhs-ai",
      stage: "选题池",
      skill: { id },
    },
    items: [item],
  };
  const first = await POST(request("/api/studio/run-skill", "POST", body));
  assert.equal(first.status, 400);
  const second = await POST(request("/api/studio/run-skill", "POST", body));
  assert.equal(second.status, 400);
  assert.match((await second.json()).error, /另一页面定时触发/);
});

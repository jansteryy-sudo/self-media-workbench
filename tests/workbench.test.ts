import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { z } from "zod";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workbench-test-"));
process.env.WORKBENCH_DATA_DIR = dir;
// Test credentials are isolated and never invoke an external provider.
process.env.DEEPSEEK_API_KEY = "test-only-secret";
process.env.QWEN_API_KEY = "test-only-qwen";
async function modules() {
  return {
    route: await import("../src/app/api/workbench/route"),
    upload: await import("../src/app/api/upload/route"),
    file: await import("../src/app/api/files/[id]/route"),
    connector: await import("../src/connectors"),
  };
}
async function post(
  action: string,
  value: unknown,
  origin = "http://localhost:3210",
) {
  const { route } = await modules();
  const res = await route.POST(
    new NextRequest("http://localhost:3210/api/workbench", {
      method: "POST",
      headers: {
        host: "localhost:3210",
        origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, value }),
    }),
  );
  return { status: res.status, data: await res.json() };
}
async function snapshot() {
  const { route } = await modules();
  return (
    await route.GET(
      new NextRequest("http://localhost:3210/api/workbench", {
        headers: { host: "localhost:3210" },
      }),
    )
  ).json();
}
let pid: string, tid: string, assetId: string;
const opts = {
  description: true,
  goal: true,
  notes: false,
  task: true,
  assets: true,
  files: false,
};
after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
describe("local workbench integration", { concurrency: false }, () => {
  it("creates projects and tasks, and survives a second database connection", async () => {
    pid = (
      await post("project", {
        name: "Test project",
        description: "Background",
        goal: "Test goal",
        notes: "PRIVATE NOTE",
      })
    ).data.id;
    tid = (
      await post("task", { projectId: pid, title: "Task A", priority: "high" })
    ).data.id;
    assert.ok(pid && tid);
    const second = new Database(path.join(dir, "workbench.db"));
    assert.equal(
      (
        second.prepare("SELECT name FROM projects WHERE id=?").get(pid) as {
          name: string;
        }
      ).name,
      "Test project",
    );
    assert.equal(
      (
        second.prepare("SELECT projectId FROM tasks WHERE id=?").get(tid) as {
          projectId: string;
        }
      ).projectId,
      pid,
    );
    second.close();
  });
  it("autosaved notes do not overwrite separately edited goals", async () => {
    await post("project", {
      id: pid,
      name: "Test project",
      goal: "Updated goal",
      description: "Background",
    });
    assert.equal(
      (await post("notes", { id: pid, notes: "PRIVATE NOTE" })).status,
      200,
    );
    const p = (await snapshot()).projects.find(
      (p: { id: string }) => p.id === pid,
    );
    assert.equal(p.goal, "Updated goal");
    assert.equal(p.notes, "PRIVATE NOTE");
  });
  it("rejects cross-origin writes, missing projects and cross-project associations", async () => {
    assert.equal(
      (await post("project", { name: "No" }, "https://untrusted.example"))
        .status,
      400,
    );
    assert.equal(
      (await post("task", { projectId: "missing", title: "No" })).status,
      400,
    );
    const other = (await post("project", { name: "Other" })).data.id;
    assert.equal(
      (await post("asset", { projectId: other, taskId: tid, title: "No" }))
        .status,
      400,
    );
    assert.equal(
      (
        await post("asset", {
          projectId: pid,
          title: "unsafe",
          url: "javascript:alert(1)",
        })
      ).status,
      400,
    );
  });
  it("completes and reopens tasks without stale completion timestamps", async () => {
    await post("task", {
      id: tid,
      projectId: pid,
      title: "Task A",
      status: "done",
    });
    assert.ok(
      (await snapshot()).tasks.find((t: { id: string }) => t.id === tid)
        .completedAt,
    );
    await post("task", {
      id: tid,
      projectId: pid,
      title: "Task A",
      status: "todo",
    });
    assert.equal(
      (await snapshot()).tasks.find((t: { id: string }) => t.id === tid)
        .completedAt,
      null,
    );
  });
  it("context excludes unchecked notes and foreign project assets", async () => {
    assetId = (
      await post("asset", {
        projectId: pid,
        taskId: tid,
        title: "Output A",
        content: "Project A output",
      })
    ).data.id;
    const other = (await post("project", { name: "Foreign" })).data.id;
    await post("asset", {
      projectId: other,
      title: "Foreign",
      content: "FOREIGN SECRET",
    });
    const r = await post("context", {
      projectId: pid,
      taskId: tid,
      provider: "chatgpt",
      options: opts,
      instruction: "Do the task",
    });
    assert.match(r.data.text, /Task A/);
    assert.match(r.data.text, /Project A output/);
    assert.doesNotMatch(r.data.text, /PRIVATE NOTE|FOREIGN SECRET/);
    const external = await post("external", {
      projectId: pid,
      taskId: tid,
      provider: "chatgpt",
      options: opts,
      instruction: "Do it",
    });
    assert.equal(external.data.url, "https://chatgpt.com/");
    assert.equal((await snapshot()).activities[0].status, "prepared");
  });
  it("uploads bytes and downloads them without exposing executable HTML inline", async () => {
    const { upload, file } = await modules();
    const form = new FormData();
    form.append("projectId", pid);
    form.append(
      "file",
      new File(["<script>alert(1)</script>"], "test.html", {
        type: "text/html",
      }),
    );
    const res = await upload.POST(
      new NextRequest("http://localhost:3210/api/upload", {
        method: "POST",
        headers: { host: "localhost:3210" },
        body: form,
      }),
    );
    assert.equal(res.status, 200);
    const { id } = await res.json();
    const download = await file.GET(
      new NextRequest(`http://localhost:3210/api/files/${id}`, {
        headers: { host: "localhost:3210" },
      }),
      { params: Promise.resolve({ id }) },
    );
    assert.match(
      download.headers.get("Content-Disposition") || "",
      /^attachment/,
    );
    assert.equal(
      download.headers.get("Content-Type"),
      "application/octet-stream",
    );
    assert.equal(await download.text(), "<script>alert(1)</script>");
    await post("asset", {
      id: assetId,
      projectId: pid,
      taskId: tid,
      title: "Output A",
      fileId: id,
    });
  });
  it("adapter sends context, stores messages, and makes response provenance traceable", async () => {
    const realFetch = globalThis.fetch;
    let sent: Record<string, unknown> = {};
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://api.deepseek.com/chat/completions");
      sent = JSON.parse(String(init?.body));
      return Response.json({
        choices: [
          {
            message: { content: "TEST RESPONSE: not a live provider response" },
          },
        ],
      });
    };
    try {
      const sid = (
        await post("session", {
          projectId: pid,
          taskId: tid,
          provider: "deepseek",
          options: opts,
          instruction: "Test",
        })
      ).data.id;
      const r = await post("message", {
        sessionId: sid,
        content: "Test request",
      });
      assert.equal(r.status, 200);
      assert.match(JSON.stringify(sent), /Updated goal/);
      const snap = await snapshot();
      assert.equal(
        snap.messages.filter((m: { sessionId: string }) => m.sessionId === sid)
          .length,
        2,
      );
      assert.equal(
        snap.activities.find((a: { id: string }) => a.id === r.data.activityId)
          .status,
        "completed",
      );
      assert.equal(
        (
          await post("asset", {
            projectId: pid,
            taskId: tid,
            title: "Saved response",
            content: r.data.result,
            activityId: r.data.activityId,
            sourceApp: "deepseek",
          })
        ).status,
        200,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  it("provider failure is contained and never exposes secrets", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("Sensitive provider error test-only-secret", {
        status: 401,
      });
    try {
      const r = await post("test", { id: "deepseek" });
      assert.equal(r.status, 400);
      assert.match(r.data.error, /认证失败/);
      assert.doesNotMatch(JSON.stringify(r), /test-only-secret/);
      assert.doesNotMatch(
        JSON.stringify(await snapshot()),
        /test-only-secret|test-only-qwen/,
      );
      assert.equal(
        (await post("project", { name: "Still works after failure" })).status,
        200,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  it("standard MCP tool discovery and message mapping work against an isolated real transport", async () => {
    const { connector } = await modules();
    const received: unknown[] = [];
    const server = createServer(async (req, res) => {
      const mcp = new McpServer({ name: "test-fixture-only", version: "1" });
      mcp.registerTool(
        "test_message",
        {
          inputSchema: {
            prompt: z.string(),
            background: z.string(),
            conversation: z.string(),
          },
        },
        async (args) => {
          received.push(args);
          return {
            content: [{ type: "text", text: "MCP TEST ECHO: " + args.prompt }],
          };
        },
      );
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void transport.close();
        void mcp.close();
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    try {
      connector.saveConnection("openclaw", {
        baseUrl: `http://127.0.0.1:${addr.port}/mcp`,
        toolName: "test_message",
        transport: "streamable-http",
        argumentTemplate:
          '{"prompt":"{{message}}","background":"{{context}}","conversation":"{{sessionId}}"}',
      });
      const tools = await connector.listMcpTools();
      assert.equal(tools[0].name, "test_message");
      const result = await connector.mcpChat(
        'Text with "quotes"\nand newline',
        "Background",
        "local-session",
      );
      assert.match(result, /MCP TEST ECHO/);
      assert.deepEqual(received[0], {
        prompt: 'Text with "quotes"\nand newline',
        background: "Background",
        conversation: "local-session",
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
  it("archives and restores projects without discarding their contents", async () => {
    await post("project", {
      id: pid,
      name: "Test project",
      status: "archived",
    });
    assert.equal(
      (await snapshot()).projects.find((p: { id: string }) => p.id === pid)
        .status,
      "archived",
    );
    await post("project", { id: pid, name: "Test project", status: "active" });
    const snap = await snapshot();
    assert.ok(snap.tasks.some((t: { id: string }) => t.id === tid));
    assert.ok(snap.assets.some((a: { id: string }) => a.id === assetId));
  });
});

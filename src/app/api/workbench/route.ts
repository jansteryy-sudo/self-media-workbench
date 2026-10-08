import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, id, now, storageRoot } from "@/db";
import {
  projects,
  tasks,
  assets,
  files,
  activities,
  sessions,
  messages,
} from "@/db/schema";
import {
  connections,
  getConnection,
  saveConnection,
  apiChat,
  listMcpTools,
  mcpChat,
} from "@/connectors";
import {
  projectSchema,
  taskSchema,
  assetSchema,
  providerSchema,
  contextOptions,
  connectionSchema,
} from "@/lib/validation";
import { buildContext } from "@/lib/context-builder";
import { guard, errorResponse } from "@/lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function project(projectId: string) {
  const p = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!p) throw Error("项目不存在");
  return p;
}
function task(taskId: string | null | undefined, projectId: string) {
  if (!taskId) return undefined;
  const t = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!t || t.projectId !== projectId) throw Error("任务与项目不匹配");
  return t;
}
export async function GET(request: NextRequest) {
  try {
    guard(request);
    return NextResponse.json({
      projects: db
        .select()
        .from(projects)
        .orderBy(desc(projects.lastOpenedAt))
        .all(),
      tasks: db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all(),
      assets: db.select().from(assets).orderBy(desc(assets.createdAt)).all(),
      files: db
        .select({
          id: files.id,
          projectId: files.projectId,
          name: files.name,
          mime: files.mime,
          size: files.size,
          createdAt: files.createdAt,
        })
        .from(files)
        .orderBy(desc(files.createdAt))
        .all(),
      activities: db
        .select()
        .from(activities)
        .orderBy(desc(activities.createdAt))
        .all(),
      sessions: db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.createdAt))
        .all(),
      messages: db.select().from(messages).orderBy(messages.createdAt).all(),
      connections: connections(),
      storage: storageRoot,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    guard(request);
    const body = await request.json();
    const action = z.string().parse(body.action);
    const value = body.value;
    const stamp = now();
    if (action === "project") {
      const p = projectSchema.parse(value);
      if (p.id) project(p.id);
      const key = p.id || id();
      if (p.id)
        db.update(projects)
          .set({ ...p, updatedAt: stamp })
          .where(eq(projects.id, key))
          .run();
      else
        db.insert(projects)
          .values({
            ...p,
            id: key,
            createdAt: stamp,
            updatedAt: stamp,
            lastOpenedAt: stamp,
          })
          .run();
      return NextResponse.json({ id: key });
    }
    if (action === "notes") {
      const v = z
        .object({ id: z.string(), notes: z.string().max(100000) })
        .parse(value);
      project(v.id);
      db.update(projects)
        .set({ notes: v.notes, updatedAt: stamp })
        .where(eq(projects.id, v.id))
        .run();
      return NextResponse.json({ ok: true });
    }
    if (action === "visit") {
      const key = z.string().parse(value.id);
      project(key);
      db.update(projects)
        .set({ lastOpenedAt: stamp })
        .where(eq(projects.id, key))
        .run();
      return NextResponse.json({ ok: true });
    }
    if (action === "task") {
      const t = taskSchema.parse(value);
      project(t.projectId);
      if (t.id) task(t.id, t.projectId);
      const key = t.id || id();
      const existing = t.id ? task(t.id, t.projectId) : undefined;
      const completedAt =
        t.status === "done" ? existing?.completedAt || stamp : null;
      if (t.id)
        db.update(tasks)
          .set({ ...t, updatedAt: stamp, completedAt })
          .where(eq(tasks.id, key))
          .run();
      else
        db.insert(tasks)
          .values({
            ...t,
            id: key,
            createdAt: stamp,
            updatedAt: stamp,
            completedAt,
          })
          .run();
      return NextResponse.json({ id: key });
    }
    if (action === "asset") {
      const a = assetSchema.parse(value);
      project(a.projectId);
      task(a.taskId, a.projectId);
      if (a.id) {
        const old = db.select().from(assets).where(eq(assets.id, a.id)).get();
        if (!old || old.projectId !== a.projectId)
          throw Error("产物不存在或项目不匹配");
      }
      if (a.fileId) {
        const f = db.select().from(files).where(eq(files.id, a.fileId)).get();
        if (!f || f.projectId !== a.projectId) throw Error("文件与项目不匹配");
      }
      if (a.activityId) {
        const act = db
          .select()
          .from(activities)
          .where(eq(activities.id, a.activityId))
          .get();
        if (!act || act.projectId !== a.projectId || act.taskId !== a.taskId)
          throw Error("AI 记录与项目或任务不匹配");
      }
      const key = a.id || id();
      if (a.id) db.update(assets).set(a).where(eq(assets.id, key)).run();
      else
        db.insert(assets)
          .values({ ...a, id: key, createdAt: stamp })
          .run();
      return NextResponse.json({ id: key });
    }
    if (action === "context" || action === "external" || action === "session") {
      const v = z
        .object({
          projectId: z.string(),
          taskId: z.string().nullable().optional(),
          provider: providerSchema,
          options: contextOptions,
          instruction: z.string().max(50000),
        })
        .parse(value);
      const p = project(v.projectId);
      const t = task(v.taskId, p.id);
      const context = buildContext(
        p,
        t,
        db
          .select()
          .from(assets)
          .where(eq(assets.projectId, p.id))
          .orderBy(desc(assets.createdAt))
          .all(),
        db.select().from(files).where(eq(files.projectId, p.id)).all(),
        v.options,
        v.instruction,
      );
      const c = getConnection(v.provider);
      if (action === "external") {
        if (!c.modes.includes("external")) throw Error("此应用不支持网页模式");
        db.insert(activities)
          .values({
            id: id(),
            projectId: p.id,
            taskId: t?.id || null,
            provider: v.provider,
            mode: "external",
            status: "prepared",
            context: context.text,
            createdAt: stamp,
          })
          .run();
        return NextResponse.json({ ...context, url: c.url });
      }
      if (action === "session") {
        if (!c.configured || !c.capabilities.includes("sendText"))
          throw Error("请先在设置中配置此连接。");
        const key = id();
        db.insert(sessions)
          .values({
            id: key,
            projectId: p.id,
            taskId: t?.id || null,
            provider: v.provider,
            context: context.text,
            createdAt: stamp,
          })
          .run();
        return NextResponse.json({ id: key, context: context.text });
      }
      return NextResponse.json(context);
    }
    if (action === "connection") {
      const c = connectionSchema.parse(value);
      saveConnection(c.id, { ...c, lastTest: "", error: "" });
      return NextResponse.json({ ok: true });
    }
    if (action === "test") {
      const provider = providerSchema.parse(value.id);
      try {
        const result =
          provider === "openclaw"
            ? await listMcpTools()
            : await apiChat(provider, [
                { role: "user", content: "Reply with OK." },
              ]);
        saveConnection(provider, { lastTest: stamp, error: "" });
        return NextResponse.json({ ok: true, result });
      } catch (e) {
        saveConnection(provider, {
          error: e instanceof Error ? e.message : "连接失败",
          lastTest: "",
        });
        throw e;
      }
    }
    if (action === "message") {
      const v = z
        .object({
          sessionId: z.string(),
          content: z.string().trim().min(1).max(50000),
        })
        .parse(value);
      const s = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, v.sessionId))
        .get();
      if (!s) throw Error("会话不存在");
      const history = db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, s.id))
        .orderBy(messages.createdAt)
        .all();
      const activityId = id();
      db.insert(activities)
        .values({
          id: activityId,
          projectId: s.projectId,
          taskId: s.taskId,
          provider: s.provider,
          mode: s.provider === "openclaw" ? "mcp" : "api",
          status: "running",
          context: s.context + "\n\n" + v.content,
          createdAt: stamp,
        })
        .run();
      try {
        const result =
          s.provider === "openclaw"
            ? await mcpChat(v.content, s.context, s.id)
            : await apiChat(s.provider, [
                { role: "system", content: s.context },
                ...history.map((m) => ({ role: m.role, content: m.content })),
                { role: "user", content: v.content },
              ]);
        db.transaction((tx) => {
          tx.insert(messages)
            .values([
              {
                id: id(),
                sessionId: s.id,
                role: "user",
                content: v.content,
                createdAt: stamp,
              },
              {
                id: id(),
                sessionId: s.id,
                role: "assistant",
                content: result,
                createdAt: now(),
              },
            ])
            .run();
          tx.update(activities)
            .set({ status: "completed", result })
            .where(eq(activities.id, activityId))
            .run();
        });
        return NextResponse.json({ result, activityId });
      } catch (e) {
        db.update(activities)
          .set({
            status: "failed",
            result: e instanceof Error ? e.message : "调用失败",
          })
          .where(eq(activities.id, activityId))
          .run();
        throw e;
      }
    }
    throw Error("未知操作");
  } catch (e) {
    return errorResponse(e);
  }
}

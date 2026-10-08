import { z } from "zod";
export const providerSchema = z.enum([
  "chatgpt",
  "deepseek",
  "qwen",
  "lovart",
  "jimeng",
  "openclaw",
]);
export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(10000).default(""),
  goal: z.string().max(10000).default(""),
  notes: z.string().max(100000).default(""),
  icon: z
    .enum(["folder", "sparkles", "video", "book", "sun", "code"])
    .default("folder"),
  color: z.enum(["green", "orange", "blue", "purple"]).default("green"),
  tags: z.string().max(200).default(""),
  status: z.enum(["active", "archived"]).default("active"),
});
export const taskSchema = z.object({
  id: z.string().optional(),
  projectId: z.string(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(""),
  notes: z.string().max(100000).default(""),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  preferredApp: providerSchema.default("chatgpt"),
});
export const assetSchema = z.object({
  id: z.string().optional(),
  projectId: z.string(),
  taskId: z.string().nullable().default(null),
  title: z.string().trim().min(1).max(200),
  type: z
    .enum([
      "Text",
      "Document",
      "Image",
      "Video",
      "Audio",
      "Code",
      "Archive",
      "URL",
      "Other",
    ])
    .default("Text"),
  content: z.string().max(500000).default(""),
  url: z
    .union([
      z.literal(""),
      z.url().refine((s) => /^https?:\/\//.test(s), "仅支持 http / https 链接"),
    ])
    .default(""),
  fileId: z.string().nullable().default(null),
  sourceApp: z.string().max(100).default("manual"),
  activityId: z.string().nullable().default(null),
  prompt: z.string().max(100000).default(""),
  notes: z.string().max(10000).default(""),
});
export const contextOptions = z.object({
  description: z.boolean(),
  goal: z.boolean(),
  notes: z.boolean(),
  task: z.boolean(),
  assets: z.boolean(),
  files: z.boolean(),
});
export const connectionSchema = z
  .object({
    id: providerSchema,
    url: z.string().max(2000),
    baseUrl: z.string().max(2000),
    model: z.string().max(100),
    transport: z.enum(["streamable-http", "sse"]),
    toolName: z.string().max(200),
    argumentTemplate: z.string().max(10000),
  })
  .superRefine((v, ctx) => {
    for (const field of ["url", "baseUrl"] as const) {
      if (v[field])
        try {
          const u = new URL(v[field]);
          if (
            !["https:", "http:"].includes(u.protocol) ||
            u.username ||
            u.password ||
            u.search ||
            u.hash
          )
            throw Error();
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "请填写不含凭证和查询参数的 HTTP(S) 地址",
            path: [field],
          });
        }
    }
    try {
      const parsed = JSON.parse(v.argumentTemplate);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw Error();
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "工具参数模板必须是 JSON 对象",
        path: ["argumentTemplate"],
      });
    }
  });

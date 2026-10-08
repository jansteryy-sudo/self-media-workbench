import { z } from "zod";
export const stages = [
  "灵感收集",
  "热点与爆款调研",
  "选题池",
  "内容制作",
  "内容审核",
  "发布计划",
  "数据复盘",
  "发布资产库",
  "商品与赠品",
  "知识与经验",
] as const;
export const itemSchema = z.object({
  id: z.string().min(1).max(100),
  account: z.string().min(1).max(100),
  title: z.string().max(500),
  body: z.string().max(200000),
  kind: z.enum(stages),
  status: z.string().max(100),
  source: z.string().max(200),
  date: z.string().max(40),
  url: z.string().max(2000),
  type: z.string().max(100),
  createdAt: z.string().optional(),
  actualDate: z.string().optional(),
  todoState: z.string().optional(),
  reflection: z.string().optional(),
  views: z.string().optional(),
  metrics: z.string().optional(),
  price: z.string().optional(),
  specification: z.string().optional(),
  delivery: z.string().optional(),
  tags: z.string().optional(),
  reviewNote: z.string().optional(),
  parentId: z.string().optional(),
  likes: z.string().optional(),
  comments: z.string().optional(),
  shares: z.string().optional(),
  conversions: z.string().optional(),
  history: z
    .array(
      z.object({
        at: z.string(),
        action: z.string(),
        kind: z.string(),
        status: z.string(),
        title: z.string(),
        body: z.string(),
      }),
    )
    .max(50)
    .optional(),
  files: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mime: z.string(),
        size: z.number(),
        url: z.string(),
      }),
    )
    .optional(),
});
export type WorkItem = Omit<z.infer<typeof itemSchema>, "kind"> & {
  kind: string;
};
export function recordChange(
  next: WorkItem,
  previous?: WorkItem,
  action = "保存内容",
): WorkItem {
  const changed =
    !previous ||
    JSON.stringify({ ...previous, history: undefined }) !==
      JSON.stringify({ ...next, history: undefined });
  if (!changed) return next;
  return {
    ...next,
    createdAt: next.createdAt || new Date().toISOString(),
    history: [
      ...(previous?.history?.length
        ? previous.history
        : previous
          ? [
              {
                at: previous.createdAt || new Date().toISOString(),
                action: "原始版本",
                kind: previous.kind,
                status: previous.status,
                title: previous.title,
                body: previous.body,
              },
            ]
          : []),
      {
        at: new Date().toISOString(),
        action,
        kind: next.kind,
        status: next.status,
        title: next.title,
        body: next.body,
      },
    ].slice(-50),
  };
}
export const proposalSchema = z.object({
  answer: z.string().max(30000),
  actions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("create"),
          account: z.string(),
          title: z.string().min(1).max(500),
          body: z.string().max(200000),
          kind: z.enum(stages),
          parentId: z.string().optional(),
        }),
        z.object({
          type: z.literal("update"),
          id: z.string(),
          title: z.string().min(1).max(500).optional(),
          body: z.string().max(200000).optional(),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
            .optional(),
          reviewNote: z.string().max(5000).optional(),
        }),
      ]),
    )
    .max(20),
});
export type Proposal = z.infer<typeof proposalSchema>;
export function applyProposal(
  items: WorkItem[],
  proposal: Proposal,
  accountIds: string[],
) {
  let next = [...items];
  for (const a of proposal.actions) {
    if (a.type === "create") {
      if (!accountIds.includes(a.account)) throw Error("AI 指定了不存在的账号");
      if (a.parentId && !next.some((i) => i.id === a.parentId))
        throw Error("来源内容已不存在");
      next.unshift(
        recordChange(
          {
            id: crypto.randomUUID(),
            account: a.account,
            title: a.title,
            body: a.body,
            kind: a.kind,
            status: "AI 草稿 · 待确认",
            source: "工作台 AI",
            date: "",
            url: "",
            type: "标题正文",
            parentId: a.parentId,
          },
          undefined,
          "AI 创建草稿",
        ),
      );
    } else {
      const old = next.find((i) => i.id === a.id);
      if (!old) throw Error("AI 要修改的内容已不存在");
      const { id, type, ...patch } = a;
      void id;
      void type;
      next = next.map((i) =>
        i.id === old.id
          ? recordChange({ ...old, ...patch }, old, "确认 AI 修改")
          : i,
      );
    }
  }
  return next;
}

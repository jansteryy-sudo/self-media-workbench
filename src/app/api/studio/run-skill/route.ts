import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import { readSkill } from "@/lib/studio-skill";
import { generate } from "@/lib/studio-model";
import { itemSchema, stages } from "@/lib/studio-records";
import { studioAccounts } from "@/lib/studio-mcp";
import { z } from "zod";
export const runtime = "nodejs";
const active = new Set<string>();
const scheduledDates = new Map<string, string>();
const schema = z.object({
  scheduled: z.boolean().default(false),
  provider: z.string(),
  job: z.object({
    id: z.string().min(1).max(100),
    name: z.string().max(500),
    description: z.string().max(5000).optional(),
    account: z.string(),
    stage: z.enum(stages),
    skill: z.object({ id: z.string() }),
  }),
  items: z.array(itemSchema).max(10000),
});
export async function POST(req: NextRequest) {
  let claimed = "";
  try {
    guard(req);
    const { provider, job, items, scheduled } = schema.parse(await req.json());
    const day = new Date().toLocaleDateString("sv-SE");
    if (active.has(job.id)) throw Error("该任务已在运行，请勿重复启动");
    if (scheduled && scheduledDates.get(job.id) === day)
      throw Error("该任务今天已由另一页面定时触发");
    active.add(job.id);
    claimed = job.id;
    if (scheduled) scheduledDates.set(job.id, day);
    const account = (await studioAccounts()).find((a) => a.id === job.account);
    if (!account) throw Error("账号不存在");
    const skill = await readSkill(job.skill.id);
    const text = await generate(
      provider,
      '你是自媒体文本 Skill 执行器。只能分析提供的文字、生成草稿，不可执行脚本、联网、发布、删除或修改原内容。Skill中要求使用外部工具时，说明无法完成的步骤，不伪造数据或来源。只输出JSON {"title":"产物标题","body":"完整Markdown产物；标明待验证事实和限制"}。',
      JSON.stringify({
        task: job.name,
        description: job.description || "",
        account: {
          name: account.name,
          platform: account.platform,
          direction: account.direction,
        },
        skill,
        records: items
          .filter(
            (i) =>
              i.account === job.account &&
              (i.kind === job.stage || i.kind === "知识与经验"),
          )
          .slice(0, 30)
          .map((i) => ({
            title: i.title,
            body: i.body.slice(0, 5000),
            kind: i.kind,
          })),
      }),
    );
    let result;
    try {
      result = z
        .object({
          title: z.string().min(1).max(500),
          body: z.string().min(1).max(200000),
        })
        .parse(
          JSON.parse(
            text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""),
          ),
        );
    } catch {
      throw Error("模型结果格式错误，未保存产物，请重试");
    }
    return NextResponse.json({ result });
  } catch (e) {
    return errorResponse(e);
  } finally {
    if (claimed) active.delete(claimed);
  }
}

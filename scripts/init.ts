import { db, storageRoot } from "../src/db";
import { projects, tasks, assets } from "../src/db/schema";
const demo = process.argv.includes("--demo");
if (demo && !db.select().from(projects).all().length) {
  const date = new Date().toISOString();
  const seeds = [
    {
      id: "demo-content",
      name: "内容运营 · AI 实验室",
      description: "从一个热点出发，探索更好的内容组织与 AI 工作流。",
      goal: "完成一份可复用的热点内容策划方案",
      icon: "sparkles",
      color: "green",
      tags: "工作,内容运营",
    },
    {
      id: "demo-creator",
      name: "个人内容创作",
      description: "把有价值的观察，变成值得被看见的内容。",
      goal: "完成第一期短视频的选题与脚本",
      icon: "video",
      color: "orange",
      tags: "创作,视频",
    },
    {
      id: "demo-learning",
      name: "学习与灵感收集",
      description: "收集好问题，记录新发现，保持好奇心。",
      goal: "整理本周学习笔记，沉淀三个可实践的方法",
      icon: "book",
      color: "blue",
      tags: "学习,知识库",
    },
    {
      id: "demo-life",
      name: "生活中的小计划",
      description: "给重要的小事留一点空间。",
      goal: "规划一个轻松、有趣的周末",
      icon: "sun",
      color: "purple",
      tags: "生活",
    },
  ];
  db.transaction((tx) => {
    for (const p of seeds)
      tx.insert(projects)
        .values({
          ...p,
          notes:
            "这是可编辑的示例项目。\n\n用自己的资料、任务和产物替换它，开始你的工作。",
          createdAt: date,
          updatedAt: date,
          lastOpenedAt: date,
        })
        .run();
    const ts = [
      ["demo-content", "梳理热点选题与用户问题", "doing", "high"],
      ["demo-content", "设计一套内容策划 Prompt", "todo", "medium"],
      ["demo-content", "整理参考资料", "done", "low"],
      ["demo-creator", "写出第一期视频脚本", "todo", "high"],
      ["demo-creator", "收集视觉风格参考", "todo", "medium"],
      ["demo-learning", "整理本周的学习笔记", "todo", "medium"],
      ["demo-life", "安排周末出行计划", "todo", "low"],
    ];
    ts.forEach((t, i) =>
      tx
        .insert(tasks)
        .values({
          id: `demo-task-${i}`,
          projectId: t[0],
          title: t[1],
          status: t[2],
          priority: t[3],
          description: "示例任务，可点击修改或开始 AI 协作。",
          createdAt: date,
          updatedAt: date,
          completedAt: t[2] === "done" ? date : null,
        })
        .run(),
    );
    [
      {
        title: "热点内容策划模板",
        projectId: "demo-content",
        type: "Document",
        content:
          "# 热点内容策划模板\n\n## 事件核心\n发生了什么？哪些信息已经得到证实？\n\n## 用户问题\n- 为什么值得关注？\n- 对用户有什么影响？\n- 接下来应该关注什么？\n\n## 内容组织\n事实摘要 → 事件时间线 → 核心问答 → 来源链接\n\n> 示例模板，请补充真实来源后使用。",
      },
      {
        title: "短视频脚本结构",
        projectId: "demo-creator",
        type: "Text",
        content:
          "# 短视频脚本结构\n\n1. 开头：一个具体的问题\n2. 展开：事实、例子与关键关系\n3. 结尾：一个值得带走的判断\n\n示例内容，可继续编辑。",
      },
      {
        title: "灵感收集清单",
        projectId: "demo-learning",
        type: "Document",
        content:
          "# 灵感收集\n\n- 看到了什么？\n- 为什么有意思？\n- 可以应用在哪个项目？\n- 下一步的小实验是什么？",
      },
    ].forEach((a, i) =>
      tx
        .insert(assets)
        .values({
          ...a,
          id: `demo-asset-${i}`,
          sourceApp: "示例模板",
          createdAt: date,
        })
        .run(),
    );
  });
  console.log("已创建 4 个明确标记的示例项目，无模拟 AI 调用。");
}
console.log(`SQLite 已就绪：${storageRoot}`);

import type {
  Project,
  Task,
  Asset,
  StoredFile,
  ContextOptions,
} from "../types";
export function buildContext(
  project: Project,
  task: Task | undefined,
  assets: Asset[],
  files: StoredFile[],
  options: ContextOptions,
  instruction: string,
) {
  const pack = {
    project: {
      name: project.name,
      description: options.description ? project.description : "",
      current_goal: options.goal ? project.goal : "",
    },
    task:
      options.task && task
        ? {
            title: task.title,
            description: task.description,
            notes: task.notes,
          }
        : null,
    notes: options.notes ? project.notes : "",
    files: options.files
      ? files.map((f) => ({ name: f.name, type: f.mime, size: f.size }))
      : [],
    assets: options.assets
      ? assets
          .slice(0, 5)
          .map((a) => ({ title: a.title, content: a.content, url: a.url }))
      : [],
    instruction,
  };
  const text = [
    `# 项目：${pack.project.name}`,
    pack.project.description && `## 项目背景\n${pack.project.description}`,
    pack.project.current_goal && `## 当前目标\n${pack.project.current_goal}`,
    pack.notes && `## 项目笔记\n${pack.notes}`,
    pack.task &&
      `## 当前任务\n${pack.task.title}\n${pack.task.description}\n${pack.task.notes}`,
    pack.files.length &&
      `## 输入资料（仅文件清单，内容需手动附加）\n${pack.files.map((f) => `- ${f.name}`).join("\n")}`,
    pack.assets.length &&
      `## 最近产物\n${pack.assets.map((a) => `### ${a.title}\n${a.content}\n${a.url}`).join("\n")}`,
    `## 本次指令\n${instruction || "请根据项目背景和当前目标，帮助我推进下一步工作。"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { pack, text };
}

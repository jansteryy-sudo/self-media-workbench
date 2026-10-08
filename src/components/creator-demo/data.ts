export type Platform = "小红书" | "抖音" | "公众号";
export type Account = {
  id: string;
  name: string;
  platform: Platform;
  initial: string;
  color: string;
  direction: string;
  goal: string;
  family: string;
  homepage?: string;
  platformId?: string;
  avatar?: string;
};
export type CreatorTask = {
  id: string;
  accountId: string;
  title: string;
  note: string;
  category: string;
  status: "todo" | "review" | "done";
  executor: "人工" | "工作台 AI" | "ChatGPT 导入";
  due: string;
  result: string;
  assetId?: string;
};
export type CreatorContent = {
  id: string;
  accountId: string;
  title: string;
  subtitle: string;
  stage: "选题" | "制作中" | "待发布" | "已发布";
  format: string;
  date: string;
  cover: "sage" | "apricot" | "ink" | "lemon";
  shared: string;
  body: string;
};
export type CreatorAsset = {
  id: string;
  accountId: string;
  title: string;
  use: "发布物料" | "用户交付" | "研究参考";
  format: string;
  version: string;
  status: "待检查" | "可使用";
  source: string;
  note: string;
  body: string;
  sharedWith: string[];
};
export type DemoData = {
  tasks: CreatorTask[];
  contents: CreatorContent[];
  assets: CreatorAsset[];
};
export const accounts: Account[] = [];
export const initialData: DemoData = { tasks: [], contents: [], assets: [] };
export const importSample = "";
export type ImportItem = {
  id: string;
  kind: "任务" | "选题" | "发布物料" | "用户交付" | "研究参考";
  title: string;
  body: string;
  selected: boolean;
};
export function parseImport(text: string): ImportItem[] {
  const lines = text.split(/\r?\n/);
  const output: ImportItem[] = [];
  let current: ImportItem | undefined;
  for (const line of lines) {
    const match = line.match(
      /^\s*#{1,3}\s*(任务|选题|发布物料|用户交付|研究参考)\s*[:：]\s*(.+)$/,
    );
    if (match) {
      current = {
        id: `import-${output.length}`,
        kind: match[1] as ImportItem["kind"],
        title: match[2].trim(),
        body: "",
        selected: true,
      };
      output.push(current);
    } else if (current) current.body += (current.body ? "\n" : "") + line;
  }
  return output.map((x) => ({ ...x, body: x.body.trim() }));
}

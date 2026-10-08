const names: Record<string, string> = {
  id: "id",
  title: "title",
  标题: "title",
  views: "views",
  浏览量: "views",
  播放量: "views",
  阅读量: "views",
  likes: "likes",
  点赞: "likes",
  comments: "comments",
  评论: "comments",
  shares: "shares",
  分享: "shares",
  conversions: "conversions",
  转化: "conversions",
  成交: "conversions",
};
export function parseMetrics(text: string) {
  let rows: Record<string, unknown>[];
  if (text.trim().startsWith("[") || text.trim().startsWith("{")) {
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : [data];
  } else {
    const lines: string[][] = [];
    let row: string[] = [],
      cell = "",
      quoted = false;
    const input = text.replace(/^\uFEFF/, "");
    for (let i = 0; i <= input.length; i++) {
      const c = input[i] || "\n";
      if (c === '"') {
        if (quoted && input[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (!quoted && (c === "," || c === "\n")) {
        row.push(cell.replace(/\r$/, ""));
        cell = "";
        if (c === "\n") {
          if (row.some((v) => v.trim())) lines.push(row);
          row = [];
        }
      } else cell += c;
    }
    if (quoted) throw Error("CSV 引号未闭合");
    const [header, ...body] = lines;
    if (!header) throw Error("没有数据");
    rows = body.map((cells) =>
      Object.fromEntries(header.map((key, i) => [key.trim(), cells[i] || ""])),
    );
  }
  if (rows.length > 10000 || !rows.length)
    throw Error("数据为空或超过 10000 条");
  return rows.map((row) => {
    if (!row || typeof row !== "object") throw Error("数据格式无效");
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const field = names[key];
      if (!field) continue;
      const text = String(value ?? "").trim();
      if (["id", "title"].includes(field)) result[field] = text;
      else if (text) {
        if (!/^\d+(?:\.\d+)?$/.test(text))
          throw Error("数据必须为非负数字：" + key);
        result[field] = text;
      }
    }
    if (!result.id && !result.title) throw Error("每条数据需要 id 或 标题");
    return result;
  });
}

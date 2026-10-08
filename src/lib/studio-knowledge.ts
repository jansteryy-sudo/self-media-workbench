import type { WorkItem } from "./studio-records";
export function retrieveKnowledge(
  items: WorkItem[],
  query: string,
  account: string,
) {
  const segments = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const terms = new Set<string>();
  for (const segment of segments) {
    terms.add(segment);
    if (/[\p{Script=Han}]/u.test(segment)) {
      for (let i = 0; i < segment.length - 1; i++)
        terms.add(segment.slice(i, i + 2));
    }
  }
  return items
    .filter(
      (i) =>
        i.kind === "知识与经验" && (account === "all" || i.account === account),
    )
    .map((i) => {
      const chunks = i.body.match(/[\s\S]{1,1800}/g) || [""];
      const scored = chunks
        .map((body) => ({
          body,
          score: [...terms].reduce(
            (s, t) =>
              s +
              (body.toLowerCase().includes(t) ? 1 : 0) +
              (i.title.toLowerCase().includes(t) ? 2 : 0),
            0,
          ),
        }))
        .sort((a, b) => b.score - a.score);
      return { ...i, body: scored[0].body, score: scored[0].score };
    })
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

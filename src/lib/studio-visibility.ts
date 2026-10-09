/** Discarding is reversible, but removes records from every active workspace. */
export function inWorkspace(item: {kind: string; todoState?: string}, page: string) {
  return item.kind === page && item.todoState !== "废弃";
}
/** Actual publication is authoritative; creation time is never an invented schedule. */
export function calendarDate(item: {status: string; date: string; actualDate?: string}) {
  return (item.status === "已发布" ? item.actualDate || item.date : item.date) || "";
}

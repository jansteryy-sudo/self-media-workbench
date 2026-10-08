import path from "node:path";
/** Desktop supplies a per-user writable directory; development keeps its existing directory. */
export const dataRoot = path.resolve(
  /*turbopackIgnore: true*/ process.env.WORKBENCH_DATA_DIR || path.join(process.cwd(), "workbench-data"),
);

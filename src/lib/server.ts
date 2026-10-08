import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
export function guard(request: NextRequest) {
  const session = process.env.WORKBENCH_DESKTOP_TOKEN;
  if (session && request.headers.get("x-workbench-session") !== session)
    throw Error("请从自媒体工作台 App 访问此功能");
  const host = request.headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))
    throw Error("只允许从本机访问工作台。");
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== host) throw Error("拒绝跨站请求。");
}
export function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof ZodError
          ? error.issues.map((x) => x.message).join("；")
          : error instanceof Error &&
              !/SQLITE|constraint|FOREIGN KEY/i.test(error.message)
            ? error.message
            : "保存失败，请检查项目和关联记录是否存在。",
    },
    { status: 400 },
  );
}

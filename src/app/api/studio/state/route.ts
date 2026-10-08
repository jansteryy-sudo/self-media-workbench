import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/server";
import {
  readState,
  writeState,
  stateSchema,
  serialize,
} from "@/lib/studio-state";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    guard(req);
    return NextResponse.json({ state: await readState() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(req: NextRequest) {
  try {
    guard(req);
    const raw = await req.json();
    const value = stateSchema.parse(raw);
    return await serialize(async () => {
      const current = await readState();
      if ((current?.revision || null) !== raw.revision)
        return NextResponse.json(
          { error: "另一页面已修改数据，请重新载入，避免覆盖", state: current },
          { status: 409 },
        );
      return NextResponse.json({ state: await writeState(value) });
    });
  } catch (e) {
    return errorResponse(e);
  }
}

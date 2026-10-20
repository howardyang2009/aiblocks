import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/lib/api-errors";

// Parse the JSON request body, returning a typed value or a ready-made 400
// response. Callers narrow with `if (body instanceof NextResponse) return body`.
export async function parseBody<T>(req: NextRequest): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return NextResponse.json({ error: "invalidBody" satisfies ApiError }, { status: 400 });
  }
}

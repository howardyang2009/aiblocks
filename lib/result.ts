import { NextResponse } from "next/server";

// The one shape nearly every mutation in lib/ returns: either it succeeded
// with some payload, or it failed with an HTTP status and a message a route
// can forward as-is. `T` is the extra payload on success — omit it (or pass
// `{}`) for results that only need to say "it worked."
// `{}` here means "no extra fields" (the default, for results that only
// need to say "it worked"), not "any value."
export type Result<T = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };

// Every route forwards a failed Result the same way — this is that
// conversion, factored out from the ~15 call sites that repeated it. Only
// the error branch: success responses vary per route (extra fields, field
// omission) too much to generalize, so callers still shape those by hand.
export function toResponse(result: { ok: false; status: number; error: string }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

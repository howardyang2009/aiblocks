// The one shape nearly every mutation in lib/ returns: either it succeeded
// with some payload, or it failed with an HTTP status and a message a route
// can forward as-is. `T` is the extra payload on success — omit it (or pass
// `{}`) for results that only need to say "it worked."
// `{}` here means "no extra fields" (the default, for results that only
// need to say "it worked"), not "any value."
export type Result<T = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };

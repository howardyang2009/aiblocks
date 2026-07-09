// The one shape nearly every client-side mutation goes through: fetch, parse
// JSON, map an HTTP failure or a network exception to a message the caller
// already knows how to show. `fetchImpl` is ACCEPTED, not created internally,
// so tests hand this a fake directly instead of mocking global fetch.
//
// The response body is parsed defensively (`.json().catch(() => ({}))`) on
// both the success and failure path — a successful DELETE typically returns
// no body at all, and this lets that fall through as "no fields" instead of
// needing a separate "does this endpoint return a body" flag.

export type ClientActionMessages = {
  fallback: string;
  network: string;
};

export type ClientActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function runClientAction<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit | undefined,
  messages: ClientActionMessages
): Promise<ClientActionResult<T>> {
  try {
    const res = await fetchImpl(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = (body as { error?: string }).error ?? messages.fallback;
      return { ok: false, error };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: messages.network };
  }
}

import type { FetchLike } from './types';

// The one shape shared by every simple external-search adapter: fetch,
// throw a "<source> search failed: <status>" on a non-ok response, parse
// JSON. Each adapter's own envelope shape and field mapping still lives in
// the adapter — that part genuinely differs source to source and isn't
// duplicated, only the fetch/throw/parse around it is.
export async function fetchJson<T>(
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string>,
  sourceLabel: string
): Promise<T> {
  const res = await fetchFn(url, { headers });
  if (!res.ok) throw new Error(`${sourceLabel} search failed: ${res.status}`);
  return (await res.json()) as T;
}

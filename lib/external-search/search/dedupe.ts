import type { SearchResult } from '../adapters/types';

function canonicalKey(result: SearchResult): string {
  const raw = result.githubUrl ?? result.url;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let path = u.pathname.replace(/\/+$/, '');
    if (host === 'github.com') {
      const parts = path.split('/').filter(Boolean);
      path = '/' + parts.slice(0, 2).join('/');
    }
    return host + path.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function unionSources(a: SearchResult['sources'], bSource: SearchResult['source'], bSources: SearchResult['sources']): NonNullable<SearchResult['sources']> {
  const base = a ?? [];
  const incoming = bSources ?? [bSource];
  const seen = new Set(base);
  const out = [...base];
  for (const s of incoming) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function merge(a: SearchResult, b: SearchResult): SearchResult {
  return {
    ...a,
    githubUrl: a.githubUrl ?? b.githubUrl,
    description: a.description ?? b.description,
    stars: a.stars ?? b.stars,
    sources: unionSources(a.sources, b.source, b.sources),
  };
}

export function dedupe(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const result of results) {
    const key = canonicalKey(result);
    const existing = map.get(key);
    if (existing) {
      map.set(key, merge(existing, result));
    } else {
      // Initialize sources for first-seen result
      const sources = result.sources ?? [result.source];
      const seen = new Set<SearchResult['source']>();
      const deduped: NonNullable<SearchResult['sources']> = [];
      for (const s of sources) {
        if (!seen.has(s)) { seen.add(s); deduped.push(s); }
      }
      map.set(key, { ...result, sources: deduped });
    }
  }
  return [...map.values()];
}

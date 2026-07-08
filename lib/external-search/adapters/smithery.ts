import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface SmitheryServer {
  qualifiedName: string;
  displayName?: string;
  description?: string;
  homepage?: string;
  useCount?: number;
}

export function createSmitheryAdapter(
  deps: { fetchFn?: FetchLike; apiKey?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'smithery',
    supports: (type: ComponentType) => type === 'mcp',
    isEnabled: () => Boolean(deps.apiKey),
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const res = await fetchFn(
        `https://registry.smithery.ai/servers?q=${q}&pageSize=10`,
        { headers: { Accept: 'application/json', Authorization: `Bearer ${deps.apiKey}` } },
      );
      if (!res.ok) throw new Error(`Smithery search failed: ${res.status}`);
      const body = (await res.json()) as { servers?: SmitheryServer[] };
      return (body.servers ?? []).map((server) => ({
        title: server.displayName ?? server.qualifiedName,
        url: server.homepage ?? `https://smithery.ai/server/${server.qualifiedName}`,
        description: server.description,
        source: 'smithery' as const,
        stars: server.useCount,
      }));
    },
  };
}

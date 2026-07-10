import { fetchJson } from './fetch-json';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface HuggingfaceModel {
  id?: string;
  likes?: number;
  pipeline_tag?: string;
}

export function createHuggingfaceAdapter(
  deps: { fetchFn?: FetchLike; token?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'huggingface',
    supports: (type: ComponentType) => type === 'llm',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (deps.token) headers.Authorization = `Bearer ${deps.token}`;
      const body = await fetchJson<unknown>(
        fetchFn,
        `https://huggingface.co/api/models?search=${q}&limit=10&sort=likes&direction=-1`,
        headers,
        'Hugging Face'
      );
      if (!Array.isArray(body)) return [];
      return (body as HuggingfaceModel[])
        .filter((model): model is HuggingfaceModel & { id: string } => Boolean(model?.id))
        .map((model) => ({
          title: model.id,
          url: `https://huggingface.co/${model.id}`,
          description: model.pipeline_tag,
          source: 'huggingface' as const,
          stars: model.likes,
        }));
    },
  };
}

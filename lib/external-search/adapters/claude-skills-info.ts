import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface ClaudeSkillsInfoItem {
  slug: string;
  name: string;
  description?: string;
  stars?: number;
  source?: { repo?: string; url?: string };
}

const SEARCH_TYPE: Partial<Record<ComponentType, string>> = {
  skill: 'skill',
  subagent: 'subagent',
  'claude-plugin': 'plugin',
  'slash-command': 'command',
  hook: 'hook',
  'claude-md': 'claude-md-example',
};

export function createClaudeSkillsInfoAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'claude-skills-info',
    supports: (type: ComponentType) => Boolean(SEARCH_TYPE[type]),
    isEnabled: () => true,
    async search(query: string, type: ComponentType): Promise<SearchResult[]> {
      const apiType = SEARCH_TYPE[type];
      if (!apiType) return [];

      const q = encodeURIComponent(query);
      const res = await fetchFn(
        `https://claudeskills.info/api/v1/search?q=${q}&type=${apiType}&limit=10&sort=stars`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`claudeskills.info search failed: ${res.status}`);
      const body = (await res.json()) as { results?: ClaudeSkillsInfoItem[] };
      return (body.results ?? [])
        .filter(
          (item): item is ClaudeSkillsInfoItem & { name: string; source: { url: string } } =>
            Boolean(item?.name && item?.source?.url),
        )
        .map((item) => ({
          title: item.name,
          url: item.source.url,
          githubUrl: githubUrlOf(item.source.url),
          description: item.description,
          source: 'claude-skills-info' as const,
          stars: item.stars,
        }));
    },
  };
}

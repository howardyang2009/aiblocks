import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface SkillStoreIoSkill {
  slug: string;
  displayName: string;
  description?: string;
  repo: string;
  stats?: { downloadCount?: number } | null;
}

export function createSkillStoreIoAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'skill-store-io',
    supports: (type: ComponentType) => type === 'skill',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const res = await fetchFn(
        `https://skillstore.io/api/skills?q=${q}&limit=10`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`skillstore.io search failed: ${res.status}`);
      const body = (await res.json()) as { data?: SkillStoreIoSkill[] };
      return (body.data ?? [])
        .filter((skill): skill is SkillStoreIoSkill => Boolean(skill?.displayName && skill?.repo))
        .map((skill) => ({
          title: skill.displayName,
          url: skill.repo,
          githubUrl: githubUrlOf(skill.repo),
          description: skill.description,
          source: 'skill-store-io' as const,
          stars: skill.stats?.downloadCount ?? undefined,
        }));
    },
  };
}

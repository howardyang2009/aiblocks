import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface SkillsmpSkill {
  name: string;
  author?: string;
  description?: string;
  githubUrl?: string;
  skillUrl: string;
  stars?: number;
}

export function createSkillsmpAdapter(
  deps: { fetchFn?: FetchLike; apiKey?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'skillsmp',
    supports: (type: ComponentType) => type === 'skill',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (deps.apiKey) headers.Authorization = `Bearer ${deps.apiKey}`;
      const res = await fetchFn(
        `https://skillsmp.com/api/v1/skills/search?q=${q}&limit=10`,
        { headers },
      );
      if (!res.ok) throw new Error(`SkillsMP search failed: ${res.status}`);
      const body = (await res.json()) as { data?: { skills?: SkillsmpSkill[] } };
      return (body.data?.skills ?? []).map((skill) => ({
        title: skill.name,
        url: skill.skillUrl,
        githubUrl: skill.githubUrl,
        description: skill.description,
        source: 'skillsmp' as const,
        stars: skill.stars,
      }));
    },
  };
}

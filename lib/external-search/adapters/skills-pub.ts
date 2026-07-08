import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface SkillsPubSkill {
  skillId: string;
  skillName: string;
  pluginName?: string;
  pluginDescription?: string;
  repositoryUrl: string;
}

export function createSkillsPubAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'skills-pub',
    supports: (type: ComponentType) => type === 'skill',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const res = await fetchFn(
        `https://skills.pub/api/skills?q=${q}&page=1&pageSize=10`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`skills.pub search failed: ${res.status}`);
      const body = (await res.json()) as { data?: { skills?: SkillsPubSkill[] } };
      return (body.data?.skills ?? [])
        .filter((skill): skill is SkillsPubSkill => Boolean(skill?.skillName && skill?.repositoryUrl))
        .map((skill) => ({
          title: skill.skillName,
          url: skill.repositoryUrl,
          githubUrl: githubUrlOf(skill.repositoryUrl),
          description: skill.pluginDescription,
          source: 'skills-pub' as const,
        }));
    },
  };
}

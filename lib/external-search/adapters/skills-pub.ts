import { fetchJson } from './fetch-json';
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
      const body = await fetchJson<{ data?: { skills?: SkillsPubSkill[] } }>(
        fetchFn,
        `https://skills.pub/api/skills?q=${q}&page=1&pageSize=10`,
        { Accept: 'application/json' },
        'skills.pub'
      );
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

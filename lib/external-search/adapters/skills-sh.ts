import { fetchJson } from './fetch-json';
import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface V1Skill {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs?: number;
  sourceType?: string;
  installUrl?: string;
  url?: string;
}

export function createSkillsShAdapter(
  deps: { fetchFn?: FetchLike; token?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'skills-sh',
    supports: (type: ComponentType) => type === 'skill',
    // Requires a Vercel project OIDC token — see https://skills.sh/docs/api#authentication.
    isEnabled: () => Boolean(deps.token),
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const body = await fetchJson<{ data?: V1Skill[] }>(
        fetchFn,
        `https://skills.sh/api/v1/skills/search?q=${q}&limit=10`,
        { Accept: 'application/json', Authorization: `Bearer ${deps.token ?? ''}` },
        'skills.sh'
      );
      return (body.data ?? [])
        .filter((skill): skill is V1Skill & { name: string } => Boolean(skill?.name))
        .map((skill) => {
          const url = skill.installUrl ?? skill.url ?? `https://skills.sh/${skill.id}`;
          return {
            title: skill.name,
            url,
            githubUrl: githubUrlOf(url),
            source: 'skills-sh' as const,
            stars: skill.installs,
          };
        });
    },
  };
}

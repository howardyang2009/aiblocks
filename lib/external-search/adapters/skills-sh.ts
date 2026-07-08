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
      const res = await fetchFn(
        `https://skills.sh/api/v1/skills/search?q=${q}&limit=10`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${deps.token ?? ''}`,
          },
        },
      );
      if (!res.ok) throw new Error(`skills.sh search failed: ${res.status}`);
      const body = (await res.json()) as { data?: V1Skill[] };
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

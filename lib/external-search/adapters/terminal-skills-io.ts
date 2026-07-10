import { fetchJson } from './fetch-json';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface TerminalSkillsIoSkill {
  slug: string;
  name: string;
  description?: string;
  stars?: number;
}

export function createTerminalSkillsIoAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'terminal-skills-io',
    supports: (type: ComponentType) => type === 'skill',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);
      const body = await fetchJson<{ data?: TerminalSkillsIoSkill[] }>(
        fetchFn,
        `https://terminalskills.io/api/v1/skills?q=${q}&limit=10`,
        { Accept: 'application/json' },
        'terminalskills.io'
      );
      // No GitHub repo field is exposed by this API — skills are installed via
      // the terminal-skills CLI, so link to the catalog's own detail page instead.
      return (body.data ?? [])
        .filter((skill): skill is TerminalSkillsIoSkill => Boolean(skill?.slug && skill?.name))
        .map((skill) => ({
          title: skill.name,
          url: `https://terminalskills.io/skills/${skill.slug}`,
          description: skill.description,
          source: 'terminal-skills-io' as const,
          stars: skill.stars,
        }));
    },
  };
}

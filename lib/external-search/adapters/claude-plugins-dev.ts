import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface ClaudePluginsDevPlugin {
  name: string;
  gitUrl?: string;
  description?: string;
  stars?: number;
}

interface ClaudePluginsDevSkill {
  name: string;
  sourceUrl?: string;
  description?: string;
  stars?: number;
}

export function createClaudePluginsDevAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'claude-plugins-dev',
    supports: (type: ComponentType) => type === 'claude-plugin' || type === 'skill',
    isEnabled: () => true,
    async search(query: string, type: ComponentType): Promise<SearchResult[]> {
      const q = encodeURIComponent(query);

      if (type === 'skill') {
        const res = await fetchFn(
          `https://claude-plugins.dev/api/skills?q=${q}&limit=10`,
          { headers: { Accept: 'application/json' } },
        );
        if (!res.ok) throw new Error(`claude-plugins.dev search failed: ${res.status}`);
        const body = (await res.json()) as { skills?: ClaudePluginsDevSkill[] };
        return (body.skills ?? [])
          .filter((skill): skill is ClaudePluginsDevSkill & { name: string; sourceUrl: string } =>
            Boolean(skill?.name && skill?.sourceUrl),
          )
          .map((skill) => ({
            title: skill.name,
            url: skill.sourceUrl,
            githubUrl: githubUrlOf(skill.sourceUrl),
            description: skill.description,
            source: 'claude-plugins-dev' as const,
            stars: skill.stars,
          }));
      }

      const res = await fetchFn(
        `https://claude-plugins.dev/api/plugins?q=${q}&limit=10`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`claude-plugins.dev search failed: ${res.status}`);
      const body = (await res.json()) as { plugins?: ClaudePluginsDevPlugin[] };
      return (body.plugins ?? [])
        .filter((plugin): plugin is ClaudePluginsDevPlugin & { name: string; gitUrl: string } =>
          Boolean(plugin?.name && plugin?.gitUrl),
        )
        .map((plugin) => ({
          title: plugin.name,
          url: plugin.gitUrl,
          githubUrl: githubUrlOf(plugin.gitUrl),
          description: plugin.description,
          source: 'claude-plugins-dev' as const,
          stars: plugin.stars,
        }));
    },
  };
}

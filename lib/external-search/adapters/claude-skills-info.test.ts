import { describe, expect, it, vi } from 'vitest';
import { createClaudeSkillsInfoAdapter } from './claude-skills-info';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createClaudeSkillsInfoAdapter', () => {
  it('is always enabled', () => {
    expect(createClaudeSkillsInfoAdapter().isEnabled()).toBe(true);
  });

  it('supports skill, subagent, claude-plugin, slash-command, hook and claude-md only', () => {
    const adapter = createClaudeSkillsInfoAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(true);
    expect(adapter.supports('claude-plugin')).toBe(true);
    expect(adapter.supports('slash-command')).toBe(true);
    expect(adapter.supports('hook')).toBe(true);
    expect(adapter.supports('claude-md')).toBe(true);
    expect(adapter.supports('prompt')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
    expect(adapter.supports('model')).toBe(false);
  });

  it('maps each ComponentType to the API\'s type param', async () => {
    const fetchFn = mockFetch({ results: [] });
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn });
    const calls = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls;

    await adapter.search('x', 'skill');
    await adapter.search('x', 'subagent');
    await adapter.search('x', 'claude-plugin');
    await adapter.search('x', 'slash-command');
    await adapter.search('x', 'hook');
    await adapter.search('x', 'claude-md');

    expect(calls[0][0]).toContain('type=skill');
    expect(calls[1][0]).toContain('type=subagent');
    expect(calls[2][0]).toContain('type=plugin');
    expect(calls[3][0]).toContain('type=command');
    expect(calls[4][0]).toContain('type=hook');
    expect(calls[5][0]).toContain('type=claude-md-example');
  });

  it('queries the search endpoint with q, type, limit and sort', async () => {
    const fetchFn = mockFetch({ results: [] });
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn });
    await adapter.search('docx', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      'https://claudeskills.info/api/v1/search?q=docx&type=skill&limit=10&sort=stars',
    );
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('maps results to SearchResult using the source repo url', async () => {
    const fetchFn = mockFetch({
      results: [
        {
          slug: 'docx',
          name: 'docx',
          description: 'Work with Word documents',
          stars: 30168,
          source: {
            repo: 'K-Dense-AI/claude-scientific-skills',
            url: 'https://github.com/K-Dense-AI/claude-scientific-skills/blob/main/skills/docx/SKILL.md',
          },
        },
      ],
    });
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn });
    const results = await adapter.search('docx', 'skill');
    expect(results).toEqual([
      {
        title: 'docx',
        url: 'https://github.com/K-Dense-AI/claude-scientific-skills/blob/main/skills/docx/SKILL.md',
        githubUrl: 'https://github.com/K-Dense-AI/claude-scientific-skills/blob/main/skills/docx/SKILL.md',
        description: 'Work with Word documents',
        source: 'claude-skills-info',
        stars: 30168,
      },
    ]);
  });

  it('filters out entries missing a name or source url', async () => {
    const fetchFn = mockFetch({
      results: [
        { slug: 'no-name', source: { url: 'https://github.com/x/y' } },
        { slug: 'no-source', name: 'no-source' },
        { slug: 'has-both', name: 'has-both', source: { url: 'https://github.com/x/y' } },
      ],
    });
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('has-both');
  });

  it('returns an empty array for unsupported types without calling fetch', async () => {
    const fetchFn = mockFetch({ results: [] });
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn });
    expect(await adapter.search('x', 'prompt')).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createClaudeSkillsInfoAdapter({ fetchFn: mockFetch({}, false, 503) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow(
      'claudeskills.info search failed: 503',
    );
  });
});

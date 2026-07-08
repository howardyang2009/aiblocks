import { describe, expect, it, vi } from 'vitest';
import { createSkillsShAdapter } from './skills-sh';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createSkillsShAdapter', () => {
  it('is disabled without a token', () => {
    expect(createSkillsShAdapter().isEnabled()).toBe(false);
    expect(createSkillsShAdapter({ token: 'oidc-token' }).isEnabled()).toBe(true);
  });

  it('only supports the skill component type', () => {
    const adapter = createSkillsShAdapter({ token: 't' });
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('claude-plugin')).toBe(false);
    expect(adapter.supports('slash-command')).toBe(false);
    expect(adapter.supports('hook')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
    expect(adapter.supports('model')).toBe(false);
  });

  it('sends the query and bearer token to the search endpoint', async () => {
    const fetchFn = mockFetch({ data: [] });
    const adapter = createSkillsShAdapter({ fetchFn, token: 'oidc-token' });
    await adapter.search('docx', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://skills.sh/api/v1/skills/search?q=docx&limit=10');
    expect((init as RequestInit).headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer oidc-token',
    });
  });

  it('maps V1Skill results to SearchResult using installUrl', async () => {
    const fetchFn = mockFetch({
      data: [
        {
          id: 'vercel-labs/skills/find-skills',
          slug: 'find-skills',
          name: 'find-skills',
          source: 'vercel-labs/skills',
          installs: 24531,
          sourceType: 'github',
          installUrl: 'https://github.com/vercel-labs/skills',
          url: 'https://skills.sh/vercel-labs/skills/find-skills',
        },
      ],
      query: 'find skills',
      searchType: 'semantic',
      count: 1,
      durationMs: 12,
    });
    const adapter = createSkillsShAdapter({ fetchFn, token: 't' });
    const results = await adapter.search('find skills', 'skill');
    expect(results).toEqual([
      {
        title: 'find-skills',
        url: 'https://github.com/vercel-labs/skills',
        githubUrl: 'https://github.com/vercel-labs/skills',
        source: 'skills-sh',
        stars: 24531,
      },
    ]);
  });

  it('falls back to the skills.sh detail url when installUrl is missing', async () => {
    const fetchFn = mockFetch({
      data: [
        { id: 'mintlify.com/mintlify', slug: 'mintlify', name: 'mintlify', source: 'mintlify.com', installs: 5 },
      ],
    });
    const adapter = createSkillsShAdapter({ fetchFn, token: 't' });
    const results = await adapter.search('mintlify', 'skill');
    expect(results[0].url).toBe('https://skills.sh/mintlify.com/mintlify');
    expect(results[0].githubUrl).toBeUndefined();
  });

  it('filters out entries missing a name', async () => {
    const fetchFn = mockFetch({
      data: [{ id: 'x/y', slug: 'y' }, { id: 'a/b', slug: 'b', name: 'b' }],
    });
    const adapter = createSkillsShAdapter({ fetchFn, token: 't' });
    const results = await adapter.search('x', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('b');
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createSkillsShAdapter({ fetchFn: mockFetch({}, false, 401), token: 'expired' });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('skills.sh search failed: 401');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createSkillStoreIoAdapter } from './skill-store-io';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createSkillStoreIoAdapter', () => {
  it('is always enabled', () => {
    expect(createSkillStoreIoAdapter().isEnabled()).toBe(true);
  });

  it('only supports the skill component type', () => {
    const adapter = createSkillStoreIoAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('claude-plugin')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('queries the search endpoint with q and limit', async () => {
    const fetchFn = mockFetch({ data: [], total: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    const adapter = createSkillStoreIoAdapter({ fetchFn });
    await adapter.search('pdf', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://skillstore.io/api/skills?q=pdf&limit=10');
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('maps skills to SearchResult using repo, description and download count', async () => {
    const fetchFn = mockFetch({
      data: [
        {
          slug: 'zhanlincui-canvas-design',
          emoji: '📦',
          displayName: 'canvas-design',
          description: 'Create polished PNG and PDF visual artwork from a design philosophy.',
          category: 'design',
          repo: 'https://github.com/ZhanlinCui/Ultimate-Agent-Skills-Collection/tree/main/canvas-design',
          author: 'ZhanlinCui',
          stats: { viewCount: 231, downloadCount: 109, favoriteCount: 2, popularityScore: 0 },
        },
      ],
      total: 71,
      pagination: { page: 1, limit: 2, total: 71, totalPages: 36 },
    });
    const adapter = createSkillStoreIoAdapter({ fetchFn });
    const results = await adapter.search('pdf', 'skill');
    expect(results).toEqual([
      {
        title: 'canvas-design',
        url: 'https://github.com/ZhanlinCui/Ultimate-Agent-Skills-Collection/tree/main/canvas-design',
        githubUrl: 'https://github.com/ZhanlinCui/Ultimate-Agent-Skills-Collection/tree/main/canvas-design',
        description: 'Create polished PNG and PDF visual artwork from a design philosophy.',
        source: 'skill-store-io',
        stars: 109,
      },
    ]);
  });

  it('handles a null stats object', async () => {
    const fetchFn = mockFetch({
      data: [
        {
          slug: 'x',
          displayName: 'x',
          description: 'd',
          repo: 'https://github.com/a/b',
          stats: null,
        },
      ],
    });
    const adapter = createSkillStoreIoAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results[0].stars).toBeUndefined();
  });

  it('filters out entries missing a displayName or repo', async () => {
    const fetchFn = mockFetch({
      data: [
        { slug: 'a', repo: 'https://github.com/x/y' },
        { slug: 'b', displayName: 'no-repo' },
        { slug: 'c', displayName: 'has-both', repo: 'https://github.com/x/y' },
      ],
    });
    const adapter = createSkillStoreIoAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('has-both');
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createSkillStoreIoAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('skillstore.io search failed: 500');
  });
});

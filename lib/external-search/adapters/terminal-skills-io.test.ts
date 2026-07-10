import { describe, expect, it, vi } from 'vitest';
import { createTerminalSkillsIoAdapter } from './terminal-skills-io';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createTerminalSkillsIoAdapter', () => {
  it('is always enabled', () => {
    expect(createTerminalSkillsIoAdapter().isEnabled()).toBe(true);
  });

  it('only supports the skill component type', () => {
    const adapter = createTerminalSkillsIoAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('claude-plugin')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('queries the search endpoint with q and limit', async () => {
    const fetchFn = mockFetch({ success: true, data: [], pagination: { total: 0, page: 1, limit: 10, hasMore: false } });
    const adapter = createTerminalSkillsIoAdapter({ fetchFn });
    await adapter.search('pdf', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://terminalskills.io/api/v1/skills?q=pdf&limit=10');
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('maps skills to SearchResult using the catalog detail page (no repo field exists)', async () => {
    const fetchFn = mockFetch({
      success: true,
      data: [
        {
          slug: 'doc-parser',
          name: 'doc-parser',
          description: 'Parse complex documents with IBM docling.',
          category: 'documents',
          author: 'terminal-skills',
          downloads: 0,
          stars: 12,
          tags: ['parsing', 'docling'],
        },
      ],
      pagination: { total: 19, page: 1, limit: 2, hasMore: true },
    });
    const adapter = createTerminalSkillsIoAdapter({ fetchFn });
    const results = await adapter.search('pdf', 'skill');
    expect(results).toEqual([
      {
        title: 'doc-parser',
        url: 'https://terminalskills.io/skills/doc-parser',
        description: 'Parse complex documents with IBM docling.',
        source: 'terminal-skills-io',
        stars: 12,
      },
    ]);
  });

  it('filters out entries missing a slug or name', async () => {
    const fetchFn = mockFetch({
      data: [{ slug: 'a' }, { name: 'no-slug' }, { slug: 'b', name: 'has-both' }],
    });
    const adapter = createTerminalSkillsIoAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('has-both');
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createTerminalSkillsIoAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('terminalskills.io search failed: 500');
  });
});

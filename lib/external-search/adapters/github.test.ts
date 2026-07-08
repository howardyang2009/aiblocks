import { describe, expect, it, vi } from 'vitest';
import { createGithubAdapter } from './github';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('createGithubAdapter', () => {
  it('maps repository items to SearchResult', async () => {
    const fetchFn = mockFetch({
      items: [
        { full_name: 'foo/bar', html_url: 'https://github.com/foo/bar', description: 'a tool', stargazers_count: 42 },
      ],
    });
    const adapter = createGithubAdapter({ fetchFn });
    const results = await adapter.search('bar', 'prompt');
    expect(results).toEqual([
      { title: 'foo/bar', url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', description: 'a tool', source: 'github', stars: 42 },
    ]);
  });

  it('sends the Authorization header when a token is set', async () => {
    const fetchFn = mockFetch({ items: [] });
    const adapter = createGithubAdapter({ fetchFn, token: 'tok' });
    await adapter.search('x', 'skill');
    const [, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('throws on a non-ok response', async () => {
    const adapter = createGithubAdapter({ fetchFn: mockFetch({}, false, 403) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('403');
  });

  it('is enabled and supports all component types', () => {
    const adapter = createGithubAdapter();
    expect(adapter.isEnabled()).toBe(true);
    expect(adapter.supports('mcp')).toBe(true);
  });
});

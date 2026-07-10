import { describe, expect, it, vi } from 'vitest';
import { createBraveAdapter } from './brave';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createBraveAdapter', () => {
  it('is disabled unless an apiKey is set', () => {
    expect(createBraveAdapter({}).isEnabled()).toBe(false);
    expect(createBraveAdapter({ apiKey: 'k' }).isEnabled()).toBe(true);
  });

  it('supports every component type', () => {
    const adapter = createBraveAdapter({ apiKey: 'k' });
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(true);
    expect(adapter.supports('prompt')).toBe(true);
    expect(adapter.supports('mcp')).toBe(true);
  });

  it('sends the query and subscription token', async () => {
    const fetchFn = mockFetch({ web: { results: [] } });
    const adapter = createBraveAdapter({ apiKey: 'secret', fetchFn });
    await adapter.search('hello world', 'prompt');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('https://api.search.brave.com/res/v1/web/search');
    expect(url).toContain('q=ai%20prompt%20for%20hello%20world');
    expect((init as RequestInit).headers).toMatchObject({
      'X-Subscription-Token': 'secret',
      Accept: 'application/json',
    });
  });

  it('maps results and marks github links', async () => {
    const fetchFn = mockFetch({
      web: {
        results: [
          { title: 'Foo', url: 'https://github.com/foo/bar', description: 'a repo' },
          { title: 'Blog', url: 'https://example.com/post', description: 'text' },
        ],
      },
    });
    const adapter = createBraveAdapter({ apiKey: 'k', fetchFn });
    const results = await adapter.search('foo', 'prompt');
    expect(results[0]).toEqual({
      title: 'Foo',
      url: 'https://github.com/foo/bar',
      githubUrl: 'https://github.com/foo/bar',
      description: 'a repo',
      source: 'brave',
    });
    expect(results[1].githubUrl).toBeUndefined();
  });

  it('filters out results missing a title or url', async () => {
    const fetchFn = mockFetch({
      web: {
        results: [
          { description: 'no title or url' },
          { title: 'No url' },
          { title: 'Has both', url: 'https://example.com' },
        ],
      },
    });
    const adapter = createBraveAdapter({ apiKey: 'k', fetchFn });
    const results = await adapter.search('foo', 'prompt');
    expect(results).toEqual([
      { title: 'Has both', url: 'https://example.com', githubUrl: undefined, description: undefined, source: 'brave' },
    ]);
  });

  it('returns an empty array when the web block is absent', async () => {
    const fetchFn = mockFetch({});
    const adapter = createBraveAdapter({ apiKey: 'k', fetchFn });
    expect(await adapter.search('foo', 'prompt')).toEqual([]);
  });

  it('throws with the status when the request fails', async () => {
    const fetchFn = mockFetch({}, false, 429);
    const adapter = createBraveAdapter({ apiKey: 'k', fetchFn });
    await expect(adapter.search('foo', 'prompt')).rejects.toThrow('Brave search failed: 429');
  });
});

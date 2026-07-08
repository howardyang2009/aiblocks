import { describe, expect, it, vi } from 'vitest';
import { createGoogleAdapter } from './google';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

const deps = { apiKey: 'k', projectId: 'p', engineId: 'e' };

describe('createGoogleAdapter', () => {
  it('is disabled unless apiKey, projectId, and engineId are all set', () => {
    expect(createGoogleAdapter({ apiKey: 'k' }).isEnabled()).toBe(false);
    expect(createGoogleAdapter({ apiKey: 'k', projectId: 'p' }).isEnabled()).toBe(false);
    expect(createGoogleAdapter({ projectId: 'p', engineId: 'e' }).isEnabled()).toBe(false);
    expect(createGoogleAdapter(deps).isEnabled()).toBe(true);
  });

  it('maps results and marks github links', async () => {
    const fetchFn = mockFetch({
      results: [
        {
          document: {
            derivedStructData: {
              title: 'Foo',
              link: 'https://github.com/foo/bar',
              snippets: [{ snippet: 'a repo' }],
            },
          },
        },
        {
          document: {
            derivedStructData: {
              title: 'Blog',
              link: 'https://example.com/post',
              snippets: [{ snippet: 'text' }],
            },
          },
        },
      ],
    });
    const adapter = createGoogleAdapter({ ...deps, fetchFn });
    const results = await adapter.search('foo', 'prompt');
    expect(results[0]).toEqual({
      title: 'Foo', url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', description: 'a repo', source: 'google',
    });
    expect(results[1].githubUrl).toBeUndefined();
  });

  it('filters out results missing a title or link', async () => {
    const fetchFn = mockFetch({
      results: [
        { document: { derivedStructData: { snippets: [{ snippet: 'no title or link' }] } } },
        { document: { derivedStructData: { title: 'No link' } } },
        { document: { derivedStructData: { title: 'Has both', link: 'https://example.com' } } },
      ],
    });
    const adapter = createGoogleAdapter({ ...deps, fetchFn });
    const results = await adapter.search('foo', 'prompt');
    expect(results).toEqual([
      { title: 'Has both', url: 'https://example.com', githubUrl: undefined, description: undefined, source: 'google' },
    ]);
  });

  it('includes the API error message when the request fails', async () => {
    const fetchFn = mockFetch(
      { error: { code: 403, message: 'API_KEY_SERVICE_BLOCKED' } },
      false,
      403,
    );
    const adapter = createGoogleAdapter({ ...deps, fetchFn });
    await expect(adapter.search('foo', 'prompt')).rejects.toThrow(
      'Google search failed: 403 — API_KEY_SERVICE_BLOCKED',
    );
  });

  it('falls back to status only when the error body is not JSON', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    })) as unknown as typeof fetch;
    const adapter = createGoogleAdapter({ ...deps, fetchFn });
    await expect(adapter.search('foo', 'prompt')).rejects.toThrow('Google search failed: 500');
  });
});

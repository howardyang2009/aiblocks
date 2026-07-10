import { describe, expect, it, vi } from 'vitest';
import { fetchJson } from './fetch-json';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('fetchJson', () => {
  it('passes the url and headers through to fetchFn unchanged', async () => {
    const fetchFn = mockFetch({ items: [] });
    const headers = { Accept: 'application/json' };

    await fetchJson(fetchFn, 'https://example.com/api?q=x', headers, 'Example');

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/api?q=x', { headers });
  });

  it('returns the parsed body on success', async () => {
    const fetchFn = mockFetch({ items: [{ id: 1 }] });

    const body = await fetchJson<{ items: { id: number }[] }>(fetchFn, 'https://example.com/api', {}, 'Example');

    expect(body).toEqual({ items: [{ id: 1 }] });
  });

  it('throws a "<label> search failed: <status>" error on a non-ok response', async () => {
    const fetchFn = mockFetch({}, false, 500);

    await expect(fetchJson(fetchFn, 'https://example.com/api', {}, 'Example')).rejects.toThrow(
      'Example search failed: 500'
    );
  });
});

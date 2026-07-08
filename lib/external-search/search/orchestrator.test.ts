import { describe, expect, it } from 'vitest';
import { runSearch } from './orchestrator';
import type { SearchAdapter, SearchResult } from '../adapters/types';

function fakeAdapter(over: Partial<SearchAdapter> & { id: SearchAdapter['id'] }): SearchAdapter {
  return {
    supports: () => true,
    isEnabled: () => true,
    search: async () => [],
    ...over,
  };
}

const result = (over: Partial<SearchResult>): SearchResult => ({
  title: 't', url: 'https://x', source: 'github', ...over,
});

describe('runSearch', () => {
  it('marks a disabled adapter and does not call it', async () => {
    let called = false;
    const adapter = fakeAdapter({
      id: 'google',
      isEnabled: () => false,
      search: async () => { called = true; return []; },
    });
    const res = await runSearch([adapter], 'q', 'prompt');
    expect(called).toBe(false);
    expect(res.sources).toEqual([{ source: 'google', status: 'disabled', count: 0 }]);
  });

  it('collects, dedupes, and ranks results from enabled adapters', async () => {
    const gh = fakeAdapter({ id: 'github', search: async () => [result({ source: 'github', url: 'https://github.com/a/b', githubUrl: 'https://github.com/a/b', stars: 1 })] });
    const sk = fakeAdapter({ id: 'skillsmp', search: async () => [result({ source: 'skillsmp', url: 'https://github.com/a/b', githubUrl: 'https://github.com/a/b' })] });
    const res = await runSearch([gh, sk], 'q', 'skill');
    expect(res.results).toHaveLength(1); // deduped by github url
    expect(res.results[0].source).toBe('skillsmp'); // ranked above github
  });

  it('records an error status when an adapter throws', async () => {
    const bad = fakeAdapter({ id: 'github', search: async () => { throw new Error('boom'); } });
    const res = await runSearch([bad], 'q', 'prompt');
    expect(res.sources[0]).toMatchObject({ source: 'github', status: 'error', count: 0 });
    expect(res.results).toEqual([]);
  });

  it('records an error status when an adapter exceeds the timeout', async () => {
    const slow = fakeAdapter({ id: 'github', search: () => new Promise(() => {}) });
    const res = await runSearch([slow], 'q', 'prompt', { timeoutMs: 10 });
    expect(res.sources[0].status).toBe('error');
  });
});

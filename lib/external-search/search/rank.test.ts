import { describe, expect, it } from 'vitest';
import { rank } from './rank';
import type { SearchResult } from '../adapters/types';

const r = (over: Partial<SearchResult>): SearchResult => ({
  title: 't', url: 'https://x', source: 'github', ...over,
});

describe('rank', () => {
  it('orders curated marketplaces above google', () => {
    const out = rank([
      r({ source: 'google' }),
      r({ source: 'skillsmp' }),
    ]);
    expect(out[0].source).toBe('skillsmp');
  });

  it('breaks ties within a source by stars', () => {
    const out = rank([
      r({ source: 'github', stars: 1 }),
      r({ source: 'github', stars: 100 }),
    ]);
    expect(out[0].stars).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import { dedupe } from './dedupe';
import type { SearchResult } from '../adapters/types';

const r = (over: Partial<SearchResult>): SearchResult => ({
  title: 't', url: 'https://x', source: 'github', ...over,
});

describe('dedupe', () => {
  it('collapses the same github repo from different sources', () => {
    const out = dedupe([
      r({ url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', source: 'github' }),
      r({ url: 'https://github.com/foo/bar/', githubUrl: 'https://github.com/foo/bar/', source: 'google' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('treats github.com sub-paths of one repo as the same entry', () => {
    const out = dedupe([
      r({ githubUrl: 'https://github.com/foo/bar', url: 'https://github.com/foo/bar' }),
      r({ githubUrl: 'https://github.com/foo/bar/tree/main', url: 'https://github.com/foo/bar/tree/main' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('keeps distinct urls separate', () => {
    const out = dedupe([
      r({ url: 'https://github.com/foo/bar' }),
      r({ url: 'https://github.com/baz/qux' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('fills missing fields when merging duplicates', () => {
    const out = dedupe([
      r({ url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', description: undefined, stars: undefined }),
      r({ url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', description: 'nice', stars: 5 }),
    ]);
    expect(out[0].description).toBe('nice');
    expect(out[0].stars).toBe(5);
  });

  it('populates sources with all contributing adapters when deduping across github and skillsmp', () => {
    const out = dedupe([
      r({ url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', source: 'github' }),
      r({ url: 'https://github.com/foo/bar', githubUrl: 'https://github.com/foo/bar', source: 'skillsmp' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sources).toContain('github');
    expect(out[0].sources).toContain('skillsmp');
  });
});

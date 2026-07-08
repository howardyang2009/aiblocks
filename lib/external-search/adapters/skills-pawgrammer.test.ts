import { describe, expect, it, vi } from 'vitest';
import { createSkillsPawgrammerAdapter } from './skills-pawgrammer';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

const INDEX = [
  {
    slug: 'ab-method',
    title: 'ab-method',
    description: 'A revolutionary approach to software development using incremental missions.',
    categories: ['development'],
    tags: ['ab method', 'ayoubben18', 'skill'],
    featured: false,
    mcp: false,
    author: 'ayoubben18',
    repoUrl: 'https://github.com/ayoubben18/ab-method',
  },
  {
    slug: 'docx-generator',
    title: 'docx-generator',
    description: 'Generate Word documents from templates.',
    categories: ['document'],
    tags: ['docx', 'word'],
    featured: false,
    mcp: false,
    author: 'someone',
    repoUrl: 'https://github.com/someone/docx-generator',
  },
];

describe('createSkillsPawgrammerAdapter', () => {
  it('is always enabled', () => {
    expect(createSkillsPawgrammerAdapter().isEnabled()).toBe(true);
  });

  it('only supports the skill component type', () => {
    const adapter = createSkillsPawgrammerAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('claude-plugin')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('fetches the static search-index endpoint (no query params)', async () => {
    const fetchFn = mockFetch(INDEX);
    const adapter = createSkillsPawgrammerAdapter({ fetchFn });
    await adapter.search('docx', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://skills.pawgrammer.com/api/search-index');
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('filters the index client-side by title/description/tags/categories/author', async () => {
    const fetchFn = mockFetch(INDEX);
    const adapter = createSkillsPawgrammerAdapter({ fetchFn });
    const results = await adapter.search('docx', 'skill');
    expect(results).toEqual([
      {
        title: 'docx-generator',
        url: 'https://github.com/someone/docx-generator',
        githubUrl: 'https://github.com/someone/docx-generator',
        description: 'Generate Word documents from templates.',
        source: 'skills-pawgrammer',
      },
    ]);
  });

  it('requires every query term to match (AND semantics)', async () => {
    const fetchFn = mockFetch(INDEX);
    const adapter = createSkillsPawgrammerAdapter({ fetchFn });
    const results = await adapter.search('docx missing-term', 'skill');
    expect(results).toEqual([]);
  });

  it('matches case-insensitively against tags', async () => {
    const fetchFn = mockFetch(INDEX);
    const adapter = createSkillsPawgrammerAdapter({ fetchFn });
    const results = await adapter.search('AYOUBBEN18', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('ab-method');
  });

  it('filters out entries missing a title or repoUrl', async () => {
    const fetchFn = mockFetch([{ title: 'no-repo' }, { repoUrl: 'https://github.com/x/y' }]);
    const adapter = createSkillsPawgrammerAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results).toEqual([]);
  });

  it('returns an empty array when the body is not an array', async () => {
    const adapter = createSkillsPawgrammerAdapter({ fetchFn: mockFetch({}) });
    expect(await adapter.search('x', 'skill')).toEqual([]);
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createSkillsPawgrammerAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow(
      'skills.pawgrammer.com search failed: 500',
    );
  });
});

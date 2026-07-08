import { describe, expect, it, vi } from 'vitest';
import { createSkillsPubAdapter } from './skills-pub';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createSkillsPubAdapter', () => {
  it('is always enabled', () => {
    expect(createSkillsPubAdapter().isEnabled()).toBe(true);
  });

  it('only supports the skill component type', () => {
    const adapter = createSkillsPubAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('claude-plugin')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('queries the search endpoint with q, page and pageSize', async () => {
    const fetchFn = mockFetch({ data: { skills: [], total: 0 } });
    const adapter = createSkillsPubAdapter({ fetchFn });
    await adapter.search('pdf', 'skill');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://skills.pub/api/skills?q=pdf&page=1&pageSize=10');
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('maps skills to SearchResult using repositoryUrl and pluginDescription', async () => {
    const fetchFn = mockFetch({
      data: {
        skills: [
          {
            skillId: 'anthropics-skills::document-skills::docx::anthropics',
            repoName: 'anthropics-skills',
            skillName: 'docx',
            pluginName: 'document-skills',
            pluginDescription:
              'Collection of document processing suite including Excel, Word, PowerPoint, and PDF capabilities',
            author: { name: 'anthropics', email: '', url: 'https://github.com/anthropics' },
            pluginBin: '/plugin marketplace add anthropics-skills',
            repositoryUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx',
            version: '',
            updatedAt: 1783475861,
            createdAt: 1783475861,
          },
        ],
        total: 9,
      },
    });
    const adapter = createSkillsPubAdapter({ fetchFn });
    const results = await adapter.search('pdf', 'skill');
    expect(results).toEqual([
      {
        title: 'docx',
        url: 'https://github.com/anthropics/skills/tree/main/skills/docx',
        githubUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx',
        description:
          'Collection of document processing suite including Excel, Word, PowerPoint, and PDF capabilities',
        source: 'skills-pub',
      },
    ]);
  });

  it('filters out entries missing a skillName or repositoryUrl', async () => {
    const fetchFn = mockFetch({
      data: {
        skills: [
          { skillId: 'a', repositoryUrl: 'https://github.com/x/y' },
          { skillId: 'b', skillName: 'no-repo' },
          { skillId: 'c', skillName: 'has-both', repositoryUrl: 'https://github.com/x/y' },
        ],
      },
    });
    const adapter = createSkillsPubAdapter({ fetchFn });
    const results = await adapter.search('x', 'skill');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('has-both');
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createSkillsPubAdapter({ fetchFn: mockFetch({}, false, 503) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('skills.pub search failed: 503');
  });
});

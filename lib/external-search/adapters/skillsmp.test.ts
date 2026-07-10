import { describe, expect, it, vi } from 'vitest';
import { createSkillsmpAdapter } from './skillsmp';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createSkillsmpAdapter', () => {
  it('maps skills to SearchResult using skillUrl and githubUrl', async () => {
    const fetchFn = mockFetch({
      data: {
        skills: [
          { name: 'pdf-tools', author: 'acme', description: 'read pdfs', githubUrl: 'https://github.com/acme/pdf', skillUrl: 'https://skillsmp.com/s/pdf-tools', stars: 12 },
        ],
      },
    });
    const adapter = createSkillsmpAdapter({ fetchFn });
    const results = await adapter.search('pdf', 'skill');
    expect(results).toEqual([
      { title: 'pdf-tools', url: 'https://skillsmp.com/s/pdf-tools', githubUrl: 'https://github.com/acme/pdf', description: 'read pdfs', source: 'skillsmp', stars: 12 },
    ]);
  });

  it('supports only the skill component type', () => {
    const adapter = createSkillsmpAdapter();
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('throws on a non-ok response', async () => {
    const adapter = createSkillsmpAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'skill')).rejects.toThrow('500');
  });
});

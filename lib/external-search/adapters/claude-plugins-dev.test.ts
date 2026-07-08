import { describe, expect, it, vi } from 'vitest';
import { createClaudePluginsDevAdapter } from './claude-plugins-dev';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createClaudePluginsDevAdapter', () => {
  it('is always enabled', () => {
    expect(createClaudePluginsDevAdapter().isEnabled()).toBe(true);
  });

  it('supports claude-plugin and skill only', () => {
    const adapter = createClaudePluginsDevAdapter();
    expect(adapter.supports('claude-plugin')).toBe(true);
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('mcp')).toBe(false);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('prompt')).toBe(false);
    expect(adapter.supports('model')).toBe(false);
  });

  it('queries the plugins endpoint for claude-plugin', async () => {
    const fetchFn = mockFetch({
      plugins: [
        {
          name: 'frontend-design',
          gitUrl: 'https://github.com/anthropics/claude-code',
          description: 'Build UIs',
          stars: 125603,
        },
      ],
    });
    const adapter = createClaudePluginsDevAdapter({ fetchFn });
    const results = await adapter.search('design', 'claude-plugin');
    const [url] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://claude-plugins.dev/api/plugins?q=design&limit=10');
    expect(results).toEqual([
      {
        title: 'frontend-design',
        url: 'https://github.com/anthropics/claude-code',
        githubUrl: 'https://github.com/anthropics/claude-code',
        description: 'Build UIs',
        source: 'claude-plugins-dev',
        stars: 125603,
      },
    ]);
  });

  it('queries the skills endpoint for skill', async () => {
    const fetchFn = mockFetch({
      skills: [
        {
          name: 'docx',
          sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx',
          description: 'Work with Word documents',
          stars: 37018,
        },
      ],
    });
    const adapter = createClaudePluginsDevAdapter({ fetchFn });
    const results = await adapter.search('docx', 'skill');
    const [url] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://claude-plugins.dev/api/skills?q=docx&limit=10');
    expect(results).toEqual([
      {
        title: 'docx',
        url: 'https://github.com/anthropics/skills/tree/main/skills/docx',
        githubUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx',
        description: 'Work with Word documents',
        source: 'claude-plugins-dev',
        stars: 37018,
      },
    ]);
  });

  it('filters out entries missing a name or link', async () => {
    const fetchFn = mockFetch({
      plugins: [
        { name: 'no-url' },
        { gitUrl: 'https://github.com/x/y' },
        { name: 'has-both', gitUrl: 'https://github.com/x/y' },
      ],
    });
    const adapter = createClaudePluginsDevAdapter({ fetchFn });
    const results = await adapter.search('x', 'claude-plugin');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('has-both');
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createClaudePluginsDevAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'claude-plugin')).rejects.toThrow(
      'claude-plugins.dev search failed: 500',
    );
  });
});

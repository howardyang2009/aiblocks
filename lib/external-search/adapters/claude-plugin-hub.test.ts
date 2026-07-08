import { describe, expect, it, vi } from 'vitest';
import { createClaudePluginHubAdapter } from './claude-plugin-hub';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createClaudePluginHubAdapter', () => {
  it('is always enabled', () => {
    expect(createClaudePluginHubAdapter().isEnabled()).toBe(true);
  });

  it('supports claude-plugin, skill, subagent, slash-command, hook and mcp only', () => {
    const adapter = createClaudePluginHubAdapter();
    expect(adapter.supports('claude-plugin')).toBe(true);
    expect(adapter.supports('skill')).toBe(true);
    expect(adapter.supports('subagent')).toBe(true);
    expect(adapter.supports('slash-command')).toBe(true);
    expect(adapter.supports('hook')).toBe(true);
    expect(adapter.supports('mcp')).toBe(true);
    expect(adapter.supports('prompt')).toBe(false);
    expect(adapter.supports('model')).toBe(false);
  });

  it('queries the plugins endpoint (no q) for claude-plugin', async () => {
    const fetchFn = mockFetch({
      items: [
        {
          slug: 'obra-superpowers-2',
          name: 'superpowers',
          displayName: null,
          description: 'Enforce TDD',
          repositoryUrl: 'https://github.com/obra/superpowers',
          starCount: 249015,
        },
      ],
    });
    const adapter = createClaudePluginHubAdapter({ fetchFn });
    const results = await adapter.search('tdd', 'claude-plugin');
    const [url] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://www.claudepluginhub.com/api/plugins?limit=10');
    expect(results).toEqual([
      {
        title: 'superpowers',
        url: 'https://github.com/obra/superpowers',
        githubUrl: 'https://github.com/obra/superpowers',
        description: 'Enforce TDD',
        source: 'claude-plugin-hub',
        stars: 249015,
      },
    ]);
  });

  it('falls back to the hub page url when a plugin has no repositoryUrl', async () => {
    const fetchFn = mockFetch({
      items: [{ slug: 'no-repo-plugin', name: 'no-repo-plugin', starCount: 1 }],
    });
    const adapter = createClaudePluginHubAdapter({ fetchFn });
    const results = await adapter.search('x', 'claude-plugin');
    expect(results[0].url).toBe('https://www.claudepluginhub.com/plugins/no-repo-plugin');
    expect(results[0].githubUrl).toBeUndefined();
  });

  it('queries the search endpoint filtered by type for skill/agent/slash-command/hook/mcp', async () => {
    const fetchFn = mockFetch({
      results: [
        {
          type: 'skill',
          data: {
            fingerprint: 'nutrient-document-processing',
            name: 'nutrient-document-processing',
            description: 'Process documents',
            totalStars: 226667,
            representativePlugin: { slug: 'affaan-m-everything-claude-code' },
          },
        },
        {
          type: 'command',
          data: { name: 'other-command', description: 'not a skill', totalStars: 1 },
        },
      ],
    });
    const adapter = createClaudePluginHubAdapter({ fetchFn });
    const results = await adapter.search('docx', 'skill');
    const [url] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://www.claudepluginhub.com/api/search?q=docx&limit=10');
    expect(results).toEqual([
      {
        title: 'nutrient-document-processing',
        url: 'https://www.claudepluginhub.com/plugins/affaan-m-everything-claude-code',
        githubUrl: undefined,
        description: 'Process documents',
        source: 'claude-plugin-hub',
        stars: 226667,
      },
    ]);
  });

  it('reconstructs a github url when a search result carries owner and repo directly', async () => {
    const fetchFn = mockFetch({
      results: [
        {
          type: 'agent',
          data: { name: 'docx-agent', description: 'Word bridge', totalStars: 5, ownerLogin: 'fix-fast', repoName: 'corgi' },
        },
      ],
    });
    const adapter = createClaudePluginHubAdapter({ fetchFn });
    const results = await adapter.search('docx', 'subagent');
    expect(results[0].url).toBe('https://github.com/fix-fast/corgi');
    expect(results[0].githubUrl).toBe('https://github.com/fix-fast/corgi');
  });

  it('maps slash-command to the "command" search type and hook/mcp to themselves', async () => {
    const commandFetch = mockFetch({
      results: [{ type: 'command', data: { name: 'docs', description: 'gen docs', totalStars: 5 } }],
    });
    const commandAdapter = createClaudePluginHubAdapter({ fetchFn: commandFetch });
    const commandResults = await commandAdapter.search('docs', 'slash-command');
    expect(commandResults[0].title).toBe('docs');

    const hookFetch = mockFetch({
      results: [{ type: 'hook', data: { name: 'pre-commit', description: 'lint', totalStars: 2 } }],
    });
    const hookAdapter = createClaudePluginHubAdapter({ fetchFn: hookFetch });
    const hookResults = await hookAdapter.search('lint', 'hook');
    expect(hookResults[0].title).toBe('pre-commit');

    const mcpFetch = mockFetch({
      results: [{ type: 'mcp', data: { name: 'filesystem', description: 'fs server', totalStars: 3 } }],
    });
    const mcpAdapter = createClaudePluginHubAdapter({ fetchFn: mcpFetch });
    const mcpResults = await mcpAdapter.search('fs', 'mcp');
    expect(mcpResults[0].title).toBe('filesystem');
  });

  it('returns an empty array for unsupported types', async () => {
    const adapter = createClaudePluginHubAdapter({ fetchFn: mockFetch({ results: [] }) });
    expect(await adapter.search('x', 'prompt')).toEqual([]);
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createClaudePluginHubAdapter({ fetchFn: mockFetch({}, false, 500) });
    await expect(adapter.search('x', 'claude-plugin')).rejects.toThrow(
      'claudepluginhub.com search failed: 500',
    );
  });
});

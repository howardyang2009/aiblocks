import { describe, expect, it, vi } from 'vitest';
import { createSmitheryAdapter } from './smithery';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createSmitheryAdapter', () => {
  it('is disabled without an api key', () => {
    expect(createSmitheryAdapter().isEnabled()).toBe(false);
    expect(createSmitheryAdapter({ apiKey: 'k' }).isEnabled()).toBe(true);
  });

  it('supports mcp only', () => {
    const adapter = createSmitheryAdapter({ apiKey: 'k' });
    expect(adapter.supports('mcp')).toBe(true);
    expect(adapter.supports('skill')).toBe(false);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('prompt')).toBe(false);
  });

  it('maps servers and sends the bearer token', async () => {
    const fetchFn = mockFetch({
      servers: [
        { qualifiedName: '@acme/db', displayName: 'DB Server', description: 'sql', homepage: 'https://acme.dev/db', useCount: 9 },
        { qualifiedName: '@x/y', displayName: 'Y', description: 'y', useCount: 1 },
      ],
    });
    const adapter = createSmitheryAdapter({ fetchFn, apiKey: 'k' });
    const results = await adapter.search('db', 'mcp');
    expect(results[0]).toEqual({
      title: 'DB Server', url: 'https://acme.dev/db', description: 'sql', source: 'smithery', stars: 9,
    });
    expect(results[1].url).toBe('https://smithery.ai/server/@x/y');
    const [, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k');
  });
});

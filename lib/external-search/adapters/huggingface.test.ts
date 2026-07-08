import { describe, expect, it, vi } from 'vitest';
import { createHuggingfaceAdapter } from './huggingface';

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => payload })) as unknown as typeof fetch;
}

describe('createHuggingfaceAdapter', () => {
  it('is always enabled (public API, no key required)', () => {
    expect(createHuggingfaceAdapter().isEnabled()).toBe(true);
  });

  it('only supports the model component type', () => {
    const adapter = createHuggingfaceAdapter();
    expect(adapter.supports('model')).toBe(true);
    expect(adapter.supports('skill')).toBe(false);
    expect(adapter.supports('subagent')).toBe(false);
    expect(adapter.supports('prompt')).toBe(false);
    expect(adapter.supports('mcp')).toBe(false);
  });

  it('queries the models endpoint with the search term', async () => {
    const fetchFn = mockFetch([]);
    const adapter = createHuggingfaceAdapter({ fetchFn });
    await adapter.search('llama 3', 'model');
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('https://huggingface.co/api/models');
    expect(url).toContain('search=llama%203');
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/json' });
  });

  it('sends an Authorization header only when a token is set', async () => {
    const withToken = mockFetch([]);
    await createHuggingfaceAdapter({ fetchFn: withToken, token: 'hf_secret' }).search('x', 'model');
    const withoutToken = mockFetch([]);
    await createHuggingfaceAdapter({ fetchFn: withoutToken }).search('x', 'model');

    const authed = (withToken as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const anon = (withoutToken as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(authed.headers).toMatchObject({ Authorization: 'Bearer hf_secret' });
    expect((anon.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('maps models to results with the huggingface page url and likes as stars', async () => {
    const fetchFn = mockFetch([
      { id: 'meta-llama/Llama-3-8B', likes: 1200, pipeline_tag: 'text-generation' },
      { id: 'google-bert/bert-base-uncased', likes: 50 },
    ]);
    const adapter = createHuggingfaceAdapter({ fetchFn });
    const results = await adapter.search('llm', 'model');
    expect(results[0]).toEqual({
      title: 'meta-llama/Llama-3-8B',
      url: 'https://huggingface.co/meta-llama/Llama-3-8B',
      description: 'text-generation',
      source: 'huggingface',
      stars: 1200,
    });
    expect(results[1]).toEqual({
      title: 'google-bert/bert-base-uncased',
      url: 'https://huggingface.co/google-bert/bert-base-uncased',
      description: undefined,
      source: 'huggingface',
      stars: 50,
    });
  });

  it('filters out entries missing an id', async () => {
    const fetchFn = mockFetch([{ likes: 10 }, { id: 'ok/model' }]);
    const adapter = createHuggingfaceAdapter({ fetchFn });
    const results = await adapter.search('x', 'model');
    expect(results).toEqual([
      { title: 'ok/model', url: 'https://huggingface.co/ok/model', description: undefined, source: 'huggingface', stars: undefined },
    ]);
  });

  it('returns an empty array when the body is not an array', async () => {
    const adapter = createHuggingfaceAdapter({ fetchFn: mockFetch({}) });
    expect(await adapter.search('x', 'model')).toEqual([]);
  });

  it('throws with the status when the request fails', async () => {
    const adapter = createHuggingfaceAdapter({ fetchFn: mockFetch({}, false, 503) });
    await expect(adapter.search('x', 'model')).rejects.toThrow('Hugging Face search failed: 503');
  });
});

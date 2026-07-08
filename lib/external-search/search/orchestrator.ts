import type {
  AdapterId,
  ComponentType,
  SearchAdapter,
  SearchResult,
} from '../adapters/types';
import { dedupe } from './dedupe';
import { rank } from './rank';

export interface SourceStatus {
  source: AdapterId;
  status: 'ok' | 'disabled' | 'error';
  count: number;
  message?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  sources: SourceStatus[];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function runSearch(
  adapters: SearchAdapter[],
  query: string,
  type: ComponentType,
  opts: { timeoutMs?: number } = {},
): Promise<SearchResponse> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const collected: SearchResult[] = [];
  const sources: SourceStatus[] = new Array(adapters.length);

  await Promise.all(
    adapters.map(async (adapter, i) => {
      if (!adapter.isEnabled()) {
        sources[i] = { source: adapter.id, status: 'disabled', count: 0 };
        return;
      }
      try {
        const results = await withTimeout(adapter.search(query, type), timeoutMs);
        collected.push(...results);
        sources[i] = { source: adapter.id, status: 'ok', count: results.length };
      } catch (err) {
        sources[i] = {
          source: adapter.id,
          status: 'error',
          count: 0,
          message: err instanceof Error ? err.message : 'unknown error',
        };
      }
    }),
  );

  return { results: rank(dedupe(rank(collected))), sources };
}

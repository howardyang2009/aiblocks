export type ComponentType =
  | 'skill'
  | 'subagent'
  | 'prompt'
  | 'mcp'
  | 'model'
  | 'claude-plugin'
  | 'hook'
  | 'slash-command'
  | 'claude-md';
export type AdapterId =
  | 'github'
  | 'smithery'
  | 'skillsmp'
  | 'google'
  | 'brave'
  | 'huggingface'
  | 'claude-plugins-dev'
  | 'claude-plugin-hub'
  | 'claude-skills-info'
  | 'skills-sh'
  | 'skills-pawgrammer'
  | 'skills-pub'
  | 'skill-store-io'
  | 'terminal-skills-io';

export interface SearchResult {
  title: string;
  url: string;
  githubUrl?: string;
  description?: string;
  source: AdapterId;
  sources?: AdapterId[];
  stars?: number;
}

export interface SearchAdapter {
  id: AdapterId;
  supports(type: ComponentType): boolean;
  isEnabled(): boolean;
  search(query: string, type: ComponentType): Promise<SearchResult[]>;
}

export type FetchLike = typeof fetch;

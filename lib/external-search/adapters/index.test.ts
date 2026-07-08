import { describe, expect, it } from 'vitest';
import { createAdapters, selectAdapters } from './index';

describe('adapter registry', () => {
  it('creates github, skillsmp, smithery, google, brave, huggingface, claude-skills-info, skills-sh, skills-pawgrammer, skills-pub, skill-store-io and terminal-skills-io adapters', () => {
    const ids = createAdapters({}).map((a) => a.id).sort();
    expect(ids).toEqual([
      'brave',
      'claude-skills-info',
      'github',
      'google',
      'huggingface',
      'skill-store-io',
      'skills-pawgrammer',
      'skills-pub',
      'skills-sh',
      'skillsmp',
      'smithery',
      'terminal-skills-io',
    ]);
  });

  it('routes skill to skillsmp + github + google + brave + claude-skills-info + skills-sh + skills-pawgrammer + skills-pub + skill-store-io + terminal-skills-io (google/brave/skills-sh disabled by default)', () => {
    const adapters = createAdapters({});
    const ids = selectAdapters(adapters, 'skill').map((a) => a.id).sort();
    expect(ids).toEqual([
      'brave',
      'claude-skills-info',
      'github',
      'google',
      'skill-store-io',
      'skills-pawgrammer',
      'skills-pub',
      'skills-sh',
      'skillsmp',
      'terminal-skills-io',
    ]);
  });

  it('routes claude-plugin to github + google + brave + claude-skills-info', () => {
    const ids = selectAdapters(createAdapters({}), 'claude-plugin').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'claude-skills-info', 'github', 'google']);
  });

  it('routes model to huggingface + github + google + brave', () => {
    const ids = selectAdapters(createAdapters({}), 'model').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'github', 'google', 'huggingface']);
  });

  it('routes mcp to smithery + github + google + brave', () => {
    const ids = selectAdapters(createAdapters({}), 'mcp').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'github', 'google', 'smithery']);
  });

  it('routes subagent to github + google + brave + claude-skills-info', () => {
    const ids = selectAdapters(createAdapters({}), 'subagent').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'claude-skills-info', 'github', 'google']);
  });

  it('routes prompt to github + google + brave', () => {
    const ids = selectAdapters(createAdapters({}), 'prompt').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'github', 'google']);
  });

  it('routes hook to github + google + brave + claude-skills-info', () => {
    const ids = selectAdapters(createAdapters({}), 'hook').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'claude-skills-info', 'github', 'google']);
  });

  it('routes slash-command to github + google + brave + claude-skills-info', () => {
    const ids = selectAdapters(createAdapters({}), 'slash-command').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'claude-skills-info', 'github', 'google']);
  });

  it('routes claude-md to github + google + brave + claude-skills-info', () => {
    const ids = selectAdapters(createAdapters({}), 'claude-md').map((a) => a.id).sort();
    expect(ids).toEqual(['brave', 'claude-skills-info', 'github', 'google']);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { getConfig } from './config';

describe('getConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('reads adapter keys from the environment', () => {
    process.env.GITHUB_TOKEN = 'gh';
    process.env.SMITHERY_API_KEY = 'sm';
    process.env.GOOGLE_SEARCH_API_KEY = 'gk';
    process.env.GOOGLE_SEARCH_PROJECT_ID = 'proj';
    process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine';
    process.env.VERCEL_OIDC_TOKEN = 'oidc';
    const cfg = getConfig();
    expect(cfg.githubToken).toBe('gh');
    expect(cfg.smitheryKey).toBe('sm');
    expect(cfg.googleApiKey).toBe('gk');
    expect(cfg.googleProjectId).toBe('proj');
    expect(cfg.googleEngineId).toBe('engine');
    expect(cfg.skillsShToken).toBe('oidc');
  });

  it('leaves missing keys undefined', () => {
    delete process.env.SKILLSMP_API_KEY;
    delete process.env.SKILLS_SH_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    expect(getConfig().skillsmpKey).toBeUndefined();
    expect(getConfig().skillsShToken).toBeUndefined();
  });

  it('prefers an explicit skills.sh api key over the Vercel OIDC token', () => {
    process.env.SKILLS_SH_API_KEY = 'sk_live_abc';
    process.env.VERCEL_OIDC_TOKEN = 'oidc';
    expect(getConfig().skillsShToken).toBe('sk_live_abc');
  });
});

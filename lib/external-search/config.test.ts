import { afterEach, describe, expect, it, vi } from 'vitest';

const { getVercelOidcToken } = vi.hoisted(() => ({ getVercelOidcToken: vi.fn() }));
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken }));

const { getConfig } = await import('./config');

describe('getConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    getVercelOidcToken.mockReset();
  });

  it('reads adapter keys from the environment', async () => {
    process.env.GITHUB_TOKEN = 'gh';
    process.env.SMITHERY_API_KEY = 'sm';
    process.env.GOOGLE_SEARCH_API_KEY = 'gk';
    process.env.GOOGLE_SEARCH_PROJECT_ID = 'proj';
    process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine';
    delete process.env.SKILLS_SH_API_KEY;
    getVercelOidcToken.mockResolvedValue('oidc');
    const cfg = await getConfig();
    expect(cfg.githubToken).toBe('gh');
    expect(cfg.smitheryKey).toBe('sm');
    expect(cfg.googleApiKey).toBe('gk');
    expect(cfg.googleProjectId).toBe('proj');
    expect(cfg.googleEngineId).toBe('engine');
    expect(cfg.skillsShToken).toBe('oidc');
  });

  it('leaves missing keys undefined', async () => {
    delete process.env.SKILLSMP_API_KEY;
    delete process.env.SKILLS_SH_API_KEY;
    getVercelOidcToken.mockRejectedValue(new Error('no OIDC token available'));
    const cfg = await getConfig();
    expect(cfg.skillsmpKey).toBeUndefined();
    expect(cfg.skillsShToken).toBeUndefined();
  });

  it('prefers an explicit skills.sh api key over the Vercel OIDC token', async () => {
    process.env.SKILLS_SH_API_KEY = 'sk_live_abc';
    getVercelOidcToken.mockResolvedValue('oidc');
    const cfg = await getConfig();
    expect(cfg.skillsShToken).toBe('sk_live_abc');
    expect(getVercelOidcToken).not.toHaveBeenCalled();
  });
});

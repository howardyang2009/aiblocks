import { getVercelOidcToken } from '@vercel/oidc';

export interface AppConfig {
  githubToken?: string;
  skillsmpKey?: string;
  smitheryKey?: string;
  googleApiKey?: string;
  googleProjectId?: string;
  googleEngineId?: string;
  braveKey?: string;
  huggingfaceToken?: string;
  skillsShToken?: string;
}

// getVercelOidcToken() reads the per-request `x-vercel-oidc-token` header when
// actually deployed (falling back to process.env.VERCEL_OIDC_TOKEN for local
// `vercel dev`/`vercel env pull`) — a plain process.env read only ever works
// locally, since Vercel Functions never populate that env var at runtime.
async function skillsShOidcToken(): Promise<string | undefined> {
  try {
    return await getVercelOidcToken();
  } catch {
    return undefined;
  }
}

export async function getConfig(): Promise<AppConfig> {
  return {
    githubToken: process.env.GITHUB_TOKEN || undefined,
    skillsmpKey: process.env.SKILLSMP_API_KEY || undefined,
    smitheryKey: process.env.SMITHERY_API_KEY || undefined,
    googleApiKey: process.env.GOOGLE_SEARCH_API_KEY || undefined,
    googleProjectId: process.env.GOOGLE_SEARCH_PROJECT_ID || undefined,
    googleEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || undefined,
    braveKey: process.env.BRAVE_SEARCH_API_KEY || undefined,
    huggingfaceToken: process.env.HUGGINGFACE_API_TOKEN || undefined,
    // skills.sh accepts either an sk_live_... API key or a Vercel OIDC Federation project
    // identity token — see https://skills.sh/docs/api#authentication.
    skillsShToken: process.env.SKILLS_SH_API_KEY || (await skillsShOidcToken()),
  };
}

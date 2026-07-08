/** Returns the link if it points at github.com, otherwise undefined. */
export function githubUrlOf(link: string): string | undefined {
  try {
    return new URL(link).hostname.replace(/^www\./, '') === 'github.com' ? link : undefined;
  } catch {
    return undefined;
  }
}

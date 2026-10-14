// The RheinWeg wave mark. AiBlocks is a RheinWeg product, so the navbar
// and footer share this one definition instead of inlining the SVG.
export const RHEINWEG_URL = "https://rheinwegde.vercel.app/de/";

export function RheinWegLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path d="M6 20c4-6 8 2 12-4s6-4 8-2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

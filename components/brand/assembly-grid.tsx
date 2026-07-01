// The signature visual: a 12x4 grid of blocks, a few "assembling" (hot/on).
// Shared so it can be reused anywhere on the site (home, about, etc.)
// instead of being redefined per page.
export function AssemblyGrid({
  hot = [3, 14, 15, 26, 27, 28, 39, 40],
  on = [1, 2, 13, 25, 38, 41, 42, 16, 29],
}: {
  hot?: number[];
  on?: number[];
}) {
  const hotSet = new Set(hot);
  const onSet = new Set(on);
  const cells = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div className="assembly-grid" aria-hidden>
      {cells.map((i) => (
        <i key={i} className={hotSet.has(i) ? "hot" : onSet.has(i) ? "on" : ""} />
      ))}
    </div>
  );
}

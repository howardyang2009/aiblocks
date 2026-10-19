function leafKeys(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" ? leafKeys(value, path) : [path];
  });
}

/**
 * Compares two message trees by their dotted leaf keys. `missing` is in the
 * source but not the target; `extra` is in the target but not the source.
 */
export function keyDifferences(source: object, target: object): { missing: string[]; extra: string[] } {
  const sourceKeys = new Set(leafKeys(source));
  const targetKeys = new Set(leafKeys(target));
  return {
    missing: [...sourceKeys].filter((k) => !targetKeys.has(k)).sort(),
    extra: [...targetKeys].filter((k) => !sourceKeys.has(k)).sort(),
  };
}

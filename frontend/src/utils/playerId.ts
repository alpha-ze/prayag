/**
 * Derives a short, human-readable player tag from a UUID.
 * e.g. "a3f2c1d4-..." → "#A3F2C1"
 * Stable: same UUID always produces the same tag.
 */
export function shortId(uuid: string): string {
  const clean = uuid.replace(/-/g, '');
  return '#' + clean.substring(0, 6).toUpperCase();
}

/**
 * Cleans a raw list of dropdown option strings: trims whitespace, drops
 * blank entries, and removes duplicates while preserving order. Shared by
 * the admin "edit events" UI and the `update-event-options` API route so
 * both apply exactly the same rules.
 */
export function cleanOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const option of options) {
    const trimmed = option.trim();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * The free-text fallback choice. The prediction form always appends this
 * entry to every dropdown, so it must never be part of an event's stored
 * options array or it would show up twice.
 */
export const OTHER_OPTION = "Other";

/**
 * Cleans a raw list of dropdown option strings: trims whitespace, drops
 * blank entries, drops any stored "Other" entry, and removes duplicates
 * while preserving order. Shared by the admin "edit events" UI, the
 * `update-event-options` API route and the prediction form so they all
 * apply exactly the same rules.
 */
export function cleanOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const option of options) {
    const trimmed = option.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === OTHER_OPTION.toLowerCase()) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Cleans a raw list of dropdown option strings: trims whitespace, drops
 * blank entries, and removes duplicates while preserving order. Shared by
 * the admin "edit events" UI and the `update-event-options` API route so
 * both apply exactly the same rules.
 */
export function cleanOptions(options: string[]): string[] {
  return options
    .map((option) => option.trim())
    .filter((option, index, all) => option.length > 0 && all.indexOf(option) === index);
}

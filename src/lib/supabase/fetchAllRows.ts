const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Supabase caps each response (1,000 rows by default), silently truncating
 * larger result sets. Fetches every row by requesting consecutive ranges.
 * The query must have a stable order so pages don't overlap or skip rows.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  // Advance by rows actually returned, so a project max-rows setting lower
  // than PAGE_SIZE can't cause rows to be skipped.
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    if (page.length === 0) return rows;
    rows.push(...page);
  }
}

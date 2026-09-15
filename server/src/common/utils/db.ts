import { ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';

const logger = new Logger('Database');

/** A table row as returned by the API: `_id` mirrors `id` so existing clients keep working. */
export type Doc<T> = T & { id: string; _id: string; createdAt: string; updatedAt: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function toDoc<T = any>(row: any): Doc<T> {
  return row ? { _id: row.id, ...row } : row;
}

export function toDocs<T = any>(rows: any[] | null | undefined): Doc<T>[] {
  return (rows || []).map((row) => toDoc<T>(row));
}

/** Unwraps a supabase-js result, turning database errors into HTTP errors. */
export function unwrap<T>({ data, error }: { data: T; error: any }): T {
  if (error) {
    if (error.code === '23505') throw new ConflictException('A record with these details already exists.');
    logger.error(`${error.code || ''} ${error.message}`);
    throw new InternalServerErrorException('A database error occurred.');
  }
  return data;
}

/** Resolves a `{ count: 'exact', head: true }` query to its row count. */
export async function countOf(query: PromiseLike<{ count: number | null; error: any }>): Promise<number> {
  const { count, error } = await query;
  unwrap({ data: null, error });
  return count || 0;
}

/** Escapes LIKE wildcards so user input matches literally. */
export function escapeLike(value: string): string {
  return value.trim().replace(/[\\%_]/g, '\\$&');
}

/** Quotes a value for use inside a PostgREST `or=(...)` filter string. */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}

/** `or` filter matching `term` case-insensitively anywhere in any of `columns`. */
export function containsAny(columns: string[], term: string): string {
  const pattern = quoteFilterValue(`%${escapeLike(term)}%`);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',');
}

/** `or` filter matching a row by uuid or by an alternate unique column. */
export function idOrColumn(id: string, column: string, columnValue: string = id.trim()): string {
  const trimmed = (id || '').trim();
  const byColumn = `${column}.eq.${quoteFilterValue(columnValue)}`;
  return isUuid(trimmed) ? `id.eq.${trimmed},${byColumn}` : byColumn;
}

/** Reads every row of a query, paging past PostgREST's default row cap. */
export async function fetchAll<T = any>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: any; error: any }> },
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = unwrap(await build().range(from, from + pageSize - 1)) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

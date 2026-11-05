export function storagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  const marker = "/storage/v1/object/public/game-images/";
  const at = input.indexOf(marker);
  if (at >= 0) return decodeURIComponent(input.slice(at + marker.length).split("?")[0]);
  if (/^https?:\/\//i.test(input)) return null;
  return input.replace(/^\/+/, "");
}

export const PAGE_SIZE = 500;
export const ID_CHUNK_SIZE = 100;

export type QueryError = { code?: string; message?: string };

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: QueryError | null }>,
): Promise<{ data: T[] | null; error: QueryError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

export function chunks<T>(values: T[], size = ID_CHUNK_SIZE): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("Chunk size must be a positive integer");
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

type StorageRemover = {
  storage: {
    from(bucket: string): {
      remove(paths: string[]): Promise<{ error: unknown | null }>;
    };
  };
};

export async function removeStoragePaths(
  admin: StorageRemover,
  bucket: string,
  paths: string[],
): Promise<void> {
  const batchSize = 100;
  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
}

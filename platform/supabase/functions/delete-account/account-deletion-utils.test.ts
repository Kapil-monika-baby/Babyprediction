import {
  chunks,
  fetchAllRows,
  removeStoragePaths,
  storagePath,
} from "./account-deletion-utils.ts";

Deno.test("storagePath extracts bucket paths and ignores external URLs", () => {
  if (storagePath("  /folder/image.jpg  ") !== "folder/image.jpg") throw new Error("relative path failed");
  if (storagePath("https://cdn.example.com/image.jpg") !== null) throw new Error("external URL should be ignored");
  if (storagePath("https://project.supabase.co/storage/v1/object/public/game-images/a%20b.jpg?x=1") !== "a b.jpg") {
    throw new Error("public storage URL parsing failed");
  }
  if (storagePath(null) !== null) throw new Error("null path should be ignored");
});

Deno.test("chunks splits IDs into bounded groups", () => {
  const result = chunks(Array.from({ length: 205 }, (_, i) => i), 100);
  if (result.length !== 3 || result[0].length !== 100 || result[2].length !== 5) {
    throw new Error("chunk boundaries are incorrect");
  }
});

Deno.test("fetchAllRows paginates beyond the PostgREST default page size", async () => {
  const all = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const requested: number[][] = [];
  const result = await fetchAllRows<{ id: number }>(async (from, to) => {
    requested.push([from, to]);
    return { data: all.slice(from, to + 1), error: null };
  });
  if (result.error || result.data?.length !== 1201) throw new Error("pagination lost rows");
  if (requested.length !== 3 || requested[0][0] !== 0 || requested[1][0] !== 500 || requested[2][0] !== 1000) {
    throw new Error("pagination ranges are incorrect");
  }
});

Deno.test("fetchAllRows stops and returns query errors", async () => {
  const failure = { code: "XX000", message: "query failed" };
  const result = await fetchAllRows(async () => ({ data: null, error: failure }));
  if (result.error !== failure || result.data !== null) throw new Error("query error was not propagated");
});

Deno.test("removeStoragePaths batches requests and stops on failure", async () => {
  const calls: number[] = [];
  const failure = new Error("storage unavailable");
  const admin = {
    storage: {
      from: (_bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push(paths.length);
          return calls.length === 2 ? { error: failure } : { error: null };
        },
      }),
    },
  };
  let caught: unknown;
  try {
    await removeStoragePaths(admin, "memory-media", Array.from({ length: 250 }, (_, i) => String(i)));
  } catch (error) {
    caught = error;
  }
  if (caught !== failure) throw new Error("storage error was not propagated");
  if (calls.length !== 2 || calls[0] !== 100 || calls[1] !== 100) {
    throw new Error("storage deletion did not stop at the failed batch");
  }
});

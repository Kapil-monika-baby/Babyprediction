/// <reference lib="deno.ns" />
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


Deno.test("removeOwnedStorageObjects sweeps all buckets and paginates", async () => {
  const objects = Array.from({ length: 501 }, (_, i) => ({ bucket_id: i === 500 ? "game-images" : "memory-media", name: "user/" + i + ".jpg" }));
  const rpcCalls: Array<{ p_limit: number; p_offset: number }> = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];
  const admin = { rpc: async (_fn: string, args: Record<string, unknown>) => { const limit=Number(args.p_limit), offset=Number(args.p_offset); rpcCalls.push({p_limit:limit,p_offset:offset}); return {data:objects.slice(offset,offset+limit),error:null}; }, storage: {from:(bucket:string)=>({remove:async(paths:string[])=>{removals.push({bucket,paths});return {error:null};}})} };
  const count=await removeOwnedStorageObjects(admin,"user-123");
  if(count!==501) throw new Error("owned Storage object count is incorrect");
  if(rpcCalls.length!==2||rpcCalls[0].p_offset!==0||rpcCalls[1].p_offset!==500) throw new Error("owned Storage objects were not paginated");
  if(removals.length!==2||!removals.some(x=>x.bucket==="memory-media"&&x.paths.length===500)||!removals.some(x=>x.bucket==="game-images"&&x.paths.length===1)) throw new Error("owned objects were not removed from each bucket");
});

Deno.test("removeOwnedStorageObjects aborts before deletion when ownership query fails", async () => {
  const failure={code:"XX000",message:"ownership lookup failed"}; let removeCalls=0;
  const admin={rpc:async()=>({data:null,error:failure}),storage:{from:(_bucket:string)=>({remove:async(_paths:string[])=>{removeCalls+=1;return {error:null};}})}};
  let caught:unknown; try {await removeOwnedStorageObjects(admin,"user-123");} catch(error){caught=error;}
  if(caught!==failure||removeCalls!==0) throw new Error("ownership query failure did not safely abort cleanup");
});

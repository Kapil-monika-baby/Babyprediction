-- Tighten private Storage object authorization to bind every object to an existing
-- memory and its timeline. Expected object path: <timeline UUID>/<memory UUID>/<filename>.
-- Apply after the base Memories migration, in staging first.

drop policy if exists "memory storage read members" on storage.objects;
create policy "memory storage read members" on storage.objects
for select to authenticated
using (
  bucket_id = 'memory-media'
  and exists (
    select 1
    from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mi.deleted_at is null
      and (mt.owner_id = auth.uid() or exists (
        select 1 from public.memory_members mm
        where mm.timeline_id = mt.id and mm.user_id = auth.uid()
      ))
  )
);

drop policy if exists "memory storage upload members" on storage.objects;
create policy "memory storage upload members" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'memory-media'
  and exists (
    select 1
    from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mi.created_by = auth.uid()
      and mi.deleted_at is null
      and (mt.owner_id = auth.uid() or exists (
        select 1 from public.memory_members mm
        where mm.timeline_id = mt.id and mm.user_id = auth.uid()
      ))
  )
);

drop policy if exists "memory storage update owner" on storage.objects;
create policy "memory storage update owner" on storage.objects
for update to authenticated
using (
  bucket_id = 'memory-media'
  and exists (
    select 1 from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mt.owner_id = auth.uid()
      and mi.deleted_at is null
  )
)
with check (
  bucket_id = 'memory-media'
  and exists (
    select 1 from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mt.owner_id = auth.uid()
      and mi.deleted_at is null
  )
);

drop policy if exists "memory storage delete owner" on storage.objects;
create policy "memory storage delete owner or author" on storage.objects
for delete to authenticated
using (
  bucket_id = 'memory-media'
  and exists (
    select 1
    from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mi.deleted_at is null
      and (
        mt.owner_id = auth.uid()
        or (
          mi.created_by = auth.uid()
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = auth.uid()
          )
        )
      )
  )
);

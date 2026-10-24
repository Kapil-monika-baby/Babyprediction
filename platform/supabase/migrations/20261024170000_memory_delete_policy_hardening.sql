-- Close contributor access gaps for deleting memory records/media.
-- Apply after the base and prior Memories hardening migrations, in staging first.

drop policy if exists "memory items delete owner or author" on public.memory_items;
create policy "memory items delete owner or author" on public.memory_items
for delete to authenticated
using (
  exists (
    select 1 from public.memory_timelines mt
    where mt.id = timeline_id and mt.owner_id = auth.uid()
  )
  or (
    created_by = auth.uid()
    and exists (
      select 1
      from public.memory_timelines mt
      where mt.id = timeline_id
        and exists (
          select 1 from public.memory_members mm
          where mm.timeline_id = mt.id and mm.user_id = auth.uid()
        )
    )
  )
);

drop policy if exists "memory media delete owner or author" on public.memory_media;
create policy "memory media delete owner or author" on public.memory_media
for delete to authenticated
using (
  exists (
    select 1
    from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mi.id = memory_id
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

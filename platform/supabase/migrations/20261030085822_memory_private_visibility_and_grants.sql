-- Keep private memories and their metadata/media visible only to the owner and author.
-- Accepted contributors may see shared memories, but not another contributor's private entries.
-- Also remove public table access and privileges that bypass row-level security.

drop policy if exists "memory items read members" on public.memory_items;
create policy "memory items read members" on public.memory_items
for select to authenticated
using (
  deleted_at is null
  and exists (
    select 1 from public.memory_timelines mt
    where mt.id = timeline_id
      and (
        mt.owner_id = (select auth.uid())
        or (
          visibility = 'shared'
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
        or (
          created_by = (select auth.uid())
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
      )
  )
);

drop policy if exists "memory media read members" on public.memory_media;
create policy "memory media read members" on public.memory_media
for select to authenticated
using (
  exists (
    select 1 from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mi.id = memory_id and mi.deleted_at is null
      and (
        mt.owner_id = (select auth.uid())
        or (
          mi.visibility = 'shared'
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
        or (
          mi.created_by = (select auth.uid())
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
      )
  )
);

drop policy if exists "memory storage read members" on storage.objects;
create policy "memory storage read members" on storage.objects
for select to authenticated
using (
  bucket_id = 'memory-media'
  and exists (
    select 1 from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mt.id::text = (storage.foldername(name))[1]
      and mi.id::text = (storage.foldername(name))[2]
      and mi.deleted_at is null
      and (
        mt.owner_id = (select auth.uid())
        or (
          mi.visibility = 'shared'
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
        or (
          mi.created_by = (select auth.uid())
          and exists (
            select 1 from public.memory_members mm
            where mm.timeline_id = mt.id and mm.user_id = (select auth.uid()) and mm.accepted_at is not null
          )
        )
      )
  )
);

revoke all privileges on table
  public.memory_timelines, public.memory_members, public.memory_items,
  public.memory_media, public.memory_invitations, public.memory_share_links
from anon;

revoke truncate, references, trigger on table
  public.memory_timelines, public.memory_members, public.memory_items,
  public.memory_media, public.memory_invitations, public.memory_share_links
from authenticated;

grant select, insert, update, delete on table
  public.memory_timelines, public.memory_members, public.memory_items,
  public.memory_media, public.memory_invitations, public.memory_share_links
to authenticated;

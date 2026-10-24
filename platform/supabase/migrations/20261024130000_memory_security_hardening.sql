-- Security hardening for the GoodNews Memories draft schema.
-- Apply only after reviewing and applying 20261024090000_family_memories_mvp.sql in staging.

-- A timeline can only reference a child owned by the timeline owner.
create or replace function public.enforce_memory_timeline_baby_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.baby_id is not null and not exists (
    select 1 from public.babies b
    where b.id = new.baby_id and b.owner_id = new.owner_id
  ) then
    raise exception 'The selected child must belong to the timeline owner';
  end if;
  return new;
end;
$$;

drop trigger if exists memory_timeline_baby_owner_guard on public.memory_timelines;
create trigger memory_timeline_baby_owner_guard
before insert or update of baby_id, owner_id on public.memory_timelines
for each row execute function public.enforce_memory_timeline_baby_owner();

-- Replace the draft update policy: a contributor may edit only their own memory
-- while remaining on the same timeline and remaining a member of that timeline.
drop policy if exists "memory items update owner or author" on public.memory_items;
create policy "memory items update owner or author" on public.memory_items
for update to authenticated
using (
  exists (
    select 1 from public.memory_timelines mt
    where mt.id = timeline_id and mt.owner_id = auth.uid()
  )
  or (
    created_by = auth.uid()
    and exists (
      select 1 from public.memory_timelines mt
      where mt.id = timeline_id
        and (mt.owner_id = auth.uid() or exists (
          select 1 from public.memory_members mm
          where mm.timeline_id = mt.id and mm.user_id = auth.uid()
        ))
    )
  )
)
with check (
  exists (
    select 1 from public.memory_timelines mt
    where mt.id = timeline_id and mt.owner_id = auth.uid()
  )
  or (
    created_by = auth.uid()
    and visibility = 'private'
    and exists (
      select 1 from public.memory_timelines mt
      where mt.id = timeline_id
        and (mt.owner_id = auth.uid() or exists (
          select 1 from public.memory_members mm
          where mm.timeline_id = mt.id and mm.user_id = auth.uid()
        ))
    )
  )
);

-- Enforce stable ownership of media records. The app must remove the private
-- Storage object explicitly before deleting its database row.
drop policy if exists "memory media insert members" on public.memory_media;
create policy "memory media insert members" on public.memory_media
for insert to authenticated
with check (
  exists (
    select 1 from public.memory_items mi
    join public.memory_timelines mt on mt.id = mi.timeline_id
    where mi.id = memory_id
      and mi.created_by = auth.uid()
      and mi.deleted_at is null
      and (mt.owner_id = auth.uid() or exists (
        select 1 from public.memory_members mm
        where mm.timeline_id = mt.id and mm.user_id = auth.uid()
      ))
  )
);

-- Avoid accidentally making media accessible to anonymous clients.
update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']
where id = 'memory-media';

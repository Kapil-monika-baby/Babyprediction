-- Break circular RLS policy references between memory_timelines and memory_members.
-- Security-definer helpers are deliberately narrow and run with a fixed search_path.

create or replace function public.is_memory_timeline_owner(p_timeline_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memory_timelines mt
    where mt.id = p_timeline_id
      and mt.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_memory_timeline_member(p_timeline_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memory_timelines mt
    where mt.id = p_timeline_id
      and mt.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.memory_members mm
    where mm.timeline_id = p_timeline_id
      and mm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_memory_timeline_owner(uuid) from public, anon;
revoke all on function public.is_memory_timeline_member(uuid) from public, anon;
grant execute on function public.is_memory_timeline_owner(uuid) to authenticated;
grant execute on function public.is_memory_timeline_member(uuid) to authenticated;

drop policy if exists "memory timelines read members" on public.memory_timelines;
create policy "memory timelines read members" on public.memory_timelines
for select to authenticated
using (public.is_memory_timeline_member(id));

drop policy if exists "memory members read owner or self" on public.memory_members;
create policy "memory members read owner or self" on public.memory_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_memory_timeline_owner(timeline_id)
);

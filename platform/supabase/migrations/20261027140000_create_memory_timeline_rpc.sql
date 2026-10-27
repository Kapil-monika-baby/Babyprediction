-- Create timelines through a narrow authenticated RPC so ownership is derived
-- from the verified JWT rather than trusted from a client-supplied owner_id.
create or replace function public.create_memory_timeline(
  p_title text default 'Family Memories',
  p_baby_id uuid default null
)
returns table(id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := coalesce(nullif(btrim(p_title), ''), 'Family Memories');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(v_title) > 120 then
    raise exception 'Timeline name must be 120 characters or fewer' using errcode = '22001';
  end if;

  if p_baby_id is not null and not exists (
    select 1 from public.babies b
    where b.id = p_baby_id and b.owner_id = v_user_id
  ) then
    raise exception 'The selected child must belong to your account' using errcode = '42501';
  end if;

  insert into public.memory_timelines(owner_id, title, baby_id)
  values (v_user_id, v_title, p_baby_id)
  returning memory_timelines.id into v_id;

  return query select v_id;
end;
$$;

revoke all on function public.create_memory_timeline(text, uuid) from public, anon;
grant execute on function public.create_memory_timeline(text, uuid) to authenticated;

-- Restrict account-deletion Storage ownership enumeration to the service role.
-- Objects are deleted only through the Supabase Storage API, never by SQL.
create or replace function public.list_user_storage_objects(p_user_id uuid,p_limit integer default 500,p_offset integer default 0)
returns table (bucket_id text, name text) language sql stable security definer set search_path = '' as $$
  select objects.bucket_id, objects.name from storage.objects as objects
   where objects.owner_id = p_user_id::text order by objects.bucket_id, objects.name
   limit least(greatest(coalesce(p_limit,500),1),500) offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.list_user_storage_objects(uuid,integer,integer) from public;
revoke all on function public.list_user_storage_objects(uuid,integer,integer) from anon, authenticated;
grant execute on function public.list_user_storage_objects(uuid,integer,integer) to service_role;

-- Harden search_path for existing authenticated SECURITY DEFINER helpers.
alter function public.accept_memory_invitation(text) set search_path = '';
alter function public.create_memory_timeline(text,uuid) set search_path = '';
alter function public.is_admin() set search_path = '';
alter function public.is_memory_timeline_member(uuid) set search_path = '';
alter function public.is_memory_timeline_owner(uuid) set search_path = '';

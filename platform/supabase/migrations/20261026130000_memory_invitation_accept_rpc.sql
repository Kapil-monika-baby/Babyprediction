-- Atomically accept a one-time, email-bound family Memories invitation.
-- This migration is prepared on the isolated branch only; do not apply to production
-- until the Memories schema and invitation flow have passed staging checks.

create or replace function public.accept_memory_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.memory_invitations%rowtype;
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invitation is invalid or expired';
  end if;

  select *
    into v_invitation
    from public.memory_invitations
   where token_hash = p_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.accepted_at is not null
     or v_invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = 'P0002', message = 'Invitation is invalid or expired';
  end if;

  if v_email = '' or lower(trim(v_invitation.invited_email)) <> v_email then
    raise exception using errcode = '42501', message = 'Sign in with the email address that was invited';
  end if;

  insert into public.memory_members (timeline_id, user_id, role, invited_by, accepted_at)
  values (v_invitation.timeline_id, v_user_id, 'contributor', v_invitation.invited_by, pg_catalog.now())
  on conflict (timeline_id, user_id) do nothing;

  update public.memory_invitations
     set accepted_at = pg_catalog.now()
   where id = v_invitation.id;

  return v_invitation.timeline_id;
end;
$$;

revoke all on function public.accept_memory_invitation(text) from public, anon;
grant execute on function public.accept_memory_invitation(text) to authenticated;

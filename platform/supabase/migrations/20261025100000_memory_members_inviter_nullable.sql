-- Preserve family membership records when an inviter deletes their account.
-- The inviter is audit metadata, not a dependency that should block account deletion.
alter table public.memory_members
  alter column invited_by drop not null;

alter table public.memory_members
  drop constraint if exists memory_members_invited_by_fkey;

alter table public.memory_members
  add constraint memory_members_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;

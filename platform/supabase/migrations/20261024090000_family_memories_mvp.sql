-- GoodNews Memories MVP schema; prepared on isolated branch, NOT applied.
create extension if not exists pgcrypto;
create table if not exists public.memory_timelines (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 baby_id uuid null references public.babies(id) on delete set null,
 title text not null default 'Family Memories' check (char_length(title) between 1 and 120),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (baby_id)
);
create table if not exists public.memory_members (
 id uuid primary key default gen_random_uuid(), timeline_id uuid not null references public.memory_timelines(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'contributor' check (role in ('contributor')),
 invited_by uuid null references auth.users(id) on delete set null, accepted_at timestamptz not null default now(),
 created_at timestamptz not null default now(), unique (timeline_id,user_id)
);
create table if not exists public.memory_items (
 id uuid primary key default gen_random_uuid(), timeline_id uuid not null references public.memory_timelines(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete restrict,
 kind text not null default 'story' check (kind in ('photo','video','story','milestone')),
 caption text not null default '' check (char_length(caption) <= 5000), occurred_on date not null default current_date,
 milestone_type text null check (milestone_type is null or char_length(milestone_type) <= 80),
 visibility text not null default 'private' check (visibility in ('private','shared')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null
);
create table if not exists public.memory_media (
 id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memory_items(id) on delete cascade,
 storage_path text not null unique, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime')),
 byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800), created_at timestamptz not null default now()
);
create table if not exists public.memory_invitations (
 id uuid primary key default gen_random_uuid(), timeline_id uuid not null references public.memory_timelines(id) on delete cascade,
 invited_email text not null check (char_length(invited_email) <= 320), role text not null default 'contributor' check (role in ('contributor')),
 token_hash text not null unique, invited_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null, accepted_at timestamptz null, revoked_at timestamptz null, created_at timestamptz not null default now()
);
create table if not exists public.memory_share_links (
 id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memory_items(id) on delete cascade,
 token_hash text not null unique, created_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz null, revoked_at timestamptz null, created_at timestamptz not null default now(),
 check (expires_at is null or expires_at > created_at)
);
create index if not exists memory_timelines_owner_idx on public.memory_timelines(owner_id);
create index if not exists memory_members_user_idx on public.memory_members(user_id);
create index if not exists memory_items_timeline_date_idx on public.memory_items(timeline_id,occurred_on desc) where deleted_at is null;
create index if not exists memory_media_memory_idx on public.memory_media(memory_id);
create index if not exists memory_invitations_timeline_idx on public.memory_invitations(timeline_id,expires_at);
create index if not exists memory_share_links_memory_idx on public.memory_share_links(memory_id);
alter table public.memory_timelines enable row level security;
alter table public.memory_members enable row level security;
alter table public.memory_items enable row level security;
alter table public.memory_media enable row level security;
alter table public.memory_invitations enable row level security;
alter table public.memory_share_links enable row level security;

create policy "memory timelines read members" on public.memory_timelines for select to authenticated using (
 owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=id and mm.user_id=auth.uid()));
create policy "memory timelines insert owner" on public.memory_timelines for insert to authenticated with check(owner_id=auth.uid());
create policy "memory timelines update owner" on public.memory_timelines for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "memory timelines delete owner" on public.memory_timelines for delete to authenticated using(owner_id=auth.uid());

create policy "memory members read owner or self" on public.memory_members for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));
create policy "memory members insert owner" on public.memory_members for insert to authenticated with check (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()) and invited_by=auth.uid());
create policy "memory members delete owner or self" on public.memory_members for delete to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));

create policy "memory items read members" on public.memory_items for select to authenticated using (
 deleted_at is null and exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory items insert members" on public.memory_items for insert to authenticated with check (
 created_by=auth.uid() and visibility='private' and exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory items update owner or author" on public.memory_items for update to authenticated using (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()) or created_by=auth.uid())
 with check (exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid())
 or (created_by=auth.uid() and visibility='private'));
create policy "memory items delete owner or author" on public.memory_items for delete to authenticated using (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()) or created_by=auth.uid());

create policy "memory media read members" on public.memory_media for select to authenticated using (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mi.deleted_at is null and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory media insert members" on public.memory_media for insert to authenticated with check (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mi.created_by=auth.uid() and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory media delete owner or author" on public.memory_media for delete to authenticated using (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and
 (mt.owner_id=auth.uid() or mi.created_by=auth.uid())));

-- Invitations and share links deliberately have no anonymous policies; token resolution must be server-side.
create policy "memory invitations read owner" on public.memory_invitations for select to authenticated using (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));
create policy "memory invitations insert owner" on public.memory_invitations for insert to authenticated with check (
 invited_by=auth.uid() and exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));
create policy "memory invitations update owner" on public.memory_invitations for update to authenticated using (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid())) with check (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));
create policy "memory invitations delete owner" on public.memory_invitations for delete to authenticated using (
 exists(select 1 from public.memory_timelines mt where mt.id=timeline_id and mt.owner_id=auth.uid()));
create policy "memory shares read owner" on public.memory_share_links for select to authenticated using (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mt.owner_id=auth.uid()));
create policy "memory shares insert owner" on public.memory_share_links for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mt.owner_id=auth.uid()));
create policy "memory shares update owner" on public.memory_share_links for update to authenticated using (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mt.owner_id=auth.uid())) with check (
 exists(select 1 from public.memory_items mi join public.memory_timelines mt on mt.id=mi.timeline_id where mi.id=memory_id and mt.owner_id=auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('memory-media','memory-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict(id) do nothing;
create policy "memory storage read members" on storage.objects for select to authenticated using (
 bucket_id='memory-media' and exists(select 1 from public.memory_timelines mt where mt.id::text=(storage.foldername(name))[1] and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory storage upload members" on storage.objects for insert to authenticated with check (
 bucket_id='memory-media' and exists(select 1 from public.memory_timelines mt where mt.id::text=(storage.foldername(name))[1] and
 (mt.owner_id=auth.uid() or exists(select 1 from public.memory_members mm where mm.timeline_id=mt.id and mm.user_id=auth.uid()))));
create policy "memory storage update owner" on storage.objects for update to authenticated using (
 bucket_id='memory-media' and exists(select 1 from public.memory_timelines mt where mt.id::text=(storage.foldername(name))[1] and mt.owner_id=auth.uid())
) with check (bucket_id='memory-media' and exists(select 1 from public.memory_timelines mt where mt.id::text=(storage.foldername(name))[1] and mt.owner_id=auth.uid()));
create policy "memory storage delete owner" on storage.objects for delete to authenticated using (
 bucket_id='memory-media' and exists(select 1 from public.memory_timelines mt where mt.id::text=(storage.foldername(name))[1] and mt.owner_id=auth.uid()));

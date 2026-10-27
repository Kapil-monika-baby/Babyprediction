-- Normalize auth.uid() expressions for policies that already used a SELECT wrapper
-- before the bulk policy optimization. This is a semantics-preserving cleanup.
do $$
declare
  p record;
  v_roles text;
  v_using text;
  v_check text;
  v_table text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'memory_timelines','memory_members','memory_items','memory_media',
        'memory_invitations','memory_share_links'
      )
      and (
        coalesce(qual, '') like '%( SELECT ( SELECT auth.uid() AS uid) AS uid)%'
        or coalesce(with_check, '') like '%( SELECT ( SELECT auth.uid() AS uid) AS uid)%'
      )
  loop
    select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ')
      into v_roles
      from unnest(p.roles) as role_names(r);

    v_table := format('%I.%I', p.schemaname, p.tablename);
    v_using := case when p.qual is null then null
      else replace(p.qual, '( SELECT ( SELECT auth.uid() AS uid) AS uid)', '( SELECT auth.uid() AS uid)') end;
    v_check := case when p.with_check is null then null
      else replace(p.with_check, '( SELECT ( SELECT auth.uid() AS uid) AS uid)', '( SELECT auth.uid() AS uid)') end;

    execute format('drop policy %I on %s', p.policyname, v_table);
    execute format(
      'create policy %I on %s as %s for %s to %s%s%s',
      p.policyname, v_table, lower(p.permissive), lower(p.cmd), v_roles,
      case when v_using is not null then format(' using (%s)', v_using) else '' end,
      case when v_check is not null then format(' with check (%s)', v_check) else '' end
    );
  end loop;
end $$;
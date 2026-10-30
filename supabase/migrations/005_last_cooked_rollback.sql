-- Rollback for 005_last_cooked: forgets when recipes were last cooked (times cooked is kept).

begin;

create or replace function public.record_cooked(rid uuid)
returns integer
language sql
set search_path = public
as $$
  update recipes set times_cooked = times_cooked + 1 where id = rid and deleted_at is null
  returning times_cooked;
$$;

alter table public.recipes drop column last_cooked_at;

commit;

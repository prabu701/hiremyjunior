-- GoTrue's admin API inserts the user first and writes app_metadata in a follow-up UPDATE, so
-- the insert trigger can't see an admin role. Promote on that update instead. app_metadata is
-- writable only with the service role, so users can never trigger this themselves.
create function public.handle_user_promotion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'role' = 'admin'
     and old.raw_app_meta_data ->> 'role' is distinct from 'admin' then
    update public.profiles
       set role = 'admin', status = 'active', onboarded_at = coalesce(onboarded_at, now())
     where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_promoted
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_promotion();

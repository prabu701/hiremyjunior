-- Booking notes: contact details are masked for the *other* side until confirmation, but the
-- author, and the teen's guardians, always see the note as written.
create or replace function public.booking_message_for(b public.bookings, viewer_role text) returns text
language sql stable as $$
  select case
    when public.booking_is_confirmed(b.state) or viewer_role in ('admin', 'parent')
      or (b.origin = 'applied' and viewer_role = 'junior')
      or (b.origin = 'invited' and viewer_role = 'employer')
    then b.message
    else public.mask_contact_info(b.message)
  end;
$$;

do $$
declare
  src text;
begin
  select pg_get_functiondef('public.booking_detail(uuid)'::regprocedure) into src;
  src := replace(src,
    $r$'message', case when revealed or viewer_role in ('admin') then b.message else public.mask_contact_info(b.message) end,$r$,
    $r$'message', public.booking_message_for(b, viewer_role),$r$);
  if position('booking_message_for' in src) = 0 then
    raise exception 'booking_detail did not contain the expected message expression';
  end if;
  execute src;
end $$;

-- The product moved to a web-first design (apps/web) whose default look is Citrus with rounded
-- corners. Pre-launch, accounts still on the old mobile defaults (midnight + sharp) never chose
-- them, so move those too; any other combination was picked deliberately and is kept.
alter table public.profiles alter column theme set default 'citrus';
alter table public.profiles alter column corner_style set default 'rounded';

update public.profiles set theme = 'citrus', corner_style = 'rounded'
 where theme = 'midnight' and corner_style = 'sharp';

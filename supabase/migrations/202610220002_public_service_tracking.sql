-- Public status-only lookup for customer tracking links.
-- Safe fields only: no phone, IMEI, prices, pattern/PIN, or internal notes.
-- Re-runnable migration; run once in Supabase SQL Editor if not already applied.
create or replace function public.get_public_service_tracking(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select jsonb_build_object(
    'ticket', r.data->>'ticket',
    'brand', r.data->>'brand',
    'model', r.data->>'model',
    'status', coalesce(nullif(r.data->>'status',''), 'Diterima'),
    'tracking_history', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'status', item->>'status',
        'at', item->>'at'
      ) order by ord)
       from jsonb_array_elements(
         case when jsonb_typeof(r.data->'tracking_history') = 'array'
              then r.data->'tracking_history' else '[]'::jsonb end
       ) with ordinality as h(item,ord)),
      '[]'::jsonb
    )
  )
  from public.app_records r
  where r.module_key = 'Servis HP'
    and upper(r.data->>'tracking_code') = upper(trim(p_code))
  order by r.created_at desc
  limit 1;
$$;
revoke all on function public.get_public_service_tracking(text) from public;
grant usage on schema public to anon, authenticated;
grant execute on function public.get_public_service_tracking(text) to anon, authenticated;
notify pgrst, 'reload schema';

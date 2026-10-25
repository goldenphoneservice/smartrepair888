-- Harden the public service-tracking RPC against search_path shadowing.
-- This RPC intentionally remains executable by anon because customers use it
-- to look up a repair ticket with a high-entropy tracking code. It returns only
-- a small, explicitly selected set of public tracking fields.
CREATE OR REPLACE FUNCTION public.get_public_service_tracking(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'ticket', r.data->>'ticket',
    'brand', r.data->>'brand',
    'model', r.data->>'model',
    'status', coalesce(nullif(r.data->>'status', ''), 'Diterima'),
    'tracking_history', coalesce(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'status', item->>'status',
            'at', item->>'at'
          ) ORDER BY ord
        )
        FROM pg_catalog.jsonb_array_elements(
          CASE
            WHEN pg_catalog.jsonb_typeof(r.data->'tracking_history') = 'array'
              THEN r.data->'tracking_history'
            ELSE '[]'::pg_catalog.jsonb
          END
        ) WITH ORDINALITY AS h(item, ord)
      ),
      '[]'::pg_catalog.jsonb
    )
  )
  FROM public.app_records AS r
  WHERE r.module_key = 'Servis HP'
    AND upper(r.data->>'tracking_code') = upper(trim(p_code))
  ORDER BY r.created_at DESC
  LIMIT 1;
$function$;

COMMENT ON FUNCTION public.get_public_service_tracking(text) IS
  'Public repair-ticket tracking endpoint. Keep the response limited to customer-safe fields and use high-entropy tracking codes.';

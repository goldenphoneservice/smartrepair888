-- GPS-SMART MANAGEMENT: SKU uniqueness and platform-admin foundation.
-- Run only in project ljngcaylpmdcjhombntl.
-- The app_records SKU index enforces per-tenant uniqueness at the database level.
create unique index if not exists app_records_inventory_sku_unique
  on public.app_records (tenant_id, upper(btrim(data->>'sku')))
  where module_key = 'Inventori' and nullif(btrim(data->>'sku'), '') is not null;

-- Keep owner and activation-code tables private; privileged operations must be performed
-- by server-side Edge Functions that verify auth.uid() against platform_owners.
alter table public.platform_owners enable row level security;
revoke all on public.platform_owners from anon, authenticated;

alter table public.platform_activation_codes enable row level security;
revoke all on public.platform_activation_codes from anon, authenticated;

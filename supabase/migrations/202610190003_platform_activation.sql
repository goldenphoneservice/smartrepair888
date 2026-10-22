-- GPS-SMART platform subscriptions. Apply only to project ljngcaylpmdcjhombntl.
create table if not exists public.platform_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan_name text not null,
  status text not null default 'active' check (status in ('active','expired','suspended')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  activated_by uuid references auth.users(id) on delete set null,
  activation_method text not null check (activation_method in ('admin','code')),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.platform_subscriptions enable row level security;
revoke all on public.platform_subscriptions from anon, authenticated;
-- SKU uniqueness at database level, per workspace.
create unique index if not exists app_records_inventory_sku_unique
  on public.app_records (tenant_id, upper(btrim(data->>'sku')))
  where module_key = 'Inventori' and nullif(btrim(data->>'sku'), '') is not null;
-- Keep platform secrets private. All privileged writes must go through the Edge Function.
alter table public.platform_owners enable row level security;
revoke all on public.platform_owners from anon, authenticated;
alter table public.platform_activation_codes enable row level security;
revoke all on public.platform_activation_codes from anon, authenticated;

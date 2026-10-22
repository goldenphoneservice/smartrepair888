-- GPS-SMART MANAGEMENT: generic tenant-scoped records for modules still using flexible payloads.
-- Apply this migration in Supabase SQL Editor. No service_role key is used by the frontend.
create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null check (module_key in ('Servis HP','Pelanggan','Inventori','Penjualan','Pembelian','Akuntansi','Pengeluaran','Tim & Akses','Langganan')),
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_records_tenant_module_created_idx
  on public.app_records (tenant_id, module_key, created_at desc);
alter table public.app_records enable row level security;

drop policy if exists "app_records_select_member" on public.app_records;
create policy "app_records_select_member" on public.app_records
for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.tenant_id = app_records.tenant_id
    and m.user_id = auth.uid()
    and m.is_active = true
));

drop policy if exists "app_records_insert_member" on public.app_records;
create policy "app_records_insert_member" on public.app_records
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.memberships m
    where m.tenant_id = app_records.tenant_id
      and m.user_id = auth.uid()
      and m.is_active = true
  )
);

drop policy if exists "app_records_update_member" on public.app_records;
create policy "app_records_update_member" on public.app_records
for update to authenticated
using (exists (
  select 1 from public.memberships m
  where m.tenant_id = app_records.tenant_id
    and m.user_id = auth.uid()
    and m.is_active = true
))
with check (exists (
  select 1 from public.memberships m
  where m.tenant_id = app_records.tenant_id
    and m.user_id = auth.uid()
    and m.is_active = true
));

drop policy if exists "app_records_delete_member" on public.app_records;
create policy "app_records_delete_member" on public.app_records
for delete to authenticated
using (exists (
  select 1 from public.memberships m
  where m.tenant_id = app_records.tenant_id
    and m.user_id = auth.uid()
    and m.is_active = true
));

comment on table public.app_records is 'Tenant-scoped flexible records for GPS-SMART modules; validate domain-specific workflows before production.';

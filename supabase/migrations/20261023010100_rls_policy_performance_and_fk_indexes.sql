-- Applied to Supabase project ljngcaylpmdcjhombntl on 2026-10-23.
-- Performance-only RLS optimization and covering indexes. No business data changed.
drop policy if exists app_records_select_member on public.app_records;
create policy app_records_select_member on public.app_records for select to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = app_records.tenant_id and m.user_id = (select auth.uid()) and m.is_active = true));

drop policy if exists app_records_insert_member on public.app_records;
create policy app_records_insert_member on public.app_records for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.memberships m where m.tenant_id = app_records.tenant_id and m.user_id = (select auth.uid()) and m.is_active = true));

drop policy if exists app_records_update_member on public.app_records;
create policy app_records_update_member on public.app_records for update to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = app_records.tenant_id and m.user_id = (select auth.uid()) and m.is_active = true))
with check (exists (select 1 from public.memberships m where m.tenant_id = app_records.tenant_id and m.user_id = (select auth.uid()) and m.is_active = true));

drop policy if exists app_records_delete_member on public.app_records;
create policy app_records_delete_member on public.app_records for delete to authenticated
using (exists (select 1 from public.memberships m where m.tenant_id = app_records.tenant_id and m.user_id = (select auth.uid()) and m.is_active = true));

create index if not exists app_records_created_by_idx on public.app_records (created_by);
create index if not exists platform_activation_codes_created_by_idx on public.platform_activation_codes (created_by);
create index if not exists platform_activation_codes_redeemed_by_tenant_idx on public.platform_activation_codes (redeemed_by_tenant);
create index if not exists platform_subscriptions_activated_by_idx on public.platform_subscriptions (activated_by);
create index if not exists purchases_tenant_supplier_idx on public.purchases (tenant_id, supplier_id);
create index if not exists service_parts_tenant_product_idx on public.service_parts (tenant_id, product_id);
create index if not exists service_parts_tenant_service_order_idx on public.service_parts (tenant_id, service_order_id);

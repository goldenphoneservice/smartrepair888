-- Safe, non-destructive indexes for inventory and supplier records stored in app_records JSON.
create index if not exists app_records_inventory_tenant_created_idx
  on public.app_records (tenant_id, created_at desc)
  where module_key = 'Inventori';

create index if not exists app_records_supplier_tenant_created_idx
  on public.app_records (tenant_id, created_at desc)
  where module_key = 'Supplier';

create index if not exists app_records_inventory_sku_lookup_idx
  on public.app_records (tenant_id, upper(coalesce(data->>'sku', '')))
  where module_key = 'Inventori';

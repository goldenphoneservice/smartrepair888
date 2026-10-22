-- GPS-SMART MANAGEMENT: service workflow lookup indexes.
-- Non-destructive; does not change existing records or expose credentials.
create index if not exists app_records_service_ticket_lookup_idx
  on public.app_records (tenant_id, (data->>'ticket'))
  where module_key = 'Servis HP' and coalesce(data->>'ticket','') <> '';
create index if not exists app_records_service_tracking_lookup_idx
  on public.app_records (tenant_id, (data->>'tracking_code'))
  where module_key = 'Servis HP' and coalesce(data->>'tracking_code','') <> '';
create index if not exists app_records_inventory_sku_lookup_idx
  on public.app_records (tenant_id, (upper(data->>'sku')))
  where module_key = 'Inventori' and coalesce(data->>'sku','') <> '';

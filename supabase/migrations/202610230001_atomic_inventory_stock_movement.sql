-- Atomic tenant-scoped inventory update + ledger insert.
-- Both changes run in one PostgreSQL transaction; row lock prevents concurrent overselling.
create or replace function public.apply_inventory_stock_movement(
  p_tenant_id uuid,
  p_product_id uuid,
  p_delta integer,
  p_movement_type text,
  p_reference text default '',
  p_notes text default '',
  p_movement_date date default current_date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_record public.app_records%rowtype;
  v_before integer;
  v_after integer;
  v_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Jumlah perubahan stok tidak boleh nol' using errcode = '22023';
  end if;
  if p_movement_type is null or length(trim(p_movement_type)) = 0 then
    raise exception 'Jenis pergerakan stok wajib diisi' using errcode = '22023';
  end if;

  -- Explicit membership check provides a clear tenant boundary in addition to RLS.
  if not exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
      and m.is_active = true
  ) then
    raise exception 'Workspace tidak ditemukan atau akses ditolak' using errcode = '42501';
  end if;

  select * into v_record
  from public.app_records
  where id = p_product_id
    and tenant_id = p_tenant_id
    and module_key = 'Inventori'
  for update;

  if not found then
    raise exception 'Produk inventori tidak ditemukan' using errcode = 'P0002';
  end if;

  v_data := coalesce(v_record.data, '{}'::jsonb);
  v_before := coalesce(nullif(v_data->>'stock', '')::numeric, 0)::integer;
  v_after := v_before + p_delta;
  if v_after < 0 then
    raise exception 'Stok tidak cukup. Stok saat ini %, perubahan %', v_before, p_delta using errcode = '23514';
  end if;

  update public.app_records
  set data = jsonb_set(v_data, '{stock}', to_jsonb(v_after::text), true),
      updated_at = now()
  where id = p_product_id and tenant_id = p_tenant_id;

  insert into public.app_records (tenant_id, module_key, data, created_by)
  values (
    p_tenant_id,
    'Riwayat Stok',
    jsonb_build_object(
      'date', coalesce(p_movement_date, current_date)::text,
      'movement_type', p_movement_type,
      'sku', coalesce(v_data->>'sku', ''),
      'product', coalesce(v_data->>'name', ''),
      'quantity', p_delta::text,
      'reference', coalesce(p_reference, ''),
      'notes', coalesce(p_notes, '')
    ),
    auth.uid()
  );

  return jsonb_build_object('ok', true, 'before', v_before, 'after', v_after, 'delta', p_delta);
end;
$$;

revoke all on function public.apply_inventory_stock_movement(uuid, uuid, integer, text, text, text, date) from public, anon;
grant execute on function public.apply_inventory_stock_movement(uuid, uuid, integer, text, text, text, date) to authenticated;

comment on function public.apply_inventory_stock_movement(uuid, uuid, integer, text, text, text, date)
is 'Atomically updates tenant inventory stock and inserts a stock ledger record.';

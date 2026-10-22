create or replace function public.post_app_record_sale_atomic(
  p_tenant_id uuid, p_invoice text, p_customer text, p_item text,
  p_quantity numeric, p_total numeric, p_payment text
)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_sale_id uuid;
  v_product public.app_records%rowtype;
  v_before numeric;
  v_after numeric;
  v_delta numeric := 0;
  v_item text := trim(coalesce(p_item,''));
  v_payment text := trim(coalesce(p_payment,''));
  v_qty numeric := coalesce(p_quantity,1);
  v_total numeric := coalesce(p_total,0);
  v_payload jsonb;
begin
  if v_user is null then raise exception 'Login diperlukan' using errcode='28000'; end if;
  if not exists (select 1 from public.memberships m where m.tenant_id=p_tenant_id and m.user_id=v_user and m.is_active=true) then
    raise exception 'Akses workspace ditolak' using errcode='42501';
  end if;
  if nullif(trim(coalesce(p_invoice,'')),'') is null then raise exception 'Nomor nota wajib diisi' using errcode='22023'; end if;
  if v_item='' then raise exception 'Barang atau jasa wajib diisi' using errcode='22023'; end if;
  if v_qty <= 0 then raise exception 'Jumlah harus lebih dari nol' using errcode='22023'; end if;
  if v_total < 0 then raise exception 'Total tidak boleh negatif' using errcode='22023'; end if;
  if v_payment='' then raise exception 'Metode pembayaran wajib diisi' using errcode='22023'; end if;

  select * into v_product from public.app_records
  where tenant_id=p_tenant_id and module_key='Inventori'
    and (upper(coalesce(data->>'sku',''))=upper(v_item) or upper(trim(coalesce(data->>'name','')))=upper(v_item))
  order by created_at desc limit 1 for update;

  if found then
    v_before := coalesce(nullif(v_product.data->>'stock','')::numeric,0);
    if v_before < v_qty then
      raise exception 'Stok tidak cukup untuk %. Stok %, diminta %', coalesce(v_product.data->>'name',v_item), v_before, v_qty using errcode='23514';
    end if;
    v_after := v_before-v_qty;
    update public.app_records
    set data=jsonb_set(coalesce(data,'{}'::jsonb),'{stock}',to_jsonb(v_after::text),true),updated_at=now()
    where id=v_product.id and tenant_id=p_tenant_id;
    v_delta := -v_qty;
  end if;

  v_payload := jsonb_build_object(
    'invoice',trim(p_invoice),'customer',coalesce(p_customer,'Umum'),
    'item',v_item,'qty',v_qty::text,'total',v_total::text,'payment',v_payment,
    'posted_at',now()::text,'stock_tracked',(v_product.id is not null),
    'product_id',case when v_product.id is null then null else v_product.id::text end
  );
  insert into public.app_records(tenant_id,module_key,data,created_by)
  values(p_tenant_id,'Penjualan',v_payload,v_user) returning id into v_sale_id;

  if v_product.id is not null then
    insert into public.app_records(tenant_id,module_key,data,created_by)
    values(p_tenant_id,'Riwayat Stok',jsonb_build_object(
      'date',current_date::text,'movement_type','Terjual',
      'sku',coalesce(v_product.data->>'sku',''),'product',coalesce(v_product.data->>'name',v_item),
      'quantity',v_delta::text,'reference',trim(p_invoice),
      'notes','Otomatis dari penjualan atomik','sale_record_id',v_sale_id::text
    ),v_user);
  end if;
  return jsonb_build_object('ok',true,'sale_id',v_sale_id,'stock_tracked',v_product.id is not null,
    'stock_before',v_before,'stock_after',v_after,'quantity',v_qty,'total',v_total);
end; $$;
revoke all on function public.post_app_record_sale_atomic(uuid,text,text,text,numeric,numeric,text) from public,anon;
grant execute on function public.post_app_record_sale_atomic(uuid,text,text,text,numeric,numeric,text) to authenticated;
comment on function public.post_app_record_sale_atomic(uuid,text,text,text,numeric,numeric,text)
is 'Atomically saves legacy app_records sale and, when item matches inventory SKU/name, deducts stock and writes stock ledger.';

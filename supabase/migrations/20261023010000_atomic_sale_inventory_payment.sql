-- GPS-SMART-MANAGEMENT: atomic sale posting
-- Applied to project ljngcaylpmdcjhombntl on 2026-10-23.
-- Do not re-run manually against a different project without reviewing it.
create or replace function public.post_sale_atomic(
  p_tenant_id uuid, p_invoice_number text, p_customer_id uuid,
  p_discount numeric, p_payment_method text, p_items jsonb
)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item jsonb; v_product_id uuid; v_quantity numeric; v_unit_price numeric;
  v_unit_cost numeric; v_stock numeric; v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount, 0); v_total numeric;
  v_sale_id uuid := gen_random_uuid(); v_line_total numeric;
  v_invoice text := nullif(trim(p_invoice_number), '');
begin
  if v_user_id is null then raise exception 'Login diperlukan' using errcode = '28000'; end if;
  if not exists (select 1 from public.memberships m where m.tenant_id=p_tenant_id and m.user_id=v_user_id and m.is_active=true and m.role in ('owner','manager')) then
    raise exception 'Akses workspace ditolak' using errcode = '42501';
  end if;
  if v_invoice is null then raise exception 'Nomor invoice wajib diisi' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Daftar barang tidak boleh kosong' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) x(value) group by value->>'product_id' having count(*) > 1) then
    raise exception 'Produk duplikat dalam daftar. Gabungkan jumlah produk menjadi satu baris.' using errcode = '22023';
  end if;
  if v_discount < 0 then raise exception 'Diskon tidak boleh negatif' using errcode = '22023'; end if;
  if p_payment_method not in ('cash','bank_transfer','card','other') then
    raise exception 'Metode pembayaran tidak valid' using errcode = '22023';
  end if;
  if p_customer_id is not null and not exists (select 1 from public.customers c where c.id=p_customer_id and c.tenant_id=p_tenant_id) then
    raise exception 'Pelanggan tidak ditemukan di workspace ini' using errcode = '23503';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    if v_quantity is null or v_quantity <= 0 or v_unit_price is null or v_unit_price < 0 then
      raise exception 'Jumlah barang atau harga tidak valid' using errcode = '22023';
    end if;
    select p.stock_quantity, p.cost_price into v_stock, v_unit_cost from public.products p
    where p.id=v_product_id and p.tenant_id=p_tenant_id and p.is_active=true for update;
    if not found then raise exception 'Produk tidak ditemukan atau tidak aktif: %', v_product_id using errcode = 'P0002'; end if;
    if v_stock < v_quantity then raise exception 'Stok tidak cukup untuk produk % (stok %, diminta %)', v_product_id, v_stock, v_quantity using errcode = '23514'; end if;
    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
  end loop;

  if v_discount > v_subtotal then raise exception 'Diskon tidak boleh melebihi subtotal' using errcode = '22023'; end if;
  v_total := v_subtotal-v_discount;
  insert into public.sales (id,tenant_id,invoice_number,customer_id,status,subtotal,discount,total,created_by)
  values (v_sale_id,p_tenant_id,v_invoice,p_customer_id,'posted',v_subtotal,v_discount,v_total,v_user_id);

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    select p.stock_quantity,p.cost_price into v_stock,v_unit_cost from public.products p
    where p.id=v_product_id and p.tenant_id=p_tenant_id and p.is_active=true for update;
    v_line_total := v_quantity*v_unit_price;
    insert into public.sale_items (tenant_id,sale_id,product_id,quantity,unit_price,unit_cost,line_total)
    values (p_tenant_id,v_sale_id,v_product_id,v_quantity,v_unit_price,coalesce(v_unit_cost,0),v_line_total);
    update public.products set stock_quantity=stock_quantity-v_quantity,updated_at=now()
    where id=v_product_id and tenant_id=p_tenant_id;
    insert into public.stock_movements (tenant_id,product_id,quantity_delta,reason,reference_type,reference_id,created_by)
    values (p_tenant_id,v_product_id,-v_quantity,'sale','sale',v_sale_id,v_user_id);
  end loop;

  if v_total > 0 then
    insert into public.payments (tenant_id,direction,method,amount,reference_type,reference_id,paid_at,created_by)
    values (p_tenant_id,'in',p_payment_method,v_total,'sale',v_sale_id,now(),v_user_id);
  end if;
  return jsonb_build_object('ok',true,'sale_id',v_sale_id,'invoice_number',v_invoice,'subtotal',v_subtotal,'discount',v_discount,'total',v_total,'items',jsonb_array_length(p_items));
end; $$;
revoke all on function public.post_sale_atomic(uuid,text,uuid,numeric,text,jsonb) from public,anon;
grant execute on function public.post_sale_atomic(uuid,text,uuid,numeric,text,jsonb) to authenticated;
comment on function public.post_sale_atomic(uuid,text,uuid,numeric,text,jsonb) is 'Atomically posts sale, lines, inventory deductions, stock movements, and full payment; currently owner/manager only due existing product-update RLS.';

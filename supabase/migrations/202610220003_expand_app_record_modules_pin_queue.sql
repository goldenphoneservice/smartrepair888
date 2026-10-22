-- Expand flexible module records for the operational menus in GPS-SMART-MANAGEMENT.
-- Non-destructive: keeps existing rows and changes only the allowed module_key values.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.app_records'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%module_key%'
  loop
    execute format('alter table public.app_records drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.app_records
  add constraint app_records_module_key_check
  check (module_key in (
    'Servis HP','Pelanggan','Inventori','Penjualan','Pembelian',
    'Supplier','Retur Produk','Perangkat HP','Aset & Inventaris',
    'Promosi & Voucher','Website Toko','PIN & Pola',
    'Akuntansi','Pengeluaran','Tim & Akses','Langganan'
  ));

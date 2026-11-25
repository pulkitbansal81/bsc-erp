-- v42.2: ws_stock mein opening_qty bhi (Busy-style Opening/Closing columns ke liye)
create or replace function ws_stock()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
    select vi.item_code, i.name as item_name, i.category_code, c.name as category_name,
           vi.warehouse_code, vi.batch,
           sum(case
                 when v.vtype in ('PURCHASE','OPENING','SRETURN') then vi.qty
                 when v.vtype = 'SALE' then -vi.qty
                 when v.vtype = 'HOLD' and v.status = 'Open' then -vi.qty
                 else 0 end) as qty,
           sum(case when v.vtype = 'OPENING' then vi.qty else 0 end) as opening_qty
    from ws_voucher_items vi
    join ws_vouchers v on v.vno = vi.vno
    join ws_items i on i.code = vi.item_code
    join ws_categories c on c.code = i.category_code
    where (v.status in ('Active','Open'))
    group by vi.item_code, i.name, i.category_code, c.name, vi.warehouse_code, vi.batch
  ) x
$$;

-- v44: dispatch fields + sale-return cartage/unloading MINUS
alter table ws_vouchers add column if not exists auto_person text not null default '';
alter table ws_vouchers add column if not exists dispatch_notes text not null default '';
alter table ws_vouchers add column if not exists dispatched_at timestamptz;

-- post: SRETURN mein cartage/unloading minus hota hai
create or replace function ws_post_voucher(p_v jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t text := upper(coalesce(p_v->>'vtype','')); pref text; vno_ text; it jsonb;
  itotal numeric := 0; gt numeric; sgn int;
  pc text := coalesce(p_v->>'party_code',''); pn text := ''; inm text; n int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('ws_post'));
  pref := case t when 'PURCHASE' then 'PV' when 'SALE' then 'SV' when 'SRETURN' then 'SR'
                 when 'HOLD' then 'HO' when 'OPENING' then 'OP' else null end;
  if pref is null then raise exception 'Voucher type galat: %', t; end if;
  if t <> 'OPENING' then
    select name into pn from ws_parties where code = pc and status = 'Active';
    if pn is null then raise exception 'Party nahi mili — pehle Party Master mein add karo'; end if;
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if coalesce((it->>'qty')::numeric,0) <> 0 then n := n + 1; itotal := itotal + coalesce((it->>'qty')::numeric,0) * coalesce((it->>'price')::numeric,0); end if;
  end loop;
  if n = 0 then raise exception 'Kam se kam ek item chahiye'; end if;
  sgn := case when t = 'SRETURN' then -1 else 1 end;
  gt := itotal + sgn * (coalesce((p_v->>'cartage')::numeric,0) + coalesce((p_v->>'unloading')::numeric,0));
  vno_ := ws_next_no(pref);
  insert into ws_vouchers(vno, vtype, vdate, party_code, party_name, cartage, unloading, items_total, grand_total,
                          delivery_address, delivery_phone, driver, notes, status, created_by)
  values (vno_, t, coalesce((p_v->>'vdate')::date, current_date), pc, coalesce(pn,''),
          coalesce((p_v->>'cartage')::numeric,0), coalesce((p_v->>'unloading')::numeric,0), itotal, gt,
          coalesce(p_v->>'delivery_address',''), coalesce(p_v->>'delivery_phone',''), coalesce(p_v->>'driver',''), coalesce(p_v->>'notes',''),
          case when t = 'HOLD' then 'Open' else 'Active' end, coalesce(p_v->>'created_by',''));
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if coalesce((it->>'qty')::numeric,0) = 0 then continue; end if;
    select name into inm from ws_items where code = it->>'item_code';
    if inm is null then raise exception 'Item nahi mila: %', coalesce(it->>'item_code','?'); end if;
    insert into ws_voucher_items(vno, item_code, item_name, warehouse_code, batch, qty, price, amount, unit)
    values (vno_, it->>'item_code', inm, coalesce(it->>'warehouse_code',''), trim(coalesce(it->>'batch','')),
            (it->>'qty')::numeric, coalesce((it->>'price')::numeric,0),
            (it->>'qty')::numeric * coalesce((it->>'price')::numeric,0), coalesce(nullif(it->>'unit',''),'Box'));
  end loop;
  return jsonb_build_object('vno', vno_, 'items_total', itotal, 'grand_total', gt, 'party_name', coalesce(pn,''));
end $$;

create or replace function ws_edit_voucher(p_vno text, p_v jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st text; t text; it jsonb; itotal numeric := 0; gt numeric; sgn int;
  pc text := coalesce(p_v->>'party_code',''); pn text := ''; inm text; n int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('ws_post'));
  select status, vtype into st, t from ws_vouchers where vno = p_vno;
  if st is null then raise exception 'Voucher nahi mila: %', p_vno; end if;
  if st not in ('Active','Open') then raise exception 'Ye voucher % hai — edit nahi ho sakta', st; end if;
  if t <> 'OPENING' then
    select name into pn from ws_parties where code = pc and status = 'Active';
    if pn is null then raise exception 'Party nahi mili'; end if;
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if coalesce((it->>'qty')::numeric,0) <> 0 then n := n + 1; itotal := itotal + coalesce((it->>'qty')::numeric,0) * coalesce((it->>'price')::numeric,0); end if;
  end loop;
  if n = 0 then raise exception 'Kam se kam ek item chahiye'; end if;
  sgn := case when t = 'SRETURN' then -1 else 1 end;
  gt := itotal + sgn * (coalesce((p_v->>'cartage')::numeric,0) + coalesce((p_v->>'unloading')::numeric,0));
  update ws_vouchers set
    vdate = coalesce((p_v->>'vdate')::date, vdate), party_code = pc, party_name = coalesce(pn, party_name),
    cartage = coalesce((p_v->>'cartage')::numeric,0), unloading = coalesce((p_v->>'unloading')::numeric,0),
    items_total = itotal, grand_total = gt,
    delivery_address = coalesce(p_v->>'delivery_address',''), delivery_phone = coalesce(p_v->>'delivery_phone',''),
    driver = coalesce(p_v->>'driver',''), notes = coalesce(p_v->>'notes','')
  where vno = p_vno;
  delete from ws_voucher_items where vno = p_vno;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if coalesce((it->>'qty')::numeric,0) = 0 then continue; end if;
    select name into inm from ws_items where code = it->>'item_code';
    if inm is null then raise exception 'Item nahi mila: %', coalesce(it->>'item_code','?'); end if;
    insert into ws_voucher_items(vno, item_code, item_name, warehouse_code, batch, qty, price, amount, unit)
    values (p_vno, it->>'item_code', inm, coalesce(it->>'warehouse_code',''), trim(coalesce(it->>'batch','')),
            (it->>'qty')::numeric, coalesce((it->>'price')::numeric,0),
            (it->>'qty')::numeric * coalesce((it->>'price')::numeric,0), coalesce(nullif(it->>'unit',''),'Box'));
  end loop;
  return jsonb_build_object('vno', p_vno, 'items_total', itotal, 'grand_total', gt);
end $$;

-- dispatch status set (SALE only)
create or replace function ws_set_dispatch(p_vno text, p_status text, p_auto text, p_notes text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update ws_vouchers set dispatch_status = coalesce(p_status,''), auto_person = coalesce(p_auto,''),
    dispatch_notes = coalesce(p_notes,''), dispatched_at = case when p_status='Dispatched' then now() else dispatched_at end
  where vno = p_vno and vtype = 'SALE' and status = 'Active';
  if not found then raise exception 'Sale voucher nahi mila: %', p_vno; end if;
  return true;
end $$;

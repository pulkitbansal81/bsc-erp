-- ============================================================
-- WHOLESALE MODULE (proper accounting structure — positional model nahi)
-- Hierarchy: Category → Item → Batch. Stock hamesha vouchers se DERIVED hota hai
-- (kabhi out-of-sync nahi ho sakta): PURCHASE/OPENING/SRETURN = +, SALE = −, HOLD(Open) = −.
-- ============================================================

create table if not exists ws_categories (
  code text primary key,
  name text not null unique,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists ws_items (
  code text primary key,
  name text not null,
  category_code text not null references ws_categories(code),
  sp1 numeric,            -- selling price list 1 (optional)
  sp2 numeric,            -- selling price list 2 (optional)
  purchase_price numeric, -- optional
  status text not null default 'Active',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists ws_items_name_uq on ws_items (lower(name));
create table if not exists ws_parties (
  code text primary key,
  name text not null,
  phone text not null,
  ptype text not null default 'CUSTOMER',   -- CUSTOMER | SUPPLIER
  credit text not null default 'No',        -- Yes | No
  credit_days int,
  credit_limit numeric,
  price_list text not null default 'P1',    -- P1 | P2
  opening_balance numeric not null default 0, -- + = party se lena hai, − = dena hai
  status text not null default 'Active',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists ws_parties_name_uq on ws_parties (lower(name));
create table if not exists ws_warehouses (
  code text primary key,
  name text not null unique,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists ws_vouchers (
  vno text primary key,
  vtype text not null,                      -- PURCHASE | SALE | SRETURN | HOLD | OPENING
  vdate date not null,
  party_code text not null default '',
  party_name text not null default '',
  cartage numeric not null default 0,
  unloading numeric not null default 0,
  items_total numeric not null default 0,
  grand_total numeric not null default 0,
  delivery_address text not null default '',
  delivery_phone text not null default '',
  notes text not null default '',
  status text not null default 'Active',    -- Active | Cancelled | (HOLD: Open | Converted | Cancelled)
  converted_to text not null default '',    -- HOLD → SALE vno
  created_by text not null default '',
  created_at timestamptz not null default now(),
  cancelled_by text not null default '',
  cancelled_at timestamptz
);
create index if not exists ws_vouchers_type_idx on ws_vouchers (vtype, vdate);
create index if not exists ws_vouchers_party_idx on ws_vouchers (party_code);
create table if not exists ws_voucher_items (
  id bigint generated always as identity primary key,
  vno text not null references ws_vouchers(vno),
  item_code text not null,
  item_name text not null default '',
  warehouse_code text not null default '',
  batch text not null default '',
  qty numeric not null,
  price numeric not null default 0,
  amount numeric not null default 0
);
create index if not exists ws_vitems_vno_idx on ws_voucher_items (vno);
create index if not exists ws_vitems_item_idx on ws_voucher_items (item_code);
create table if not exists ws_payments (
  pno text primary key,
  pdate date not null,
  party_code text not null,
  party_name text not null default '',
  amount numeric not null,
  direction text not null,                  -- IN (received) | OUT (paid)
  source text not null default 'Cash',
  notes text not null default '',
  status text not null default 'Active',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ws_payments_party_idx on ws_payments (party_code);
create table if not exists ws_expenses (
  eno text primary key,
  edate date not null,
  amount numeric not null,
  category text not null default '',
  detail text not null default '',
  source text not null default 'Cash',
  notes text not null default '',
  status text not null default 'Active',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists ws_counters (
  prefix text primary key,
  n bigint not null default 0
);

-- service-role-only, retail jaisa hi
alter table ws_categories enable row level security;
alter table ws_items enable row level security;
alter table ws_parties enable row level security;
alter table ws_warehouses enable row level security;
alter table ws_vouchers enable row level security;
alter table ws_voucher_items enable row level security;
alter table ws_payments enable row level security;
alter table ws_expenses enable row level security;
alter table ws_counters enable row level security;

-- ---------- numbering ----------
create or replace function ws_next_no(p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into ws_counters(prefix, n) values (p_prefix, 1)
    on conflict (prefix) do update set n = ws_counters.n + 1
    returning n into v;
  return p_prefix || lpad(v::text, 4, '0');
end $$;

-- ---------- voucher post (atomic: number + voucher + items) ----------
-- p_v: {vtype, vdate, party_code, cartage, unloading, delivery_address, delivery_phone, notes, created_by}
-- p_items: [{item_code, warehouse_code, batch, qty, price}]
create or replace function ws_post_voucher(p_v jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t text := upper(coalesce(p_v->>'vtype',''));
  pref text; vno_ text; it jsonb; itotal numeric := 0; gt numeric;
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
  gt := itotal + coalesce((p_v->>'cartage')::numeric,0) + coalesce((p_v->>'unloading')::numeric,0);
  vno_ := ws_next_no(pref);
  insert into ws_vouchers(vno, vtype, vdate, party_code, party_name, cartage, unloading, items_total, grand_total,
                          delivery_address, delivery_phone, notes, status, created_by)
  values (vno_, t, coalesce((p_v->>'vdate')::date, current_date), pc, coalesce(pn,''),
          coalesce((p_v->>'cartage')::numeric,0), coalesce((p_v->>'unloading')::numeric,0), itotal, gt,
          coalesce(p_v->>'delivery_address',''), coalesce(p_v->>'delivery_phone',''), coalesce(p_v->>'notes',''),
          case when t = 'HOLD' then 'Open' else 'Active' end, coalesce(p_v->>'created_by',''));
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if coalesce((it->>'qty')::numeric,0) = 0 then continue; end if;
    select name into inm from ws_items where code = it->>'item_code';
    if inm is null then raise exception 'Item nahi mila: %', coalesce(it->>'item_code','?'); end if;
    insert into ws_voucher_items(vno, item_code, item_name, warehouse_code, batch, qty, price, amount)
    values (vno_, it->>'item_code', inm, coalesce(it->>'warehouse_code',''), trim(coalesce(it->>'batch','')),
            (it->>'qty')::numeric, coalesce((it->>'price')::numeric,0),
            (it->>'qty')::numeric * coalesce((it->>'price')::numeric,0));
  end loop;
  return jsonb_build_object('vno', vno_, 'items_total', itotal, 'grand_total', gt, 'party_name', coalesce(pn,''));
end $$;

-- ---------- cancel (stock derived hai — status badalte hi wapas) ----------
create or replace function ws_cancel_voucher(p_vno text, p_by text)
returns boolean language plpgsql security definer set search_path = public as $$
declare st text; t text;
begin
  perform pg_advisory_xact_lock(hashtext('ws_post'));
  select status, vtype into st, t from ws_vouchers where vno = p_vno;
  if st is null then raise exception 'Voucher nahi mila: %', p_vno; end if;
  if st = 'Cancelled' then return true; end if;
  if t = 'HOLD' and st = 'Converted' then raise exception 'Ye hold pehle hi Sale ban chuka hai'; end if;
  update ws_vouchers set status = 'Cancelled', cancelled_by = coalesce(p_by,''), cancelled_at = now() where vno = p_vno;
  return true;
end $$;

-- ---------- hold → sale (atomic) ----------
create or replace function ws_convert_hold(p_hold text, p_v jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st text; t text; res jsonb;
begin
  select status, vtype into st, t from ws_vouchers where vno = p_hold;
  if t is distinct from 'HOLD' then raise exception 'Hold voucher nahi mila: %', p_hold; end if;
  if st <> 'Open' then raise exception 'Ye hold % hai — convert nahi ho sakta', st; end if;
  p_v := jsonb_set(p_v, '{vtype}', '"SALE"');
  res := ws_post_voucher(p_v, p_items);
  update ws_vouchers set status = 'Converted', converted_to = res->>'vno' where vno = p_hold;
  return res;
end $$;

-- ---------- stock: item × warehouse × batch (derived) ----------
create or replace function ws_stock()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
    select vi.item_code, i.name as item_name, i.category_code, c.name as category_name,
           vi.warehouse_code, vi.batch,
           sum(case
                 when v.vtype in ('PURCHASE','OPENING','SRETURN') then vi.qty
                 when v.vtype = 'SALE' then -vi.qty
                 when v.vtype = 'HOLD' and v.status = 'Open' then -vi.qty
                 else 0 end) as qty
    from ws_voucher_items vi
    join ws_vouchers v on v.vno = vi.vno
    join ws_items i on i.code = vi.item_code
    join ws_categories c on c.code = i.category_code
    where (v.status in ('Active','Open'))
    group by vi.item_code, i.name, i.category_code, c.name, vi.warehouse_code, vi.batch
  ) x
$$;

-- ---------- item ledger (movement list) ----------
create or replace function ws_item_ledger(p_item text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.vdate, x.created_at), '[]'::jsonb) from (
    select v.vno, v.vtype, v.vdate, v.party_name, v.status, v.created_at,
           vi.warehouse_code, vi.batch, vi.qty, vi.price,
           case when v.vtype in ('PURCHASE','OPENING','SRETURN') then vi.qty
                when v.vtype = 'SALE' then -vi.qty
                when v.vtype = 'HOLD' and v.status = 'Open' then -vi.qty
                else 0 end as delta
    from ws_voucher_items vi join ws_vouchers v on v.vno = vi.vno
    where vi.item_code = p_item and v.status in ('Active','Open')
  ) x
$$;

-- ---------- party ledger: SALE + / SRETURN − / payment IN − / payment OUT + (supplier: PURCHASE −? )
-- Simple accounting: customer side — sale se lena banta hai (+), return aur payment IN se ghat'ta (−).
-- Supplier side — purchase se dena banta hai (−), payment OUT se barabar hota hai (+). Hold ledger mein NAHI.
create or replace function ws_party_ledger(p_party text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.d, x.created_at), '[]'::jsonb) from (
    select v.vno as ref, v.vtype as kind, v.vdate as d, v.grand_total as amt, '' as source, v.notes, v.created_at,
           case when v.vtype = 'SALE' then v.grand_total
                when v.vtype = 'SRETURN' then -v.grand_total
                when v.vtype = 'PURCHASE' then -v.grand_total
                else 0 end as delta
    from ws_vouchers v
    where v.party_code = p_party and v.status = 'Active' and v.vtype in ('SALE','SRETURN','PURCHASE')
    union all
    select p.pno, 'PAYMENT-' || p.direction, p.pdate, p.amount, p.source, p.notes, p.created_at,
           case when p.direction = 'IN' then -p.amount else p.amount end
    from ws_payments p where p.party_code = p_party and p.status = 'Active'
  ) x
$$;

-- ---------- party outstanding (list screens ke liye, ek call) ----------
create or replace function ws_party_balances()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
    select p.code, p.opening_balance + coalesce(v.d, 0) + coalesce(pay.d, 0) as balance
    from ws_parties p
    left join (
      select party_code, sum(case when vtype = 'SALE' then grand_total when vtype = 'SRETURN' then -grand_total
                                  when vtype = 'PURCHASE' then -grand_total else 0 end) as d
      from ws_vouchers where status = 'Active' group by party_code
    ) v on v.party_code = p.code
    left join (
      select party_code, sum(case when direction = 'IN' then -amount else amount end) as d
      from ws_payments where status = 'Active' group by party_code
    ) pay on pay.party_code = p.code
  ) x
$$;

-- ---------- module load: recent vouchers (items nested) + payments + expenses — ek call ----------
create or replace function ws_recent(p_vlimit int default 400, p_plimit int default 300)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'vouchers', coalesce((select jsonb_agg(row_to_json(v2) order by v2.created_at desc) from (
        select v.*, (select coalesce(jsonb_agg(row_to_json(vi) order by vi.id),'[]'::jsonb)
                     from ws_voucher_items vi where vi.vno = v.vno) as items
        from ws_vouchers v order by v.created_at desc limit p_vlimit
      ) v2), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(row_to_json(p) order by p.created_at desc) from (
        select * from ws_payments order by created_at desc limit p_plimit
      ) p), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(row_to_json(e) order by e.created_at desc) from (
        select * from ws_expenses order by created_at desc limit p_plimit
      ) e), '[]'::jsonb)
  )
$$;

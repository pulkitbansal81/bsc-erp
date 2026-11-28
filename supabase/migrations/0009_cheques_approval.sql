-- v47: Cheque Register (retail + wholesale) + wholesale payment approval

-- ---------- wholesale payment approval ----------
alter table ws_payments add column if not exists check_status text not null default 'Approved'; -- Approved | Pending Approval
alter table ws_payments add column if not exists checked_by text not null default '';
alter table ws_payments add column if not exists checked_at timestamptz;

create or replace function ws_post_payments(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; pno text; pn text; out_ids text[] := '{}'; dir text; src text; cs text;
begin
  perform pg_advisory_xact_lock(hashtext('ws_pay'));
  for it in select * from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) loop
    select name into pn from ws_parties where code = it->>'party_code' and status='Active';
    if pn is null then raise exception 'Party nahi mili: %', coalesce(it->>'party_code','?'); end if;
    dir := upper(coalesce(it->>'direction','IN'));
    if dir not in ('IN','OUT','REBATE') then dir := 'IN'; end if;
    if coalesce((it->>'amount')::numeric,0) <= 0 then raise exception 'Amount sahi nahi (%)', pn; end if;
    src := coalesce(it->>'source','');
    -- Sirf Cash auto-approved; Rebate / GPay Others / NEFT / Cheque / Card → Admin approval
    cs := case when dir <> 'REBATE' and (src = 'Cash' or src = '') then 'Approved' else 'Pending Approval' end;
    pno := ws_next_no('WP');
    insert into ws_payments(pno,pdate,party_code,party_name,amount,direction,source,source_detail,notes,created_by,check_status)
    values (pno, coalesce((it->>'pdate')::date,current_date), it->>'party_code', pn,
            (it->>'amount')::numeric, dir, src, coalesce(it->>'source_detail',''),
            coalesce(it->>'notes',''), coalesce(it->>'created_by',''), cs);
    out_ids := out_ids || pno;
  end loop;
  return jsonb_build_object('pnos', to_jsonb(out_ids), 'count', coalesce(array_length(out_ids,1),0));
end $$;

create or replace function ws_approve_payment(p_pno text, p_by text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update ws_payments set check_status='Approved', checked_by=coalesce(p_by,''), checked_at=now()
  where pno=p_pno and status='Active';
  if not found then raise exception 'Payment nahi mili: %', p_pno; end if;
  return true;
end $$;

-- ledger: pending-approval entries dikhein par delta 0 (calc approval ke baad)
create or replace function ws_party_ledger(p_party text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.d, x.created_at), '[]'::jsonb) from (
    select v.vno as ref, v.vtype as kind, v.vdate as d, v.grand_total as amt, '' as source, v.notes, v.created_at, 'Approved' as check_status,
           case when v.vtype = 'SALE' then v.grand_total when v.vtype = 'SRETURN' then -v.grand_total
                when v.vtype = 'PURCHASE' then -v.grand_total else 0 end as delta
    from ws_vouchers v
    where v.party_code = p_party and v.status = 'Active' and v.vtype in ('SALE','SRETURN','PURCHASE')
    union all
    select p.pno,
           case p.direction when 'IN' then 'RECEIPT' when 'OUT' then 'PAYMENT' when 'REBATE' then 'REBATE' else p.direction end,
           p.pdate, p.amount, (p.source || case when p.source_detail<>'' then ' · '||p.source_detail else '' end), p.notes, p.created_at, p.check_status,
           case when p.check_status <> 'Approved' then 0
                when p.direction in ('IN','REBATE') then -p.amount else p.amount end
    from ws_payments p where p.party_code = p_party and p.status = 'Active'
  ) x
$$;

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
      select party_code, sum(case when direction in ('IN','REBATE') then -amount else amount end) as d
      from ws_payments where status = 'Active' and check_status = 'Approved' group by party_code
    ) pay on pay.party_code = p.code
  ) x
$$;

-- ---------- cheque register ----------
create table if not exists cheque_status (
  origin text not null,            -- retail | wholesale
  ref text not null,               -- PaymentID / pno
  status text not null default 'Pending',  -- Pending | Sent | Cleared | Bounced
  represent_count int not null default 0,
  history jsonb not null default '[]'::jsonb,
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (origin, ref)
);
alter table cheque_status enable row level security;

-- Retail SourceDetail: "Cheque #418822 dt 08/05/2025"
create or replace function cheque_register(p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (
    select 'retail' as origin, vals->>0 as ref, vals->>3 as party, vals->>2 as party_code,
           coalesce(substring(vals->>6 from '#\s*([A-Za-z0-9\-/]+)'),'') as cheque_no,
           coalesce(to_date(substring(vals->>6 from 'dt\s*(\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY'), nullif(vals->>1,'')::date) as cheque_date,
           (vals->>4)::numeric as amount, vals->>8 as received_by, nullif(vals->>1,'')::date as pay_date,
           coalesce(nullif(vals->>11,''),'') as cash_status
    from erp_rows where tab='Payments' and vals->>5='Cheque' and coalesce(vals->>4,'') <> ''
    union all
    select 'wholesale', p.pno, p.party_name, p.party_code,
           coalesce(substring(p.source_detail from '#\s*([A-Za-z0-9\-/]+)'),''),
           coalesce(to_date(substring(p.source_detail from 'dt\s*(\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY'), p.pdate),
           p.amount, p.created_by, p.pdate, p.check_status
    from ws_payments p where p.source='Cheque' and p.direction='IN' and p.status='Active'
  )
  select coalesce(jsonb_agg(row_to_json(x) order by x.cheque_date, x.ref), '[]'::jsonb) from (
    select r.*, coalesce(s.status,'Pending') as status, coalesce(s.represent_count,0) as represent_count,
           coalesce(s.history,'[]'::jsonb) as history, s.updated_by, s.updated_at
    from r left join cheque_status s on s.origin=r.origin and s.ref=r.ref
    where (p_from is null or r.cheque_date >= p_from) and (p_to is null or r.cheque_date <= p_to)
  ) x
$$;

-- action: send | clear | bounce | represent
create or replace function cheque_set(p_origin text, p_ref text, p_action text, p_by text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur text; nxt text; rc int;
begin
  select status, represent_count into cur, rc from cheque_status where origin=p_origin and ref=p_ref;
  cur := coalesce(cur,'Pending'); rc := coalesce(rc,0);
  nxt := case p_action
           when 'send' then case when cur in ('Pending','Bounced') then 'Sent' else null end
           when 'clear' then case when cur='Sent' then 'Cleared' else null end
           when 'bounce' then case when cur='Sent' then 'Bounced' else null end
           when 'represent' then case when cur='Bounced' then 'Pending' else null end
           else null end;
  if nxt is null then raise exception 'Ye action (%) abhi allowed nahi — cheque status % hai', p_action, cur; end if;
  if p_action='represent' then rc := rc + 1; end if;
  insert into cheque_status(origin, ref, status, represent_count, history, updated_by, updated_at)
  values (p_origin, p_ref, nxt, rc, jsonb_build_array(jsonb_build_object('a',p_action,'to',nxt,'by',p_by,'at',now(),'note',coalesce(p_note,''))), coalesce(p_by,''), now())
  on conflict (origin, ref) do update set status=excluded.status, represent_count=excluded.represent_count,
    history = cheque_status.history || excluded.history, updated_by=excluded.updated_by, updated_at=now();
  return jsonb_build_object('status', nxt, 'represent_count', rc);
end $$;

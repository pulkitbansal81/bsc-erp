-- v45: payments — source_detail (cheque#/date, gpay head), REBATE direction, batch insert
alter table ws_payments add column if not exists source_detail text not null default '';

-- REBATE ledger mein IN jaisa (dealer ka outstanding kam karta hai)
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
    select p.pno,
           case p.direction when 'IN' then 'RECEIPT' when 'OUT' then 'PAYMENT' when 'REBATE' then 'REBATE' else p.direction end,
           p.pdate, p.amount, (p.source || case when p.source_detail<>'' then ' · '||p.source_detail else '' end), p.notes, p.created_at,
           case when p.direction in ('IN','REBATE') then -p.amount else p.amount end
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
      from ws_payments where status = 'Active' group by party_code
    ) pay on pay.party_code = p.code
  ) x
$$;

-- batch payment insert
create or replace function ws_post_payments(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; pno text; pn text; out_ids text[] := '{}'; dir text;
begin
  perform pg_advisory_xact_lock(hashtext('ws_pay'));
  for it in select * from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) loop
    select name into pn from ws_parties where code = it->>'party_code' and status='Active';
    if pn is null then raise exception 'Party nahi mili: %', coalesce(it->>'party_code','?'); end if;
    dir := upper(coalesce(it->>'direction','IN'));
    if dir not in ('IN','OUT','REBATE') then dir := 'IN'; end if;
    if coalesce((it->>'amount')::numeric,0) <= 0 then raise exception 'Amount sahi nahi (%)', pn; end if;
    pno := ws_next_no('WP');
    insert into ws_payments(pno,pdate,party_code,party_name,amount,direction,source,source_detail,notes,created_by)
    values (pno, coalesce((it->>'pdate')::date,current_date), it->>'party_code', pn,
            (it->>'amount')::numeric, dir, coalesce(it->>'source',''), coalesce(it->>'source_detail',''),
            coalesce(it->>'notes',''), coalesce(it->>'created_by',''));
    out_ids := out_ids || pno;
  end loop;
  return jsonb_build_object('pnos', to_jsonb(out_ids), 'count', coalesce(array_length(out_ids,1),0));
end $$;

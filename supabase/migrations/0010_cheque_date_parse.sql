-- v47.3: cheque date parse — dd/mm/yyyy AUR yyyy-mm-dd dono (purane wholesale entries yyyy-mm-dd mein thin)
create or replace function cheque_date_of(p_detail text, p_fallback date)
returns date language sql immutable as $$
  select coalesce(
    to_date(substring(p_detail from 'dt\s*(\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY'),
    to_date(substring(p_detail from 'dt\s*(\d{4}-\d{2}-\d{2})'), 'YYYY-MM-DD'),
    p_fallback)
$$;
create or replace function cheque_register(p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (
    select 'retail' as origin, vals->>0 as ref, vals->>3 as party, vals->>2 as party_code,
           coalesce(substring(vals->>6 from '#\s*([A-Za-z0-9\-/]+)'),'') as cheque_no,
           cheque_date_of(vals->>6, nullif(vals->>1,'')::date) as cheque_date,
           (vals->>4)::numeric as amount, vals->>8 as received_by, nullif(vals->>1,'')::date as pay_date,
           coalesce(nullif(vals->>11,''),'') as cash_status
    from erp_rows where tab='Payments' and vals->>5='Cheque' and coalesce(vals->>4,'') <> ''
    union all
    select 'wholesale', p.pno, p.party_name, p.party_code,
           coalesce(substring(p.source_detail from '#\s*([A-Za-z0-9\-/]+)'),''),
           cheque_date_of(p.source_detail, p.pdate),
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

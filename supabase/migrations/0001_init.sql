-- BSC ERP — core storage (positional parity with Google Sheets)
-- Har sheet-tab = erp_rows mein rows; rid = sheet row number (header=1, data 2..N)
-- vals = jsonb array (cell values, COLS order mein) — frontend/backend dono isi order se chalte hain.

create table if not exists erp_tabs (
  tab text primary key,
  headers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists erp_rows (
  tab text not null,
  rid bigint not null,
  vals jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tab, rid)
);
create index if not exists erp_rows_id_idx on erp_rows (tab, (vals->>0));

-- PropertiesService replacement (tokens, WA creds, decoy flags, template names...)
create table if not exists kv (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Service-role-only: RLS on, koi policy nahi — sirf edge functions (service key) access karte hain.
alter table erp_tabs enable row level security;
alter table erp_rows enable row level security;
alter table kv enable row level security;

-- ===== append (dup-ID guard + idempotency), Sheets appendRow ka port =====
create or replace function erp_append_row(p_tab text, p_vals jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  id0 text; m text[]; prefix text; padlen int; maxn bigint := 0; exists_ boolean := false;
  has_ts boolean := false; n int; r record; same boolean; i int; nrid bigint; v jsonb := p_vals;
begin
  perform pg_advisory_xact_lock(hashtext('erp_tab_' || p_tab));
  n := coalesce(jsonb_array_length(v), 0);
  if n = 0 then raise exception 'Empty row'; end if;
  id0 := coalesce(v->>0, '');
  m := regexp_match(id0, '^([A-Za-z]+)([0-9]+)$');
  if m is not null then
    prefix := m[1]; padlen := length(m[2]);
    select exists(select 1 from erp_rows where tab = p_tab and vals->>0 = id0) into exists_;
    select coalesce(max(nullif(substring(vals->>0 from '^' || prefix || '0*([0-9]+)$'), '')::bigint), 0)
      into maxn from erp_rows where tab = p_tab and vals->>0 ~ ('^' || prefix || '[0-9]+$');
    if exists_ then
      id0 := prefix || lpad((maxn + 1)::text, padlen, '0');
      v := jsonb_set(v, '{0}', to_jsonb(id0));
    end if;
  end if;
  -- idempotent: Timestamp wali row, baaki cells (ID chhod ke) last 60 mein same → wahi row wapas
  select exists(select 1 from jsonb_array_elements_text(v) x
                where x ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$') into has_ts;
  if has_ts and p_tab <> 'EstimateItems' and n >= 4 then
    for r in select rid, vals from erp_rows where tab = p_tab order by rid desc limit 60 loop
      same := true;
      for i in 1..(n - 1) loop
        if coalesce(r.vals->>i, '') <> coalesce(v->>i, '') then same := false; exit; end if;
      end loop;
      if same then return jsonb_build_object('r', r.rid, 'id', r.vals->>0, 'dup', true); end if;
    end loop;
  end if;
  select coalesce(max(rid), 1) + 1 into nrid from erp_rows where tab = p_tab;
  insert into erp_rows(tab, rid, vals) values (p_tab, nrid, v);
  return jsonb_build_object('r', nrid, 'id', v->>0);
end $$;

-- ===== bulk simple append (AccessLog / ZivaChats / PendingMsgs — koi guard nahi) =====
create or replace function erp_append_rows_simple(p_tab text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare nrid bigint; r jsonb; c int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('erp_tab_' || p_tab));
  select coalesce(max(rid), 1) into nrid from erp_rows where tab = p_tab;
  for r in select * from jsonb_array_elements(p_rows) loop
    nrid := nrid + 1; c := c + 1;
    insert into erp_rows(tab, rid, vals) values (p_tab, nrid, r);
  end loop;
  return c;
end $$;

-- ===== updateCells port (v28.1 verify-ID safety belt ke saath) =====
create or replace function erp_update_cells(p_tab text, p_rid bigint, p_changes jsonb, p_verify_id text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare v jsonb; k text; idx int; mx int := 0; rids bigint[];
begin
  perform pg_advisory_xact_lock(hashtext('erp_tab_' || p_tab));
  select vals into v from erp_rows where tab = p_tab and rid = p_rid;
  if coalesce(trim(p_verify_id), '') <> '' then
    if v is null or trim(coalesce(v->>0, '')) <> trim(p_verify_id) then
      select array_agg(rid) into rids from erp_rows
        where tab = p_tab and trim(coalesce(vals->>0, '')) = trim(p_verify_id);
      if rids is null or array_length(rids, 1) <> 1 then
        raise exception 'Row mismatch (% %) — app refresh karke dobara try karein', p_tab, trim(p_verify_id);
      end if;
      p_rid := rids[1];
      select vals into v from erp_rows where tab = p_tab and rid = p_rid;
    end if;
  end if;
  if v is null then raise exception 'Row not found (% row %)', p_tab, p_rid; end if;
  for k in select jsonb_object_keys(p_changes) loop
    mx := greatest(mx, k::int);
  end loop;
  while jsonb_array_length(v) <= mx loop v := v || '[""]'::jsonb; end loop;
  for k in select jsonb_object_keys(p_changes) loop
    idx := k::int;
    v := jsonb_set(v, array[idx::text], p_changes->k);
  end loop;
  update erp_rows set vals = v, updated_at = now() where tab = p_tab and rid = p_rid;
  return true;
end $$;

-- ===== import / replace (Sheets se migration + Stock upload) =====
create or replace function erp_replace_tab(p_tab text, p_headers jsonb, p_rows jsonb, p_mode text default 'replace')
returns jsonb language plpgsql security definer set search_path = public as $$
declare nrid bigint; r jsonb; c int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('erp_tab_' || p_tab));
  if p_mode = 'replace' then
    delete from erp_rows where tab = p_tab;
    insert into erp_tabs(tab, headers, updated_at) values (p_tab, coalesce(p_headers, '[]'::jsonb), now())
      on conflict (tab) do update set headers = excluded.headers, updated_at = now();
    nrid := 1;
  else
    select coalesce(max(rid), 1) into nrid from erp_rows where tab = p_tab;
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    nrid := nrid + 1; c := c + 1;
    insert into erp_rows(tab, rid, vals) values (p_tab, nrid, r);
  end loop;
  return jsonb_build_object('rows', c, 'last_rid', nrid);
end $$;

-- ===== multi-tab read (login) — ek hi call mein saare tabs =====
create or replace function erp_read_tabs(p_tabs text[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.tab, t.data), '{}'::jsonb) from (
    select r.tab, jsonb_agg(r.vals order by r.rid) as data
    from erp_rows r where r.tab = any(p_tabs) group by r.tab
  ) t
$$;

-- AccessLog trim helper
create or replace function erp_trim_tab(p_tab text, p_keep int)
returns int language plpgsql security definer set search_path = public as $$
declare cnt int; cut bigint; del int := 0;
begin
  select count(*) into cnt from erp_rows where tab = p_tab;
  if cnt > p_keep + 500 then
    select rid into cut from erp_rows where tab = p_tab order by rid desc offset p_keep limit 1;
    delete from erp_rows where tab = p_tab and rid <= cut; get diagnostics del = row_count;
  end if;
  return del;
end $$;

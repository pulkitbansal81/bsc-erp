// ============================================================================
// BSC ERP — API edge function (Code.gs ka Supabase port, v1)
// Frontend wahi hai; google.script.run ki jagah ye HTTP endpoint.
// Request:  POST { fn, args, auth }   →  Response: { ok:true, res } | { ok:false, err }
// Data: erp_rows (positional jsonb arrays, Sheets parity) — dekho migrations/0001_init.sql
// Props (WA_TOKEN, DECOY_KEY, TPL_* ...): kv table (Script Properties ka replacement)
// Bridge: B2B/IMS/Docs/Tasks/ledgerPdf abhi purane Apps Script ke paas (BRIDGE_URL/BRIDGE_KEY kv mein)
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { HEADERS, TABS, CORE_TABS, DEFER_TABS } from "./headers.ts";

const SB = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("SB_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  { auth: { persistSession: false } },
);

// ---------- misc helpers ----------
const OFFICE_HOURS = { wk: ["08:30", "21:00"], sun: ["08:30", "14:30"] };
const ALERT_RULES: Record<string, number> = { ledger_open: 20, login_fail: 3, hours_block: 1 };
const ACCESSLOG_MAX = 10000;
const TOK_IDLE_MS = 2 * 60 * 60 * 1000;
const TOK_TOUCH_MS = 10 * 60 * 1000;
const SERVER_BUILD = "srv sb-v2 — Supabase (wholesale)";
const DECOY_REAL_TABS: Record<string, 1> = { Users: 1, Roles: 1, Branches: 1 };

function istParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value || "";
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour") === "24" ? "00" : g("hour"), mi: g("minute"), s: g("second"), wd: g("weekday") };
}
function nowIST(): string { const p = istParts(); return `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`; }
function todayIST(): string { return nowIST().slice(0, 10); }
function hoursOk(): boolean {
  const p = istParts();
  const w = p.wd === "Sun" ? OFFICE_HOURS.sun : OFFICE_HOURS.wk;
  const hm = `${p.h}:${p.mi}`;
  return hm >= w[0] && hm <= w[1];
}
const hoursMsg = () => "Office hours ke bahar ERP band rehta hai.";
const isAdminRole = (r: unknown) => /admin/i.test(String(r || ""));
const isSwitchRole = (r: unknown) => /switch/i.test(String(r || ""));
const S = (v: unknown) => String(v == null ? "" : v);
const low = (v: unknown) => S(v).trim().toLowerCase();

// per-isolate micro cache (sirf Users/Roles — 10s; token/tab reads hamesha live)
const MEM = new Map<string, { exp: number; v: unknown }>();
function memGet(k: string) { const e = MEM.get(k); if (e && e.exp > Date.now()) return e.v; MEM.delete(k); return undefined; }
function memSet(k: string, v: unknown, ms: number) { MEM.set(k, { exp: Date.now() + ms, v }); }

// ---------- kv (Script Properties) ----------
async function getProp(key: string): Promise<string> {
  const { data } = await SB.from("kv").select("value").eq("key", key).maybeSingle();
  return data ? String(data.value) : "";
}
async function setProp(key: string, value: string) {
  await SB.from("kv").upsert({ key, value, updated_at: new Date().toISOString() });
}
async function delProp(key: string) { await SB.from("kv").delete().eq("key", key); }

// ---------- row/tab layer ----------
type Values = unknown[][];
function headerOf(t: string): string[] { return HEADERS[t] || HEADERS[t.replace(/^Decoy_/, "")] || []; }
function padRow(vals: unknown[], n: number): unknown[] {
  if (vals.length >= n) return vals;
  const out = vals.slice(); while (out.length < n) out.push(""); return out;
}
async function readTabsRaw(tabs: string[]): Promise<Record<string, unknown[][]>> {
  if (!tabs.length) return {};
  const { data, error } = await SB.rpc("erp_read_tabs", { p_tabs: tabs });
  if (error) throw new Error("DB read: " + error.message);
  return (data || {}) as Record<string, unknown[][]>;
}
function toValues(t: string, rows: unknown[][] | undefined): Values {
  const hdr = headerOf(t);
  const out: Values = [hdr.slice()];
  (rows || []).forEach((r) => out.push(padRow(r as unknown[], hdr.length)));
  return out;
}
async function appendRowDB(tab: string, row: unknown[]): Promise<{ r: number; id: string; dup?: boolean }> {
  const { data, error } = await SB.rpc("erp_append_row", { p_tab: tab, p_vals: row });
  if (error) throw new Error(error.message.replace(/^[^:]*: /, ""));
  return data as { r: number; id: string; dup?: boolean };
}
async function appendSimple(tab: string, rows: unknown[][]) {
  if (!rows.length) return;
  const { error } = await SB.rpc("erp_append_rows_simple", { p_tab: tab, p_rows: rows });
  if (error) throw new Error(error.message);
}
async function updateCellsDB(tab: string, rid: number, changes: Record<string, unknown>, verifyId: string) {
  const { error } = await SB.rpc("erp_update_cells", { p_tab: tab, p_rid: rid, p_changes: changes, p_verify_id: verifyId || "" });
  if (error) throw new Error(error.message.replace(/^[^:]*: /, ""));
  return true;
}
async function findRidById(tab: string, id: string): Promise<number> {
  const { data } = await SB.from("erp_rows").select("rid").eq("tab", tab).eq("vals->>0", String(id));
  if (!data || data.length !== 1) throw new Error("Row not found: " + tab + " " + id);
  return Number(data[0].rid);
}

// ---------- users / roles ----------
async function usersRows(): Promise<unknown[][]> {
  const hit = memGet("users"); if (hit) return hit as unknown[][];
  const raw = await readTabsRaw(["Users"]);
  const v = toValues("Users", raw.Users);
  memSet("users", v, 10000);
  return v;
}
async function rolesRows(): Promise<unknown[][]> {
  const hit = memGet("roles"); if (hit) return hit as unknown[][];
  const raw = await readTabsRaw(["Roles"]);
  const v = toValues("Roles", raw.Roles);
  memSet("roles", v, 10000);
  return v;
}
async function userRec(u: string) {
  const rows = await usersRows(); const uu = low(u);
  for (let i = 1; i < rows.length; i++) {
    if (low(rows[i][2]) === uu) return { name: S(rows[i][1]) || uu, role: S(rows[i][4]), phone: S(rows[i][5]) };
  }
  return { name: uu, role: "", phone: "" };
}
async function userByPhone(last10: string) {
  const rows = await usersRows();
  for (let i = 1; i < rows.length; i++) {
    const d = S(rows[i][5]).replace(/\D/g, "");
    if (d.slice(-10) === last10) return { name: S(rows[i][1]), username: S(rows[i][2]) };
  }
  return { name: "", username: "" };
}

// ---------- auth ----------
type Auth = { u?: string; p?: string; t?: string };
type Ctx = { u: string; imp: string };

async function credOk(auth: Auth): Promise<string> {
  if (!auth || !auth.u || !auth.p) throw new Error("Invalid credentials");
  const rows = await usersRows();
  for (let i = 1; i < rows.length; i++) {
    if (low(rows[i][2]) === low(auth.u) && S(rows[i][3]) === S(auth.p) && S(rows[i][7] || "Active") !== "Inactive") return low(rows[i][2]);
  }
  throw new Error("Invalid credentials");
}
async function login_(auth: Auth) {
  const uLow = low(auth?.u);
  const lockTill = Number(await getProp("lock_" + uLow) || 0);
  if (lockTill > Date.now()) throw new Error("Too many attempts: 5 baar galat password — 15 minute baad try karein");
  let u: string;
  try { u = await credOk(auth); } catch (e) {
    const n = Number(await getProp("fail_" + uLow) || 0) + 1;
    await setProp("fail_" + uLow, String(n));
    if (n >= 5) await setProp("lock_" + uLow, String(Date.now() + 900000));
    try { const urf = await userRec(uLow); await accessLog(uLow, urf.name || uLow, urf.role || "?", "login_fail", "galat password (" + n + ")", 1); } catch (_) { /* */ }
    throw e;
  }
  await delProp("fail_" + uLow); await delProp("lock_" + uLow);
  const ur = await userRec(u);
  if (!isAdminRole(ur.role) && !isSwitchRole(ur.role) && !hoursOk()) {
    try { await accessLog(u, ur.name, ur.role, "hours_block", "login " + nowIST(), 1); } catch (_) { /* */ }
    throw new Error("HOURS: " + hoursMsg());
  }
  try { await accessLog(u, ur.name, ur.role, "login", "", 1); } catch (_) { /* */ }
  const tok = crypto.randomUUID();
  await setProp("tok_" + u, JSON.stringify({ t: tok, at: Date.now(), c: Date.now() }));
  return { token: tok, all: await readAll(CORE_TABS, { u, t: tok }, true, { u, imp: "" }), phase: 1 };
}
async function requireAuth(auth: Auth): Promise<Ctx> {
  if (!auth || !auth.u || !auth.t) throw new Error("SESSION: session nahi mila — dobara login karein");
  const u = low(auth.u);
  const impRaw = await getProp("imp_" + u);
  if (impRaw) {
    try {
      const impRec = JSON.parse(impRaw);
      if (String(impRec.t) === String(auth.t)) {
        if (Date.now() - (impRec.at || 0) > TOK_IDLE_MS) { await delProp("imp_" + u); throw new Error("SESSION: test session expire ho gaya — dobara Login as karein"); }
        return { u, imp: String(impRec.by || "admin") };
      }
    } catch (e) { if (String(e).includes("SESSION")) throw e; }
  }
  const raw = await getProp("tok_" + u);
  if (!raw) throw new Error("SESSION: session khatam ho gaya — dobara login karein");
  let rec: { t: string; at: number; c?: number };
  try { rec = JSON.parse(raw); } catch { rec = { t: raw, at: 0 }; }
  if (String(rec.t) !== String(auth.t)) throw new Error("SESSION: aap kisi doosre system par login ho gaye hain");
  const now = Date.now();
  if (!rec.at || now - rec.at > TOK_IDLE_MS) throw new Error("SESSION: 2 ghante se app idle tha — dobara login karein");
  if (now - rec.at > TOK_TOUCH_MS) await setProp("tok_" + u, JSON.stringify({ t: rec.t, at: now, c: rec.c || 0 }));
  const rows = await usersRows(); let ok = false;
  for (let i = 1; i < rows.length; i++) {
    if (low(rows[i][2]) === u) {
      if (S(rows[i][7] || "Active") === "Inactive") throw new Error("SESSION: user inactive kar diya gaya hai");
      if (!isSwitchRole(rows[i][4])) {
        const ep = Number(await getProp("DECOY_EPOCH") || 0);
        if (ep && (rec.c || 0) < ep) { await delProp("tok_" + u); throw new Error("SESSION: session refresh — dobara login karein"); }
      }
      if (!isAdminRole(rows[i][4]) && !isSwitchRole(rows[i][4]) && !hoursOk()) {
        try { await accessLog(u, S(rows[i][1]) || u, S(rows[i][4]), "hours_block", "session " + nowIST(), 1); } catch (_) { /* */ }
        throw new Error("SESSION: " + hoursMsg());
      }
      ok = true; break;
    }
  }
  if (!ok) throw new Error("SESSION: user nahi mila — dobara login karein");
  return { u, imp: "" };
}
async function requireOwner(ctx: Ctx) {
  const ur = await userRec(ctx.u);
  if (!isAdminRole(ur.role)) throw new Error("Not allowed");
  return ur;
}
async function requireSwitch(ctx: Ctx) {
  const ur = await userRec(ctx.u);
  if (!isSwitchRole(ur.role)) throw new Error("Not allowed");
  return ur;
}
async function requireAdminOrPM(ctx: Ctx): Promise<string> {
  const rows = await usersRows();
  for (let i = 1; i < rows.length; i++) {
    if (low(rows[i][2]) === ctx.u) {
      const role = S(rows[i][4]).trim().toUpperCase();
      if (role === "ADMIN") return "ADMIN";
      if (role.indexOf("PURCHASE") > -1) return "PM";
      break;
    }
  }
  throw new Error("IMS module sirf Admin / Purchase Manager ke liye hai");
}

// ---------- scoping (applyScope_ port — logic 1:1) ----------
function colIdx(values: Values, name: string, fb: number): number {
  if (values && values.length) { for (let i = 0; i < (values[0] as unknown[]).length; i++) { if (S(values[0][i]).trim() === name) return i; } }
  return fb;
}
function filterRows(values: Values, keep: (r: unknown[]) => boolean): Values {
  if (!values || values.length < 2) return values || [];
  const out: Values = [values[0]];
  for (let i = 1; i < values.length; i++) { if (keep(values[i] as unknown[])) out.push((values[i] as unknown[]).concat(["__r" + (i + 1)])); }
  return out;
}
// NOTE: filterRows "__r<frontend index>" nahi — asli rid chahiye. erp_read_tabs rows rid-order mein
// aate hain par delete kabhi nahi hota (sheets jaisa), isliye index+1 == rid NAHI guaranteed future mein.
// Isliye yahan values ke saath rid list bhi rakhte hain:
function filterRowsRid(values: Values, rids: number[], keep: (r: unknown[]) => boolean): Values {
  if (!values || values.length < 2) return values || [];
  const out: Values = [values[0]];
  for (let i = 1; i < values.length; i++) { if (keep(values[i] as unknown[])) out.push((values[i] as unknown[]).concat(["__r" + (rids[i - 1] || i + 1)])); }
  return out;
}
type Scope = { mode: string; branch?: string; names?: Record<string, 1>; cover?: unknown };
async function coverFor(uLow: string, rows: unknown[][]) {
  const out = { branch: "", all: false, names: [] as string[] };
  try {
    const raw = await readTabsRaw(["Substitutes"]);
    const v = (raw.Substitutes || []) as unknown[][];
    const today = todayIST();
    const k = (x: unknown) => S(x).slice(0, 10);
    for (let i = 0; i < v.length; i++) {
      if (low(v[i][3]) !== uLow) continue;
      if (S(v[i][10]) === "Cancelled") continue;
      if (k(v[i][5]) > today || k(v[i][6]) < today) continue;
      const absU = low(v[i][1]); let absRole = "", absBr = "";
      for (let r = 1; r < rows.length; r++) { if (low(rows[r][2]) === absU) { absRole = S(rows[r][4]); absBr = S(rows[r][9]).trim(); break; } }
      out.names.push(S(v[i][2]));
      if (/manager/i.test(absRole) && !/dispatch/i.test(absRole)) { if (absBr) out.branch = absBr; else out.all = true; }
      else if (/crm|admin|data entry/i.test(absRole)) out.all = true;
    }
  } catch (_) { /* */ }
  return out;
}
async function scopeInfo(ctx: Ctx): Promise<Scope> {
  const uLow = ctx.u;
  const rows = await usersRows();
  let me: unknown[] | null = null;
  for (let i = 1; i < rows.length; i++) { if (low(rows[i][2]) === uLow) { me = rows[i]; break; } }
  if (!me) return { mode: "all" };
  const myName = S(me[1]).trim();
  let branch = S(me[9]).trim();
  const cv = await coverFor(uLow, rows);
  if (cv.all) return { mode: "all", cover: cv };
  if (cv.branch && !branch) branch = cv.branch;
  const roles = S(me[4]).split(",").map((s) => s.trim()).filter(Boolean);
  const BUILTIN: Record<string, 1> = { "Admin": 1, "Manager": 1, "Salesman": 1, "Data Entry": 1, "CRM": 1 };
  let wantBranch = !!cv.branch, wantSelf = false;
  if (cv.branch) branch = cv.branch;
  let rrows: unknown[][] | null = null;
  for (const ro of roles) {
    if (ro === "Admin" || ro === "CRM" || ro === "Data Entry") return { mode: "all" };
    if (ro === "Manager") { wantBranch = true; continue; }
    if (ro === "Salesman") { wantSelf = true; continue; }
    if (!BUILTIN[ro]) {
      if (!rrows) rrows = await rolesRows();
      let found: unknown[] | null = null;
      for (let j = 1; j < rrows.length; j++) { if (S(rrows[j][0]).trim() === ro) { found = rrows[j]; break; } }
      if (!found || S(found[2]).trim() !== "Branch") return { mode: "all" };
      wantBranch = true;
    }
  }
  if (wantBranch) {
    if (!branch) return { mode: "all" };
    const names: Record<string, 1> = {};
    for (let k = 1; k < rows.length; k++) {
      const b = S(rows[k][9]).trim();
      if (b === "" || b === branch) names[S(rows[k][1]).trim().toUpperCase()] = 1;
    }
    return { mode: "branch", branch, names };
  }
  if (wantSelf) { const n: Record<string, 1> = {}; n[myName.toUpperCase()] = 1; return { mode: "self", names: n }; }
  return { mode: "all" };
}
// applyScope_ 1:1 port (filterRows yahan index-based hai; readAll rid arrays pass karta hai)
function applyScope(data: Record<string, Values>, rids: Record<string, number[]>, sc: Scope, loginMode: boolean, todayMs?: number) {
  const nowMs = todayMs || Date.now();
  const FR = (t: string, values: Values, keep: (r: unknown[]) => boolean) => filterRowsRid(values, rids[t] || [], keep);
  if (data.Users && data.Users.length) {
    const pc = colIdx(data.Users, "Password", 3);
    data.Users = data.Users.map((r, i) => { if (i === 0) return r; const c = (r as unknown[]).slice(); c[pc] = ""; return c; });
  }
  if (loginMode && data.DispatchHistory) delete data.DispatchHistory;
  if (data.Attendance && loginMode) {
    const dIdx = colIdx(data.Attendance, "Date", 3);
    const cut = new Date(nowMs - 45 * 24 * 3600 * 1000);
    const cutStr = cut.getFullYear() + "-" + ("0" + (cut.getMonth() + 1)).slice(-2) + "-" + ("0" + cut.getDate()).slice(-2);
    data.Attendance = FR("Attendance", data.Attendance, (r) => S(r[dIdx]).slice(0, 10) >= cutStr);
  }
  if (!sc || sc.mode === "all") { delete data.__rawEstimates; delete data.__rawCustomers; return data; }
  const NM = sc.names || {};
  const inN = (v: unknown) => NM[S(v).trim().toUpperCase()] === 1;
  if (data.Quotations) { const qsm = colIdx(data.Quotations, "Salesman", 6); data.Quotations = FR("Quotations", data.Quotations, (r) => inN(r[qsm])); }
  const leadIds: Record<string, 1> = {};
  if (data.Leads) {
    const lsm = colIdx(data.Leads, "Salesman", 5), lid = colIdx(data.Leads, "LeadID", 0);
    data.Leads = FR("Leads", data.Leads, (r) => inN(r[lsm]));
    for (let i = 1; i < data.Leads.length; i++) leadIds[S(data.Leads[i][lid])] = 1;
  }
  const eRaw = data.__rawEstimates || data.Estimates;
  const cRaw = data.__rawCustomers || data.Customers;
  const custIds: Record<string, 1> = {}, custNames: Record<string, 1> = {}, estIds: Record<string, 1> = {};
  if (eRaw && cRaw) {
    const esm = colIdx(eRaw, "Salesman", 7), ecu = colIdx(eRaw, "CustomerID", 3), eid = colIdx(eRaw, "EstimateID", 0);
    const cid = colIdx(cRaw, "CustomerID", 0), csm = colIdx(cRaw, "Salesman", 5), cnm = colIdx(cRaw, "Name", 1);
    for (let a = 1; a < eRaw.length; a++) { if (inN(eRaw[a][esm])) custIds[S(eRaw[a][ecu])] = 1; }
    for (let b = 1; b < cRaw.length; b++) {
      if (inN(cRaw[b][csm]) || custIds[S(cRaw[b][cid])]) {
        custIds[S(cRaw[b][cid])] = 1;
        custNames[low(cRaw[b][cnm])] = 1;
      }
    }
    for (let c2 = 1; c2 < eRaw.length; c2++) { if (inN(eRaw[c2][esm]) || custIds[S(eRaw[c2][ecu])]) estIds[S(eRaw[c2][eid])] = 1; }
    if (data.Customers) data.Customers = FR("Customers", data.Customers, (r) => custIds[S(r[cid])] === 1);
    if (data.Estimates) data.Estimates = FR("Estimates", data.Estimates, (r) => estIds[S(r[eid])] === 1);
  }
  if (data.EstimateItems) {
    const ie = colIdx(data.EstimateItems, "EstimateID", 1);
    data.EstimateItems = FR("EstimateItems", data.EstimateItems, (r) => estIds[S(r[ie])] === 1);
  }
  if (data.Payments) {
    const pcu = colIdx(data.Payments, "CustomerID", 2), prb = colIdx(data.Payments, "ReceivedBy", 8), pab = colIdx(data.Payments, "AcceptedBy", 12);
    data.Payments = FR("Payments", data.Payments, (r) => custIds[S(r[pcu])] === 1 || inN(r[prb]) || inN(r[pab]));
  }
  if (data.Followups) {
    const fl = colIdx(data.Followups, "LeadID", 1);
    data.Followups = FR("Followups", data.Followups, (r) => leadIds[S(r[fl])] === 1);
  }
  if (data.PayFollowups) {
    const pf = colIdx(data.PayFollowups, "CustomerID", 1);
    data.PayFollowups = FR("PayFollowups", data.PayFollowups, (r) => custIds[S(r[pf])] === 1);
  }
  if (data.Expenses) {
    const xeb = colIdx(data.Expenses, "EnteredBy", 6), xct = colIdx(data.Expenses, "Category", 3), xcd = colIdx(data.Expenses, "CategoryDetail", 4);
    data.Expenses = FR("Expenses", data.Expenses, (r) => {
      if (inN(r[xeb])) return true;
      return S(r[xct]) === "Customer Return" && custNames[low(r[xcd])] === 1;
    });
  }
  if (data.Attendance) {
    const anm = colIdx(data.Attendance, "Name", 1);
    // NOTE: login-window filter ke baad "__r" lag chuka ho sakta hai — dobara filter par bhi theek chalega
    data.Attendance = filterRows(data.Attendance, (r) => inN(r[anm]));
  }
  if (data.DispatchHistory) {
    const de = colIdx(data.DispatchHistory, "EstimateID", 1);
    data.DispatchHistory = FR("DispatchHistory", data.DispatchHistory, (r) => estIds[S(r[de])] === 1);
  }
  delete data.__rawEstimates; delete data.__rawCustomers;
  return data;
}

// ---------- readAll ----------
// PostgREST ek call mein max ~1000 rows deta hai — isliye HAMESHA page-by-page (warna bade tabs katt jaate hain)
async function selectAllRows(realTab: string): Promise<{ rid: number; vals: unknown[] }[]> {
  const out: { rid: number; vals: unknown[] }[] = [];
  const CH = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await SB.from("erp_rows").select("rid,vals").eq("tab", realTab).order("rid").range(from, from + CH - 1);
    if (error) throw new Error("DB read " + realTab + ": " + error.message);
    out.push(...(data || []) as { rid: number; vals: unknown[] }[]);
    if (!data || data.length < CH) break;
    from += CH;
  }
  return out;
}
async function tabReadWithRids(t: string, decoy: boolean): Promise<{ values: Values; rids: number[] }> {
  const realTab = decoy && !DECOY_REAL_TABS[t] ? "Decoy_" + t : t;
  const data = await selectAllRows(realTab);
  const hdr = headerOf(t);
  const values: Values = [hdr.slice()];
  const rids: number[] = [];
  data.forEach((r) => { values.push(padRow(r.vals as unknown[], hdr.length)); rids.push(Number(r.rid)); });
  return { values, rids };
}
async function readAll(tabs: string[] | null, auth: Auth, loginLike: boolean, ctx: Ctx) {
  const tAll = Date.now();
  const perf: Record<string, [number, number, number]> = {};
  const loginMode = !(tabs && tabs.length) || !!loginLike;
  const list = (tabs && tabs.length) ? tabs.filter((t) => TABS.indexOf(t) > -1) : TABS.slice();
  const decoy = (await getProp("DECOY_MODE")) === "1";
  const sc = auth ? await scopeInfo(ctx) : { mode: "all" };
  const wanted = list.filter((t) => !(loginMode && t === "DispatchHistory"));
  const extra: string[] = [];
  if (sc.mode !== "all") {
    const needSets = list.some((t) => ["Payments", "Expenses", "EstimateItems", "PayFollowups", "Followups", "DispatchHistory", "Estimates", "Customers"].indexOf(t) > -1);
    if (needSets && list.indexOf("Estimates") < 0) extra.push("__rawEstimates");
    if (needSets && list.indexOf("Customers") < 0) extra.push("__rawCustomers");
    if (needSets && list.indexOf("Leads") < 0 && list.indexOf("Followups") > -1) extra.push("Leads");
  }
  const out: Record<string, Values> = {};
  const rids: Record<string, number[]> = {};
  await Promise.all(wanted.concat(extra).map(async (t) => {
    const real = t === "__rawEstimates" ? "Estimates" : t === "__rawCustomers" ? "Customers" : t;
    const t0 = Date.now();
    const r = await tabReadWithRids(real, decoy);
    out[t] = r.values; rids[t === "__rawEstimates" ? "Estimates" : t === "__rawCustomers" ? "Customers" : t] = r.rids;
    if (t === "Leads" && extra.includes("Leads")) rids.Leads = r.rids;
    perf[real] = [r.values.length, Date.now() - t0, 0];
  }));
  const res = applyScope(out, rids, sc as Scope, loginMode) as Record<string, unknown>;
  res.__perf = { tabs: perf, ms: Date.now() - tAll, scope: (sc as Scope).mode || "all", srv: SERVER_BUILD };
  return res;
}

// ---------- access log + alerts ----------
async function accessLogRows(limit: number): Promise<unknown[][]> {
  const out: { rid: number; vals: unknown[] }[] = [];
  const CH = 1000;
  let from = 0;
  while (out.length < limit) {
    const { data } = await SB.from("erp_rows").select("rid,vals").eq("tab", "AccessLog").order("rid", { ascending: false }).range(from, from + Math.min(CH, limit - out.length) - 1);
    out.push(...(data || []) as { rid: number; vals: unknown[] }[]);
    if (!data || data.length < Math.min(CH, limit - out.length)) break;
    from += data.length;
  }
  return out.reverse().map((r) => r.vals as unknown[]);
}
async function accessLog(user: string, name: string, role: string, action: string, detail: string, count: number, imp = "") {
  if ((await getProp("DECOY_MODE")) === "1" || isSwitchRole(role)) return;
  if (imp) name = S(name) + " [Admin test: " + imp + "]";
  await appendSimple("AccessLog", [[nowIST(), S(user), S(name), S(role), S(action), S(detail).slice(0, 300), Number(count) || 1]]);
  if (Math.random() < 0.05) { try { await SB.rpc("erp_trim_tab", { p_tab: "AccessLog", p_keep: ACCESSLOG_MAX }); } catch (_) { /* */ } }
  if (ALERT_RULES[action] && !imp) { try { await alertCheck(user, name, action); } catch (_) { /* */ } }
}
async function todayCount(user: string, action: string): Promise<number> {
  const v = await accessLogRows(800);
  const today = todayIST(), uu = low(user); let c = 0;
  for (const r of v) {
    if (S(r[0]).slice(0, 10) === today && low(r[1]) === uu && S(r[4]) === action) c += Number(r[6]) || 1;
  }
  return c;
}
async function alertCheck(user: string, name: string, action: string) {
  const c = await todayCount(user, action);
  if (c < ALERT_RULES[action]) return;
  const key = "alert_" + todayIST().replace(/-/g, "") + "_" + low(user) + "_" + action;
  if (await getProp(key)) return;
  await setProp(key, nowIST());
  const msg = action === "ledger_open" ? "🔴 ERP ALERT: " + name + " ne aaj " + c + " customers ke ledger khole hain (limit " + ALERT_RULES.ledger_open + "). Access Log check karo."
    : action === "login_fail" ? "🔴 ERP ALERT: " + name + " ke account par aaj " + c + " galat-password login attempts."
    : "🔴 ERP ALERT: " + name + " ne office hours ke bahar ERP kholne ki koshish ki (" + nowIST() + ").";
  let phone = await getProp("ALERT_PHONE");
  if (!phone) {
    const rows = await usersRows();
    for (let i = 1; i < rows.length; i++) { if (isAdminRole(rows[i][4]) && S(rows[i][5]).replace(/\D/g, "").length >= 10) { phone = S(rows[i][5]); break; } }
  }
  if (phone) { try { await zivaSend(phone, msg, "Security alert"); } catch (e) { await appendSimple("AccessLog", [[nowIST(), "system", "ERP", "", "alert_fail", S((e as Error).message).slice(0, 200), 1]]); } }
}
async function logAccess(events: unknown[][], ctx: Ctx) {
  if (!events || !events.length) return true;
  const ur = await userRec(ctx.u);
  if ((await getProp("DECOY_MODE")) === "1" || isSwitchRole(ur.role)) return true;
  const rows: unknown[][] = []; const alertActs: Record<string, 1> = {};
  for (let i = 0; i < Math.min(50, events.length); i++) {
    const e = events[i] || [];
    const act = S(e[0]).slice(0, 40); if (!act) continue;
    rows.push([nowIST(), ctx.u, ur.name + (ctx.imp ? " [Admin test: " + ctx.imp + "]" : ""), ur.role, act, S(e[1]).slice(0, 300), Number(e[2]) || 1]);
    if (ALERT_RULES[act] && !ctx.imp) alertActs[act] = 1;
  }
  await appendSimple("AccessLog", rows);
  for (const a of Object.keys(alertActs)) { try { await alertCheck(ctx.u, ur.name, a); } catch (_) { /* */ } }
  return true;
}
async function readAccessLog(opts: { alertsOnly?: boolean }) {
  opts = opts || {};
  const { count } = await SB.from("erp_rows").select("rid", { count: "exact", head: true }).eq("tab", "AccessLog");
  const v = await accessLogRows(opts.alertsOnly ? 1500 : 3000);
  const today = todayIST();
  const rows: unknown[] = []; const sum: Record<string, Record<string, unknown>> = {}; const alerts: unknown[] = [];
  for (const row of v) {
    const ts = S(row[0]);
    const r = { t: ts, u: S(row[1]), n: S(row[2]), r: S(row[3]), a: S(row[4]), d: S(row[5]), c: Number(row[6]) || 1 };
    if (!opts.alertsOnly) rows.push(r);
    if (ts.slice(0, 10) === today) {
      const k = r.u;
      if (!sum[k]) sum[k] = { u: k, n: r.n, r: r.r, login: 0, login_fail: 0, hours_block: 0, ledger_open: 0, prints: 0, last: "" };
      const x = sum[k] as Record<string, number | string>;
      if (r.a === "login") (x.login as number) += r.c; else if (r.a === "login_fail") (x.login_fail as number) += r.c;
      else if (r.a === "hours_block") (x.hours_block as number) += r.c;
      else if (r.a === "ledger_open") (x.ledger_open as number) += r.c;
      else if (/^print_|^ledger_pdf$|^wa_ledger$/.test(r.a)) (x.prints as number) += r.c;
      if (ts > S(x.last)) x.last = ts;
    }
  }
  for (const u of Object.keys(sum)) {
    const x = sum[u] as Record<string, number | string>;
    if ((x.ledger_open as number) >= ALERT_RULES.ledger_open) alerts.push({ u, n: x.n, type: "ledger", msg: x.n + " ne aaj " + x.ledger_open + " ledgers khole" });
    if ((x.login_fail as number) >= ALERT_RULES.login_fail) alerts.push({ u, n: x.n, type: "fail", msg: x.n + " par " + x.login_fail + " galat-password attempts" });
    if ((x.hours_block as number) >= ALERT_RULES.hours_block) alerts.push({ u, n: x.n, type: "hours", msg: x.n + " ne office hours ke bahar " + x.hours_block + " baar koshish ki" });
  }
  return { rows: rows.reverse(), today: Object.values(sum), alerts, total: count || 0, rules: ALERT_RULES, hours: OFFICE_HOURS };
}

// ---------- WhatsApp ----------
async function waCreds() {
  const tok = await getProp("WA_TOKEN"), pid = await getProp("WA_PHONE_ID");
  if (!tok || !pid) throw new Error("Setup baaki: kv table mein WA_TOKEN aur WA_PHONE_ID add karo (bot project se copy karke)");
  return { tok, pid };
}
async function zivaSend(phone: string, text: string, by: string) {
  let ph = S(phone).replace(/\D/g, "");
  if (ph.length === 10) ph = "91" + ph;
  if (ph.length < 11) throw new Error("Number sahi nahi lag raha");
  text = S(text).trim();
  if (!text) throw new Error("Message khaali hai");
  const { tok, pid } = await waCreds();
  const res = await fetch("https://graph.facebook.com/v21.0/" + pid + "/messages", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
    body: JSON.stringify({ messaging_product: "whatsapp", to: ph, type: "text", text: { body: text.slice(0, 4000) } }),
  });
  const j = await res.json().catch(() => ({}));
  if (j.error) throw new Error("WhatsApp: " + (j.error.message || "send fail"));
  await appendSimple("ZivaChats", [[nowIST(), ph.slice(-10), S(by) + " (ERP)", "out", "text", text.slice(0, 1200)]]);
  return { ok: true };
}
async function waTemplateERP(ph: string, name: string, params: string[]) {
  const { tok, pid } = await waCreds();
  const lang = (await getProp("TPL_LANG")) || "en";
  const comps = params && params.length ? [{ type: "body", parameters: params.map((v) => ({ type: "text", text: S(v).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 240) || "-" })) }] : [];
  const res = await fetch("https://graph.facebook.com/v21.0/" + pid + "/messages", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
    body: JSON.stringify({ messaging_product: "whatsapp", to: ph, type: "template", template: { name, language: { code: lang }, components: comps } }),
  });
  const j = await res.json().catch(() => ({}));
  if (j.error) throw new Error("Template: " + (j.error.message || "fail"));
  return j;
}
async function zivaSendOrQueue(phone: string, text: string, by: string, what: string) {
  let ph = S(phone).replace(/\D/g, ""); if (ph.length === 10) ph = "91" + ph;
  try { return await zivaSend(ph, text, by); } catch (e) {
    const msg = S((e as Error).message);
    if (!/131047|re-engagement|24 hours|outside the allowed window|131026/i.test(msg)) throw e;
    const ur = await userByPhone(ph.slice(-10));
    await appendSimple("PendingMsgs", [[ph.slice(-10), ur.name, S(text).slice(0, 4000), nowIST(), "Pending", S(what || "message"), ""]]);
    const p = istParts();
    const ref = S(what || "DOC").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() + "-" + p.d + p.mo + p.y + "-" + p.h + p.mi;
    const tplName = (await getProp("TPL_PENDING")) || "erp_document_ready";
    try { await waTemplateERP(ph, tplName, [ur.name.split(" ")[0] || "User", S(what || "document"), ref]); } catch (e2) { return { queued: true, nudge: false, err: (e2 as Error).message }; }
    return { queued: true, nudge: true };
  }
}
async function custNotify(kind: string, d: Record<string, string>) {
  try {
    d = d || {};
    let ph = S(d.phone).replace(/\D/g, ""); if (ph.length === 10) ph = "91" + ph;
    if (ph.length < 12) return { ok: false, err: "Customer phone sahi nahi (" + S(d.phone) + ")" };
    const first = S(d.name || "Customer").trim().split(/\s+/)[0] || "Customer";
    let tpl: string, params: string[];
    if (kind === "promise") { tpl = (await getProp("TPL_PROMISE")) || "erp_order_promise"; params = [first, d.date, d.time]; }
    else if (kind === "revised") { tpl = (await getProp("TPL_REVISED")) || "erp_order_revised"; params = [first, d.date, d.time]; }
    else if (kind === "dispatched") { tpl = (await getProp("TPL_DISPATCHED")) || "erp_order_dispatched"; params = [first, d.auto || "Auto", d.autoPhone || "-"]; }
    else return { ok: false, err: "Unknown kind" };
    await waTemplateERP(ph, tpl, params.map((v) => S(v) === "" ? "-" : S(v)));
    try { await appendSimple("ZivaChats", [[nowIST(), ph.slice(-10), S(d.name || "Customer"), "out", "template", "ERP: " + kind + " " + S(d.est)]]); } catch (_) { /* */ }
    return { ok: true };
  } catch (e) { return { ok: false, err: S((e as Error).message).slice(0, 120) }; }
}
async function readZivaChats() {
  const { data } = await SB.from("erp_rows").select("vals").eq("tab", "ZivaChats").order("rid", { ascending: false }).limit(600);
  return (data || []).reverse().map((r) => padRow(r.vals as unknown[], 6));
}

// ---------- files (Supabase Storage — Drive replacement) ----------
const FILES_BUCKET = "erp-files";
function dataUrlParts(dataUrl: string) {
  const mime = dataUrl.substring(5, dataUrl.indexOf(";"));
  const b64 = dataUrl.split(",")[1] || "";
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { mime: mime || "application/octet-stream", bin };
}
async function storageSave(folder: string, filename: string, dataUrl: string): Promise<string> {
  const { mime, bin } = dataUrlParts(dataUrl);
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  const path = folder + "/" + Date.now() + "_" + safe;
  const { error } = await SB.storage.from(FILES_BUCKET).upload(path, bin, { contentType: mime, upsert: false });
  if (error) throw new Error("File save: " + error.message);
  const { data } = SB.storage.from(FILES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
async function saveTaskFile(dataUrl: string, filename: string) {
  if (!dataUrl || dataUrl.indexOf(",") < 0) return { url: "" };
  return { url: await storageSave("task-attachments", filename || "file", dataUrl) };
}
async function saveAttendance(rec: Record<string, unknown>, imgB64: string) {
  const decoy = (await getProp("DECOY_MODE")) === "1";
  const tab = decoy ? "Decoy_Attendance" : "Attendance";
  if (decoy) await decoyNoteWrite("Attendance", S(rec.Name) + " " + S(rec.Type) + " " + S(rec.Date));
  const { data } = await SB.from("erp_rows").select("vals").eq("tab", tab).order("rid", { ascending: false }).limit(400);
  for (const r of (data || [])) {
    const v = r.vals as unknown[];
    if (low(v[2]) === low(rec.Username) && S(v[3]).slice(0, 10) === S(rec.Date).slice(0, 10) && S(v[5]) === S(rec.Type)) {
      throw new Error("Aaj ki " + S(rec.Type) + " attendance already marked hai");
    }
  }
  let url = "";
  if (imgB64 && imgB64.indexOf(",") > -1) {
    url = await storageSave("attendance-selfies", S(rec.Name) + "_" + S(rec.Date) + "_" + S(rec.Type) + ".jpg", imgB64);
  }
  await appendRowDB(tab, [rec.AttID, rec.Name, rec.Username, rec.Date, rec.Time, rec.Type, rec.Lat, rec.Lng, rec.DistanceM, url, rec.LateBy, rec.Timestamp]);
  return { url };
}

// ---------- Gemini slip reader ----------
async function aiReadSlip(dataUrl: string) {
  const key = await getProp("GEMINI_KEY");
  if (!key) throw new Error("AI setup pending: kv table mein GEMINI_KEY add karo (free key: aistudio.google.com/apikey)");
  const mime = dataUrl.substring(5, dataUrl.indexOf(";"));
  const b64 = dataUrl.split(",")[1];
  const prompt = 'You are reading a photo of a tile-shop sales slip (may be handwritten, Hindi or English or mixed). Extract whatever is present and return STRICT JSON only, no markdown, with exactly these keys: {"customer_name":"","phone":"","address":"","cartage":0,"unloading":0,"discount":0,"items":[{"name":"","qty":0,"price":0}]}. Rules: numbers must be plain numbers (no commas or currency symbols); if a field is not visible use empty string or 0; item name exactly as written on the slip; qty and price per item if written (price is per-unit rate, not amount). Phone must be digits only.';
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime || "image/jpeg", data: b64 } }] }],
    generationConfig: { response_mime_type: "application/json", temperature: 0 },
  };
  const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];
  let lastErr = "";
  for (const model of MODELS) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 200) {
      const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) throw new Error("AI returned no answer — try again");
      return JSON.parse(txt);
    }
    lastErr = j.error?.message || String(res.status);
    if (res.status !== 429 && res.status !== 404) break;
  }
  throw new Error("AI error: " + lastErr.split(".")[0] + " — thodi der baad try karo, ya key check karo.");
}

// ---------- stock replace ----------
async function replaceStock(rows: unknown[][], by: string) {
  if (!rows || !rows.length) throw new Error("File mein koi item nahi mila");
  const data: unknown[][] = [];
  for (const r of rows) {
    const n = S(r[0]).trim();
    if (!n) continue;
    data.push([n, r[1] == null ? "" : r[1], S(r[2])]);
  }
  if (!data.length) throw new Error("File mein koi valid item nahi mila");
  const ts = nowIST();
  const { error } = await SB.rpc("erp_replace_tab", { p_tab: "Stock", p_headers: HEADERS.Stock, p_rows: data, p_mode: "replace" });
  if (error) throw new Error(error.message);
  await SB.rpc("erp_replace_tab", { p_tab: "StockMeta", p_headers: HEADERS.StockMeta, p_rows: [[ts, S(by)]], p_mode: "replace" });
  return { count: data.length, at: ts };
}

// ---------- scheduler (OwnerTasks) ----------
async function readSched() {
  const r = await tabReadWithRids("OwnerTasks", false);
  return r.values;
}
async function appendSched(row: unknown[]) {
  const res = await appendRowDB("OwnerTasks", row);
  return { id: res.id };
}
async function updateSched(id: string, changes: Record<string, unknown>) {
  const rid = await findRidById("OwnerTasks", id);
  return await updateCellsDB("OwnerTasks", rid, changes, String(id));
}

// ---------- WHOLESALE (proper tables; Admin-only v1) ----------
async function wsRpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await SB.rpc(name, args);
  if (error) throw new Error(error.message.replace(/^[^:]*: /, ""));
  return data;
}
async function wsSel(table: string, order = "created_at", limit = 2000): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  while (out.length < limit) {
    const ch = Math.min(1000, limit - out.length);
    const { data, error } = await SB.from(table).select("*").order(order, { ascending: true }).range(from, from + ch - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []) as Record<string, unknown>[]);
    if (!data || data.length < ch) break;
    from += data.length;
  }
  return out;
}
async function wsBootstrap() {
  const [cats, items, parties, whs, recent, stock, balances] = await Promise.all([
    wsSel("ws_categories"), wsSel("ws_items", "code", 5000), wsSel("ws_parties", "code", 5000), wsSel("ws_warehouses"),
    wsRpc("ws_recent", { p_vlimit: 400, p_plimit: 300 }), wsRpc("ws_stock", {}), wsRpc("ws_party_balances", {}),
  ]);
  const r = recent as Record<string, unknown>;
  return { cats, items, parties, whs, vouchers: r.vouchers, payments: r.payments, expenses: r.expenses, stock, balances, srv: SERVER_BUILD };
}
const WS_MASTER: Record<string, { table: string; prefix: string }> = {
  cat: { table: "ws_categories", prefix: "CAT" },
  item: { table: "ws_items", prefix: "ITM" },
  party: { table: "ws_parties", prefix: "PTY" },
  wh: { table: "ws_warehouses", prefix: "WH" },
};
async function wsMasterSave(kind: string, obj: Record<string, unknown>, by: string) {
  const m = WS_MASTER[kind];
  if (!m) throw new Error("Master kind galat: " + kind);
  const name = S(obj.name).trim();
  if (!name) throw new Error("Naam likhna zaroori hai");
  if (kind === "item" && !S(obj.category_code)) throw new Error("Category chunna zaroori hai");
  if (kind === "party") {
    if (!S(obj.phone).trim()) throw new Error("Phone zaroori hai");
    if (S(obj.credit) === "Yes" && (!Number(obj.credit_days) || !Number(obj.credit_limit))) {
      throw new Error("Credit Yes hai to Credit days aur Credit limit dono bharna zaroori hai");
    }
  }
  const row: Record<string, unknown> = { ...obj, name };
  delete row._new;
  let code = S(obj.code);
  if (!code) {
    code = (await wsRpc("ws_next_no", { p_prefix: m.prefix })) as string;
    row.code = code; row.created_by = by;
    const { error } = await SB.from(m.table).insert(row);
    if (error) throw new Error(/duplicate key.*name/i.test(error.message) ? "Is naam ka record pehle se hai" : error.message);
  } else {
    delete row.created_by; delete row.created_at;
    const { error } = await SB.from(m.table).update(row).eq("code", code);
    if (error) throw new Error(/duplicate key.*name/i.test(error.message) ? "Is naam ka record pehle se hai" : error.message);
  }
  return { code };
}
async function wsPaySave(obj: Record<string, unknown>, by: string) {
  if (!S(obj.party_code)) throw new Error("Party chuno");
  if (!(Number(obj.amount) > 0)) throw new Error("Amount sahi nahi");
  const { data: pt } = await SB.from("ws_parties").select("name").eq("code", S(obj.party_code)).maybeSingle();
  if (!pt) throw new Error("Party nahi mili");
  const pno = (await wsRpc("ws_next_no", { p_prefix: "WP" })) as string;
  const { error } = await SB.from("ws_payments").insert({
    pno, pdate: S(obj.pdate) || todayIST(), party_code: S(obj.party_code), party_name: S(pt.name),
    amount: Number(obj.amount), direction: S(obj.direction) === "OUT" ? "OUT" : "IN",
    source: S(obj.source) || "Cash", notes: S(obj.notes), created_by: by,
  });
  if (error) throw new Error(error.message);
  return { pno };
}
async function wsExpSave(obj: Record<string, unknown>, by: string) {
  if (!(Number(obj.amount) > 0)) throw new Error("Amount sahi nahi");
  if (!S(obj.category).trim()) throw new Error("Category/head likhna zaroori hai");
  const eno = (await wsRpc("ws_next_no", { p_prefix: "WE" })) as string;
  const { error } = await SB.from("ws_expenses").insert({
    eno, edate: S(obj.edate) || todayIST(), amount: Number(obj.amount), category: S(obj.category).trim(),
    detail: S(obj.detail), source: S(obj.source) || "Cash", notes: S(obj.notes), created_by: by,
  });
  if (error) throw new Error(error.message);
  return { eno };
}
async function wsRowCancel(table: string, keyCol: string, key: string, by: string) {
  const { error } = await SB.from(table).update({ status: "Cancelled" }).eq(keyCol, key).eq("status", "Active");
  if (error) throw new Error(error.message);
  return true;
}

// ---------- impersonate ----------
async function impersonate(target: string, ctx: Ctx) {
  const t = low(target); if (!t) throw new Error("User chuno");
  const rows = await usersRows(); let found = false;
  for (let i = 1; i < rows.length; i++) { if (low(rows[i][2]) === t) { found = true; break; } }
  if (!found) throw new Error("User nahi mila: " + t);
  const tok = crypto.randomUUID();
  await setProp("imp_" + t, JSON.stringify({ t: tok, at: Date.now(), by: ctx.u }));
  const ur = await userRec(ctx.u);
  try { await accessLog(ctx.u, ur.name, ur.role, "impersonate", "login as " + t, 1); } catch (_) { /* */ }
  return { token: tok, all: await readAll(null, { u: t, t: tok }, false, { u: t, imp: ctx.u }) };
}
async function impersonateEnd(target: string) {
  await delProp("imp_" + low(target));
  return true;
}

// ---------- decoy (kill switch) ----------
async function decoyNoteWrite(tab: string, detail: string, user = "?") {
  try {
    let w: unknown[] = [];
    try { w = JSON.parse((await getProp("DECOY_WRITES")) || "[]"); } catch { w = []; }
    w.push([nowIST(), user, S(tab), S(detail).slice(0, 160)]);
    if (w.length > 300) w = w.slice(w.length - 300);
    await setProp("DECOY_WRITES", JSON.stringify(w));
  } catch (_) { /* */ }
}
async function decoyStatus() {
  let w: unknown[] = [];
  try { w = JSON.parse((await getProp("DECOY_WRITES")) || "[]"); } catch { w = []; }
  return { on: (await getProp("DECOY_MODE")) === "1", last: await getProp("DECOY_LAST"), writes: w.slice().reverse(), writesCount: w.length };
}
async function decoySetFn(on: boolean, by: string) {
  const was = (await getProp("DECOY_MODE")) === "1";
  if (on) { await ensureDecoyTabs(false); await setProp("DECOY_MODE", "1"); }
  else await setProp("DECOY_MODE", "");
  if (was !== !!on) { await setProp("DECOY_EPOCH", String(Date.now())); await setProp("DECOY_LAST", (on ? "ON " : "OFF ") + nowIST() + " by " + S(by)); }
  if (on && !was) await setProp("DECOY_WRITES", "[]");
  return await decoyStatus();
}
async function decoyNames(): Promise<string[]> {
  const out: string[] = [];
  try {
    const rows = await usersRows();
    for (let i = 1; i < rows.length; i++) { const r = S(rows[i][4]); if (/salesman|manager/i.test(r) && S(rows[i][7] || "Active") !== "Inactive") out.push(S(rows[i][1])); }
  } catch (_) { /* */ }
  return out.length ? out : ["Ravi", "Amit"];
}
// decoyGen_ 1:1 port (dummy 2025 data)
function decoyGen(t: string, names: string[]): Record<string, unknown>[] {
  names = names && names.length ? names : ["Ravi", "Amit"];
  const N = (i: number) => names[i % names.length];
  const C = [["Rakesh Traders", "9812340011", "Model Town", N(0)], ["Sunita Devi", "9812340022", "Civil Lines", N(1)], ["Gupta Builders", "9812340033", "Dugri Road", N(2)], ["Harpreet Singh", "9812340044", "Sarabha Nagar", N(3)], ["Mehta Interiors", "9812340055", "Ferozepur Road", N(4)], ["Anil Kumar", "9812340066", "Haibowal", N(5)], ["Sharma Ji (Contractor)", "9812340077", "Pakhowal Road", N(6)], ["Deepak Enterprises", "9812340088", "Gill Road", N(7)]];
  const IT: [string, number][] = [["2X4 SPARTEN GLOSS", 1450], ["12X24 PANARA BEIGE", 620], ["2X2 VITRIFIED IVORY", 780], ["18X12 SUNRAJ WALL", 540], ["2X4 RENITE MATT", 1320], ["600X600 GVT GREY", 890], ["12X18 KITCHEN WALL", 480], ["2X4 DYNA BEIGE", 1390], ["4X4 PARKING TILE", 520], ["32X64 LETOZA CREMA", 2100]];
  const D = ["2025-03-12", "2025-04-03", "2025-04-21", "2025-05-08", "2025-06-15", "2025-07-02", "2025-07-27", "2025-08-19", "2025-09-05", "2025-10-14"];
  const ts = (d: string) => d + " 11:20:00";
  const pad = (p: string, n: number, w = 4) => { let s = String(n); while (s.length < w) s = "0" + s; return p + s; };
  const out: Record<string, unknown>[] = [];
  if (t === "Customers") C.forEach((c, i) => out.push({ CustomerID: pad("CUST", i + 1), Name: c[0], Phone: c[1], Address: c[2], CreatedFromLead: "", Salesman: c[3], CreatedBy: c[3], CreatedAt: ts(D[i]), OpeningBalance: 0 }));
  if (t === "Leads") C.slice(0, 6).forEach((c, i) => out.push({ LeadID: pad("L", i + 1), Date: D[i], Name: c[0], Phone: c[1], Address: c[2], Salesman: c[3], Source: i % 2 ? "Walk-in" : "Reference", SourceDetail: "", Comments: "2 room flooring ka kaam", Status: i < 4 ? "Won" : "Open", NextFollowupDate: i < 4 ? "" : "2025-11-05", DealAmount: "", LostReason: "", CreatedBy: c[3], CreatedAt: ts(D[i]) }));
  if (t === "Followups") C.slice(0, 6).forEach((c, i) => out.push({ FollowupID: pad("F", i + 1), LeadID: pad("L", i + 1), Date: D[i + 1], Comment: "Sample dikhaya, rate discuss hua", Outcome: i < 4 ? "Deal Won" : "Follow-up", NextFollowupDate: i < 4 ? "" : "2025-11-05", DoneBy: c[3], Timestamp: ts(D[i + 1]) }));
  if (t === "Estimates") C.forEach((c, i) => { const it = 12000 + i * 3700, ret = i === 5; const cart = ret ? 0 : 400, unl = ret ? 0 : 200; out.push({ EstimateID: pad("EST", i + 1), Type: ret ? "Return" : "Sale", Date: D[i], CustomerID: pad("CUST", i + 1), CustomerName: c[0], Phone: c[1], Address: c[2], Salesman: c[3], ItemsTotal: ret ? 3200 : it, Cartage: cart, Unloading: unl, Discount: ret ? 0 : 200, GrandTotal: ret ? 3200 : it + cart + unl - 200, SendLabor: "No", PaymentReceived: ret ? 0 : Math.round(it * 0.5), PaymentSource: ret ? "" : "Cash", PaymentSourceDetail: "", PaymentTerms: i % 3 === 0 ? "Credit" : "Full", TermsDetail: "", Status: "Confirmed", DispatchStatus: i < 6 ? "Dispatched" : "Pending", DispatchNotes: "", CreatedBy: c[3], CreatedAt: ts(D[i]), LastEditedBy: "", LastEditedAt: "", Notes: "", DeliveryType: "Regular", DeliveryAddress: c[2], CheckStatus: "", CheckedBy: "", CheckedAt: "", AutoPerson: "", SlipStatus: "Received", SlipReceivedAt: "", DeliveryPhone: "", HideFromCRM: "" }); });
  if (t === "EstimateItems") { let n = 1; C.forEach((c, i) => { const k = (i % 3) + 2; for (let j = 0; j < k; j++) { const item = IT[(i + j) % IT.length]; const q = 5 + ((i * 3 + j * 7) % 20); out.push({ RowID: pad("EI", n++, 5), EstimateID: pad("EST", i + 1), ItemName: item[0], Qty: q, Price: item[1], Amount: q * item[1], Src: "" }); } }); }
  if (t === "Payments") C.slice(0, 7).forEach((c, i) => { const src = ["Cash", "NEFT BSC", "GPay Others", "Cash", "Card Swipe", "Cash", "Cheque"][i]; out.push({ PaymentID: pad("PY", i + 1), Date: D[i + 1], CustomerID: pad("CUST", i + 1), CustomerName: c[0], Amount: 5000 + i * 1500, Source: src, SourceDetail: src === "GPay Others" ? "Office" : src === "Cheque" ? "Cheque #418822 dt 08/05/2025" : "", EstimateID: pad("EST", i + 1), ReceivedBy: c[3], Timestamp: ts(D[i + 1]), Comments: "", CashStatus: src === "Cash" ? "Accepted" : "", AcceptedBy: src === "Cash" ? "Manager" : "", AcceptedAt: src === "Cash" ? ts(D[i + 1]) : "", CheckStatus: "", CheckedBy: "", CheckedAt: "", BillingDetails: "", BillingItems: "", VoiceURL: "", FileURL: "" }); });
  if (t === "Expenses") ([["Tea & Snacks", "", 340], ["Fuel", "Activa", 1200], ["Salary", "Helper", 9000], ["Electricity", "", 4100], ["Cartage", "Tempo", 800], ["Stationery", "", 560], ["Repair", "Shutter", 1500], ["Misc", "", 250]] as [string, string, number][]).forEach((x, i) => out.push({ ExpenseID: pad("EXP", i + 1), Date: D[i], Amount: x[2], Category: x[0], CategoryDetail: x[1], Source: i % 4 === 1 ? "NEFT BSC" : "Cash", EnteredBy: N(i), Timestamp: ts(D[i]), Comments: "", CashStatus: "Accepted", AcceptedBy: "Manager", AcceptedAt: ts(D[i]) }));
  if (t === "ExpenseCategories") ["Tea & Snacks", "Fuel", "Salary", "Electricity", "Cartage", "Stationery", "Repair", "Misc"].forEach((n2, i) => out.push({ CategoryID: pad("EC", i + 1), Name: n2, RequiresDetail: "No", DetailLabel: "", CreatedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "PayFollowups") C.slice(0, 4).forEach((c, i) => out.push({ PFID: pad("PF", i + 1), CustomerID: pad("CUST", i + 1), CustomerName: c[0], Date: D[i + 2], Comment: "Agle hafte payment dega", NextFollowupDate: D[i + 3], PromisedAmount: 4000, DoneBy: c[3], Timestamp: ts(D[i + 2]) }));
  if (t === "Daybook") [0, 3, 6].forEach((i, k) => out.push({ Date: D[i], OpeningBalance: 8000 + k * 500, CashReceived: 6500, CashExpenses: 1540, ClosingBalance: 8000 + k * 500 + 6500 - 1540, ClosedBy: "Manager", ClosedAt: ts(D[i]), Branch: "" }));
  if (t === "Items") IT.forEach((it, i) => out.push({ ItemID: pad("IT", i + 1), Name: it[0], Price: it[1], AddedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "Stock") IT.forEach((it, i) => out.push({ ItemName: it[0], Qty: 12 + (i * 9) % 60, Remarks: "BOX" }));
  if (t === "StockMeta") out.push({ UpdatedAt: ts(D[8]), UpdatedBy: "Admin" });
  if (t === "GpayHeads") ["Office", "Counter"].forEach((n3) => out.push({ Name: n3, CreatedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "AutoPersons") ([["Gurmeet", "9812350001"], ["Sonu", "9812350002"]] as [string, string][]).forEach((a) => out.push({ Name: a[0], DriverNumber: a[1], CreatedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "DispatchHistory") C.slice(0, 6).forEach((c, i) => out.push({ HistoryID: pad("DH", i + 1), EstimateID: pad("EST", i + 1), Status: "Dispatched", Notes: "", ChangedBy: "Dispatch", Timestamp: ts(D[i + 1]) }));
  if (t === "Vendors") ([["Kajaria Depot", 1], ["Somany Agency", 2]] as [string, number][]).forEach((v) => out.push({ VendorID: pad("VD", v[1]), Name: v[0], CreatedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "Godowns") out.push({ GodownID: "GD0001", Name: "Main Godown", CreatedBy: "Admin", CreatedAt: ts(D[0]), Branch: "" });
  if (t === "Purchases") IT.slice(0, 4).forEach((it, i) => out.push({ RowID: pad("PRW", i + 1, 5), PurchID: pad("PUR", 1), Date: D[2], VendorID: "VD0001", VendorName: "Kajaria Depot", GodownID: "GD0001", SIID: pad("SI", i + 1), ItemName: it[0], Qty: 20, Rate: Math.round(it[1] * 0.8), Amount: 20 * Math.round(it[1] * 0.8), Notes: "", EnteredBy: "Manager", Timestamp: ts(D[2]) }));
  if (t === "StockItems") IT.slice(0, 4).forEach((it, i) => out.push({ SIID: pad("SI", i + 1), GodownID: "GD0001", Category: "Tiles", Name: it[0], OpeningStock: 30, CreatedBy: "Admin", CreatedAt: ts(D[0]) }));
  if (t === "StockCategories") out.push({ CatID: "SC0001", Name: "Tiles", CreatedBy: "Admin", CreatedAt: ts(D[0]) });
  return out;
}
async function ensureDecoyTabs(force: boolean) {
  const { count } = await SB.from("erp_rows").select("rid", { count: "exact", head: true }).eq("tab", "Decoy_Customers");
  if (!force && (count || 0) > 0) return;
  const names = await decoyNames();
  for (const t of TABS) {
    if (DECOY_REAL_TABS[t]) continue;
    const hdr = headerOf(t);
    const objs = decoyGen(t, names);
    const rows = objs.map((o) => hdr.map((h) => o[h] == null ? "" : o[h]));
    await SB.rpc("erp_replace_tab", { p_tab: "Decoy_" + t, p_headers: hdr, p_rows: rows, p_mode: "replace" });
  }
}
// decoyExternal_ port — ON ke dauran external fns ka behaviour
function decoyExternal(fn: string, args: unknown[]): unknown {
  const EMPTY_B2B = {
    visits: [["VisitID", "Date", "DealerName", "MA", "PlanComments", "Status", "Review", "NextAction", "NextFollowupDate", "HelpRequired", "Reason", "DoneAt", "CreatedBy", "CreatedAt"]],
    sampling: [["SampID", "Date", "DealerName", "MA", "SamplesList", "Charges", "Comments", "TimeCommitDays", "Mode", "Status", "ApprovedBy", "ApprovedAt", "ListGivenBy", "ListGivenAt", "ReadyBy", "ReadyAt", "RTDBy", "RTDAt", "DispatchedBy", "DispatchedAt", "CreatedAt", "SheetItems", "SheetCreatedBy", "SheetCreatedAt", "SheetComments"]],
    dreturns: [["DRID", "Date", "DealerName", "ItemsList", "Comments", "PostedBy", "CreatedAt"]],
    dealers: [], beats: [], samplesheet: [],
  };
  if (fn === "readB2B") return EMPTY_B2B;
  if (fn === "readDocs" || fn === "readTasks") return {};
  if (fn === "readIMSItems") return [];
  if (fn === "logAccess") return true;
  if (fn === "readSched" || fn === "readIMSDash" || fn === "readZivaChats" || fn === "readAccessLog") throw new Error("Server busy — thodi der baad try karein");
  const W: Record<string, 1> = { appendB2B: 1, updateB2B: 1, addB2BDealer: 1, appendVisitsBulk: 1, appendIMSEntries: 1, imsCreateIndent: 1, imsSetIndentStatus: 1, imsCreatePO: 1, imsRecalcClosing: 1, imsUpdateADC: 1, markTaskDone: 1, appendSched: 1, updateSched: 1, zivaSend: 1, replaceStock: 1 };
  if (W[fn]) {
    decoyNoteWrite(fn, JSON.stringify(args || []).slice(0, 160));
    return fn === "appendB2B" ? { id: (args && (args[1] as unknown[])?.[0]) || "" }
      : fn === "appendIMSEntries" ? { added: 0, dup: 0, recalced: false }
      : fn === "appendVisitsBulk" ? { ids: [] }
      : fn === "replaceStock" ? { count: 0, at: nowIST() } : true;
  }
  return undefined;
}

// ---------- bridge (purane Apps Script ke paas jo kaam abhi hai) ----------
const BRIDGE_FNS: Record<string, 1> = {
  readDocs: 1, readTasks: 1, markTaskDone: 1,
  readB2B: 1, appendB2B: 1, updateB2B: 1, addB2BDealer: 1, appendVisitsBulk: 1,
  readIMSItems: 1, appendIMSEntries: 1, readIMSDash: 1, imsCreateIndent: 1, imsSetIndentStatus: 1, imsCreatePO: 1, imsRecalcClosing: 1, imsUpdateADC: 1,
  ledgerPdf: 1,
};
async function bridgeCall(fn: string, args: unknown[]) {
  const url = await getProp("BRIDGE_URL"), key = await getProp("BRIDGE_KEY");
  if (!url || !key) throw new Error("Bridge setup baaki: kv table mein BRIDGE_URL + BRIDGE_KEY add karo (purane Apps Script wale)");
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, call: fn, args: args || [] }),
    redirect: "follow",
  });
  const text = await res.text();
  let j: { ok?: boolean; res?: unknown; err?: string };
  try { j = JSON.parse(text); } catch { throw new Error("Bridge response samajh nahi aaya: " + text.slice(0, 120)); }
  if (!j.ok) throw new Error(j.err || "Bridge error");
  return j.res;
}

// ---------- append/update with decoy redirect ----------
async function appendRowAPI(tab: string, row: unknown[], ctx: Ctx) {
  if ((await getProp("DECOY_MODE")) === "1" && !DECOY_REAL_TABS[tab]) {
    await decoyNoteWrite(tab, JSON.stringify(row).slice(0, 160), ctx.u);
    return await appendRowDB("Decoy_" + tab, row);
  }
  return await appendRowDB(tab, row);
}
async function updateCellsAPI(tab: string, rowNum: number, changes: Record<string, unknown>, verify: { id?: unknown } | undefined, ctx: Ctx) {
  const verifyId = verify && verify.id != null ? String(verify.id) : "";
  if ((await getProp("DECOY_MODE")) === "1" && !DECOY_REAL_TABS[tab]) {
    await decoyNoteWrite(tab, "row " + rowNum + " " + JSON.stringify(changes).slice(0, 140), ctx.u);
    return await updateCellsDB("Decoy_" + tab, Number(rowNum), changes, verifyId);
  }
  return await updateCellsDB(tab, Number(rowNum), changes, verifyId);
}

// ---------- router ----------
async function route(fn: string, args: unknown[], auth: Auth): Promise<unknown> {
  if (fn === "login") return await login_(auth);
  const ctx = await requireAuth(auth);
  if (fn === "decoyStatus") { await requireSwitch(ctx); return await decoyStatus(); }
  if (fn === "decoySet") { const ur = await requireSwitch(ctx); return await decoySetFn(!!args?.[0], ur.name); }
  if (fn === "decoyRegen") { await requireSwitch(ctx); await ensureDecoyTabs(true); return await decoyStatus(); }
  if (fn === "decoyClearWrites") { await requireSwitch(ctx); await setProp("DECOY_WRITES", "[]"); return await decoyStatus(); }
  if ((await getProp("DECOY_MODE")) === "1") {
    const dx = decoyExternal(fn, args);
    if (dx !== undefined) return dx;
  }
  if (fn === "logAccess") return await logAccess(args?.[0] as unknown[][], ctx);
  if (fn === "readAccessLog") { await requireOwner(ctx); return await readAccessLog(args?.[0] as { alertsOnly?: boolean }); }
  if (fn === "impersonate") { await requireOwner(ctx); return await impersonate(S(args?.[0]), ctx); }
  if (fn === "zivaSendOrQueue") { await requireOwner(ctx); return await zivaSendOrQueue(S(args?.[0]), S(args?.[1]), ctx.u, S(args?.[2])); }
  if (fn === "impersonateEnd") return await impersonateEnd(S(args?.[0]));
  if (fn === "ledgerPdf") {
    try { const ur0 = await userRec(ctx.u); await accessLog(ctx.u, ur0.name, ur0.role, "ledger_pdf", S(args?.[0]), 1, ctx.imp); } catch (_) { /* */ }
  }
  if (fn === "readSched" || fn === "appendSched" || fn === "updateSched") await requireOwner(ctx);
  if (fn.startsWith("ws")) { // v1: Wholesale sirf Admin
    const ur = await requireOwner(ctx);
    switch (fn) {
      case "wsBootstrap": return await wsBootstrap();
      case "wsMasterSave": return await wsMasterSave(S(args?.[0]), (args?.[1] || {}) as Record<string, unknown>, ur.name);
      case "wsVoucher": { const r = await wsRpc("ws_post_voucher", { p_v: { ...(args?.[0] as Record<string, unknown>), created_by: ur.name }, p_items: args?.[1] }); return r; }
      case "wsCancel": return await wsRpc("ws_cancel_voucher", { p_vno: S(args?.[0]), p_by: ur.name });
      case "wsEdit": return await wsRpc("ws_edit_voucher", { p_vno: S(args?.[0]), p_v: { ...(args?.[1] as Record<string, unknown>) }, p_items: args?.[2] });
      case "wsDispatch": return await wsRpc("ws_set_dispatch", { p_vno: S(args?.[0]), p_status: S(args?.[1]), p_auto: S(args?.[2]), p_notes: S(args?.[3]) });
      case "wsHoldConvert": return await wsRpc("ws_convert_hold", { p_hold: S(args?.[0]), p_v: { ...(args?.[1] as Record<string, unknown>), created_by: ur.name }, p_items: args?.[2] });
      case "wsPay": return await wsPaySave((args?.[0] || {}) as Record<string, unknown>, ur.name);
      case "wsPayBatch": { const rows = ((args?.[0] || []) as Record<string, unknown>[]).map((x) => ({ ...x, created_by: ur.name })); return await wsRpc("ws_post_payments", { p_rows: rows }); }
      case "wsPayCancel": return await wsRowCancel("ws_payments", "pno", S(args?.[0]), ur.name);
      case "wsExp": return await wsExpSave((args?.[0] || {}) as Record<string, unknown>, ur.name);
      case "wsExpCancel": return await wsRowCancel("ws_expenses", "eno", S(args?.[0]), ur.name);
      case "wsItemLedger": return await wsRpc("ws_item_ledger", { p_item: S(args?.[0]) });
      case "wsPartyLedger": return await wsRpc("ws_party_ledger", { p_party: S(args?.[0]) });
    }
    throw new Error("Unknown WS API: " + fn);
  }
  if (fn === "readZivaChats" || fn === "zivaSend") await requireOwner(ctx);

  switch (fn) {
    case "readAll": return await readAll(args?.[0] as string[] | null, auth, !!(args?.[1] as { loginLike?: boolean })?.loginLike, ctx);
    case "appendRow": return await appendRowAPI(S(args?.[0]), args?.[1] as unknown[], ctx);
    case "updateCells": return await updateCellsAPI(S(args?.[0]), Number(args?.[1]), args?.[2] as Record<string, unknown>, args?.[3] as { id?: unknown }, ctx);
    case "custNotify": return await custNotify(S(args?.[0]), args?.[1] as Record<string, string>);
    case "saveAttendance": return await saveAttendance(args?.[0] as Record<string, unknown>, S(args?.[1]));
    case "saveTaskFile": return await saveTaskFile(S(args?.[0]), S(args?.[1]));
    case "aiReadSlip": return await aiReadSlip(S(args?.[0]));
    case "replaceStock": return await replaceStock(args?.[0] as unknown[][], S(args?.[1] ?? ctx.u));
    case "readSched": return await readSched();
    case "appendSched": return await appendSched(args?.[0] as unknown[]);
    case "updateSched": return await updateSched(S(args?.[0]), args?.[1] as Record<string, unknown>);
    case "readZivaChats": return await readZivaChats();
    case "zivaSend": return await zivaSend(S(args?.[0]), S(args?.[1]), S(args?.[2] ?? ctx.u));
  }
  if (BRIDGE_FNS[fn]) {
    const IMS_FNS: Record<string, 1> = { readIMSDash: 1, imsCreateIndent: 1, imsSetIndentStatus: 1, imsCreatePO: 1, imsRecalcClosing: 1, imsUpdateADC: 1 };
    if (IMS_FNS[fn]) {
      const imsRole = await requireAdminOrPM(ctx);
      return await bridgeCall(fn, (args || []).concat([imsRole]));
    }
    return await bridgeCall(fn, args || []);
  }
  throw new Error("Unknown API: " + fn);
}

// ---------- HTTP ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  // Ziva kill-switch: GET ?fn=decoy&mode=kill|live&key=<DECOY_KEY>
  if (req.method === "GET" && url.searchParams.get("fn") === "decoy") {
    const key = await getProp("DECOY_KEY");
    if (!key || url.searchParams.get("key") !== key) return new Response("no", { headers: { ...CORS, "Content-Type": "text/plain" } });
    const mode = (url.searchParams.get("mode") || "").toLowerCase();
    if (mode === "kill") await decoySetFn(true, "Ziva");
    else if (mode === "live") await decoySetFn(false, "Ziva");
    const on = (await getProp("DECOY_MODE")) === "1";
    return new Response(on ? "ON" : "OFF", { headers: { ...CORS, "Content-Type": "text/plain" } });
  }
  if (req.method === "GET") return new Response(JSON.stringify({ ok: true, srv: SERVER_BUILD }), { headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const res = await route(S(body.fn), (body.args || []) as unknown[], (body.auth || {}) as Auth);
    return new Response(JSON.stringify({ ok: true, res }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, err: S((e as Error).message || e) }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

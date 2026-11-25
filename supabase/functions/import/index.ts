// BSC ERP — import endpoint (purane Google Sheet se data lane ke liye)
// Apps Script (bridge.gs → exportAllToSupabase) isse chunks mein POST karta hai.
// Auth: body.key === IMPORT_KEY (kv table). Baar-baar chal sakta hai (replace mode).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SB = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("SB_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  { auth: { persistSession: false } },
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const { data: kv, error: kvErr } = await SB.from("kv").select("value").eq("key", "IMPORT_KEY").maybeSingle();
    const want = kv ? String(kv.value) : "";
    if (!want || String(body.key || "") !== want) {
      const why = kvErr ? "kv read FAIL: " + kvErr.message : !kv ? "kv row nahi mili" : "value mismatch";
      return new Response(JSON.stringify({ ok: false, err: "IMPORT_KEY galat ya set nahi (kv table) — " + why }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const tab = String(body.tab || "");
    if (!tab) throw new Error("tab missing");
    if (body.wipe) { // optional: poora tab khaali
      await SB.from("erp_rows").delete().eq("tab", tab);
      return new Response(JSON.stringify({ ok: true, wiped: tab }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const mode = body.mode === "append" ? "append" : "replace";
    const headers = body.headers || [];
    const rows = body.rows || [];
    const { data, error } = await SB.rpc("erp_replace_tab", { p_tab: tab, p_headers: headers, p_rows: rows, p_mode: mode });
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({ ok: true, tab, mode, ...data }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, err: String((e as Error).message || e) }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

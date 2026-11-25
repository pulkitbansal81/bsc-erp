/* ============================================================================
 * BSC ERP — BRIDGE + EXPORT (ye file PURANE ERP Apps Script project mein add karo:
 * editor → Files + → Script → naam "Bridge" → ye paste → Deploy → Manage deployments
 * → existing deployment EDIT karke New version (URL wahi rehta hai).
 *
 * Script Properties (purane project mein) mein ADD karo:
 *   BRIDGE_KEY       = lamba random text (wahi Supabase kv table ke BRIDGE_KEY mein)
 *   SUPA_IMPORT_URL  = https://<project-ref>.supabase.co/functions/v1/import
 *   SUPA_IMPORT_KEY  = lamba random text (wahi Supabase kv table ke IMPORT_KEY mein)
 *
 * Kaam:
 * 1) doPost: naya Supabase ERP yahan se B2B/IMS/Docs/Tasks/ledgerPdf chalata hai
 *    (ye sheets abhi Google par hi hain). Key ke bina koi access nahi.
 * 2) exportAllToSupabase(): saara ERP data Supabase mein bhejta hai. Editor se
 *    chalao (Run ▶). Baar-baar chala sakte ho — har run par fresh copy jaati hai.
 * ========================================================================== */

var BRIDGE_ALLOWED = {
  readDocs: 1, readTasks: 1, markTaskDone: 1,
  readB2B: 1, appendB2B: 1, updateB2B: 1, addB2BDealer: 1, appendVisitsBulk: 1,
  readIMSItems: 1, appendIMSEntries: 1, readIMSDash: 1, imsCreateIndent: 1,
  imsSetIndentStatus: 1, imsCreatePO: 1, imsRecalcClosing: 1, imsUpdateADC: 1,
  ledgerPdf: 1
};

function doPost(e) {
  var out = { ok: false, err: "" };
  try {
    var body = JSON.parse(e.postData.contents);
    var key = PropertiesService.getScriptProperties().getProperty("BRIDGE_KEY") || "";
    if (!key || String(body.key || "") !== key) throw new Error("Bridge key galat");
    var fn = String(body.call || "");
    if (!BRIDGE_ALLOWED[fn]) throw new Error("Bridge: fn allowed nahi: " + fn);
    var res = globalThis[fn].apply(null, body.args || []);
    out = { ok: true, res: res === undefined ? null : res };
  } catch (err) {
    out = { ok: false, err: String(err && err.message || err).slice(0, 300) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ===== EXPORT: saare tabs → Supabase =====
 * Editor se exportAllToSupabase chalao. Log (View → Executions / Logger) mein progress dikhta hai.
 * ~1-2 minute lagta hai. Cutover wale din aakhri baar chalana = final data. */
var EXPORT_TABS = null; // null = TABS (Code.gs) + neeche EXTRA
var EXPORT_EXTRA = ["AccessLog", "ZivaChats", "PendingMsgs", "OwnerTasks"];
var EXPORT_CHUNK = 400;

function exportAllToSupabase() {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty("SUPA_IMPORT_URL"), key = p.getProperty("SUPA_IMPORT_KEY");
  if (!url || !key) throw new Error("Script Properties mein SUPA_IMPORT_URL + SUPA_IMPORT_KEY set karo");
  var list = (EXPORT_TABS || TABS.slice()).concat(EXPORT_EXTRA);
  var report = [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    try { report.push(exportOneTab_(t, url, key)); }
    catch (e) { report.push(t + ": FAIL " + String(e.message || e).slice(0, 120)); }
  }
  Logger.log(report.join("\n"));
  return report.join("\n");
}

function exportOneTab_(t, url, key) {
  var sh = ss().getSheetByName(t);
  if (!sh || sh.getLastRow() < 1) {
    post_(url, { key: key, tab: t, headers: [], rows: [], mode: "replace" });
    return t + ": empty";
  }
  var values = sh.getDataRange().getValues().map(function (r) { return r.map(norm); });
  var headers = values[0].map(function (h) { return String(h); });
  var rows = values.slice(1).filter(function (r) { return !r.every(function (c) { return c === "" || c == null; }); });
  var sent = 0, first = true;
  while (sent < rows.length || first) {
    var chunk = rows.slice(sent, sent + EXPORT_CHUNK);
    var res = post_(url, { key: key, tab: t, headers: headers, rows: chunk, mode: first ? "replace" : "append" });
    if (!res.ok) throw new Error(res.err || "import fail");
    sent += chunk.length; first = false;
    if (!chunk.length) break;
  }
  return t + ": " + rows.length + " rows";
}

function post_(url, obj) {
  var res = UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify(obj), muteHttpExceptions: true, followRedirects: true
  });
  try { return JSON.parse(res.getContentText()); }
  catch (e) { return { ok: false, err: "HTTP " + res.getResponseCode() + ": " + res.getContentText().slice(0, 120) }; }
}

/* ===== VERIFY: import ke baad milan — har tab ka row count + Customers outstanding-critical tabs ka total =====
 * Editor se verifyExportCounts() chalao; Logger mein dono taraf ke counts. */
function verifyExportCounts() {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty("SUPA_IMPORT_URL"), key = p.getProperty("SUPA_IMPORT_KEY");
  var list = (EXPORT_TABS || TABS.slice()).concat(EXPORT_EXTRA);
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i], sh = ss().getSheetByName(t);
    var n = 0;
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getDataRange().getValues();
      for (var r = 1; r < v.length; r++) { if (!v[r].every(function (c) { return c === "" || c == null; })) n++; }
    }
    out.push(t + ": sheet=" + n);
  }
  Logger.log(out.join("\n") + "\n(Supabase side: Table Editor → erp_rows → filter tab se compare karo, ya naye ERP ke Speed Diagnostics mein row counts)");
  return out.join("\n");
}

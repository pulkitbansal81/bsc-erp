const SHEET_ID = "1K8jDMc8qWl3Qo5L14Y9IQ4GcB8-g5wbLswaq-nwyebM";
const TABS = ["Users","Leads","Followups","Customers","Estimates","EstimateItems","Payments","Expenses","ExpenseCategories","DispatchHistory","CancellationRequests","Daybook","Items","Stock","StockMeta","GpayHeads","Branches","PayFollowups","AutoPersons","Roles","Attendance","DelegationTasks","Godowns","StockCategories","StockItems","Purchases","Vendors","StockOut","Feedbacks","Substitutes","Quotations"];
const COLS = {
Users:["UserID","Name","Username","Password","Role","Phone","PhotoURL","Status","CreatedAt","Branch","WeekdayIn","WeekdayOut","SundayPolicy","SundayIn","SundayOut"],
Leads:["LeadID","Date","Name","Phone","Address","Salesman","Source","SourceDetail","Comments","Status","NextFollowupDate","DealAmount","LostReason","CreatedBy","CreatedAt"],
Followups:["FollowupID","LeadID","Date","Comment","Outcome","NextFollowupDate","DoneBy","Timestamp"],
Customers:["CustomerID","Name","Phone","Address","CreatedFromLead","Salesman","CreatedBy","CreatedAt","OpeningBalance"],
Estimates:["EstimateID","Type","Date","CustomerID","CustomerName","Phone","Address","Salesman","ItemsTotal","Cartage","Unloading","Discount","GrandTotal","SendLabor","PaymentReceived","PaymentSource","PaymentSourceDetail","PaymentTerms","TermsDetail","Status","DispatchStatus","DispatchNotes","CreatedBy","CreatedAt","LastEditedBy","LastEditedAt","Notes","DeliveryType","DeliveryAddress","CheckStatus","CheckedBy","CheckedAt","AutoPerson","SlipStatus","SlipReceivedAt","DeliveryPhone","HideFromCRM","MgrSlipStatus","MgrSlipAt","MgrSlipBy","PromisedAt","PromisedBy","PromisedAt2","Promise2Reason","DispatchedAt","OnTime","WAPromise","WADispatch"], // v39 Manager slip · v40 Promised dispatch time
EstimateItems:["RowID","EstimateID","ItemName","Qty","Price","Amount","Src","Unit"], // v38: Unit = Box/Pcs
Payments:["PaymentID","Date","CustomerID","CustomerName","Amount","Source","SourceDetail","EstimateID","ReceivedBy","Timestamp","Comments","CashStatus","AcceptedBy","AcceptedAt","CheckStatus","CheckedBy","CheckedAt","BillingDetails","BillingItems","VoiceURL","FileURL","AcctCheckStatus","AcctCheckedBy","AcctCheckedAt"],
Expenses:["ExpenseID","Date","Amount","Category","CategoryDetail","Source","EnteredBy","Timestamp","Comments","CashStatus","AcceptedBy","AcceptedAt"],
ExpenseCategories:["CategoryID","Name","RequiresDetail","DetailLabel","CreatedBy","CreatedAt"],
DispatchHistory:["HistoryID","EstimateID","Status","Notes","ChangedBy","Timestamp"],
CancellationRequests:["RequestID","EstimateID","RequestedBy","Reason","Status","ActionBy","ActionAt","RequestedAt"],
Daybook:["Date","OpeningBalance","CashReceived","CashExpenses","ClosingBalance","ClosedBy","ClosedAt","Branch"],
Items:["ItemID","Name","Price","AddedBy","CreatedAt"],
Stock:["ItemName","Qty","Remarks"],
StockMeta:["UpdatedAt","UpdatedBy"],
GpayHeads:["Name","CreatedBy","CreatedAt"],
Branches:["BranchID","Name","CreatedBy","CreatedAt","Lat","Lng","RadiusM","InTime"],
PayFollowups:["PFID","CustomerID","CustomerName","Date","Comment","NextFollowupDate","PromisedAmount","DoneBy","Timestamp","Outcome","Mode","Escalated","EscTaskID"],
AutoPersons:["Name","DriverNumber","CreatedBy","CreatedAt"],
Roles:["RoleName","Modules","Scope","CanAcceptCash","Notes","CreatedBy","CreatedAt"],
Attendance:["AttID","Name","Username","Date","Time","Type","Lat","Lng","DistanceM","SelfieURL","LateBy","Timestamp"],
DelegationTasks:["TaskID","Title","Notes","AssignedTo","AssignedBy","DueDate","PhotoURL","VoiceURL","Status","DoneAt","Comments","CreatedAt"],
Godowns:["GodownID","Name","CreatedBy","CreatedAt","Branch"],
StockCategories:["CatID","Name","CreatedBy","CreatedAt"],
StockItems:["SIID","GodownID","Category","Name","OpeningStock","CreatedBy","CreatedAt"],
Purchases:["RowID","PurchID","Date","VendorID","VendorName","GodownID","SIID","ItemName","Qty","Rate","Amount","Notes","EnteredBy","Timestamp"],
Vendors:["VendorID","Name","CreatedBy","CreatedAt"],
StockOut:["OutID","Date","SIID","ItemName","GodownID","Qty","RefType","RefID","By","Timestamp"],
Feedbacks:["FBID","Date","CustomerID","CustomerName","Phone","Salesman","Branch","Stars","Feedback","Outcome","NextCallDate","CalledBy","Timestamp"],
Substitutes:["SubID","AbsentUser","AbsentName","SubstituteUser","SubstituteName","From","To","Note","CreatedBy","CreatedAt","Status"],
Quotations:["QuotID","Date","ValidTill","CustomerName","Phone","Address","Salesman","Branch","ItemsJSON","SubTotal","Freight","Unloading","GrandTotal","Terms","Notes","Status","CreatedBy","CreatedAt","LastEditedBy","LastEditedAt"]
};
const MODULES = {
wsacct:["Wholesale Accounts","🧾"],
dashboard:["Dashboard","▦"], newlead:["Add New Lead","＋"], leads:["Leads & Followups","☎"],
estimates:["Estimates","🧾"], returns:["Return Goods","↩"], customers:["Customers & Ledgers","👥"],
payfollow:["Payment Followups","💰"], outstanding:["Outstanding","₹"], checkdisp:["Check Dispatch Status","🚚"],
dispatch:["Dispatch Update (CRM)","🚚"], expenses:["Expenses","💸"], daybook:["Daily Cash Book","📒"],
items:["Items","📦"], stock:["Check Stock","🗃"], autos:["Auto Persons","🛺"], addcustomer:["Add Customer","👤"],
approvals:["Cancellation Approvals","✔"], estcheck:["Estimate Checker","🔍"], paycheck:["Payments Checker","🏦"],
misc:["Document Search","🗂️"], scorecard:["Scorecard","📈"], tasks:["Tasks / Checklist","✅"], attendance:["Attendance","🕘"], marketing:["My Marketing Schedule","🧳"], sampling:["Sampling","🧪"], taskmgmt:["Task Management","📌"], postreturn:["Dealer Returns","↩"], fillims:["Fill IMS Entries","📥"], imsdash:["IMS / Purchase","🛒"], zivainbox:["Ziva Inbox","💬"],
stockmgmt:["Stock Management","🏬"], vendormgmt:["Vendor Management","🤝"], bankcheck:["Check Bank Entries","🏦"], analysis:["Analysis","📊"], accesslog:["Access Log","🔍"], feedback:["Feedback Calls","⭐"], paycalls:["Payment Calls Report","📈"], quotation:["Quotations","📄"]
};
const BUILTIN_ROLES = ["Admin","Manager","Salesman","Data Entry","CRM"];
function roleDef(){ return (DB.Roles||[]).find(r=>String(r.RoleName)===USER.Role); }
function isCustomRole(){ return !BUILTIN_ROLES.includes(USER.Role); }
function hasMod(k){ const rd=roleDef(); return !!(rd && String(rd.Modules||"").split(",").map(s=>s.trim()).includes(k)); }
function canRecordPay(){ return isMgr()||isAdmin()||hasMod("recordpay"); }
function canAcceptCash(){ const rd=roleDef(); return isMgr()||isAdmin()||(rd && rd.CanAcceptCash==="Yes"); }
let DB = {};
let USER = null;
let CRED = null;
let ROUTE = "dashboard";
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "₹" + (Number(n)||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const num = v => Number(v)||0;
const todayStr = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const nowStr = () => { const d=new Date(); return todayStr()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0"); };
const tomorrowStr = () => { const d=new Date(); d.setDate(d.getDate()+1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }; // v21.6
const genId = p => p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*36).toString(36).toUpperCase();
function nextId(tab, field, prefix, pad){
pad = pad || 4;
let mx = 0;
const re = new RegExp("^" + prefix + "(\\d+)$");
(DB[tab]||[]).forEach(r=>{ const m = String(r[field]||"").match(re); if(m) mx = Math.max(mx, parseInt(m[1],10)); });
return prefix + String(mx+1).padStart(pad,"0");
}
const dmy = s => { const m=String(s||"").trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); if(!m) return ""; const y=m[3].length===2?("20"+m[3]):m[3]; return y+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0"); };
const daysSince = d => Math.max(0, Math.round((new Date(todayStr()) - new Date(String(d).slice(0,10)))/86400000));
const colLetter = i => { let s=""; i++; while(i>0){ let m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26);} return s; };
const initials = n => (n||"?").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
const photoURL = u => { if(!u) return ""; const m=String(u).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)([\w-]+)/); return m ? "https://drive.google.com/thumbnail?id="+m[1]+"&sz=w400" : u; };
const fmtDate = s => { if(!s) return "—"; const p=String(s).slice(0,10); return p; };
const inRange = (dateStr, from, to) => { const d=String(dateStr).slice(0,10); return d>=from && d<=to; };
function periodRange(kind){
const now = new Date(); const to = todayStr();
const d = new Date(); d.setDate(d.getDate() - (kind==="week"?6:29));
const from = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
return {from, to};
}
function toast(msg, ms=2600){ const t=$("toast"); t.textContent=msg; t.style.display="block"; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display="none", ms); }
function busy(on, msg){ $("busy").classList.toggle("on", !!on); if(msg) $("busy-msg").textContent = msg;
/* v46: watchdog — agar 60s tak overlay on raha (server/network atka) to khud hata do, warna poori screen un-clickable reh jaati thi */
clearTimeout(window._busyWD); if(on){ window._busyWD=setTimeout(()=>{ if($("busy").classList.contains("on")){ $("busy").classList.remove("on"); toast("Server se jawab nahi aaya — dobara try karo"); } }, 60000); } }
/* v33.2 DOUBLE-TAP GUARD: phone par Save do baar dab jaata hai (busy overlay aane se pehle) → do rows. saveOnce(key) pehli call par true, lock 8s ya saveDone(key) tak. */
window._saveLocks={};
function saveOnce(key){ const now=Date.now(); if(window._saveLocks[key] && now-window._saveLocks[key]<8000) return false; window._saveLocks[key]=now; return true; }
function saveDone(key){ delete window._saveLocks[key]; }
function openModal(title, html){ $("modal-title").textContent=title; $("modal-body").innerHTML=html; $("modal-scrim").classList.add("on"); }
function closeModal(){ $("modal-scrim").classList.remove("on"); }
function toggleSidebar(on){ $("sidebar").classList.toggle("open", on); $("scrim").classList.toggle("on", on); }


function gsRun(fn, args){
return new Promise((res, rej)=>{
google.script.run
.withSuccessHandler(res)
.withFailureHandler(e=>{
const m=(e && e.message) || String(e);
if(m.indexOf("SESSION")>-1){ alert(m.replace(/^.*SESSION:\s*/,"")+" — OK dabao, login page khulega."); location.reload(); return; }
rej(new Error(m));
})
.api(fn, args||[], CRED);
});
}
function rowsToObjects(tab, values){
const cols = COLS[tab];
const out = [];
for(let i=1;i<values.length;i++){
const r = values[i];
if(!r || r.every(c=>c===""||c==null)) continue;
// v28.1: scoped (filtered) data mein server asli sheet row "__r<n>" aakhri cell mein bhejta hai — wahi _row hai
const last = r[r.length-1]; const m = (typeof last==="string" && /^__r\d+$/.test(last)) ? Number(last.slice(3)) : 0;
const o = {_row: m || (i+1)};
cols.forEach((c,idx)=> o[c] = r[idx]!==undefined ? r[idx] : "");
out.push(o);
}
return out;
}
function applyAll(all, tabs){
if(!(tabs && tabs.length)){ window._dhLoaded=0; window._attFull=0; } // v24: full refresh = lazy tabs dobara aayenge
(tabs && tabs.length ? tabs : TABS).forEach(tab=>{
const vals = (all && all[tab] && all[tab].length) ? all[tab] : [COLS[tab]];
DB[tab] = rowsToObjects(tab, vals);
});
window._oc={}; window._itIdx=null; window._pfIdx=null;
}
// SPEED: tabs list doge to sirf wahi tabs server se aate hain (jaise cash book ke liye sirf 3 tabs)
async function loadAllData(msg, tabs){
busy(true, msg||"Loading data from Google Sheets…");
try{
const all = await gsRun("readAll", (tabs && tabs.length) ? [tabs] : []);
applyAll(all, tabs);
if(!(tabs && tabs.length)) window._p2=true; // full refresh = sab aa gaya
} finally { busy(false); }
}
/* v27 TWO-PHASE LOGIN — phase 2: bhaari tabs background mein (app khulne ke baad). Jab tak nahi aaye:
 *  upar patli strip, P2_ROUTES par loading card, P2_FNS (estimate kholna/banana, expense, attendance, stock) par toast. */
const DEFER_TABS=["EstimateItems","Expenses","Daybook","Items","Stock","StockMeta","Attendance","DelegationTasks","Godowns","StockCategories","StockItems","Purchases","Vendors","StockOut","Feedbacks","Quotations"];
const P2_ROUTES=new Set(["quotation","paycalls","feedback","expenses","daybook","attendance","stockmgmt","vendormgmt","stock","analysis","mytasks","taskmgmt","tasks","fillims","items","checkdisp","dispatch","estcheck","scorecard","returns","postreturn","approvals"]);
const P2_FNS=["openEstimateForm","openEstimate","openExpenseForm","markAtt","openStockUpload"];
async function loadPhase2(){
if(window._p2 || window._p2Loading) return;
window._p2Loading=true;
const strip=document.getElementById("p2-strip"); 
try{
const all=await gsRun("readAll",[DEFER_TABS,{loginLike:true}]);
applyAll(all, DEFER_TABS);
window._p2=true; window._p2Loading=false;
if(window._perf) window._perf.p2Ms=Date.now()-(window._p2T0||Date.now());
render();
}catch(e){
window._p2Loading=false;
toast("Baaki data load nahi hua: "+e.message+" — dobara try ho raha hai");
setTimeout(loadPhase2, 4000);
}
}
function p2Strip(){ return window._p2 ? "" : `<div id="p2-strip" style="background:#FFF7DB;border:1px solid #F1D48A;border-radius:8px;padding:.35rem .7rem;font-size:.75rem;margin-bottom:.6rem">⏳ Baaki data background mein aa raha hai (items, expenses, attendance, stock)… dashboard use kar sakte ho.</div>`; }
function p2Guard(){ if(window._p2) return true; toast("⏳ Data abhi load ho raha hai — 2-3 sec ruko"); if(!window._p2Loading) loadPhase2(); return false; }
async function appendRow(tab, obj){
try{ const cv=(typeof coverNow==="function")?coverNow():[]; if(cv.length && tab!=="Substitutes"){ const tag=" (cover for "+cv.map(c=>c.abs.Name).join(", ")+")"; if(obj.Comments!==undefined && String(obj.Comments||"").indexOf("(cover for")<0) obj.Comments=String(obj.Comments||"")+tag; else if(obj.Notes!==undefined && String(obj.Notes||"").indexOf("(cover for")<0) obj.Notes=String(obj.Notes||"")+tag; else if(obj.Comment!==undefined && String(obj.Comment||"").indexOf("(cover for")<0) obj.Comment=String(obj.Comment||"")+tag; alog("cover_action", tab); } }catch(e){} // v34
const row = COLS[tab].map(c => (obj[c]!==undefined && obj[c]!==null) ? obj[c] : "");
const res = await gsRun("appendRow", [tab, row]);
if(res && typeof res==="object"){
obj._row = res.r;
const idCol = COLS[tab][0];
if(res.id && obj[idCol]!==undefined && obj[idCol]!==res.id) obj[idCol]=res.id;
} else {
obj._row = res;
}
DB[tab].push(obj);
if(tab==="EstimateItems") window._itIdx=null;
if(tab==="PayFollowups") window._pfIdx=null;
return obj;
}
async function updateFields(tab, rowObj, changes){
const cols = COLS[tab]; const upd = {};
for(const [field, val] of Object.entries(changes)){
const ci = cols.indexOf(field);
if(ci>=0){ upd[ci] = (val===null ? "" : val); rowObj[field] = val; }
}
await gsRun("updateCells", [tab, rowObj._row, upd, {id: rowObj[cols[0]]}]); // v28.1: ID verify (galat row par kabhi na likhe)
return rowObj;
}
async function refreshData(){
await loadAllData("Refreshing");
render();
toast("Data refreshed");
}
async function doLogin(){
if(!window._FILE_OK){
alert("⚠ App JS did not load fully — the AppJS file was pasted incompletely or not deployed. Paste the full AppJS again and deploy a New version.");
return;
}
const u = $("li-user").value.trim(), p = $("li-pass").value;
if(!u || !p){ return showLoginErr("Enter username and password."); }
if(window._loggingIn) return; // double-click guard
window._loggingIn = true;
const _lb=$("li-btn"); if(_lb){ _lb.disabled=true; _lb.style.opacity=".65"; _lb.textContent="Signing in…"; }
busy(true,"Signing in…"); // turant overlay — user ko pata rahe kuch ho raha hai
CRED = {u:u, p:p};
try{
const _t0=Date.now();
const r = await gsRun("login");
const _t1=Date.now();
if(r && r.token) CRED = {u:CRED.u, t:r.token}; // v24: password ab memory mein bhi nahi rehta — har call sirf token se
// SPEED: login response ke saath hi poora data aa jaata hai — doosri server call nahi lagti
window._p2 = !(r && r.phase===1); // v27: phase-1 login → baaki tabs background mein (loadPhase2)
if(r && r.all){ busy(true,"Connecting to database…"); applyAll(r.all); busy(false);
window._perf={server:r.all.__perf||null, loginMs:_t1-_t0, applyMs:Date.now()-_t1, jsMs:(window._jsT1&&window._jsT0)?(window._jsT1-window._jsT0):null, at:new Date().toLocaleTimeString()}; // v25.2 diagnostics
}
else await loadAllData("Connecting to database…");
window._loggingIn=false;
}catch(e){
busy(false); CRED=null;
window._loggingIn=false;
if(_lb){ _lb.disabled=false; _lb.style.opacity="1"; _lb.textContent="Sign in"; }
if(String(e.message).indexOf("Invalid credentials")>-1) return showLoginErr("Wrong username or password.");
if(String(e.message).indexOf("HOURS:")>-1) return showLoginErr("🕘 "+String(e.message).replace(/^.*HOURS:\s*/,"")); // v26 office hours
return showLoginErr("Server error: "+e.message+". Check the deployment (Execute as: Me).");
}
const match = (DB.Users||[]).find(x => String(x.Username).trim().toLowerCase()===u.toLowerCase() && String(x.Status||"Active")!=="Inactive"); // v24: password compare server par ho chuka; sheet ka Password ab client ko aata hi nahi
if(!match){ CRED=null; return showLoginErr("Invalid username or password, or user is inactive."); }
USER = match;
USER._roles = String(match.Role||"").split(",").map(s=>s.trim()).filter(Boolean);
if(USER._roles.length>1) USER.Role = USER._roles[0];
window._rolePicked = USER._roles.length<=1;
sessionStorageShim.user = match;
showWelcome(match);
enterApp();
}
const sessionStorageShim = {};
function showLoginErr(msg){ const e=$("li-err"); e.textContent=msg; e.style.display="block"; }
const WELCOME_PHOTO = "https://drive.google.com/file/d/1n-_uerhnAfityEdPvXuwsvfLSV4pI42Y/view";
function showWelcome(u){
$("login-screen").style.display="none";
const av = $("wl-avatar");
av.innerHTML = `<img src="${esc(photoURL(WELCOME_PHOTO))}" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.textContent='🙏'">`;
$("wl-name").textContent = "Jai Bihari Ji";
$("wl-role").textContent = "Welcome, " + u.Name;
$("welcome-screen").style.display="flex";
}
function enterApp(){
// SPEED: welcome screen 5s → 1.6s → 0.8s (v25.2) — data pehle hi load ho chuka hota hai
setTimeout(()=>{
$("welcome-screen").style.display="none";
$("app").style.display="block";
$("su-name").textContent = USER.Name;
$("su-role").textContent = USER.Role;
$("su-av").innerHTML = USER.PhotoURL ? `<img src="${esc(photoURL(USER.PhotoURL))}" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.textContent='${esc(initials(USER.Name))}'">` : esc(initials(USER.Name));
ROUTE = defaultRoute();
buildNav(); render();
if(!window._p2 && !isSwitchUser()){ window._p2T0=Date.now(); loadPhase2(); } // v27 phase-2 background
scrWM(true); // v26.1: HAR user ke screen par halka naam (Admin bhi) — screenshot leak par pata chale kisne liya
}, 800);
}
/* v35: BSC logo (quotation/print header) — base64 JPEG */
const BSC_LOGO="data:image/jpeg;base64,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";
/* v35: generic PDF → WhatsApp share (ledger wale flow jaisa): server se PDF bytes → share sheet / download / wa.me link */
async function pdfShare(opts){ // {fileName, html, phone, msg, linkMsg, title, noWM}
busy(true,"PDF ban raha hai…");
try{
const res=await gsRun("ledgerPdf",[opts.fileName, opts.noWM?opts.html:wmWrap(opts.html)]);
busy(false);
const digits=String(opts.phone||"").replace(/\D/g,""); const ph=digits.length===10? "91"+digits : digits;
let file=null;
try{ if(res.b64 && window.File){ const bin=atob(res.b64); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); file=new File([arr],(res.name||opts.fileName+".pdf"),{type:"application/pdf"}); } }catch(_e){ file=null; }
const canShare=!!(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]}));
window._waL={file, msg:opts.msg, linkMsg:(opts.linkMsg||opts.msg)+"\n\n📄 PDF: "+res.url, ph, url:res.url, name:opts.title||opts.fileName};
openModal("📲 "+(opts.title||"PDF")+" — WhatsApp par bhejo", `
${canShare? `<button class="btn" style="width:100%;background:#25D366;margin-bottom:.6rem;justify-content:center" onclick="waLedgerShare()">📲 WhatsApp par PDF bhejo (seedha file)</button><p class="muted" style="font-size:.75rem;margin:0 0 .8rem">Share sheet → WhatsApp → contact chuno → PDF attach.</p>`
: `<p class="muted" style="font-size:.78rem;margin:0 0 .8rem">Is device par seedha file-share nahi hai — PDF download karke attach karo, ya link wala message bhejo.</p>`}
<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn ghost small" onclick="waLedgerDownload()">⬇ PDF download</button><button class="btn ghost small" onclick="waLedgerLink()">🔗 Link wala message bhejo</button></div>`);
}catch(e){ busy(false); toast("PDF nahi bana: "+e.message); }
}
/* v26.1: ADMIN "LOGIN AS" — Users screen se kisi bhi user ke account mein ghus ke testing (kisi bhi time). */
async function loginAs(username){
if(!isAdmin()) return;
const u=(DB.Users||[]).find(x=>String(x.Username).toLowerCase()===String(username).toLowerCase()); if(!u) return;
if(!confirm(u.Name+" ("+u.Role+") ke account mein test login karein? Aapke actions us user ke naam se log honge (\"[Admin test]\" tag ke saath).")) return;
busy(true,"Login as "+u.Name+"…");
try{
const r=await gsRun("impersonate",[u.Username]);
window._impAdmin={cred:CRED, user:USER, route:ROUTE, db:DB};
CRED={u:String(u.Username).toLowerCase(), t:r.token};
DB={}; applyAll(r.all); window._p2=true; // impersonate = full readAll
const match=(DB.Users||[]).find(x=>String(x.Username).toLowerCase()===String(u.Username).toLowerCase()) || u;
USER=match; USER._roles=String(match.Role||"").split(",").map(s=>s.trim()).filter(Boolean); if(USER._roles.length>1) USER.Role=USER._roles[0]; window._rolePicked=USER._roles.length<=1;
$("su-name").textContent=USER.Name; $("su-role").textContent=USER.Role+" · 🧪 TEST"; $("su-av").innerHTML=esc(initials(USER.Name));
ROUTE=defaultRoute(); buildNav(); render(); scrWM(true); impBanner(true);
busy(false); toast("🧪 Ab aap "+USER.Name+" ke roop mein hain");
}catch(e){ busy(false); toast("Login as fail: "+e.message); }
}
async function loginAsEnd(){
const S=window._impAdmin; if(!S) return;
busy(true,"Wapas Admin…");
try{ await gsRun("impersonateEnd",[CRED.u]); }catch(e){}
window._impAdmin=null; impBanner(false);
CRED=S.cred; USER=S.user; DB={};
try{ await loadAllData("Admin data reload…"); }catch(e){ DB=S.db; }
$("su-name").textContent=USER.Name; $("su-role").textContent=USER.Role; $("su-av").innerHTML=USER.PhotoURL?`<img src="${esc(photoURL(USER.PhotoURL))}" referrerpolicy="no-referrer">`:esc(initials(USER.Name));
window._rolePicked=true; ROUTE="home"; buildNav(); render(); scrWM(true); busy(false); toast("↩ Admin wapas");
}
function impBanner(on){
let b=document.getElementById("imp-banner");
if(!on){ if(b) b.remove(); return; }
if(!b){ b=document.createElement("div"); b.id="imp-banner"; b.style.cssText="position:fixed;bottom:0;left:0;right:0;z-index:2147483001;background:#b7791f;color:#fff;padding:.5rem .9rem;font-size:.85rem;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:.6rem;box-shadow:0 -2px 8px rgba(0,0,0,.25)"; document.body.appendChild(b); }
b.innerHTML=`<span>🧪 Admin test mode — aap <b>${esc(USER.Name)}</b> (${esc(USER.Role)}) ke roop mein ho</span><button class="btn small" style="background:#fff;color:#b7791f" onclick="loginAsEnd()">↩ Wapas Admin</button>`;
}
/* v25.2: SPEED DIAGNOSTICS — build label par tap (Admin). Login ke numbers: JS load, server readAll (per tab rows/ms/cache), apply. */
function openSpeedDiag(){
if(!USER || !isAdmin()) return;
const P=window._perf||{}; const sp=P.server||{}; const tabs=sp.tabs||{};
const rows=Object.keys(tabs).map(t=>({t, n:tabs[t][0], ms:tabs[t][1], c:tabs[t][2], kb:Math.round(JSON.stringify(DB[t]||[]).length/1024)})).sort((a,b)=>b.ms-a.ms);
const totKB=rows.reduce((s,r)=>s+r.kb,0);
openModal("⚡ Speed diagnostics — "+(P.at||""), `
<div class="grid g4">
<div class="card stat"><div class="v">${P.jsMs!=null?(P.jsMs/1000).toFixed(1)+"s":"—"}</div><div class="l">JS files load (3 files parallel)</div></div>
<div class="card stat ${P.loginMs>6000?'bad':P.loginMs>3000?'warn':'ok'}"><div class="v">${P.loginMs!=null?(P.loginMs/1000).toFixed(1)+"s":"—"}</div><div class="l">Login call (network + server)</div></div>
<div class="card stat"><div class="v">${sp.ms!=null?(sp.ms/1000).toFixed(1)+"s":"—"}</div><div class="l">Server readAll (${rows.filter(r=>r.c).length}/${rows.length} tabs cache se)</div></div>
<div class="card stat"><div class="v">${P.applyMs!=null?P.applyMs+"ms":"—"} · ${totKB}KB</div><div class="l">Phone par parse + data size${P.p2Ms?` · phase-2 ${(P.p2Ms/1000).toFixed(1)}s`:""}</div></div>
</div>
<p class="muted" style="font-size:.75rem">Login call − Server readAll = network/Apps Script overhead. Cache = pichhle 2 min mein kisi ne wahi tab padha tha. Sabse bhaari tabs upar — yahi lazy/archive ke candidates hain.</p>
<div class="tbl-wrap"><table><tr><th>Tab</th><th style="text-align:right">Rows (sheet)</th><th style="text-align:right">Rows (aapko)</th><th style="text-align:right">KB</th><th style="text-align:right">Server ms</th><th>Source</th></tr>
${rows.map(r=>`<tr class="${r.ms>800?'row-yellow':''}"><td><b>${esc(r.t)}</b></td><td style="text-align:right">${r.n}</td><td style="text-align:right">${(DB[r.t]||[]).length}</td><td style="text-align:right">${r.kb}</td><td style="text-align:right">${r.ms}</td><td>${r.c?'<span class="pill p-ok">cache</span>':'<span class="pill p-gray">sheet</span>'}</td></tr>`).join("")}
</table></div>
<div class="muted" style="font-size:.72rem;margin-top:.5rem">Scope: ${esc(sp.scope||"—")} · Frontend: ${esc(window._BUILD||"")} · <b>Server: ${esc(sp.srv||"PURANA Code.gs (v35 se pehle)")}</b> · Ye numbers Claude ko bhejo (screenshot) — agla speed step inhi par decide hoga.</div>`);
}
window.openSpeedDiag=openSpeedDiag;
function logout(){
try{ if(window._impAdmin && CRED){ google.script.run.api("impersonateEnd",[CRED.u],CRED); window._impAdmin=null; impBanner(false); } }catch(e){} // v26.1
try{ alog("logout",""); const q=window._alQ; window._alQ=[]; if(CRED&&CRED.t&&q.length) google.script.run.api("logAccess",[q],CRED); }catch(e){} // v26: sync flush
scrWM(false);
USER=null; DB={}; CRED=null; ROUTE="dashboard";
window._loggingIn=false;
const _lb=$("li-btn"); if(_lb){ _lb.disabled=false; _lb.style.opacity="1"; _lb.textContent="Sign in"; }
busy(false);
$("app").style.display="none";
$("welcome-screen").style.display="none";
$("li-user").value=""; $("li-pass").value=""; $("li-err").style.display="none";
$("login-screen").style.display="flex";
}
function menuFor(role){ return coverMenu(menuForBase(role), role); } // v34 wrapper (menuForBase mein kai early returns hain)
function menuForBase(role){
const M = [];
if(/switch/i.test(String(role||""))) return [["switch","Kill Switch","🌙"]]; // v28: sirf ek screen
if(!BUILTIN_ROLES.includes(role)){
M.push(["mytasks","My Tasks","✅"],["attendance","Attendance","🕘"],["taskmgmt","Assigned Tasks","📌"]);
const rd=(DB.Roles||[]).find(r=>String(r.RoleName)===role);
const IMPLICIT=["mytasks","attendance","taskmgmt"];
const keys=rd? String(rd.Modules||"").split(",").map(s=>s.trim()).filter(k=>MODULES[k] && !IMPLICIT.includes(k)) : [];
keys.forEach(k=>M.push([k, MODULES[k][0], MODULES[k][1]]));
// v19: EA role ko IMS upload apne aap milta hai — Roles tab mein "fillims" add karne ki zaroorat nahi
if(String(role).trim().toUpperCase()==="EA" && !M.some(x=>x[0]==="fillims")) M.push(["fillims", MODULES.fillims[0], MODULES.fillims[1]]);
if(String(role).trim().toUpperCase()==="EA" && !M.some(x=>x[0]==="wsacct")) M.push(["wsacct","Wholesale Accounts","🧾"]); // EA ko wholesale
// v21.1: "Purchase Manager" role (naam mein "purchase") ko IMS / Purchase auto milta hai — EA ko nahi
if(String(role).toLowerCase().indexOf("purchase")>-1 && !M.some(x=>x[0]==="imsdash")) M.push(["imsdash", MODULES.imsdash[0], MODULES.imsdash[1]]);
// v21.6: "Dispatch Manager" role ko dispatch status update ka right auto milta hai — same jaisa CRM ke paas hai
if(String(role).toLowerCase().indexOf("dispatch manager")>-1 && !M.some(x=>x[0]==="dispatch")) M.push(["dispatch","Estimates & Dispatch","🚚"]);
// v22.1: "Accountant" role (naam mein "accountant") ko Check Bank Entries auto milta hai
if(String(role).toLowerCase().indexOf("accountant")>-1 && !M.some(x=>x[0]==="bankcheck")) M.push(["bankcheck", MODULES.bankcheck[0], MODULES.bankcheck[1]]);
return M;
}
if(role==="Admin") M.push(["home","BSC Dashboard","🏠"],["myscheduler","My Scheduler","⭐"]);
M.push(["dashboard", role==="Admin"?"Retail Dashboard":"Dashboard","▦"]);
if(role==="Data Entry"){ M.push(["attendance","Attendance","🕘"],["taskmgmt","Assigned Tasks","📌"],["newlead","Add New Lead","＋"],["addcustomer","Add Customer","👤"],["estimates","Estimates","🧾"],["autos","Auto Persons","🛺"],["stock","Check Stock","🗃"]); return M; }
if(role==="CRM"){
M.push(["feedback","Feedback Calls","⭐"],["paycalls","Payment Calls Report","📈"],["attendance","Attendance","🕘"],["taskmgmt","Assigned Tasks","📌"],["dispatch","Estimates & Dispatch","🚚"],["payfollow","Payment Followups","💰"],["outstanding","Outstanding","₹"],["customers","Customer Ledgers","👥"],["autos","Auto Persons","🛺"],["stock","Check Stock","🗃"]);
return M;
}
if(role==="Admin"){
M.push(["attendance","Attendance","🕘"],["taskmgmt","Task Management","📌"],["stock","Check Stock","🗃"]);
M.push(["_hdr","MASTER"]);
M.push(["items","Items","📦"],["fillims","Fill IMS Entries","📥"],["imsdash","IMS / Purchase","🛒"],["zivainbox","Ziva Inbox","💬"],["addcustomer","Add Customer","👤"],["autos","Auto Persons","🛺"],["tasks","Tasks / Checklist","✅"],["users","Users","🔑"]);
M.push(["_hdr","RETAIL"]);
M.push(["leads","Leads & Followups","☎"],["estimates","Estimates","🧾"],["quotation","Quotations","📄"],["returns","Return Goods","↩"],["customers","Customers & Ledgers","👥"],["payfollow","Payment Followups","💰"],["expenses","Expenses","💸"],["daybook","Daily Cash Book","📒"],["stockmgmt","Stock Management","🏬"],["vendormgmt","Vendor Management","🤝"],["dispatch","Dispatch (CRM view)","🚚"],["outstanding","Outstanding","₹"],["approvals","Cancellation Approvals","✔"],["estcheck","Estimate Checker","🔍"],["paycheck","Payments Checker","🏦"],["bankcheck","Check Bank Entries","🏦"],["analysis","Analysis","📊"],["accesslog","Access Log","🔍"],["feedback","Feedback Calls","⭐"],["paycalls","Payment Calls Report","📈"],["quotation","Quotations","📄"]);
M.push(["_hdr","WHOLESALE"]);
M.push(["marketing","Marketing Visits","🧳"],["sampling","Sampling","🧪"]);
return M;
}
M.push(["attendance","Attendance","🕘"],["taskmgmt","Assigned Tasks","📌"],["leads","Leads & Followups","☎"],["estimates","Estimates","🧾"],["quotation","Quotations","📄"],["returns","Return Goods","↩"],["customers","Customers & Ledgers","👥"],["payfollow","Payment Followups","💰"],["stock","Check Stock","🗃"]);
if(role==="Salesman"||role==="Manager") M.push(["checkdisp","Check Dispatch Status","🚚"]);
if(role==="Manager") M.push(["outstanding","Outstanding","₹"]);
if(role==="Manager") M.push(["expenses","Expenses","💸"],["daybook","Daily Cash Book","📒"],["analysis","Analysis","📊"],["paycalls","Payment Calls Report","📈"]); // v25: Analysis (apni branch); v32: CRM calls report
// v22: Manager ko Stock Management + Vendor Management
if(role==="Manager" && /civil/i.test(String(USER.Branch||""))) M.push(["stockmgmt","Stock Management","🏬"],["vendormgmt","Vendor Management","🤝"]); // v23.2: sirf Civil Lines branch ke Manager ko
if(role==="Salesman"||role==="Manager") M.push(["scorecard","My Scorecard","📈"]);
return M;
}
function isSwitchUser(){ return !!USER && /switch/i.test(String(USER.Role||"")); } // v28 kill switch user
/** v34: cover modules menu mein — Manager cover = estimates/returns/customers(payment receive)/expenses/daybook; CRM-type cover = us role ka poora menu */
function coverMenu(M, role){
if(!USER || role!==USER.Role) return M; // sirf apne real role ke menu par
const has=new Set(M.map(x=>x[0]));
const cm=coverMgr();
if(cm && USER.Role!=="Manager" && USER.Role!=="Admin"){
M.push(["_hdr","🔁 COVER: "+cm.abs.Name]);
[["estimates","Estimates","🧾"],["returns","Return Goods","↩"],["customers","Customers & Ledgers","👥"],["expenses","Expenses","💸"],["daybook","Daily Cash Book (aaj)","📒"]].forEach(x=>{ if(!has.has(x[0])){ M.push(x); has.add(x[0]); } });
}
coverOthers().forEach(c=>{
if(!c.abs.Role || USER.Role==="Admin") return;
const theirs=menuFor(c.abs.Role).filter(x=>x[0]!=="_hdr" && !has.has(x[0]));
if(theirs.length){ M.push(["_hdr","🔁 COVER: "+c.abs.Name]); theirs.forEach(x=>{ M.push(x); has.add(x[0]); }); }
});
return M;
}
function coverStrip(){
const cv=coverNow(); if(!cv.length) return "";
return `<div style="background:#EEF4FF;border:1px solid #BFD3FF;border-radius:8px;padding:.4rem .7rem;font-size:.78rem;margin-bottom:.6rem">🔁 Aaj aap <b>${cv.map(c=>esc(c.abs.Name)+" ("+esc(c.abs.Role||"")+(c.abs.Branch?" · "+esc(c.abs.Branch):"")+")").join(", ")}</b> ko cover kar rahe ho — menu mein "COVER" section dekho. Aapke actions aapke naam se save honge (for ${esc(cv.map(c=>c.abs.Name).join(", "))}).</div>`;
}
function defaultRoute(){
if(isSwitchUser()) return "switch";
if(USER._roles && USER._roles.length>1 && !window._rolePicked) return "rolepick";
if(USER.Role==="Admin") return "home";
if(USER.Role==="Data Entry") return "dashboard";
if(isCustomRole()) return "mytasks";
return "dashboard";
}
function dueFollowupsCount(){
const t = todayStr();
return myLeads().filter(l=>l.Status==="Open" && l.NextFollowupDate && String(l.NextFollowupDate).slice(0,10)<=t).length;
}
function pendingRebates(){ return (DB.Payments||[]).filter(p=>p.Source==="Rebate" && p.CashStatus==="Pending Approval"); }
function pendingApprovalsCount(){
return (DB.CancellationRequests||[]).filter(r=>r.Status==="Pending").length + pendingRebates().length;
}
function buildNav(){
const nav = $("nav"); nav.innerHTML="";
if(USER._roles && USER._roles.length>1 && !window._rolePicked) return;
menuFor(USER.Role).forEach(([r,label,ic])=>{
if(r==="_hdr"){
const d=document.createElement("div");
d.textContent=label;
d.style.cssText="padding:.7rem 1rem .25rem;font-size:.66rem;font-weight:800;letter-spacing:.09em;opacity:.55;text-transform:uppercase";
nav.appendChild(d);
return;
}
const a = document.createElement("a");
a.href="javascript:void 0"; a.dataset.route=r;
let badge = "";
if(r==="leads" && dueFollowupsCount()>0) badge = `<span class="badge">${dueFollowupsCount()}</span>`;
if(r==="approvals" && pendingApprovalsCount()>0) badge = `<span class="badge">${pendingApprovalsCount()}</span>`;
a.innerHTML = `<span>${ic}</span> ${label} ${badge}`;
a.onclick = async ()=>{ if(isAdmin() && r==="dashboard"){ toggleSidebar(false); openAdmBranchPick(); return; } ROUTE=r; toggleSidebar(false); if(r==="daybook"){ try{ await loadAllData("Getting latest cash data…", ["Payments","Expenses","Daybook"]); }catch(e){} } if(r==="attendance" && !window._attFull){ try{ await loadAllData("Attendance history…", ["Attendance"]); window._attFull=1; }catch(e){} } render(); };
nav.appendChild(a);
});
if(USER._roles && USER._roles.length>1){
const s=document.createElement("a");
s.href="javascript:void 0";
s.innerHTML=`<span>🔁</span> Switch role <span class="muted" style="font-size:.7rem">(${esc(USER.Role)})</span>`;
s.style.cssText="margin-top:.6rem;border-top:1px solid rgba(255,255,255,.12);padding-top:.7rem;opacity:.85";
s.onclick=()=>{ switchRole(); };
nav.appendChild(s);
}
}
function render(){
try{ coverApply(); }catch(e){} // v34
window._oc={}; window._itIdx=null; window._pfIdx=null; window._agingCache={}; // SPEED: per-render caches reset
if(isCustomRole() && ROUTE!=="rolepick"){
const allowed = new Set(menuFor(USER.Role).map(x=>x[0]));
if(!allowed.has(ROUTE)) ROUTE = allowed.size ? menuFor(USER.Role)[0][0] : "noaccess";
}
buildNav();
document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("active", a.dataset.route===ROUTE));
const titles = {noaccess:"No Access", mytasks:"My Tasks", home:"BSC Dashboard", wholesale:"Wholesale", wsacct:"Wholesale Accounts", misc:"Document Search", dashboard:USER.Role==="Admin"?"Retail Dashboard":"Dashboard", newlead:"Add New Lead", leads:"Leads & Followups", estimates:"Estimates", customers:"Customers & Ledgers", items:"Items", checkdisp:"Check Dispatch Status", stock:"Check Stock", returns:"Return Goods", addcustomer:"Add Customer", estcheck:"Estimate Checker", paycheck:"Payments Checker", payfollow:"Payment Followups", autos:"Auto Persons", tasks:"Tasks / Checklist", attendance:"Attendance", marketing:"Marketing Visits (B2B)", sampling:"Sampling (B2B)", taskmgmt:"Task Management (Delegation)", postreturn:"Dealer Returns (B2B)", wholesale:"Wholesale", wsacct:"Wholesale Accounts", rolepick:"Choose Role", expenses:"Expenses", daybook:"Daily Cash Book", dispatch:"Estimates & Dispatch", outstanding:"Outstanding Payments", approvals:"Cancellation Approvals", users:"Users", scorecard:"My Scorecard", myscheduler:"My Scheduler", fillims:"Fill IMS Entries (Stock In/Out)", imsdash:"IMS / Purchase (Stock Control)", zivainbox:"💬 Ziva Inbox (WhatsApp)", stockmgmt:"Stock Management", vendormgmt:"Vendor Management", bankcheck:"Check Bank Entries", analysis:"📊 Analysis", accesslog:"🔍 Access Log", feedback:"⭐ Feedback Calls", paycalls:"📈 Payment Calls Report", quotation:"📄 Quotations"};
$("page-title").textContent = titles[ROUTE]||"";
const v = $("view");
let out;
try{
const fn = {rolepick:vRolePick, noaccess:vNoAccess, mytasks:vMyTasks, home:vAdminHome, wholesale:vWholesale, misc:vMisc, dashboard:vDashboard, newlead:vNewLeadPage, leads:vLeads, estimates:vEstimates, customers:vCustomers, items:vItems, checkdisp:vCheckDisp, stock:vStock, returns:vReturns, addcustomer:vAddCustomer, estcheck:vEstCheck, paycheck:vPayCheck, payfollow:vPayFollow, autos:vAutos, tasks:vTasks, attendance:vAttendance, marketing:vMarketing, sampling:vSampling, taskmgmt:vTaskMgmt, postreturn:vPostReturn, expenses:vExpenses, daybook:vDaybook, dispatch:vDispatch, outstanding:vOutstanding, approvals:vApprovals, users:vUsers, scorecard:vScorecard, myscheduler:(window.vScheduler||vNoAccess), fillims:(window.vFillIMS||vNoAccess), imsdash:(window.vIMSDash||vNoAccess), zivainbox:(window.vZivaInbox||vNoAccess), stockmgmt:(window.vStockMgmt||vNoAccess), vendormgmt:(window.vVendorMgmt||vNoAccess), bankcheck:(window.vBankCheck||vNoAccess), analysis:(window.vAnalysis||vNoAccess), accesslog:(window.vAccessLog||vNoAccess), switch:(window.vSwitch||vNoAccess), feedback:(window.vFeedback||vNoAccess), paycalls:(window.vPayCalls||vNoAccess), quotation:(window.vQuotation||vNoAccess), wsacct:(window.vWSAcct||vNoAccess)}[ROUTE]; // v42: wholesale accounts
out = (!window._p2 && P2_ROUTES.has(ROUTE)) ? `<div class="card empty">⏳ Ye screen ka data abhi background mein aa raha hai — 2-3 sec mein khud khul jayega.</div>` : (fn ? fn() : "<div class='empty'>Not found</div>");
if(!window._p2 && ROUTE!=="rolepick" && ROUTE!=="switch") out = p2Strip()+out;
if(ROUTE!=="rolepick" && ROUTE!=="switch") out = coverStrip()+out; // v34
}catch(err){
out = `<div class="card" style="border-left:4px solid var(--bad)"><b>⚠ Screen error:</b> ${esc(err.message||String(err))}<div class="muted" style="margin-top:.4rem">Send a screenshot of this message — it will be fixed quickly. (Usually this means Index.html was not pasted fully.)</div></div>`;
}
v.innerHTML = out;
if(window._refocusId){
const el=document.getElementById(window._refocusId);
if(el){ el.focus(); try{ const L=el.value.length; el.setSelectionRange(L,L); }catch(_e){} }
window._refocusId=null;
}
}
/* v34 COVER: Admin ne Substitutes mein aaj ke liye B ko A ka substitute banaya →
 *  A Manager hai → B aaj Manager jaisa (isMgr true, isSales false, branch = A ki) par menu sirf cover modules; Daybook sirf aaj.
 *  A CRM / CRM Wholesale hai → B ko A ke modules mil jaate hain. Real role check ke liye USER.Role seedha dekho. */
function coverNow(){
if(!USER) return [];
const t=todayStr(), me=String(USER.Username||"").toLowerCase();
return (DB.Substitutes||[]).filter(r=>String(r.SubstituteUser||"").toLowerCase()===me && r.Status!=="Cancelled" && String(r.From).slice(0,10)<=t && String(r.To).slice(0,10)>=t)
.map(r=>({row:r, abs:(DB.Users||[]).find(u=>String(u.Username||"").toLowerCase()===String(r.AbsentUser||"").toLowerCase())||{Name:r.AbsentName,Role:"",Branch:""}}));
}
function roleHas(re){ return re.test(String(USER.Role||"")) || coverNow().some(c=>re.test(String(c.abs.Role||""))); } // v34: real role YA cover role
function coverMgr(){ return coverNow().find(c=>/manager/i.test(String(c.abs.Role||"")) && !/dispatch/i.test(String(c.abs.Role||""))) || null; }
function coverOthers(){ return coverNow().filter(c=>!(/manager/i.test(String(c.abs.Role||"")) && !/dispatch/i.test(String(c.abs.Role||"")))); }
function coverApply(){ // har render par: cover state USER par set
if(!USER) return; const cm=coverMgr();
if(cm && USER.Role!=="Manager" && USER.Role!=="Admin"){ USER._cvMgr=cm.abs; if(USER._origBranch===undefined) USER._origBranch=USER.Branch||""; USER.Branch=cm.abs.Branch||USER._origBranch; }
else if(USER._cvMgr){ USER._cvMgr=null; if(USER._origBranch!==undefined) USER.Branch=USER._origBranch; }
}
const isMgr = ()=> USER.Role==="Manager" || !!(USER && USER._cvMgr), isAdmin = ()=> USER.Role==="Admin", isSales = ()=> USER.Role==="Salesman" && !(USER && USER._cvMgr);
function canSeeAll(){ return isAdmin() || USER.Role==="CRM"; }
// v23: Civil Line manager ne "No — CRM se chhupao" chuna ho to wo estimates SIRF CRM role se hide hote hain (Admin/Manager sabko dikhte hain)
/* v39: MANAGER SLIP STATUS — CRM slip receive karke OK kare → manager ko slip jaati hai → manager "received" kare.
 *  MgrSlipStatus: "" (CRM ne abhi OK nahi kiya) / "Pending" (CRM ne de di, manager ne nahi li) / "Received". */
function mgrSlipPendingList(){
return (DB.Estimates||[]).filter(e=>e.Status!=="Cancelled" && e.MgrSlipStatus==="Pending" && inMyBranch(e.Salesman)).sort((a,b)=>a.SlipReceivedAt<b.SlipReceivedAt?1:-1);
}
function openMgrSlipPending(){
const list=mgrSlipPendingList();
openModal("📄 Slips NOT received from CRM ("+list.length+")", `
${list.length? `<div class="tbl-wrap"><table><tr><th>Estimate</th><th>Customer</th><th>CRM received</th><th></th></tr>
${list.map(e=>`<tr><td><b>${esc(e.EstimateID)}</b><div class="muted" style="font-size:.75rem">${fmtDate(e.Date)} · ${esc(e.Salesman||"")}</div></td>
<td>${esc(e.CustomerName)}</td><td>${esc(String(e.SlipReceivedAt||"").slice(0,16))}</td>
<td><button class="btn small" style="background:var(--ok)" onclick="closeModal();markMgrSlipReceived('${e.EstimateID}')">Slip ✓ received</button></td></tr>`).join("")}
</table></div>` : `<div class="card empty">Sab slips mil gayi. 🎉</div>`}`);
}
async function markMgrSlipReceived(id){
const e=DB.Estimates.find(x=>x.EstimateID===id); if(!e) return;
busy(true,"Marking slip received…");
try{
await updateFields("Estimates", e, {MgrSlipStatus:"Received", MgrSlipAt:nowStr(), MgrSlipBy:USER.Name});
alog("mgr_slip_received", id);
busy(false); toast("Slip received ✓"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
/* v39: Manager estimate edit — sirf jab tak PENDING FOR DISPATCH ya ON HOLD hai (apni branch). Dispatch shuru hote hi right khatam. */
function mgrCanEditEst(e){
if(!isMgr() || !e || e.Status==="Cancelled" || e.Type==="Return") return false;
const dp=e.DispatchStatus||"PENDING FOR DISPATCH";
return (dp==="PENDING FOR DISPATCH" || dp==="ON HOLD") && inMyBranch(e.Salesman);
}
/* ===== v40 PROMISED TIME OF DISPATCH =====
 *  CRM dispatch wale se poochkar "Promised time" bharti hai (date+time) → live countdown. Deadline nikal jaaye to
 *  2nd promised time (reason zaroori, max 2). DISPATCHED / PARTIALLY DISPATCHED par DispatchedAt + OnTime (1st promise se)
 *  auto note. Customer ko WhatsApp template: promise / revised / dispatched. */
function promActive(e){ return String(e.PromisedAt2||e.PromisedAt||""); } // latest promise
function promMs(v){ v=String(v||""); if(v.length<16) return 0; const d=new Date(v.slice(0,10)+"T"+v.slice(11,16)+":00"); return isNaN(d)?0:d.getTime(); }
function promFmt(v){ v=String(v||""); if(v.length<16) return "—"; return fmtDate(v.slice(0,10))+" · "+promTime12(v.slice(11,16)); }
function promTime12(hm){ const h=+hm.slice(0,2), m=hm.slice(3,5); const ap=h>=12?"PM":"AM"; return (h%12||12)+":"+m+" "+ap; }
function promTimerStopped(e){ const dp=e.DispatchStatus||"PENDING FOR DISPATCH"; return !!e.DispatchedAt || dp==="DISPATCHED" || dp==="PARTIALLY DISPATCHED" || dp==="RETURN GOODS RECEIVED" || e.Status==="Cancelled"; }
function promIsLate(e){ const t=promMs(promActive(e)); return !!t && !promTimerStopped(e) && Date.now()>t; }
function promDur(ms){ ms=Math.abs(ms); const m=Math.round(ms/60000); if(m<60) return m+"m"; const h=Math.floor(m/60); if(h<24) return h+"h "+(m%60)+"m"; return Math.floor(h/24)+"d "+(h%24)+"h"; }
function promCountdown(e){
const v=promActive(e); const t=promMs(v); if(!t) return "";
if(promTimerStopped(e)) return "";
const left=t-Date.now();
return `<span class="cd" data-cd="${t}" style="font-weight:700;color:${left<0?'var(--bad)':left<3600000?'#B9640F':'var(--ok)'}">${left<0?"🔴 LATE "+promDur(left):"⏳ "+promDur(left)+" left"}</span>`;
}
function cdTick(){
document.querySelectorAll("[data-cd]").forEach(el=>{ const t=+el.dataset.cd; const left=t-Date.now(); el.style.color=left<0?'var(--bad)':left<3600000?'#B9640F':'var(--ok)'; el.textContent=left<0?"🔴 LATE "+promDur(left):"⏳ "+promDur(left)+" left"; });
}
if(!window._cdT) window._cdT=setInterval(cdTick, 30000);
function promNA(e){ return e.Type==="Return" || /pick|self|hold/i.test(String(e.DeliveryType||"")) || (e.DispatchStatus||"PENDING FOR DISPATCH")==="ON HOLD"; } // v40.4: Self Pickup / Hold → promise nahi
function promCell(e){ // dispatch view column
if(promNA(e)) return `<span class="muted">${e.Type==="Return"?"—":/pick|self/i.test(String(e.DeliveryType||""))?"Self pickup":"On hold"}</span>`;
const canSet = USER.Role==="CRM" || isAdmin();
let h="";
if(e.PromisedAt) h+=`<div style="white-space:nowrap">${e.PromisedAt2?'<s class="muted">':''}${promFmt(e.PromisedAt)}${e.PromisedAt2?'</s>':''}</div>`;
if(e.PromisedAt2) h+=`<div style="white-space:nowrap"><b>${promFmt(e.PromisedAt2)}</b> <span class="pill p-warn" style="font-size:.62rem" title="${esc(e.Promise2Reason||"")}">2nd</span></div>`;
if(e.DispatchedAt){ h+=`<div class="muted" style="font-size:.75rem">Dispatched ${esc(String(e.DispatchedAt).slice(0,16))}</div>`; if(e.OnTime) h+=`<span class="pill ${e.OnTime==="On time"?'p-ok':e.OnTime==="Late"?'p-bad':'p-gray'}">${esc(e.OnTime)}</span>`; }
else { const cd=promCountdown(e); if(cd) h+=`<div>${cd}</div>`; }
if(canSet && !promTimerStopped(e)){
if(!e.PromisedAt) h+=`<button class="btn small dark" onclick="openPromise('${e.EstimateID}',1)">⏰ Promised time</button>`;
else if(!e.PromisedAt2 && promIsLate(e)) h+=`<button class="btn small danger" onclick="openPromise('${e.EstimateID}',2)">2nd promised time</button>`;
}
if(e.WAPromise) h+=`<div class="muted" style="font-size:.7rem">WA: ${esc(String(e.WAPromise).slice(0,40))}</div>`;
return h||`<span class="muted">—</span>`;
}
function openPromise(id, nth){
const e=DB.Estimates.find(x=>x.EstimateID===id); if(!e) return;
if(nth===2 && e.PromisedAt2) return toast("2nd promised time pehle hi set hai — ab aur nahi.");
if(nth===2 && !e.PromisedAt) nth=1;
const d=new Date(Date.now()+2*3600000); const pad=n=>String(n).padStart(2,"0");
const dv=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()), tv=pad(d.getHours())+":"+pad(d.getMinutes());
openModal((nth===2?"2nd promised time":"Promised time of dispatch")+" — "+id, `
<div class="rowline"><span>Customer</span><b>${esc(e.CustomerName)} · ${esc(e.Phone)}</b></div>
${nth===2?`<div class="rowline"><span>1st promise (missed)</span><b style="color:var(--bad)">${promFmt(e.PromisedAt)}</b></div>`:""}
<div class="form-grid">
<div><label>Date <span class="req">*</span></label><input type="date" id="pr-d" value="${dv}" min="${todayStr()}"></div>
<div><label>Time <span class="req">*</span></label><input type="time" id="pr-t" value="${tv}"></div>
${nth===2?`<div class="full"><label>Reason — pehli deadline kyun miss hui <span class="req">*</span></label><input id="pr-r" placeholder="e.g. Auto nahi mila / material godown se late aaya"></div>`:""}
</div>
<label style="display:flex;align-items:center;gap:.4rem;margin:.6rem 0;text-transform:none;font-weight:600;cursor:pointer"><input type="checkbox" id="pr-wa" checked style="width:auto"> Customer ko WhatsApp bhejo (${nth===2?"revised time":"promised time"}) — na bhejna ho to untick</label>
<div style="margin-top:.8rem"><button class="btn" onclick="savePromise('${id}',${nth})">Save ${nth===2?"2nd ":""}promised time</button></div>`);
}
async function savePromise(id, nth){
if(!saveOnce("prom"+id)) return;
const e=DB.Estimates.find(x=>x.EstimateID===id);
const dv=$("pr-d").value, tv=$("pr-t").value; const r=nth===2?$("pr-r").value.trim():"";
if(!dv||!tv){ saveDone("prom"+id); return toast("Date aur time dono chahiye."); }
if(nth===2 && !r){ saveDone("prom"+id); return toast("Reason likhna zaroori hai."); }
const v=dv+" "+tv;
if(promMs(v) < Date.now()-60000){ saveDone("prom"+id); return toast("Ye time nikal chuka hai — aage ka time do."); }
busy(true,"Saving promised time…");
try{
const ch = nth===2 ? {PromisedAt2:v, Promise2Reason:r} : {PromisedAt:v, PromisedBy:USER.Name};
await updateFields("Estimates", e, ch);
await appendRow("DispatchHistory",{HistoryID:nextId("DispatchHistory","HistoryID","DH"),EstimateID:id,Status:(nth===2?"2ND PROMISED TIME":"PROMISED TIME"),Notes:promFmt(v)+(r?" · Reason: "+r:""),ChangedBy:USER.Name,Timestamp:nowStr()});
alog(nth===2?"promise2":"promise1", id+" "+v);
// customer WhatsApp (template) — fail hua to bhi promise save rehta hai; v40.2: tick hata diya to nahi jaata
let wa="";
if(!($("pr-wa")&&$("pr-wa").checked)) wa="skip (untick)";
else try{
const res=await gsRun("custNotify",[nth===2?"revised":"promise", {phone:e.Phone, name:e.CustomerName, est:id, date:fmtDate(dv), time:promTime12(tv)}]);
wa=(res&&res.ok)?"✓ "+nowStr().slice(0,16):"✗ "+String(res&&res.err||"fail").slice(0,60);
}catch(err){ wa="✗ "+String(err.message||"").slice(0,60); }
await updateFields("Estimates", e, {WAPromise:(e.WAPromise?e.WAPromise+" | ":"")+(nth===2?"2nd ":"")+wa});
busy(false); closeModal(); toast(wa.startsWith("✓")?"Promised time saved · customer ko WhatsApp gaya ✓":wa.startsWith("skip")?"Promised time saved (WhatsApp nahi bheja)":"Promised time saved — WhatsApp nahi gaya: "+wa.slice(2)); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
saveDone("prom"+id);
}
function crmHide(list){ return USER.Role==="CRM" ? (list||[]).filter(e=>String(e.HideFromCRM||"").trim()!=="Yes") : (list||[]); }
/* v23.2: ADMIN GLOBAL BRANCH SCOPE — Retail / Retail Dashboard par click karte hi branch poochte hain;
 * phir leads, estimates, customers, expenses, cash book, dispatch, payfollow, outstanding SAB usi branch ka.
 * admSyncBr har view ke apne branch-dropdown ko bhi sync rakhta hai (dropdown badla to scope bhi badalta hai). */
function admScoped(){ return isAdmin() && window._admBr && window._admBr!=="all"; }
function admSyncBr(v){
if(!isAdmin()) return;
window._admBr=v;
window._adminBranch=v; window._cuBr=v; window._dbBr=v; window._dpBr=v; window._pfBr=v; window._outBr=v;
}
function openAdmBranchPick(){
const cur=window._admBr||"all";
const btn=(v,l)=>`<button class="btn ${cur===v?'':'ghost'}" style="width:100%;margin-bottom:.5rem;justify-content:flex-start" data-v="${esc(v)}" onclick="admPickBranch(this.dataset.v)">${l}${cur===v?" ✓":""}</button>`;
openModal("Kaunsi branch ka data dekhna hai?", `
<p class="muted" style="margin-bottom:.8rem">Retail ka poora data — leads, estimates, customers, cash book, dispatch, payment followups, outstanding — <b>isi branch ka</b> dikhega. Badalna ho to Retail par dobara click karo (ya kisi bhi page ke branch dropdown se).</p>
${btn("all","🏢 All branches — poora data")}
${(DB.Branches||[]).map(b=>btn(b.Name,"📍 "+esc(b.Name))).join("")}
${btn("__none","🏠 HO / users without a branch")}`);
}
function admPickBranch(v){
admSyncBr(v);
closeModal(); ROUTE="dashboard"; render();
toast(v==="all"?"Sab branches ka data ✓":"Branch: "+(v==="__none"?"HO":v)+" ✓");
}
/* v23.2: GODOWN BRANCH-WISE — Manager ko sirf apni branch ke godowns dikhte hain
 * (blank Branch = purane/legacy godowns — wo bhi dikhte hain); Admin ko sab.
 * Kal Hambran Road ka alag stock banana ho to bas us branch ke naam se godown banao — data apne aap alag rahega. */
function myGodowns(){
const gs=DB.Godowns||[];
if(isAdmin()) return gs;
const b=String(USER.Branch||"").trim().toLowerCase();
return gs.filter(g=>{const gb=String(g.Branch||"").trim().toLowerCase(); return !gb || gb===b;});
}
function myLeads(){
const L = DB.Leads||[];
if(canSeeAll()) return admScoped()? L.filter(l=>inMyBranch(l.Salesman)) : L; // v23.2
if(isSales()) return L.filter(l=>l.Salesman===USER.Name);
if(isMgr()) return L.filter(l=>inMyBranch(l.Salesman));
if(USER.Role==="Data Entry") return L.filter(l=>l.CreatedBy===USER.Name);
return L.filter(l=>inMyBranch(l.Salesman));
}
function myEstimates(){
const E = DB.Estimates||[];
if(canSeeAll()) return admScoped()? E.filter(e=>inMyBranch(e.Salesman)) : E; // v23.2
if(isSales()) return E.filter(e=>e.Salesman===USER.Name);
if(isMgr()) return E.filter(e=>inMyBranch(e.Salesman));
return E.filter(e=>inMyBranch(e.Salesman));
}
function myCustomers(){
const C = DB.Customers||[];
if(canSeeAll()) return admScoped()? C.filter(c=>inMyBranch(c.Salesman)) : C; // v23.2
if(isMgr()) return C.filter(c=>inMyBranch(c.Salesman));
if(isSales()){
const mine = new Set((DB.Estimates||[]).filter(e=>e.Salesman===USER.Name).map(e=>e.CustomerID));
return C.filter(c=> c.Salesman===USER.Name || mine.has(c.CustomerID));
}
return C.filter(c=>inMyBranch(c.Salesman));
}
function salesmen(){
let list=(DB.Users||[]).filter(u=>["Salesman","Manager"].includes(u.Role) && u.Status!=="Inactive");
if(isMgr() && USER.Branch) list=list.filter(u=>(u.Branch||"")===USER.Branch || u.Name===USER.Name);
return list;
}
function userBranch(name){ const u=(DB.Users||[]).find(x=>x.Name===name); return u? (u.Branch||"") : ""; }
function myScopeBranch(){
if(admScoped()) return window._admBr; // v23.2: Admin ka chuna hua Retail branch scope
if(isMgr() && USER.Branch) return USER.Branch;
const rd=roleDef();
if(rd && rd.Scope==="Branch" && USER.Branch) return USER.Branch;
return "";
}
function inMyBranch(personName){
const b=myScopeBranch();
if(!b) return true;
if(!personName) return true;
const pb=userBranch(personName);
if(b==="__none") return pb===""; // v23.2: HO scope = sirf bina-branch users
return !pb || pb===b;
}
function activeEstimates(list){ return list.filter(e=>e.Status!=="Cancelled"); }
function rowClass(e){
const dp = e.Status==="Cancelled" ? "CANCELLED" : (e.DispatchStatus||"PENDING FOR DISPATCH");
if(dp==="DISPATCHED"||dp==="RETURN GOODS RECEIVED") return "row-green";
if(dp==="PARTIALLY DISPATCHED") return "row-yellow";
if(dp==="ON HOLD") return "row-orange";
if(dp==="CANCELLED") return "row-red";
return "row-yellow";
}
function cancelledEstimates(list){ return list.filter(e=>e.Status==="Cancelled"); }
// SPEED: EstimateItems ka index ek baar banta hai per render — pehle har estimate ke liye poori list scan hoti thi
function itemsOf(estId){
if(!window._itIdx){ const m={}; (DB.EstimateItems||[]).forEach(i=>{ (m[i.EstimateID]=m[i.EstimateID]||[]).push(i); }); window._itIdx=m; }
return window._itIdx[estId]||[];
}
// SPEED: saare customers ka outstanding EK pass mein — pehle har customer ke liye
// poore Estimates+Payments+Expenses dobara scan hote the (dashboard par sabse bhaari kaam tha)
function buildOutstandingMap_(){
const oc={__done:1};
const byName={};
(DB.Customers||[]).forEach(c=>{
oc[c.CustomerID]=num(c.OpeningBalance);
const nm=String(c.Name||"").trim().toLowerCase();
if(nm) (byName[nm]=byName[nm]||[]).push(c.CustomerID);
});
(DB.Estimates||[]).forEach(e=>{
if(e.Status==="Cancelled" || !(e.CustomerID in oc)) return;
if(e.Type==="Return") oc[e.CustomerID]-=num(e.GrandTotal); else oc[e.CustomerID]+=num(e.GrandTotal);
});
(DB.Payments||[]).forEach(p=>{
if(!(p.CustomerID in oc)) return;
if(p.Source==="Rebate" && p.CashStatus!=="Approved") return;
oc[p.CustomerID]-=num(p.Amount);
});
(DB.Expenses||[]).forEach(x=>{
if(x.Category!=="Customer Return") return;
const ids=byName[String(x.CategoryDetail||"").trim().toLowerCase()]||[];
ids.forEach(id=>oc[id]+=num(x.Amount));
});
window._oc=oc;
window._agingCache={};
}
/* v36 FIFO BILL-WISE AGING (Tally "bill-wise outstanding" jaisa):
 *  bills = Opening (date = CreatedAt) + sale estimates (date-order, Cancelled nahi); credits = payments (Rebate sirf Approved) + Return estimates
 *  + Customer Return expenses — sab credits sabse PURANE bill par pehle. Jo bills (poore/aadhe) bache = open bills; age = aaj − bill date.
 *  Credit terms ignore (estimate date = due date). Returns {open:[{ref,date,days,amt,orig}], oldest, oldestDays, total, buckets} */
function custAging(custId){
window._agingCache=window._agingCache||{};
if(window._agingCache[custId]) return window._agingCache[custId];
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId); const t=todayStr();
const dayOf=d=>{ const a=new Date(String(d).slice(0,10)+"T00:00:00"), b=new Date(t+"T00:00:00"); return Math.max(0,Math.round((b-a)/86400000)); };
const bills=[];
if(c && num(c.OpeningBalance)>0) bills.push({ref:"Opening",date:String(c.CreatedAt||t).slice(0,10),amt:num(c.OpeningBalance),orig:num(c.OpeningBalance)});
let credit=0;
if(c && num(c.OpeningBalance)<0) credit+=-num(c.OpeningBalance);
(DB.Estimates||[]).forEach(e=>{ if(e.CustomerID!==custId||e.Status==="Cancelled") return; if(e.Type==="Return") credit+=num(e.GrandTotal); else bills.push({ref:e.EstimateID,date:String(e.Date).slice(0,10),amt:num(e.GrandTotal),orig:num(e.GrandTotal)}); });
(DB.Payments||[]).forEach(p=>{ if(p.CustomerID!==custId) return; if(p.Source==="Rebate"&&p.CashStatus!=="Approved") return; credit+=num(p.Amount); });
if(c){ const nm=String(c.Name||"").trim().toLowerCase(); (DB.Expenses||[]).forEach(x=>{ if(x.Category==="Customer Return" && String(x.CategoryDetail||"").trim().toLowerCase()===nm) credit-=num(x.Amount); }); } // customer-return expense = paisa wapas diya = bill wapas khula
bills.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
let rem=Math.max(0,credit); const open=[];
for(const b of bills){ if(rem>=b.amt-0.005){ rem-=b.amt; continue; } b.amt=Math.round((b.amt-rem)*100)/100; rem=0; b.days=dayOf(b.date); open.push(b); }
if(credit<0){ /* net debit from customer-return expenses beyond credits: treat as today's bill */ open.push({ref:"Adj",date:t,amt:Math.round(-credit*100)/100,orig:-credit,days:0}); }
const total=open.reduce((s,b)=>s+b.amt,0);
const buckets={b0:0,b16:0,b31:0,b61:0,b90:0}; open.forEach(b=>{ const k=b.days<=15?"b0":b.days<=30?"b16":b.days<=60?"b31":b.days<=90?"b61":"b90"; buckets[k]+=b.amt; });
const r={open, oldest:open[0]||null, oldestDays:open.length?open[0].days:0, total, buckets};
window._agingCache[custId]=r; return r;
}
function ageColor(d){ return d>60?"var(--bad)":d>30?"#EA580C":d>15?"#B7791F":"var(--ok)"; }
function agePill(custId){ const a=custAging(custId); if(!a.open.length) return ""; const d=a.oldestDays; return `<span class="pill" style="background:${ageColor(d)};color:#fff" title="Sabse purana khula bill: ${esc(a.oldest.ref)} ${fmtDate(a.oldest.date)} — ${money(a.oldest.amt)}">${d} din</span>`; }
function agingBoxHTML(custId){
const a=custAging(custId); if(!a.open.length) return "";
return `<div class="card" style="padding:.6rem .9rem;margin:.6rem 0;border-left:4px solid ${ageColor(a.oldestDays)}"><b style="font-size:.85rem">⏳ Khula paisa — bill-wise (FIFO: payments purane bill par pehle)</b>
<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0;font-size:.72rem">${[["0–15",a.buckets.b0,"var(--ok)"],["16–30",a.buckets.b16,"#B7791F"],["31–60",a.buckets.b31,"#EA580C"],["61–90",a.buckets.b61,"var(--bad)"],["90+",a.buckets.b90,"#7F1D1D"]].filter(x=>x[1]>0.009).map(x=>`<span class="pill" style="background:${x[2]};color:#fff">${x[0]} din: ${money(x[1])}</span>`).join("")}</div>
<table style="min-width:0;font-size:.8rem"><tr><th>Bill</th><th>Date</th><th style="text-align:right">Bill amount</th><th style="text-align:right">Baki</th><th style="text-align:right">Din</th></tr>
${a.open.map(b=>`<tr><td>${esc(b.ref)}</td><td>${fmtDate(b.date)}</td><td style="text-align:right" class="muted">${money(b.orig)}</td><td style="text-align:right"><b>${money(b.amt)}</b></td><td style="text-align:right;color:${ageColor(b.days)};font-weight:700">${b.days}</td></tr>`).join("")}
</table></div>`;
}
function customerOutstanding(custId){
if(!window._oc || !window._oc.__done) buildOutstandingMap_();
if(custId in window._oc) return window._oc[custId];
// fallback — customer list mein nahi hai (purana/unknown ID): purane tarike se nikalo
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId);
let bal = c? num(c.OpeningBalance) : 0;
(DB.Estimates||[]).forEach(e=>{
if(e.CustomerID!==custId || e.Status==="Cancelled") return;
if(e.Type==="Return") bal -= num(e.GrandTotal); else bal += num(e.GrandTotal);
});
(DB.Payments||[]).forEach(p=>{ if(p.CustomerID!==custId) return; if(p.Source==="Rebate" && p.CashStatus!=="Approved") return; bal -= num(p.Amount); });
(DB.Expenses||[]).forEach(x=>{ if(x.Category==="Customer Return" && c && String(x.CategoryDetail||"").trim().toLowerCase()===String(c.Name||"").trim().toLowerCase()) bal += num(x.Amount); });
window._oc[custId]=bal;
return bal;
}


function vMyTasks(){
return `${attBanner()}${dgCard()}${myTasksCard()}
<p class="muted">These tasks come from the Non-Daily Checklist — matched to your email (${esc(USER.Username)}) matched by your email. Press ✓ Done to confirm and remove the task from the list.</p>`;
}
function vRolePick(){
const icons={"Admin":"👑","Manager":"🧑‍💼","Salesman":"🤝","CRM":"📞","Data Entry":"⌨️"};
return `<div style="max-width:640px;margin:2rem auto;text-align:center">
<h2 style="margin-bottom:.4rem">Which role do you want to work in today?</h2>
<p class="muted">You have ${USER._roles.length} roles — choose one (you can switch later from the sidebar)</p>
<div class="grid g2" style="margin-top:1rem">
${USER._roles.map(r=>`<div class="card click-tile" onclick="pickRole('${esc(r).replace(/'/g,"\\'")}')">
<div class="ic">${icons[r]||"🧩"}</div><h3>${esc(r)}</h3></div>`).join("")}
</div></div>`;
}
function pickRole(r){
USER.Role=r;
window._rolePicked=1;
window._oc={};
ROUTE=defaultRoute();
buildNav(); render();
toast("Role: "+r+" ✓");
}
function switchRole(){
window._rolePicked=0;
ROUTE="rolepick";
buildNav(); render();
}
function vNoAccess(){
return `<div class="card" style="text-align:center;padding:3.5rem 1rem;max-width:560px;margin:2rem auto">
<div style="font-size:3.5rem">🔒</div>
<h3 style="margin:.6rem 0">No modules assigned</h3>
<p class="muted">Aapke role "${esc(USER.Role)}"​ has no modules assigned yet. Ask Admin to assign modules in Roles.</p>
</div>`;
}
function vAdminHome(){
return `${attBanner()}${secAlertCard()}${dgCard()}${myTasksCard()}<div class="grid g3">
<div class="card click-tile" onclick="openAdmBranchPick()"><div class="ic">🏪</div><h3>Retail</h3><p class="muted">Leads, estimates, dispatch, cash — poora retail ERP</p></div>
<div class="card click-tile" onclick="ROUTE='wholesale';render()"><div class="ic">🏭</div><h3>Wholesale</h3><p class="muted">Marketing visits, sampling, dealer returns</p></div>
<div class="card click-tile" onclick="window._docCat='';ROUTE='misc';render()"><div class="ic">🗂️</div><h3>Misc</h3><p class="muted">Document Search — ID proofs, business docs, vehicles</p></div>
</div>`;
}
function vUC(){
return `<div class="card" style="text-align:center;padding:4rem 1rem;max-width:560px;margin:2rem auto">
<div style="font-size:4.2rem">🚧</div>
<h3 style="margin:.6rem 0;font-size:1.3rem">Under Construction</h3>
<p class="muted">Yeh module jald hi aayega.</p>
<button class="btn ghost" style="margin-top:1.2rem" onclick="ROUTE='home';render()">← BSC Dashboard</button>
</div>`;
}
function openSlipPending(){
const list=crmHide((DB.Estimates||[]).filter(e=>e.Status!=="Cancelled" && e.SlipStatus==="Pending")).sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
openModal("📄 Signed slips NOT received ("+list.length+")", `
${list.length? `<div class="tbl-wrap"><table><tr><th>Estimate</th><th>Customer</th><th>Auto</th><th>Dispatch date</th><th></th></tr>
${list.map(e=>`<tr><td><b>${esc(e.EstimateID)}</b></td><td>${esc(e.CustomerName)}<div class="muted" style="font-size:.75rem">${esc(e.Salesman||"")}</div></td>
<td>${esc(e.AutoPerson||"—")}</td><td>${esc(String(e.LastEditedAt||e.CreatedAt)).slice(0,10)}</td>
<td><button class="btn small" style="background:var(--ok)" onclick="closeModal();markSlipReceived('${e.EstimateID}')">Slip ✓ received</button></td></tr>`).join("")}
</table></div>` : `<div class="card empty">All slips received. 🎉</div>`}`);
}
function vDashboard(){
if(USER.Role==="Data Entry") return deoDashboard();
if(String(USER.Role).trim().toUpperCase()==="PC") return pcChecklistView();
const card = attBanner() + dgCard() + myTasksCard();
if(USER.Role==="CRM") return card + crmDashboard();
if(isAdmin()) return card + adminDashboard();
return card + salesDashboard();
}
function salesDashboard(){
const t = todayStr();
const f = isMgr() ? (window._dashSm||"all") : "all";
let allLeads = myLeads(), custs = myCustomers();
if(f!=="all"){ allLeads=allLeads.filter(l=>l.Salesman===f); custs=custs.filter(c=>String(c.Salesman||"")===f); }
const leads = allLeads.filter(l=>l.Status==="Open");
const due = leads.filter(l=>l.NextFollowupDate && String(l.NextFollowupDate).slice(0,10)<=t);
const owing = custs.map(c=>({c, bal: customerOutstanding(c.CustomerID)})).filter(x=>x.bal>0.01);
const payDue = owing.map(x=>({...x, pf:lastPF(x.c.CustomerID)}))
.filter(x=> x.pf && x.pf.NextFollowupDate && String(x.pf.NextFollowupDate).slice(0,10)<=t)
.sort((a,b)=> String(a.pf.NextFollowupDate).slice(0,10) < String(b.pf.NextFollowupDate).slice(0,10) ? -1 : 1);
return `
${(isMgr()&&!isAdmin())? (()=>{ const n=mgrSlipPendingList().length; return `<div style="margin-bottom:.6rem"><button class="btn small ${n?'danger':'ghost'}" onclick="openMgrSlipPending()">📄 Slips NOT received from CRM: ${n}</button></div>`; })() : ""}
${isMgr()? `<div class="toolbar"><label style="margin:0">Salesman</label>
<select style="max-width:260px" onchange="window._dashSm=this.value;render()">
<option value="all" ${f==='all'?'selected':''}>All salesmen</option>
${salesmen().map(s=>`<option ${f===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}
</select></div>`:""}
<div class="grid g3">
<div class="card stat ${due.length?'bad':'ok'}"><div class="v">${due.length}</div><div class="l">Followups due today</div></div>
<div class="card stat"><div class="v">${leads.length}</div><div class="l">My open leads</div></div>
<div class="card stat warn"><div class="v">${money(owing.reduce((s,x)=>s+x.bal,0))}</div><div class="l">My customers owe</div></div>
</div>
<div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
<button class="btn" onclick="openLeadForm()">＋ Log a new lead</button>
<button class="btn ghost" onclick="ROUTE='leads';render()">Open followups</button>
<button class="btn ghost" onclick="ROUTE='estimates';render()">Estimates</button>
</div>
<div class="section-h"><h3>Leads Followup</h3><div class="ln"></div></div>
${leadTable(due, true)}
${isSales()? `<div class="section-h"><h3>🔺 Payment escalations (CRM se)</h3><div class="ln"></div></div>${window.escList? escList(USER.Name, true) : ""}` : `<div class="section-h"><h3>Today's Payments Followup</h3><div class="ln"></div></div>
${payDue.length? `<div class="tbl-wrap"><table><tr><th>Customer</th><th>Phone</th><th style="text-align:right">Outstanding</th><th>Last followup</th><th>Next date</th><th></th></tr>
${payDue.map(x=>{
const nd=String(x.pf.NextFollowupDate).slice(0,10);
return `<tr class="${nd<t?'row-red':'row-yellow'}"><td><b>${esc(x.c.Name)}</b><div class="muted">${esc(x.c.Salesman||"")}</div></td><td>${esc(x.c.Phone)}</td>
<td style="text-align:right"><b style="color:var(--bad)">${money(x.bal)}</b></td>
<td class="muted">${fmtDate(x.pf.Date)} — ${esc(String(x.pf.Comment||"")).slice(0,50)}</td>
<td>${nd<t? `<span class="pill p-bad">${nd} · overdue</span>` : `<span class="pill p-warn">Today</span>`}</td>
<td style="white-space:nowrap"><button class="btn small" onclick="openPayFollowup('${x.c.CustomerID}')">💬 Followup</button>
<button class="btn small ghost" onclick="openLedger('${x.c.CustomerID}')">Ledger</button></td></tr>`;
}).join("")}
</table></div>` : `<div class="card empty">No payment follow-ups due today. Open the 💰 Payment Followups tab to schedule a new one.</div>`}`}`;
}
function crmDashboard(){
const est = crmHide(activeEstimates(DB.Estimates||[]));
const pend = est.filter(e=>(e.DispatchStatus||"PENDING FOR DISPATCH")==="PENDING FOR DISPATCH");
const part = est.filter(e=>e.DispatchStatus==="PARTIALLY DISPATCHED");
const hold = est.filter(e=>e.DispatchStatus==="ON HOLD");
const totalOut = (DB.Customers||[]).reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0);
const slipPend = est.filter(e=>e.SlipStatus==="Pending").length;
const noProm = est.filter(e=>!promNA(e) && !promTimerStopped(e) && !e.PromisedAt).length; // v40 · v40.4 promNA
const lateNow = est.filter(e=>promIsLate(e)).length; // v40
return `
<div class="grid g4">
<div class="card stat ${noProm?'bad':'ok'} click" onclick="window._dpF='noprom';ROUTE='dispatch';render()" style="cursor:pointer"><div class="v">${noProm}</div><div class="l">⏰ Bina promised time</div></div>
<div class="card stat ${lateNow?'bad':'ok'} click" onclick="window._dpF='late';ROUTE='dispatch';render()" style="cursor:pointer"><div class="v">${lateNow}</div><div class="l">🔴 Deadline cross (abhi late)</div></div>
<div class="card stat ${slipPend?'bad':'ok'} ${slipPend?'click':''}" ${slipPend?'onclick="openSlipPending()" style="cursor:pointer"':''}><div class="v">${slipPend}</div><div class="l">Signed slips NOT received ${slipPend?'<u>· view list</u>':''}</div></div>
<div class="card stat bad"><div class="v">${pend.length}</div><div class="l">Pending for dispatch</div></div>
<div class="card stat warn"><div class="v">${part.length}</div><div class="l">Partially dispatched</div></div>
<div class="card stat"><div class="v">${hold.length}</div><div class="l">On hold</div></div>
<div class="card stat"><div class="v">${money(totalOut)}</div><div class="l">Total outstanding</div></div>
</div>
<div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
<button class="btn" onclick="ROUTE='dispatch';render()">Update dispatch status</button>
<button class="btn ghost" onclick="ROUTE='outstanding';render()">Outstanding payments</button>
<button class="btn dark" onclick="ROUTE='stock';render()">🗃 Stock / Update Stock</button>
</div>`;
}
function smRevenue(name, from, to){
const es=(DB.Estimates||[]).filter(e=>e.Salesman===name && e.Status!=="Cancelled" && inRange(e.Date,from,to));
const sales=es.filter(e=>e.Type!=="Return");
const rev=es.reduce((s,e)=> s + (e.Type==="Return"? -num(e.GrandTotal) : num(e.GrandTotal)), 0);
return {rev, saleCount:sales.length};
}
function smOutstanding(name){
return (DB.Customers||[]).filter(c=>String(c.Salesman||"")===name)
.reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0);
}
function openSmOutstanding(i){
const r=(window._perfRows||[])[i]; if(!r) return;
const name=r.s.Name;
const rows=(DB.Customers||[]).filter(c=>String(c.Salesman||"")===name).map(c=>({c,bal:customerOutstanding(c.CustomerID)})).filter(x=>x.bal>0.009).sort((a,b)=>b.bal-a.bal);
openModal("Market credit — "+name, `
<div class="rowline"><span>Total outstanding (market credit)</span><b style="color:var(--bad)">${money(rows.reduce((s,x)=>s+x.bal,0))}</b></div>
${rows.length? `<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>Customer</th><th>Phone</th><th style="text-align:right">Outstanding</th><th></th></tr>
${rows.map(x=>`<tr><td><b>${esc(x.c.Name)}</b></td><td>${esc(x.c.Phone)}</td><td style="text-align:right"><b>${money(x.bal)}</b></td>
<td><button class="btn small ghost" onclick="openLedger('${x.c.CustomerID}')">View Ledger</button></td></tr>`).join("")}</table></div>` : `<div class="card empty">No outstanding for this salesman. 🎉</div>`}`);
}
function adminDashboard(){
const per = window._adminPeriod || "week";
const br = window._adminBranch || "all";
const {from,to} = periodRange(per);
const rows = salesmen().filter(s=> br==="all" || (s.Branch||"")===br).map(s=>{
const leads = (DB.Leads||[]).filter(l=>l.Salesman===s.Name);
const open = leads.filter(l=>l.Status==="Open");
const t = todayStr();
const missed = open.filter(l=>l.NextFollowupDate && String(l.NextFollowupDate).slice(0,10)<t).length;
const dueToday = open.filter(l=>String(l.NextFollowupDate).slice(0,10)===t).length;
const fups = (DB.Followups||[]).filter(f=>f.DoneBy===s.Name && inRange(f.Date,from,to));
const won = fups.filter(f=>f.Outcome==="Deal Won");
const {rev, saleCount} = smRevenue(s.Name, from, to);
const conv = fups.length? Math.round(won.length/fups.length*100) : 0;
const avg = saleCount? rev/saleCount : 0;
const out = smOutstanding(s.Name);
return {s, open:open.length, missed, dueToday, meetings:fups.length, won:won.length, conv, rev, avg, out};
});
window._perfRows = rows;
const pend = pendingApprovalsCount();
const slipPend=(DB.Estimates||[]).filter(e=>e.Status!=="Cancelled" && e.SlipStatus==="Pending").length;
const cashPend=(DB.Payments||[]).filter(p=>p.Source==="Cash" && p.CashStatus==="Pending").length + (DB.Expenses||[]).filter(x=>x.Source==="Cash" && x.CashStatus==="Pending").length;
const t2=todayStr();
const pfDue=myCustomers().map(c=>({bal:customerOutstanding(c.CustomerID),pf:lastPF(c.CustomerID)})).filter(x=>x.bal>0.009 && (!x.pf || !x.pf.NextFollowupDate || String(x.pf.NextFollowupDate).slice(0,10)<=t2)).length;
return `
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center">
<select style="width:auto;font-weight:700" onchange="admSyncBr(this.value);window._adminBranch=this.value;render()">
<option value="all" ${br==='all'?'selected':''}>🏢 All branches</option>
${(DB.Branches||[]).map(b=>`<option ${br===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
</select>
<span class="pill ${slipPend?'p-bad':'p-ok'}" style="cursor:pointer" onclick="openSlipPending()">📄 Slips NOT received: ${slipPend}</span>
<span class="pill ${cashPend?'p-warn':'p-ok'}" style="cursor:pointer" onclick="ROUTE='daybook';render()">💰 Cash acceptance pending: ${cashPend}</span>
<span class="pill ${pfDue?'p-warn':'p-ok'}" style="cursor:pointer" onclick="ROUTE='payfollow';render()">💬 Payment followups due: ${pfDue}</span>
</div>
<div class="grid g4">
<div class="card stat"><div class="v">${(DB.Leads||[]).filter(l=>l.Status==="Open" && (br==="all" || userBranch(l.Salesman)===br)).length}</div><div class="l">Open leads ${br==='all'?'(all)':'('+esc(br)+')'}</div></div>
<div class="card stat warn"><div class="v">${rows.reduce((s,r)=>s+r.missed,0)}</div><div class="l">Missed followups</div></div>
<div class="card stat ok"><div class="v">${money(rows.reduce((s,r)=>s+r.rev,0))}</div><div class="l">Revenue won (${per==='week'?'7 days':'30 days'})</div></div>
<div class="card stat ${pend?'bad':''}"><div class="v">${pend}</div><div class="l">Cancellations to approve</div></div>
</div>
<div class="section-h"><h3>Salesman performance</h3><div class="ln"></div>
<select style="width:auto" onchange="window._adminPeriod=this.value;render()">
<option value="week" ${per==='week'?'selected':''}>Weekly (last 7 days)</option>
<option value="month" ${per==='month'?'selected':''}>Monthly (last 30 days)</option>
</select>
</div>
<div class="tbl-wrap"><table>
<tr><th>Salesman</th><th>Open leads</th><th>Due today</th><th>Missed f/ups</th><th>Meetings done</th><th>Deals won</th><th>Conversion</th><th>Avg sale</th><th style="text-align:right">Revenue</th><th style="text-align:right">Market credit (outstanding)</th></tr>
${rows.map(r=>`<tr>
<td><span class="avatar-sm">${r.s.PhotoURL?`<img src="${esc(photoURL(r.s.PhotoURL))}" referrerpolicy="no-referrer" onerror="this.remove()">`:esc(initials(r.s.Name))}</span> ${esc(r.s.Name)}${r.s.Branch?` <span class="muted">(${esc(r.s.Branch)})</span>`:""}</td>
<td>${r.open}</td><td>${r.dueToday}</td>
<td>${r.missed? `<span class="pill p-bad">${r.missed} missed</span>` : `<span class="pill p-ok">On time</span>`}</td>
<td>${r.meetings}</td><td>${r.won}</td><td>${r.conv}%</td><td>${money(r.avg)}</td>
<td style="text-align:right"><b>${money(r.rev)}</b></td>
<td style="text-align:right"><a href="javascript:void 0" onclick="openSmOutstanding(${rows.indexOf(r)})" style="color:var(--bad);font-weight:800">${money(r.out)}</a></td></tr>`).join("") || "<tr><td colspan=10 class='empty'>No salesmen yet — create users first.</td></tr>"}
</table></div>
<div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
<button class="btn" onclick="ROUTE='approvals';render()">Review cancellations</button>
<button class="btn ghost" onclick="ROUTE='daybook';render()">Daily cash book</button>
<button class="btn ghost" onclick="ROUTE='users';render()">Manage users</button>
</div>`;
}
function leadTable(list, followupMode){
if(!list.length) return `<div class="card empty">Nothing here.</div>`;
const t=todayStr();
return `<div class="tbl-wrap"><table>
<tr><th>Lead</th><th>Phone</th><th>Salesman</th><th>Source</th><th>Status</th><th>Next followup</th><th></th></tr>
${list.map(l=>{
const nd = String(l.NextFollowupDate||"").slice(0,10);
const late = l.Status==="Open" && nd && nd<t;
const stPill = l.Status==="Won"? "p-ok" : l.Status==="Lost"? "p-bad" : "p-blue";
return `<tr class="click" onclick="openLead('${l.LeadID}')">
<td><b>${esc(l.Name)}</b><div class="muted">${esc(l.Address||"")}</div></td>
<td>${esc(l.Phone)}</td><td>${esc(l.Salesman)}</td><td>${esc(l.Source)}${l.SourceDetail?` <span class="muted">(${esc(l.SourceDetail)})</span>`:""}</td>
<td><span class="pill ${stPill}">${esc(l.Status)}</span></td>
<td>${nd? (late? `<span class="pill p-bad">${nd} · overdue</span>`: nd===t? `<span class="pill p-warn">Today</span>`: nd) : "—"}</td>
<td><button class="btn small ${followupMode?'':'ghost'}" onclick="event.stopPropagation();openLead('${l.LeadID}')">${l.Status==='Open'?'Followup':'View'}</button></td></tr>`;
}).join("")}
</table></div>`;
}
function leadListHTML(){
const q = window._leadQ||"", f = window._leadF||"all";
let list = myLeads();
const t = todayStr();
if(f==="open") list=list.filter(l=>l.Status==="Open");
if(f==="due") list=list.filter(l=>l.Status==="Open" && l.NextFollowupDate && String(l.NextFollowupDate).slice(0,10)<=t);
if(f==="won") list=list.filter(l=>l.Status==="Won");
if(f==="lost") list=list.filter(l=>l.Status==="Lost");
if(q) list=list.filter(l=>(l.Name+" "+l.Phone+" "+l.Salesman).toLowerCase().includes(q.toLowerCase()));
list = [...list].sort((a,b)=> String(a.NextFollowupDate||"9999") < String(b.NextFollowupDate||"9999") ? -1 : 1);
return leadTable(list);
}
function leadsFilter(){ const el=$("leads-list"); if(el) el.innerHTML=leadListHTML(); }
function vLeads(){
const q = window._leadQ||"", f = window._leadF||"all";
return `
<div class="toolbar">
<input placeholder="Search name / phone…" value="${esc(q)}" oninput="window._leadQ=this.value;leadsFilter()">
<select onchange="window._leadF=this.value;render()">
<option value="all" ${f==='all'?'selected':''}>All leads</option>
<option value="due" ${f==='due'?'selected':''}>Due / overdue followups</option>
<option value="open" ${f==='open'?'selected':''}>Open</option>
<option value="won" ${f==='won'?'selected':''}>Won</option>
<option value="lost" ${f==='lost'?'selected':''}>Lost</option>
</select>
<button class="btn" onclick="openLeadForm()">＋ New lead</button>
</div>
<div id="leads-list">${leadListHTML()}</div>`;
}
function vNewLeadPage(){
return `<div class="card" style="max-width:640px">${leadFormHTML()}</div>`;
}
function leadFormHTML(){
const canAssign = isAdmin()||isMgr()||USER.Role==="Data Entry";
const smOpts = salesmen().map(s=>`<option ${(!canAssign&&s.Name===USER.Name)||''}>${esc(s.Name)}</option>`).join("");
return `
<div class="form-grid">
<div><label>Name <span class="req">*</span></label><input id="ld-name"></div>
<div><label>Phone Number <span class="req">*</span></label><input id="ld-phone" inputmode="tel"></div>
<div class="full"><label>Address</label><input id="ld-addr"></div>
<div><label>Salesman Assigned <span class="req">*</span></label>
<select id="ld-sm" ${!canAssign?'disabled':''}>${isSales()?`<option selected>${esc(USER.Name)}</option>`:smOpts}</select></div>
<div><label>Source <span class="req">*</span></label>
<select id="ld-src" onchange="$('ld-src-detail-wrap').style.display=this.value==='Reference by Friend'?'block':'none'">
<option>Walk-in</option><option>Google</option><option>Reference by Friend</option><option>BNI</option><option>Site Visit</option>
</select></div>
<div class="full" id="ld-src-detail-wrap" style="display:none"><label>Friend's name <span class="req">*</span></label><input id="ld-src-detail"></div>
<div class="full"><label>Comments <span class="req">*</span></label><textarea id="ld-com" rows="2"></textarea></div>
<div><label>First followup date</label><input id="ld-next" type="date" value="${todayStr()}"></div>
</div>
<div style="margin-top:1rem"><button class="btn" onclick="saveLead()">Save lead</button></div>`;
}
function openLeadForm(){ openModal("Log a new lead", leadFormHTML()); }
async function saveLead(){
const name=$("ld-name").value.trim(), phone=$("ld-phone").value.trim(), com=$("ld-com").value.trim();
const src=$("ld-src").value, srcD=($("ld-src-detail")?$("ld-src-detail").value.trim():"");
const sm = isSales()? USER.Name : $("ld-sm").value;
if(!name||!phone||!com||!sm) return toast("Name, phone, salesman and comments are mandatory.");
if(src==="Reference by Friend" && !srcD) return toast("Enter the friend's name for reference source.");
busy(true,"Saving lead…");
try{
await appendRow("Leads",{LeadID:nextId("Leads","LeadID","LD"), Date:todayStr(), Name:name, Phone:phone, Address:$("ld-addr").value.trim(),
Salesman:sm, Source:src, SourceDetail:srcD, Comments:com, Status:"Open",
NextFollowupDate:$("ld-next").value||todayStr(), DealAmount:"", LostReason:"", CreatedBy:USER.Name, CreatedAt:nowStr()});
closeModal(); toast("Lead saved ✓"); render();
}catch(e){ toast("Could not save: "+e.message); }
busy(false);
}
function openLead(id){
const l = (DB.Leads||[]).find(x=>x.LeadID===id); if(!l) return;
const hist = (DB.Followups||[]).filter(f=>f.LeadID===id).sort((a,b)=>a.Timestamp<b.Timestamp?1:-1);
const canAct = (l.Salesman===USER.Name || isAdmin() || isMgr()) && l.Status==="Open";
const wonEst = l.Status==="Won";
openModal("Lead — "+l.Name, `
<div class="rowline"><span>Phone</span><b>${esc(l.Phone)}</b></div>
<div class="rowline"><span>Address</span><b>${esc(l.Address||"—")}</b></div>
<div class="rowline"><span>Salesman</span><b>${esc(l.Salesman)}</b></div>
<div class="rowline"><span>Source</span><b>${esc(l.Source)}${l.SourceDetail?" ("+esc(l.SourceDetail)+")":""}</b></div>
<div class="rowline"><span>Status</span><b>${esc(l.Status)}${l.Status==='Won'&&num(l.DealAmount)?' · '+money(l.DealAmount):''}${l.Status==='Lost'?' · '+esc(l.LostReason):''}</b></div>
<div class="rowline"><span>Opening comment</span><b>${esc(l.Comments)}</b></div>
${(wonEst && !isSales())? `<div style="margin:.8rem 0"><button class="btn ok" style="background:var(--ok)" onclick="openEstimateForm('${l.LeadID}')">🧾 Create Estimate from this lead</button></div>`:wonEst?`<div class="muted" style="margin:.6rem 0">🧾 Estimate Manager banayega (v23 se salesman ke paas ye right nahi hai)</div>`:""}
${canAct? `
<div class="section-h"><h3>Do a followup</h3><div class="ln"></div></div>
<label>What did the customer say? <span class="req">*</span></label><textarea id="fu-com" rows="2"></textarea>
<label>Outcome <span class="req">*</span></label>
<select id="fu-out" onchange="$('fu-next-w').style.display=this.value==='Next Followup'?'block':'none';$('fu-lost-w').style.display=this.value==='Deal Lost'?'block':'none'">
<option>Next Followup</option><option>Deal Won</option><option>Deal Lost</option>
</select>
<div id="fu-next-w"><label>Next followup date <span class="req">*</span></label><input type="date" id="fu-next" value="${todayStr()}"></div>
<div id="fu-lost-w" style="display:none"><label>Reason for loss <span class="req">*</span></label><input id="fu-reason"></div>
<div style="margin-top:1rem"><button class="btn" onclick="saveFollowup('${l.LeadID}')">Save followup</button></div>`:""}
<div class="section-h"><h3>Followup history</h3><div class="ln"></div></div>
<div class="hist">${hist.map(f=>`<div class="h-item"><b>${esc(f.Outcome)}</b> <span class="muted">· ${esc(f.Timestamp)} · by ${esc(f.DoneBy)}</span><div>${esc(f.Comment)}</div>${f.NextFollowupDate?`<div class="muted">Next: ${fmtDate(f.NextFollowupDate)}</div>`:""}</div>`).join("") || "<div class='muted'>No followups yet.</div>"}</div>
`);
}
async function saveFollowup(leadId){
const l = DB.Leads.find(x=>x.LeadID===leadId);
const com = $("fu-com").value.trim(), out = $("fu-out").value;
if(!com) return toast("Comment about what the customer said is mandatory.");
let next="", reason="";
if(out==="Next Followup"){ next=$("fu-next").value; if(!next) return toast("Enter next followup date."); }
if(out==="Deal Lost"){ reason=$("fu-reason").value.trim(); if(!reason) return toast("Reason for loss is mandatory."); }
busy(true,"Saving followup…");
try{
await appendRow("Followups",{FollowupID:nextId("Followups","FollowupID","FU"), LeadID:leadId, Date:todayStr(), Comment:com, Outcome:out, NextFollowupDate:next, DoneBy:USER.Name, Timestamp:nowStr()});
if(out==="Next Followup") await updateFields("Leads", l, {NextFollowupDate:next});
if(out==="Deal Won") await updateFields("Leads", l, {Status:"Won", NextFollowupDate:""});
if(out==="Deal Lost") await updateFields("Leads", l, {Status:"Lost", LostReason:reason, NextFollowupDate:""});
busy(false); toast("Followup saved ✓");
if(out==="Deal Won"){ closeModal(); render(); if(isSales()){ toast("Deal Won ✓ — estimate ab Manager banayega"); } else { openEstimateForm(leadId); } return; }
closeModal();
render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}


function vEstimates(){
const q = window._estQ||"", dFrom=window._estFrom||"", dTo=window._estTo||"";
let list = myEstimates();
if(q) list=list.filter(e=>(e.EstimateID+" "+e.CustomerName+" "+e.Salesman).toLowerCase().includes(q.toLowerCase()));
if(dFrom) list=list.filter(e=>String(e.Date).slice(0,10)>=dFrom);
if(dTo) list=list.filter(e=>String(e.Date).slice(0,10)<=dTo);
list=[...list].sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
const act = activeEstimates(list), cxl = cancelledEstimates(list);
const tCart = act.reduce((s,e)=>s+num(e.Cartage),0), tUnl = act.reduce((s,e)=>s+num(e.Unloading),0);
return `
<div class="toolbar">
<input id="q-est" placeholder="Search estimate / customer…" value="${esc(q)}" oninput="window._estQ=this.value;window._refocusId=this.id;render()">
<input type="date" style="flex:0 1 auto;min-width:130px" value="${dFrom}" onchange="window._estFrom=this.value;render()" title="From date">
<input type="date" style="flex:0 1 auto;min-width:130px" value="${dTo}" onchange="window._estTo=this.value;render()" title="To date">
<span class="pill p-gray">Cartage: ${money(tCart)} · Unloading: ${money(tUnl)}</span>
${(USER.Role!=="CRM" && !isSales())? `<button class="btn" onclick="openEstimateForm()">＋ New estimate</button>
<button class="btn dark" onclick="openEstimateForm(null,'Return')">↩ Return estimate</button>`:""}
</div>
${estTable(act)}
<div class="section-h"><h3>Cancelled estimates</h3><div class="ln"></div></div>
${cxl.length? estTable(cxl) : `<div class="card empty">No cancelled estimates.</div>`}`;
}
function estTable(list){
if(!list.length) return `<div class="card empty">No estimates.</div>`;
return `<div class="tbl-wrap"><table>
<tr><th>ID</th><th>Type</th><th>Date</th><th>Customer</th><th>Salesman</th><th style="text-align:right">Total</th><th>Dispatch</th><th>Status</th></tr>
${list.map(e=>{
const dp = e.DispatchStatus||"PENDING FOR DISPATCH";
const dpc = (dp==="DISPATCHED"||dp==="RETURN GOODS RECEIVED")?"p-ok":dp==="PARTIALLY DISPATCHED"?"p-warn":dp==="ON HOLD"?"p-gray":dp==="CANCELLED"?"p-bad":"p-blue";
const stc = e.Status==="Cancelled"?"p-bad":e.Status==="Cancel Requested"?"p-warn":"p-ok";
return `<tr class="click ${rowClass(e)}" onclick="openEstimate('${e.EstimateID}')">
<td><b>${esc(e.EstimateID)}</b></td><td>${esc(e.Type)}</td><td>${fmtDate(e.Date)}</td>
<td>${esc(e.CustomerName)}<div class="muted">${esc(e.Phone)}</div></td><td>${esc(e.Salesman)}</td>
<td style="text-align:right"><b>${money(e.GrandTotal)}</b></td>
<td><span class="pill ${dpc}">${esc(dp)}</span></td>
<td><span class="pill ${stc}">${esc(e.Status||"Active")}</span></td></tr>`;
}).join("")}
</table></div>`;
}
let EST_ITEMS = [];
function addPayRow(amt){
const w=$("es-pays"); if(!w) return;
const i=w.children.length;
const d=document.createElement("div");
d.className="ep-row"; d.style.cssText="display:grid;grid-template-columns:110px 1fr 34px;gap:.35rem;align-items:start;margin-bottom:.4rem";
d.innerHTML=`<input type="number" class="ep-amt" placeholder="Amount" value="${amt||""}" min="0">
<div><select class="ep-src" onchange="epSrcChg(this)">
<option>Cash</option><option>NEFT BSC</option><option>Card Swipe</option><option>Cheque</option><option>GPay Others</option></select>
<div class="ep-chq-w" style="display:none;margin-top:.3rem;grid-template-columns:1fr 1fr;gap:.3rem">
<input class="ep-chqno" placeholder="Cheque number *" inputmode="numeric"><input type="date" class="ep-chqdt" title="Cheque date"></div>
<div class="ep-gp-w" style="display:none;margin-top:.3rem">
<select class="ep-gp">${gpayHeadOpts()}</select>
<input class="ep-com" placeholder="Comments (mandatory for GPay)" style="margin-top:.3rem"></div></div>
<button type="button" class="btn ghost small" style="padding:.35rem" onclick="this.parentNode.remove();esBankSync()">✕</button>`;
w.appendChild(d);
}
function epSrcChg(sel){
const gw=sel.parentNode.querySelector(".ep-gp-w");
if(gw) gw.style.display = sel.value==="GPay Others" ? "block" : "none";
const cw=sel.parentNode.querySelector(".ep-chq-w"); // v25: Cheque → cheque no + date (per row)
if(cw){ cw.style.display = sel.value==="Cheque" ? "grid" : "none"; const dt=cw.querySelector(".ep-chqdt"); if(sel.value==="Cheque" && dt && !dt.value) dt.value=todayStr(); }
esBankSync();
}
// v22.2: kisi bhi payment row mein NEFT BSC / Card Swipe ho to billing block dikhao
function esBankSync(){
const w=$("es-bank-w"); if(!w) return;
const any=[...document.querySelectorAll("#es-pays .ep-src")].some(s=>PY_BANK_SRCS.includes(s.value));
w.style.display = any ? "block" : "none";
}
function collectEstPays(){
const out=[]; const rows=document.querySelectorAll("#es-pays .ep-row");
for(const r of rows){
const amt=num(r.querySelector(".ep-amt").value); if(amt<=0) continue;
const src=r.querySelector(".ep-src").value;
const gp=r.querySelector(".ep-gp")?r.querySelector(".ep-gp").value:"";
const com=r.querySelector(".ep-com")?r.querySelector(".ep-com").value.trim():"";
if(src==="GPay Others" && !gp) return {err:"Select who received the GPay (payment row)."};
if(src==="GPay Others" && !com) return {err:"Comments are mandatory for a GPay Others payment."};
let chq="";
if(src==="Cheque"){ // v25
const cn=(r.querySelector(".ep-chqno")||{}).value||"", cd=(r.querySelector(".ep-chqdt")||{}).value||"";
const ck=chequeDetail(cn,cd); if(ck.err) return {err:ck.err+" (payment row)"}; chq=ck.str;
}
out.push({amt:amt, src:src, gp:src==="GPay Others"?gp:(src==="Cheque"?chq:""), com:com});
}
return {pays:out};
}
function branchPrefix(brName){
if(!brName) return "";
const w=String(brName).trim().split(/\s+/).filter(Boolean);
if(!w.length) return "";
return (w.length>1 ? (w[0][0]+w[1][0]) : String(w[0]).slice(0,2)).toUpperCase();
}
function estSeriesPrefix(smName){
const u=(DB.Users||[]).find(x=>String(x.Name).trim().toLowerCase()===String(smName||"").trim().toLowerCase());
const p=branchPrefix(u? u.Branch : "");
return p || "EST";
}
function openEstimateForm(fromLeadId, type){
// v23: estimate/return goods issue karne ka right sirf Manager (aur Admin/baaki roles) ke paas — Salesman se hataya
if(isSales()) return toast("Estimate / Return banane ka right ab sirf Manager ke paas hai.");
type = type||"Estimate";
const lead = fromLeadId ? DB.Leads.find(l=>l.LeadID===fromLeadId) : null;
EST_ITEMS = [{ItemName:"",Qty:"",Price:"",Src:"",Unit:"Box"}];
window._esVoice=null; window._esFile=null; // v22.2: bank billing attachments reset
window._esCrmShow=undefined; // v23: Civil Line manager CRM-visibility choice reset
setTimeout(()=>{ if($("es-pays") && !$("es-pays").children.length) addPayRow(); },30);
const custOpts = [...myCustomers()].sort((a,b)=>String(a.Name).localeCompare(String(b.Name))).map(c=>`<option value="${c.CustomerID}">${esc(c.Name)} — ${esc(c.Phone)} (Due: ${money(customerOutstanding(c.CustomerID))})</option>`).join("");
openModal((lead?"Convert lead → ":"New ")+(type==="Return"?"Return Estimate":"Estimate"), `
${lead? `<div class="pill p-ok" style="margin-bottom:.6rem">From lead: ${esc(lead.Name)} — new customer will be auto-created</div>
<input type="hidden" id="es-lead" value="${fromLeadId}">
<div class="form-grid">
<div><label>Customer Name <span class="req">*</span></label><input id="es-cname" value="${esc(lead.Name)}"></div>
<div><label>Phone <span class="req">*</span></label><input id="es-phone" value="${esc(lead.Phone)}"></div>
<div class="full"><label>Address <span class="req">*</span></label><input id="es-addr" value="${esc(lead.Address||"")}"></div>`
: `<div class="form-grid">
<div class="full"><label>Customer Name <span class="req">*</span> <span class="muted">(existing customers only — walk-ins must first be logged as a lead)</span></label>
<input id="es-cust-q" placeholder="🔍 Type customer name/phone…" autocomplete="off" oninput="filterCustOpts()" style="margin-bottom:.4rem">
<div id="es-newcust-w"></div>
<select id="es-cust" onchange="fillCust()">${custOpts||"<option value=''>No customers yet</option>"}</select>
${(isSales()||isMgr())? `<div class="muted" style="margin-top:.3rem">New customer? <a href="javascript:void 0" onclick="closeModal();openLeadForm()">Log them as a lead first (source: Walk-in)</a>, mark Deal Won, then create the estimate from there.</div>`:""}</div>
<div><label>Phone <span class="req">*</span></label><input id="es-phone" readonly></div>
<div class="full"><label>Address <span class="req">*</span></label><input id="es-addr" readonly></div>`}
<div><label>Salesman <span class="req">*</span></label>
${isSales()? `<input id="es-sm" value="${esc(USER.Name)}" readonly>` : `<select id="es-sm">${salesmen().map(s=>`<option ${s.Name===USER.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}</select>`}</div>
<div><label>Type</label><input value="${type}" readonly><input type="hidden" id="es-type" value="${type}"></div>
</div>
<div class="section-h"><h3>Items</h3><div class="ln"></div><button type="button" class="btn small dark" onclick="aiSlipPick()">📷 Auto-fill from slip photo (AI)</button><button class="btn small ghost" onclick="addItemRow()">＋ Add item</button></div>
<div class="item-row" style="font-size:.72rem;font-weight:700;color:var(--mut);grid-template-columns:1fr 78px 100px 92px 36px 36px 30px"><span>ITEM</span><span>QTY</span><span>PRICE</span><span>AMOUNT</span><span>OV</span><span>ST</span><span></span></div>
<div id="es-items"></div>
<div class="form-grid" style="margin-top:.6rem">
<div><label>Cartage</label><input type="number" id="es-cart" value="0" oninput="calcEst()"></div>
<div><label>Unloading</label><input type="number" id="es-unl" value="0" oninput="calcEst()"></div>
<div><label>Discount</label><input type="number" id="es-disc" value="0" oninput="calcEst()"></div>
<div><label>Send Labor <span class="req">*</span></label><select id="es-labor"><option>No</option><option>Yes</option></select></div>
</div>
<div class="total-box"><div class="rowline"><span>Items total</span><b id="es-t-items">₹0</b></div>
<div class="rowline" style="border:none"><span><b>Grand total</b></span><b id="es-t-grand" style="font-size:1.15rem">₹0</b></div></div>
<div class="section-h"><h3>${type==="Return"?"Return Details":"Delivery"}</h3><div class="ln"></div></div>
<label>${type==="Return"?"Return Type":"Delivery Type"} <span class="req">*</span></label>
<div style="display:flex;gap:1.1rem;flex-wrap:wrap;padding:.2rem 0 .4rem">
${type==="Return"
? `<label class="rad"><input type="radio" name="es-dtype" value="Return from Site" checked style="width:auto"> Return from Site</label>
<label class="rad"><input type="radio" name="es-dtype" value="Return by Hand" style="width:auto"> Return by Hand</label>`
: `<label class="rad"><input type="radio" name="es-dtype" value="Regular" checked style="width:auto"> Regular</label>
<label class="rad"><input type="radio" name="es-dtype" value="Hold" style="width:auto"> Hold</label>
<label class="rad"><input type="radio" name="es-dtype" value="Self Pickup" style="width:auto"> Self Pickup</label>`}
</div>
<label class="rad" style="margin-top:.4rem"><input type="checkbox" id="es-sameaddr" checked onchange="$('es-daddr-w').style.display=this.checked?'none':'block'" style="width:auto"> ${type==="Return"?"Return":"Delivery"} address same as customer address</label>
<div id="es-daddr-w" style="display:none"><label>${type==="Return"?"Return":"Delivery"} address <span class="req">*</span></label><input id="es-daddr" placeholder="${type==="Return"?"Where the goods will come back from":"Site / delivery ka address"}">
<label>${type==="Return"?"Pickup":"Delivery"} contact phone <span class="req">*</span></label><input id="es-dphone" inputmode="tel" placeholder="Site pe kis number pe call karna hai"></div>
<label>Notes (optional)</label><textarea id="es-notes" rows="2" placeholder="Is ${type==="Return"?"return":"estimate"} se related koi baat…"></textarea>
${type==="Return"? `<div class="section-h"><h3>Refund</h3><div class="ln"></div></div>
<label>Refund mode <span class="req">*</span></label>
<select id="es-refmode" onchange="$('es-refamt-w').style.display=this.value==='Credit ledger adjustment'?'none':'block'">
<option>Credit ledger adjustment</option><option>Cash return</option></select>
<div id="es-refamt-w" style="display:none"><label>Cash return amount <span class="req">*</span></label><input type="number" id="es-refamt" min="1"></div>
<div class="muted" style="margin-top:.4rem">Note: Material amount ledger mein minus hoga, cartage/unloading customer se lena hai to wo plus — net amount ledger mein adjust hota hai. Cash return Manager ke Accept karne ke baad hi Daily Cash Book mein judega.</div>`
: `<div class="section-h"><h3>Payment (you can add multiple — e.g. part Cash, part GPay)</h3><div class="ln"></div></div>
<div id="es-pays"></div>
<button type="button" class="btn ghost small" style="margin:.2rem 0 .6rem" onclick="addPayRow()">＋ Add another payment</button>
${bankBillingHtml("es")}
<div class="form-grid">
<div><label>Payment terms <span class="req">*</span></label>
<select id="es-terms" onchange="$('es-terms-amt-w').style.display=this.value==='Payment leke aane hai'?'block':'none';$('es-terms-days-w').style.display=this.value==='Credit'?'block':'none'">
<option>Payment leke aane hai</option><option>Payment clear hai</option><option>Credit</option></select></div>
<div id="es-terms-amt-w"><label>Amount to be collected <span class="req">*</span></label><input type="number" id="es-terms-amt"></div>
<div id="es-terms-days-w" style="display:none"><label>Credit days <span class="req">*</span></label><input type="number" id="es-terms-days"></div>
</div>`}
<div style="margin-top:1.2rem"><button class="btn" onclick="saveEstimate()">Save Estimate</button></div>
`);
renderItemRows(); if(!lead && custOpts) fillCust();
}
function gpayHeadOpts(sel){
return (DB.GpayHeads||[]).map(x=>`<option ${x.Name===sel?'selected':''}>${esc(x.Name)}</option>`).join("");
}
function fillCust(){
const c = DB.Customers.find(x=>x.CustomerID===$("es-cust").value);
if(c){
$("es-phone").value=c.Phone; $("es-addr").value=c.Address;
if($("es-sm") && c.Salesman) $("es-sm").value=c.Salesman;
}
}
function filterCustOpts(){
const q=($("es-cust-q")?$("es-cust-q").value:"").trim().toLowerCase();
const list=[...myCustomers()].filter(c=>(String(c.Name)+" "+String(c.Phone)).toLowerCase().includes(q)).sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
$("es-cust").innerHTML=list.map(c=>`<option value="${c.CustomerID}">${esc(c.Name)} — ${esc(c.Phone)} (Due: ${money(customerOutstanding(c.CustomerID))})</option>`).join("")||"<option value=''>No match</option>";
const w=$("es-newcust-w");
if(w) w.innerHTML = (!list.length && q) ? `<button class="btn small" style="background:var(--ok);margin-top:.35rem" onclick="openQuickCust()">＋ "${esc($("es-cust-q").value.trim())}" — create new customer + lead</button>` : "";
fillCust();
}
function openQuickCust(){
const nm=($("es-cust-q")?$("es-cust-q").value.trim():"");
const canAssign = isAdmin()||isMgr()||USER.Role==="Data Entry";
const w=$("es-newcust-w"); if(!w) return;
window._qcVoice=null; window._qcFile=null; // v22.2
w.innerHTML = `<div class="card" style="border-left:4px solid var(--ok);margin:.5rem 0;padding:.9rem">
<b>New customer + lead (in one go)</b>
<p class="muted" style="margin:.3rem 0 .6rem">Fill the mandatory lead questions — on Save, the lead (Deal Won) + customer are created, then fill the estimate below and submit. Everything in one step.</p>
<div class="form-grid">
<div><label>Name <span class="req">*</span></label><input id="qc-name" value="${esc(nm)}"></div>
<div><label>Phone <span class="req">*</span></label><input id="qc-phone" inputmode="tel" value="${esc((window._aiCust&&window._aiCust.phone)||"")}"></div>
<div class="full"><label>Address</label><input id="qc-addr" value="${esc((window._aiCust&&window._aiCust.address)||"")}"></div>
<div class="full"><label>Requirement <span class="req">*</span></label><input id="qc-req" placeholder="what do they need — tiles/sanitary/size etc."></div>
<div><label>Source <span class="req">*</span></label>
<select id="qc-src" onchange="$('qc-srcd-w').style.display=this.value==='Reference by Friend'?'block':'none'">
<option>Walk-in</option><option>Google</option><option>Reference by Friend</option><option>BNI</option><option>Site Visit</option>
</select></div>
<div><label>Salesman <span class="req">*</span></label>
<select id="qc-sm" ${!canAssign?'disabled':''}>${isSales()?`<option selected>${esc(USER.Name)}</option>`:salesmen().map(s=>`<option>${esc(s.Name)}</option>`).join("")}</select></div>
<div class="full" id="qc-srcd-w" style="display:none"><label>Friend's name <span class="req">*</span></label><input id="qc-srcd"></div>
</div>
<div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
<button type="button" class="btn" onclick="saveQuickCust(false)">✅ Save — now fill the estimate below and submit</button>
<button type="button" class="btn dark" onclick="qcAdvToggle()">🪙 Only ADVANCE token received (estimate later)</button>
<button type="button" class="btn ghost" onclick="$('es-newcust-w').innerHTML=''">Cancel</button>
</div>
<div id="qc-adv-w" style="display:none;margin-top:.8rem;border-top:1px dashed var(--line);padding-top:.7rem">
<div class="form-grid">
<div><label>Advance amount <span class="req">*</span></label><input type="number" id="qc-amt" min="1"></div>
<div><label>Source</label><select id="qc-paysrc" onchange="$('qc-gp-w').style.display=this.value==='GPay Others'?'block':'none';$('qc-bank-w').style.display=PY_BANK_SRCS.includes(this.value)?'block':'none';chqToggle('qc',this.value)"><option>Cash</option><option>NEFT BSC</option><option>Card Swipe</option><option>Cheque</option><option>GPay Others</option></select></div>
<div class="full" id="qc-gp-w" style="display:none"><label>GPay received by? <span class="req">*</span></label><select id="qc-gp">${gpayHeadOpts()}</select></div>
${chequeFieldsHtml("qc")}
</div>
${bankBillingHtml("qc")}
<button type="button" class="btn" style="background:var(--ok);margin-top:.6rem" onclick="saveQuickCust(true)">💰 Save advance token</button>
</div></div>`;
w.scrollIntoView({behavior:"smooth",block:"center"});
}
function qcAdvToggle(){ const w=$("qc-adv-w"); w.style.display = w.style.display==="none" ? "block" : "none"; }
async function saveQuickCust(withAdv){
const n=$("qc-name").value.trim(), p=$("qc-phone").value.trim(), req=$("qc-req").value.trim();
const src=$("qc-src").value, srcd=$("qc-srcd").value.trim();
const sm = isSales()? USER.Name : $("qc-sm").value;
if(!n||!p) return toast("Name aur phone mandatory.");
if(!req) return toast("Requirement is mandatory (lead question).");
if(src==="Reference by Friend" && !srcd) return toast("Enter the friend's name.");
if(!sm) return toast("Select a salesman.");
const dupL=(DB.Leads||[]).find(l=>String(l.Phone).trim()===p), dupC=(DB.Customers||[]).find(c=>String(c.Phone).trim()===p);
if(dupC) return toast("A customer with this phone already exists: "+dupC.Name+" — type the number in search and select them.");
if(dupL && dupL.Status!=="Lost") return toast("A lead with this phone already exists ("+dupL.LeadID+" — "+dupL.Name+").");
let amt=0, advGp="", qBank=false, qBDet="", qBItems="";
if(withAdv){
amt=num($("qc-amt").value); if(amt<=0) return toast("Enter the advance amount.");
if($("qc-paysrc").value==="GPay Others"){ advGp=$("qc-gp")?$("qc-gp").value:""; if(!advGp) return toast("Select who received the GPay."); } // v21.6: GPay head mandatory (Record Payment jaisa)
if($("qc-paysrc").value==="Cheque"){ const ck=chequeDetail($("qc-chqno").value,$("qc-chqdt").value); if(ck.err) return toast(ck.err); advGp=ck.str; } // v25: cheque no+date SourceDetail mein
// v22.2: NEFT/Card advance par billing item names mandatory
qBank=PY_BANK_SRCS.includes($("qc-paysrc").value);
if(qBank){
qBDet=$("qc-bdet").value.trim(); qBItems=$("qc-bitems").value.trim();
if(!qBItems) return toast("Billing item names mandatory hain (NEFT/Card/Cheque advance) — kaunse items ka bill banna hai.");
}
}
busy(true,"Saving customer + lead…");
try{
let leadId=nextId("Leads","LeadID","LD");
const _lObj={LeadID:leadId,Date:todayStr(),Name:n,Phone:p,Address:$("qc-addr").value.trim(),Requirement:req,Source:src,SourceDetail:srcd,Salesman:sm,Status:"Won",NextFollowupDate:"",DealAmount:"",LostReason:"",CreatedBy:USER.Name,CreatedAt:nowStr()};
await appendRow("Leads",_lObj); leadId=_lObj.LeadID; DB.Leads=DB.Leads||[]; DB.Leads.push(_lObj); // v35.3: server ID
await appendRow("Followups",{FollowupID:nextId("Followups","FollowupID","FU"),LeadID:leadId,Date:todayStr(),Notes:withAdv?"Advance token — estimate baad mein":"Direct estimate (walk-in matured)",Outcome:"Deal Won",NextFollowupDate:"",DoneBy:USER.Name,Timestamp:nowStr()});
let custId=nextId("Customers","CustomerID","CU");
const _cObj={CustomerID:custId,Name:n,Phone:p,Address:$("qc-addr").value.trim(),CreatedFromLead:leadId,Salesman:sm,CreatedBy:USER.Name,CreatedAt:nowStr(),OpeningBalance:0};
await appendRow("Customers",_cObj); custId=_cObj.CustomerID; // v35.3: server duplicate-ID guard naya ID de sakta hai — WAHI use karo (CU0699 bug)
DB.Customers=DB.Customers||[]; DB.Customers.push(_cObj);
if(withAdv){
const psrc=$("qc-paysrc").value, isCash=psrc==="Cash";
let qV="", qF="";
if(qBank){
if(window._qcVoice){ busy(true,"Voice note upload ho raha hai…"); qV=await bkUpload('_qcVoice','pay_voice'); }
if(window._qcFile){ busy(true,"File upload ho rahi hai…"); qF=await bkUpload('_qcFile','pay_file'); }
busy(true,"Saving customer + lead…");
}
await appendRow("Payments",{PaymentID:nextId("Payments","PaymentID","PY"),Date:todayStr(),CustomerID:custId,CustomerName:n,Amount:amt,Source:psrc,SourceDetail:advGp,EstimateID:"",ReceivedBy:USER.Name,Timestamp:nowStr(),Comments:"ADVANCE TOKEN"+(advGp?(psrc==="Cheque"?" · ":" · GPay: ")+advGp:""),CashStatus:isCash?((isMgr()||isAdmin())?"Accepted":"Pending"):"",AcceptedBy:(isCash&&(isMgr()||isAdmin()))?USER.Name:"",AcceptedAt:(isCash&&(isMgr()||isAdmin()))?nowStr():"",
BillingDetails:qBDet,BillingItems:qBItems,VoiceURL:qV,FileURL:qF});
}
busy(false);
window._oc={};
if($("es-newcust-w")) $("es-newcust-w").innerHTML="";
if($("es-cust-q")){ $("es-cust-q").value=n; filterCustOpts(); $("es-cust").value=custId; fillCust(); }
toast(withAdv? "Advance token saved ✓ — you can create the estimate now, or Cancel" : "Customer + lead (Won) created ✓ — now fill the items below and submit the estimate");
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function aiSlipPick(){
let fi=document.getElementById("ai-slip-file");
if(!fi){
fi=document.createElement("input");
fi.type="file"; fi.id="ai-slip-file"; fi.accept="image/*";
fi.style.position="fixed"; fi.style.left="-9999px";
fi.addEventListener("change",function(){ aiSlipPicked(this); });
document.body.appendChild(fi);
}
fi.click();
}
function aiSlipPicked(input){
const f=input.files && input.files[0]; input.value=""; if(!f) return;
const img=new Image();
img.onload=async ()=>{
const c=document.createElement("canvas");
const s=Math.min(1, 1280/Math.max(img.width,img.height));
c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
c.getContext("2d").drawImage(img,0,0,c.width,c.height);
const dataUrl=c.toDataURL("image/jpeg",0.78);
busy(true,"🤖 AI is reading the slip… (5-10 sec)");
try{
const d=await gsRun("aiReadSlip",[dataUrl]);
busy(false);
aiFillEstimate(d);
}catch(e){ busy(false); toast("AI failed: "+e.message); }
};
img.src=URL.createObjectURL(f);
}
function aiMatchItem(name){
const norm=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const n=norm(name); if(!n) return {name:name, price:""};
let best=null, bestScore=0;
(DB.Items||[]).forEach(it=>{
const m=norm(it.Name); if(!m) return;
let score=0;
if(m===n) score=100;
else if(m.indexOf(n)>-1 || n.indexOf(m)>-1) score=Math.min(m.length,n.length)*100/Math.max(m.length,n.length);
if(score>bestScore){ bestScore=score; best=it; }
});
if(best && bestScore>=55) return {name:best.Name, price:best.Price};
return {name:name, price:""};
}
function aiFillEstimate(d){
let filled=[];
if(Array.isArray(d.items) && d.items.length){
EST_ITEMS = d.items.filter(x=>String(x.name||"").trim()).map(x=>{
const m=aiMatchItem(x.name);
return {ItemName:m.name, Qty:(num(x.qty)||""), Price:(num(x.price)|| m.price || ""), Src:"", Unit:(/pc|piece|nos/i.test(String(x.unit||x.qty||""))?"Pcs":"Box")};
});
if(!EST_ITEMS.length) EST_ITEMS=[{ItemName:"",Qty:"",Price:"",Src:"",Unit:"Box"}];
renderItemRows(); calcEst();
filled.push(EST_ITEMS.length+" items");
}
if(num(d.cartage)>0 && $("es-cart")){ $("es-cart").value=num(d.cartage); filled.push("cartage"); }
if(num(d.unloading)>0 && $("es-unl")){ $("es-unl").value=num(d.unloading); filled.push("unloading"); }
if(num(d.discount)>0 && $("es-disc")){ $("es-disc").value=num(d.discount); filled.push("discount"); }
calcEst();
const ph=String(d.phone||"").replace(/\D/g,"");
if(ph){
const c=(DB.Customers||[]).find(x=>String(x.Phone).replace(/\D/g,"")===ph);
if(c && $("es-cust-q")){ $("es-cust-q").value=c.Name; filterCustOpts(); $("es-cust").value=c.CustomerID; fillCust(); filled.push("customer (matched by phone)"); }
else if(d.customer_name && $("es-cust-q")){ $("es-cust-q").value=String(d.customer_name); filterCustOpts(); filled.push("customer (new — use the green button)"); window._aiCust={name:d.customer_name, phone:ph, address:d.address||""}; }
} else if(d.customer_name && $("es-cust-q")){
$("es-cust-q").value=String(d.customer_name); filterCustOpts(); filled.push("customer name");
window._aiCust={name:d.customer_name, phone:"", address:d.address||""};
}
toast(filled.length? ("🤖 AI filled: "+filled.join(", ")+" — VERIFY everything before saving!") : "AI could not read this slip clearly — retake the photo straight-on in good light.");
}
function renderItemRows(){
$("es-items").innerHTML = EST_ITEMS.map((it,i)=>{
// v22: ST toggle — godown stock se minus (by default OFF, stock pe koi farak nahi)
let stkLine="";
if(it.Stk){
const _gset=new Set(myGodowns().map(g=>g.GodownID)); // v23.2: sirf apni branch ke godowns
const sis=(DB.StockItems||[]).filter(s=>_gset.has(s.GodownID) && String(s.Name).trim().toLowerCase()===String(it.ItemName||"").trim().toLowerCase());
if(!sis.some(s=>s.GodownID===it.StkG)) it.StkG = sis.length? sis[0].GodownID : "";
const cur=sis.find(s=>s.GodownID===it.StkG);
stkLine=`<div class="muted" style="margin:-.15rem 0 .45rem;font-size:.76rem">📦 Stock minus hoga — godown:
<select style="width:auto;min-width:120px;padding:.18rem .4rem;font-size:.78rem" onchange="EST_ITEMS[${i}].StkG=this.value;renderItemRows()">${sis.map(s=>`<option value="${esc(s.GodownID)}" ${s.GodownID===it.StkG?'selected':''}>${esc(gdName(s.GodownID))}</option>`).join("")}</select>
${cur?` <b>(abhi stock: ${siClosing(cur)})</b>`:""}</div>`;
}
return `
<div class="item-row" style="grid-template-columns:1fr 64px 58px 90px 86px 36px 36px 30px">
<div class="isrch">
<input placeholder="Type item name…" value="${esc(it.ItemName)}" autocomplete="off"
oninput="itemSearch(${i},this)" onfocus="itemSearch(${i},this)" onblur="hideSugg(${i})">
<div class="isugg" id="isugg-${i}"></div>
</div>
<input type="number" placeholder="Qty" value="${esc(it.Qty)}" oninput="EST_ITEMS[${i}].Qty=this.value;calcEst()">
<select title="Box / Pcs" style="padding:.3rem .2rem" onchange="EST_ITEMS[${i}].Unit=this.value">${["Box","Pcs"].map(u=>`<option ${(it.Unit||"Box")===u?"selected":""}>${u}</option>`).join("")}</select>
<input type="number" placeholder="Price" value="${esc(it.Price)}" oninput="EST_ITEMS[${i}].Price=this.value;calcEst()">
<input value="${money(num(it.Qty)*num(it.Price))}" readonly style="background:#F4F7FB">
<button class="ov ${it.Src==='OV'?'on':''}" title="Outer vendor material (code: °)" onclick="EST_ITEMS[${i}].Src=EST_ITEMS[${i}].Src==='OV'?'':'OV';renderItemRows()">OV</button>
<button class="ov" title="Godown stock se minus karna ho to ON karo" onclick="toggleStk(${i})" style="${it.Stk?'background:#D6EDDF;color:#0E8A4D;border-color:#0E8A4D':''}">ST</button>
<button class="del" onclick="EST_ITEMS.splice(${i},1);renderItemRows();calcEst()">✕</button>
</div>${stkLine}`;}).join("");
calcEst();
}
// v22: ST toggle — naam se stock item auto-match, godown har baar poochta hai (dropdown)
function toggleStk(i){
const it=EST_ITEMS[i];
if(it.Stk){ it.Stk=false; it.StkG=""; renderItemRows(); return; }
const name=String(it.ItemName||"").trim().toLowerCase();
if(!name) return toast("Pehle item ka naam likho, phir ST on karo.");
const _gset=new Set(myGodowns().map(g=>g.GodownID)); // v23.2
const sis=(DB.StockItems||[]).filter(s=>_gset.has(s.GodownID) && String(s.Name).trim().toLowerCase()===name);
if(!sis.length) return toast("Ye item godown stock mein nahi mila — Stock Management mein item banao, ya ST off hi rakho.");
it.Stk=true; it.StkG=sis[0].GodownID;
renderItemRows();
}
function itemSearch(i, inp){
EST_ITEMS[i].ItemName = inp.value;
const q = inp.value.trim().toLowerCase();
const box = $("isugg-"+i); if(!box) return;
const matches = (DB.Items||[]).filter(x=>String(x.Name).toLowerCase().includes(q)).slice(0,8);
window._isugg = matches;
let s = matches.map((x,j)=>`<div onmousedown="pickItem(${i},${j})">${esc(x.Name)}${num(x.Price)?` <span class="muted">· ${money(x.Price)}</span>`:""}</div>`).join("");
if(q && !matches.some(x=>String(x.Name).toLowerCase()===q))
s += `<div class="addnew" onmousedown="addNewItemInline(${i})">＋ Add new item “${esc(inp.value.trim())}”</div>`;
box.innerHTML = s;
box.style.display = s ? "block" : "none";
}
function hideSugg(i){ setTimeout(()=>{ const b=$("isugg-"+i); if(b) b.style.display="none"; }, 180); }
function pickItem(i, j){
const x = window._isugg[j]; if(!x) return;
EST_ITEMS[i].ItemName = x.Name;
if(num(x.Price)>0 && !num(EST_ITEMS[i].Price)) EST_ITEMS[i].Price = num(x.Price);
renderItemRows();
}
async function addNewItemInline(i){
const name = String(EST_ITEMS[i].ItemName||"").trim(); if(!name) return;
if(!(DB.Items||[]).some(x=>String(x.Name).toLowerCase()===name.toLowerCase())){
busy(true,"Adding item to master list…");
try{ await appendRow("Items",{ItemID:nextId("Items","ItemID","IM"),Name:name,Price:"",AddedBy:USER.Name,CreatedAt:nowStr()}); toast("Item added ✓"); }
catch(e){ toast("Item add failed: "+e.message); }
busy(false);
}
renderItemRows();
}
function addItemRow(){ EST_ITEMS.push({ItemName:"",Qty:"",Price:"",Src:"",Unit:"Box"}); renderItemRows(); }
function calcEst(){
const it = EST_ITEMS.reduce((s,x)=>s+num(x.Qty)*num(x.Price),0);
const isRet = $("es-type") && $("es-type").value==="Return";
const cart=num($("es-cart")&&$("es-cart").value), unl=num($("es-unl")&&$("es-unl").value), disc=num($("es-disc")&&$("es-disc").value);
const g = isRet ? (it - cart - unl - disc) : (it + cart + unl - disc);
if($("es-t-items")) $("es-t-items").textContent=money(it);
if($("es-t-grand")) $("es-t-grand").textContent=money(g);
EST_ITEMS.forEach((x,i)=>{});
return {it,g};
}
/* v23: Civil Line branch Manager — save se theek pehle chhota dialog (estimate form modal ke UPAR overlay,
 * taaki form ka data waise hi bana rahe). Yes → normal save; No → HideFromCRM="Yes" ke saath save. */
function esAskCrmShow(){
const old=document.getElementById("es-crm-ask"); if(old) old.remove();
const d=document.createElement("div");
d.id="es-crm-ask";
d.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem";
d.innerHTML=`<div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:1.2rem 1.2rem 1rem;box-shadow:0 12px 40px rgba(0,0,0,.35)">
<h3 style="margin:.1rem 0 .5rem">Ye estimate CRM ko show karna hai?</h3>
<p class="muted" style="margin:0 0 1rem;font-size:.85rem">Yes = normal (CRM ke dispatch-status page par dikhega).<br>No = CRM ko dispatch status mein NAHI dikhega.</p>
<div style="display:flex;gap:.6rem">
<button class="btn" style="background:var(--ok)" onclick="window._esCrmShow=true;document.getElementById('es-crm-ask').remove();saveEstimate()">✅ Yes — CRM ko dikhao</button>
<button class="btn dark" onclick="window._esCrmShow=false;document.getElementById('es-crm-ask').remove();saveEstimate()">🚫 No — CRM se chhupao</button>
</div>
<div style="margin-top:.6rem;text-align:right"><button class="btn ghost small" onclick="document.getElementById('es-crm-ask').remove()">Cancel</button></div>
</div>`;
document.body.appendChild(d);
}
async function saveEstimate(){
const type=$("es-type").value;
const fromLead = $("es-lead")? $("es-lead").value : null;
let custId, cname, phone, addr;
if(fromLead){
cname=$("es-cname").value.trim(); phone=$("es-phone").value.trim(); addr=$("es-addr").value.trim();
if(!cname||!phone||!addr) return toast("Name, phone and address are mandatory.");
} else {
custId=$("es-cust").value;
if(!custId) return toast("Select an existing customer. Walk-ins go through the lead form first.");
const c=DB.Customers.find(x=>x.CustomerID===custId);
cname=c.Name; phone=c.Phone; addr=c.Address;
}
let sm = isSales()? USER.Name : ($("es-sm")? $("es-sm").value : USER.Name);
if(!fromLead && custId){
const cc=(DB.Customers||[]).find(x=>x.CustomerID===custId);
if(cc && cc.Salesman) sm = cc.Salesman;
}
const items = EST_ITEMS.filter(x=>x.ItemName.trim() && num(x.Qty)>0);
if(!items.length) return toast("Add at least one item with qty.");
// v22: ST-flagged items — save se pehle match verify (naam + chuna hua godown)
// v28.2: Return estimate par bhi ST chalta hai — stock PLUS hota hai (StockOut row RefType "Return", Stock Management mein IN ki tarah ginti)
const stkRows=[];
{
for(const x of items){
if(!x.Stk) continue;
const si=(DB.StockItems||[]).find(s=>s.GodownID===x.StkG && String(s.Name).trim().toLowerCase()===x.ItemName.trim().toLowerCase());
if(!si) return toast('"'+x.ItemName+'" chune gaye godown ke stock mein nahi mila — ST off karo ya Stock Management mein item banao.');
stkRows.push({si:si, qty:num(x.Qty)});
}
}
let terms="", termsDetail="", pays=[], payAmt=0, paySrc="", paySrcD="", hasBankPay=false, esBDet="", esBItems="";
if(type!=="Return"){
terms=$("es-terms").value;
if(terms==="Payment leke aane hai"){ termsDetail=$("es-terms-amt").value; if(!termsDetail) return toast("Enter amount to be collected."); termsDetail="Collect "+money(termsDetail); }
if(terms==="Credit"){ const d=$("es-terms-days").value; if(!d) return toast("Enter credit days."); termsDetail=d+" days"; }
const cp=collectEstPays();
if(cp.err) return toast(cp.err);
pays=cp.pays;
// v22.2: NEFT/Card payment ho to billing item names mandatory (accountant ke liye)
hasBankPay = pays.some(p=>PY_BANK_SRCS.includes(p.src));
if(hasBankPay){
esBDet=$("es-bdet").value.trim(); esBItems=$("es-bitems").value.trim();
if(!esBItems) return toast("Billing item names mandatory hain (NEFT/Card/Cheque payment) — kaunse items ka bill banna hai.");
}
payAmt=pays.reduce((s,p)=>s+p.amt,0);
paySrc=[...new Set(pays.map(p=>p.src))].join(" + ");
paySrcD=pays.filter(p=>p.gp).map(p=>p.gp).join(", ");
}
const dtypeEl=document.querySelector('input[name="es-dtype"]:checked');
const dtype=dtypeEl?dtypeEl.value:"Regular";
const sameAddr=$("es-sameaddr").checked;
const daddr=sameAddr? "" : $("es-daddr").value.trim();
const dphone=sameAddr? "" : $("es-dphone").value.trim();
if(!sameAddr && !daddr) return toast("Enter a delivery address or tick 'same as customer'.");
if(!sameAddr && !dphone) return toast("Phone number is mandatory with a delivery address.");
const notes=$("es-notes").value.trim();
let refMode="", refAmt=0;
if(type==="Return"){
refMode=$("es-refmode").value;
if(refMode==="Cash return"){
refAmt=num($("es-refamt").value);
if(refAmt<=0) return toast("Enter the cash return amount.");
}
}
// v23: SIRF Civil Line branch ke Manager se — estimate submit par poochho "ye CRM ko show karna hai?"
// Yes = normal (pehle jaisa); No = HideFromCRM="Yes" → CRM ke dispatch-status page par nahi dikhega.
if(type!=="Return" && USER.Role==="Manager" && /civil/i.test(String(USER.Branch||"")) && window._esCrmShow===undefined){
return esAskCrmShow();
}
const hideCrm = (window._esCrmShow===false) ? "Yes" : "";
window._esCrmShow=undefined;
const {it,g}=calcEst();
busy(true,"Saving estimate…");
try{
if(fromLead && !custId){
const existing=(DB.Customers||[]).find(c=>c.CreatedFromLead===fromLead || String(c.Phone).trim()===String(phone).trim());
if(existing){ custId=existing.CustomerID; }
else{
custId = nextId("Customers","CustomerID","CU");
const _cObj2={CustomerID:custId,Name:cname,Phone:phone,Address:addr,CreatedFromLead:fromLead,Salesman:sm,CreatedBy:USER.Name,CreatedAt:nowStr(),OpeningBalance:0};
await appendRow("Customers",_cObj2); custId=_cObj2.CustomerID; // v35.3
DB.Customers=DB.Customers||[]; DB.Customers.push(_cObj2);
}
}
let estId = nextId("Estimates","EstimateID", type==="Return"?"RET":estSeriesPrefix(sm));
const est = {EstimateID:estId, Type:type, Date:todayStr(), CustomerID:custId, CustomerName:cname, Phone:phone, Address:addr,
Salesman:sm, ItemsTotal:it, Cartage:num($("es-cart").value), Unloading:num($("es-unl").value), Discount:num($("es-disc").value),
GrandTotal:g, SendLabor:$("es-labor").value, PaymentReceived:payAmt, PaymentSource:paySrc, PaymentSourceDetail:paySrcD,
PaymentTerms:terms, TermsDetail:termsDetail, Status:"Active", DispatchStatus:"PENDING FOR DISPATCH", DispatchNotes:"",
CreatedBy:USER.Name, CreatedAt:nowStr(), LastEditedBy:"", LastEditedAt:"", Notes:notes, DeliveryType:dtype, DeliveryAddress:daddr, DeliveryPhone:dphone, HideFromCRM:hideCrm};
await appendRow("Estimates", est);
estId = est.EstimateID || estId;
for(const x of items){
await appendRow("EstimateItems",{RowID:nextId("EstimateItems","RowID","IT",5),EstimateID:estId,ItemName:x.ItemName.trim(),Qty:num(x.Qty),Price:num(x.Price),Amount:num(x.Qty)*num(x.Price),Src:x.Src||"",Unit:x.Unit||"Box"});
}
if(type==="Return" && refMode==="Cash return" && refAmt>0){
const autoAccE = isMgr()||isAdmin();
await appendRow("Expenses",{ExpenseID:nextId("Expenses","ExpenseID","EX"),Date:todayStr(),Amount:refAmt,Category:"Customer Return",CategoryDetail:cname,
Source:"Cash",EnteredBy:USER.Name,Timestamp:nowStr(),Comments:"Cash return against "+estId,
CashStatus:autoAccE?"Accepted":"Pending",AcceptedBy:autoAccE?USER.Name:"",AcceptedAt:autoAccE?nowStr():""});
}
// v22.2: bank billing attachments — ek baar upload, sab NEFT/Card rows par lagta hai
let esBV="", esBF="";
if(hasBankPay){
if(window._esVoice){ busy(true,"Voice note upload ho raha hai…"); esBV=await bkUpload('_esVoice','pay_voice'); }
if(window._esFile){ busy(true,"File upload ho rahi hai…"); esBF=await bkUpload('_esFile','pay_file'); }
busy(true,"Saving estimate…");
}
for(const p of pays){
const isCash = p.src==="Cash";
const autoAcc = isCash && (isMgr()||isAdmin());
const rowBank = PY_BANK_SRCS.includes(p.src);
await appendRow("Payments",{PaymentID:nextId("Payments","PaymentID","PY"),Date:todayStr(),CustomerID:custId,CustomerName:cname,Amount:p.amt,Source:p.src,SourceDetail:p.gp,EstimateID:estId,ReceivedBy:USER.Name,Timestamp:nowStr(),Comments:p.com,
CashStatus:isCash?(autoAcc?"Accepted":"Pending"):"",AcceptedBy:autoAcc?USER.Name:"",AcceptedAt:autoAcc?nowStr():"",
BillingDetails:rowBank?esBDet:"",BillingItems:rowBank?esBItems:"",VoiceURL:rowBank?esBV:"",FileURL:rowBank?esBF:""});
}
await appendRow("DispatchHistory",{HistoryID:nextId("DispatchHistory","HistoryID","DH"),EstimateID:estId,Status:"PENDING FOR DISPATCH",Notes:"Estimate created",ChangedBy:USER.Name,Timestamp:nowStr()});
// v22: ST-flagged items ka godown stock minus (StockOut entry — Stock Management mein dikhega)
for(const sr of stkRows){
await appendRow("StockOut",{OutID:nextId("StockOut","OutID","SO",5),Date:todayStr(),SIID:sr.si.SIID,ItemName:sr.si.Name,GodownID:sr.si.GodownID,Qty:sr.qty,RefType:type==="Return"?"Return":"Estimate",RefID:estId,By:USER.Name,Timestamp:nowStr()}); // v28.2: Return → stock wapas (IN)
}
// v21.6: koi bhi CREDIT estimate bane to payment followup by default NEXT DAY par set —
// "Set nahi hai" na dikhe. Agar customer ka pehle se FUTURE followup set hai to usse nahi chhedte.
if(terms==="Credit"){
const _pfLast=(DB.PayFollowups||[]).filter(f=>f.CustomerID===custId).sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1)[0];
const _hasFuture=_pfLast && _pfLast.NextFollowupDate && String(_pfLast.NextFollowupDate).slice(0,10)>todayStr();
if(!_hasFuture) await appendRow("PayFollowups",{PFID:nextId("PayFollowups","PFID","PF"),CustomerID:custId,CustomerName:cname,Date:todayStr(),Comment:"Auto: credit estimate "+estId+" ("+termsDetail+") bana — pehla payment followup system ne set kiya",NextFollowupDate:tomorrowStr(),PromisedAmount:"",DoneBy:USER.Name,Timestamp:nowStr()});
}
if(fromLead){ const l=DB.Leads.find(x=>x.LeadID===fromLead); if(l && !num(l.DealAmount)) await updateFields("Leads", l, {DealAmount:g}); }
else{ const cc2=(DB.Customers||[]).find(x=>x.CustomerID===custId); if(cc2 && cc2.CreatedFromLead){ const l2=DB.Leads.find(x=>x.LeadID===cc2.CreatedFromLead); if(l2 && !num(l2.DealAmount)) await updateFields("Leads", l2, {DealAmount:g}); } }
busy(false); closeModal(); toast("Estimate "+estId+" saved ✓");
render(); openEstimate(estId);
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openEstimate(id){
const e = DB.Estimates.find(x=>x.EstimateID===id); if(!e) return;
// v24 SPEED: DispatchHistory login par nahi aati — pehla estimate kholne par ek baar load hoti hai
if(!window._dhLoaded){
window._dhLoaded=1;
busy(true,"History load ho rahi hai…");
loadAllData("History…",["DispatchHistory"]).then(()=>{ busy(false); openEstimate(id); }).catch(()=>{ busy(false); openEstimate(id); });
return;
}
const items = itemsOf(id);
const hist = (DB.DispatchHistory||[]).filter(h=>h.EstimateID===id).sort((a,b)=>a.Timestamp<b.Timestamp?1:-1);
const req = (DB.CancellationRequests||[]).find(r=>r.EstimateID===id && r.Status==="Pending");
const canCancel = e.Status==="Active" && (e.Salesman===USER.Name||isMgr()||isAdmin()) && !req;
openModal(e.Type+" "+e.EstimateID, `
<div class="rowline"><span>Customer</span><b>${esc(e.CustomerName)} · ${esc(e.Phone)}</b></div>
<div class="rowline"><span>Address</span><b>${esc(e.Address)}</b></div>
<div class="rowline"><span>Salesman / Date</span><b>${esc(e.Salesman)} · ${fmtDate(e.Date)}</b></div>
<div class="rowline"><span>Status</span><b>${esc(e.Status)} · ${esc(e.DispatchStatus||"PENDING FOR DISPATCH")}</b></div>
${e.DispatchNotes?`<div class="rowline"><span>Dispatch note</span><b>${esc(e.DispatchNotes)}</b></div>`:""}
<div class="section-h"><h3>Items</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Item</th><th>Qty</th><th>Price</th><th style="text-align:right">Amount</th></tr>
${items.map(i=>`<tr><td>${esc(i.ItemName)}${i.Src==='OV'?' <span class="pill p-warn" style="font-size:.62rem">OV°</span>':''}</td><td>${esc(i.Qty)}</td><td>${money(i.Price)}</td><td style="text-align:right">${money(i.Amount)}</td></tr>`).join("")}
</table></div>
<div class="total-box">
<div class="rowline"><span>Items</span><b>${money(e.ItemsTotal)}</b></div>
<div class="rowline"><span>Cartage + Unloading</span><b>${money(num(e.Cartage)+num(e.Unloading))}</b></div>
<div class="rowline"><span>Discount</span><b>− ${money(e.Discount)}</b></div>
<div class="rowline" style="border:none"><span><b>Grand total</b></span><b>${money(e.GrandTotal)}</b></div>
</div>
<div class="rowline"><span>Send labor</span><b>${esc(e.SendLabor)}</b></div>
<div class="rowline"><span>Delivery type</span><b>${esc(e.DeliveryType||"Regular")}</b></div>
${e.AutoPerson?`<div class="rowline"><span>Auto person</span><b>🛺 ${esc(e.AutoPerson)}</b></div>`:""}
${e.SlipStatus?`<div class="rowline"><span>Signed slip (CRM)</span><b>${e.SlipStatus==="Received"?"✓ Received "+esc(String(e.SlipReceivedAt).slice(0,10)):"❌ NOT received"}</b></div>`:""}
${e.PromisedAt?`<div class="rowline"><span>Promised dispatch</span><b>${e.PromisedAt2?'<s class="muted">'+promFmt(e.PromisedAt)+'</s> → '+promFmt(e.PromisedAt2)+' <span class="pill p-warn" style="font-size:.62rem">2nd</span>':promFmt(e.PromisedAt)} ${promCountdown(e)}</b></div>${e.Promise2Reason?`<div class="rowline"><span>2nd time reason</span><b>${esc(e.Promise2Reason)}</b></div>`:""}`:""}
${e.DispatchedAt?`<div class="rowline"><span>Dispatched at</span><b>${esc(String(e.DispatchedAt).slice(0,16))} ${e.OnTime?`<span class="pill ${e.OnTime==="On time"?'p-ok':e.OnTime==="Late"?'p-bad':'p-gray'}">${esc(e.OnTime)}</span>`:""}</b></div>`:""}
${e.WADispatch?`<div class="rowline"><span>Dispatch WhatsApp</span><b>${esc(e.WADispatch)}</b></div>`:""}
${e.MgrSlipStatus?`<div class="rowline"><span>Slip (Manager)</span><b>${e.MgrSlipStatus==="Received"?"✓ Received "+esc(String(e.MgrSlipAt).slice(0,10))+" · "+esc(e.MgrSlipBy||""):"❌ NOT received from CRM"}</b></div>`:""}
${e.DeliveryAddress?`<div class="rowline"><span>Delivery address</span><b>${esc(e.DeliveryAddress)}${e.DeliveryPhone?" · 📞 "+esc(e.DeliveryPhone):""}</b></div>`:""}
${e.Notes?`<div class="rowline"><span>Notes</span><b>${esc(e.Notes)}</b></div>`:""}
<div class="rowline"><span>Payment received</span><b>${money(e.PaymentReceived)} ${e.PaymentSource?"("+esc(e.PaymentSource)+(e.PaymentSourceDetail?" — "+esc(e.PaymentSourceDetail):"")+")":""}</b></div>
<div class="rowline"><span>Terms</span><b>${esc(e.PaymentTerms)}${e.TermsDetail?" · "+esc(e.TermsDetail):""}</b></div>
<div class="muted" style="margin-top:.5rem">Created by ${esc(e.CreatedBy)} at ${esc(e.CreatedAt)}${e.LastEditedAt?` · Last edited by ${esc(e.LastEditedBy)} at ${esc(e.LastEditedAt)}`:""}</div>
${req?`<div class="pill p-warn" style="margin-top:.6rem">Cancellation requested by ${esc(req.RequestedBy)} — awaiting Admin approval</div>`:""}
<div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
<button class="btn" onclick="printEstimate('${id}',true)">🖨 PDF (with price)</button>
<button class="btn ghost" onclick="printEstimate('${id}',false)">🖨 PDF (without price)</button>
${isAdmin()? `<button class="btn dark" onclick="adminEditEstimate('${id}')">✎ Edit (Admin)</button>`: mgrCanEditEst(e)? `<button class="btn dark" onclick="adminEditEstimate('${id}')">✎ Edit (Manager)</button>`:""}
${(isMgr()&&!isAdmin()&&e.MgrSlipStatus==="Pending")? `<button class="btn" style="background:var(--ok)" onclick="closeModal();markMgrSlipReceived('${id}')">📄 Slip ✓ received</button>`:""}
${canCancel? `<button class="btn danger" onclick="requestCancel('${id}')">Request cancellation</button>`:""}
${isAdmin()&&req? `<button class="btn danger" onclick="actionCancel('${req.RequestID}','Approved')">Approve cancel</button>
<button class="btn ghost" onclick="actionCancel('${req.RequestID}','Rejected')">Reject</button>`:""}
</div>
${hist.length?`<div class="section-h"><h3>Dispatch history</h3><div class="ln"></div></div>
<div class="hist">${hist.map(h=>`<div class="h-item"><b>${esc(h.Status)}</b> <span class="muted">· ${esc(h.Timestamp)} · ${esc(h.ChangedBy)}</span>${h.Notes?`<div>${esc(h.Notes)}</div>`:""}</div>`).join("")}</div>`:""}
`);
}
async function requestCancel(id){
const reason = prompt("Reason for cancellation (mandatory):");
if(!reason||!reason.trim()) return toast("Reason is required.");
busy(true,"Sending cancellation request…");
try{
const e=DB.Estimates.find(x=>x.EstimateID===id);
await appendRow("CancellationRequests",{RequestID:nextId("CancellationRequests","RequestID","CX"),EstimateID:id,RequestedBy:USER.Name,Reason:reason.trim(),Status:"Pending",ActionBy:"",ActionAt:"",RequestedAt:nowStr()});
await updateFields("Estimates", e, {Status:"Cancel Requested"});
busy(false); closeModal(); toast("Sent for Admin approval ✓"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
async function actionCancel(reqId, decision){
const r=DB.CancellationRequests.find(x=>x.RequestID===reqId); if(!r) return;
const e=DB.Estimates.find(x=>x.EstimateID===r.EstimateID);
busy(true, decision==="Approved"?"Cancelling estimate…":"Rejecting request…");
try{
await updateFields("CancellationRequests", r, {Status:decision, ActionBy:USER.Name, ActionAt:nowStr()});
if(decision==="Approved"){
await updateFields("Estimates", e, {Status:"Cancelled", DispatchStatus:"CANCELLED"});
await appendRow("DispatchHistory",{HistoryID:nextId("DispatchHistory","HistoryID","DH"),EstimateID:e.EstimateID,Status:"CANCELLED",Notes:"Cancellation approved by "+USER.Name+" — "+r.Reason,ChangedBy:USER.Name,Timestamp:nowStr()});
} else {
await updateFields("Estimates", e, {Status:"Active"});
}
busy(false); closeModal(); toast(decision==="Approved"?"Estimate cancelled":"Request rejected"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function vApprovals(){
const pend=(DB.CancellationRequests||[]).filter(r=>r.Status==="Pending");
const past=(DB.CancellationRequests||[]).filter(r=>r.Status!=="Pending").sort((a,b)=>a.ActionAt<b.ActionAt?1:-1);
return `
${pend.length? `<div class="tbl-wrap"><table><tr><th>Estimate</th><th>Customer</th><th>Requested by</th><th>Reason</th><th>When</th><th></th></tr>
${pend.map(r=>{ const _e=(DB.Estimates||[]).find(x=>x.EstimateID===r.EstimateID)||{}; return `<tr><td><a href="javascript:void 0" onclick="openEstimate('${r.EstimateID}')"><b>${esc(r.EstimateID)}</b></a></td>
<td>${_e.CustomerID?`<a href="javascript:void 0" onclick="openLedger('${esc(_e.CustomerID)}')" title="Statement kholo">${esc(_e.CustomerName||"")}</a>`:"—"}</td>
<td>${esc(r.RequestedBy)}</td><td>${esc(r.Reason)}</td><td>${esc(r.RequestedAt)}</td>
<td style="white-space:nowrap"><button class="btn small danger" onclick="actionCancel('${r.RequestID}','Approved')">Approve</button>
<button class="btn small ghost" onclick="actionCancel('${r.RequestID}','Rejected')">Reject</button></td></tr>`; }).join("")}
</table></div>` : `<div class="card empty">No pending cancellation requests.</div>`}
<div class="section-h"><h3>Rebate / Discount approvals</h3><div class="ln"></div></div>
${pendingRebates().length? `<div class="tbl-wrap"><table><tr><th>Customer</th><th style="text-align:right">Rebate</th><th>Reason</th><th>Requested by</th><th>Date</th><th></th></tr>
${pendingRebates().map(p=>`<tr><td><a href="javascript:void 0" onclick="openLedger('${esc(p.CustomerID)}')" title="Statement kholo"><b>${esc(p.CustomerName)}</b></a></td>
<td style="text-align:right"><b>${money(p.Amount)}</b></td>
<td>${esc(p.Comments||"—")}</td><td>${esc(p.ReceivedBy)}</td><td>${fmtDate(p.Date)}</td>
<td style="white-space:nowrap"><button class="btn small" style="background:var(--ok)" onclick="actionRebate('${p.PaymentID}','Approved')">Approve</button>
<button class="btn small ghost" onclick="actionRebate('${p.PaymentID}','Rejected')">Reject</button></td></tr>`).join("")}
</table></div>` : `<div class="card empty">No rebate approvals pending.</div>`}
<div class="section-h"><h3>Past decisions</h3><div class="ln"></div></div>
${past.length?`<div class="tbl-wrap"><table><tr><th>Estimate</th><th>By</th><th>Reason</th><th>Decision</th><th>Actioned</th></tr>
${past.map(r=>`<tr><td>${esc(r.EstimateID)}</td><td>${esc(r.RequestedBy)}</td><td>${esc(r.Reason)}</td>
<td><span class="pill ${r.Status==='Approved'?'p-bad':'p-gray'}">${esc(r.Status)}</span></td><td>${esc(r.ActionAt)} · ${esc(r.ActionBy)}</td></tr>`).join("")}
</table></div>`:`<div class="card empty">—</div>`}`;
}
async function actionRebate(pid, decision){
const p=(DB.Payments||[]).find(x=>x.PaymentID===pid && x.Source==="Rebate"); if(!p) return;
busy(true, decision==="Approved"?"Approving rebate…":"Rejecting…");
try{
await updateFields("Payments", p, {CashStatus:decision, AcceptedBy:USER.Name, AcceptedAt:nowStr()});
busy(false); toast(decision==="Approved"? "Rebate approved ✓ — credited to the ledger" : "Rebate rejected"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function adminEditEstimate(id){
const e=DB.Estimates.find(x=>x.EstimateID===id);
if(!isAdmin() && !mgrCanEditEst(e)) return toast("Edit sirf PENDING FOR DISPATCH / ON HOLD tak — dispatch shuru hone ke baad Admin se karwao."); // v39
openModal("Edit "+id+(isAdmin()?" (Admin)":" (Manager)"), `
<div class="form-grid">
<div><label>Cartage</label><input type="number" id="ae-cart" value="${num(e.Cartage)}"></div>
<div><label>Unloading</label><input type="number" id="ae-unl" value="${num(e.Unloading)}"></div>
<div><label>Discount</label><input type="number" id="ae-disc" value="${num(e.Discount)}"></div>
<div><label>Send Labor</label><select id="ae-labor"><option ${e.SendLabor==='No'?'selected':''}>No</option><option ${e.SendLabor==='Yes'?'selected':''}>Yes</option></select></div>
<div class="full"><label>Payment terms</label><input id="ae-terms" value="${esc(e.PaymentTerms)}"></div>
<div class="full"><label>Terms detail</label><input id="ae-termsd" value="${esc(e.TermsDetail)}"></div>
</div>
<div class="section-h"><h3>Items</h3><div class="ln"></div></div>
${itemsOf(id).map(i=>`<div class="item-row">
<input value="${esc(i.ItemName)}" data-it="${i.RowID}" data-f="ItemName">
<input type="number" value="${num(i.Qty)}" data-it="${i.RowID}" data-f="Qty">
<input type="number" value="${num(i.Price)}" data-it="${i.RowID}" data-f="Price">
<input value="${money(i.Amount)}" readonly style="background:#F4F7FB"><span></span></div>`).join("")}
<div style="margin-top:1rem"><button class="btn" onclick="saveAdminEdit('${id}')">Save changes</button></div>`);
}
async function saveAdminEdit(id){
const e=DB.Estimates.find(x=>x.EstimateID===id);
if(!isAdmin() && !mgrCanEditEst(e)) return toast("Edit right nahi — status change ho chuka hai."); // v39
busy(true,"Saving edits…");
try{
const inputs=[...document.querySelectorAll("#modal [data-it]")];
const byRow={};
inputs.forEach(inp=>{ (byRow[inp.dataset.it]=byRow[inp.dataset.it]||{})[inp.dataset.f]=inp.value; });
let itemsTotal=0;
for(const rid in byRow){
const it=DB.EstimateItems.find(x=>x.RowID===rid);
const q=num(byRow[rid].Qty), p=num(byRow[rid].Price), nm=byRow[rid].ItemName;
const amt=q*p; itemsTotal+=amt;
if(nm!==it.ItemName||q!==num(it.Qty)||p!==num(it.Price)){
await updateFields("EstimateItems", it, {ItemName:nm, Qty:q, Price:p, Amount:amt});
}
}
const cart=num($("ae-cart").value), unl=num($("ae-unl").value), disc=num($("ae-disc").value);
const grand=itemsTotal+cart+unl-disc;
await updateFields("Estimates", e, {Cartage:cart, Unloading:unl, Discount:disc, ItemsTotal:itemsTotal, GrandTotal:grand,
SendLabor:$("ae-labor").value, PaymentTerms:$("ae-terms").value, TermsDetail:$("ae-termsd").value,
LastEditedBy:USER.Name, LastEditedAt:nowStr()});
busy(false); closeModal(); toast("Estimate updated ✓"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function printEstimate(id, withPrice){
alog("print_estimate", id+(withPrice?" (with price)":" (no price)")); // v26
const e=DB.Estimates.find(x=>x.EstimateID===id); if(!e) return;
withPrice = withPrice!==false;
const items=itemsOf(id);
// v38.1: GRAND TOTAL ke neeche payment settlement —
//   full payment  → "Received (Cash)  −125313" + "BALANCE  NIL"
//   part payment  → "Received (Cash)  −10000"  + "BALANCE  115313"
//   credit / 0 paid → kuch nahi (sirf terms line)
const _paid = num(e.PaymentReceived), _bal = Math.max(0, num(e.GrandTotal) - _paid);
const payRows = (_paid > 0 && e.Type !== "Return") ? `
<tr><td colspan="3" class="r">Received${e.PaymentSource?" ("+esc(e.PaymentSource)+")":""}</td><td class="r">-${_paid.toFixed(2)}</td></tr>
<tr class="bal"><td colspan="3" class="r">BALANCE</td><td class="r">${_bal <= 0 ? "NIL" : _bal.toFixed(2)}</td></tr>` : "";
const totals = withPrice ? `
<tr><td colspan="3" class="r">Items total</td><td class="r">${num(e.ItemsTotal).toFixed(2)}</td></tr>
<tr><td colspan="3" class="r">Cartage / Unloading</td><td class="r">${(num(e.Cartage)+num(e.Unloading)).toFixed(2)}</td></tr>
<tr><td colspan="3" class="r">Discount</td><td class="r">-${num(e.Discount).toFixed(2)}</td></tr>
<tr class="tot"><td colspan="3" class="r">GRAND TOTAL</td><td class="r">${num(e.GrandTotal).toFixed(2)}</td></tr>${payRows}` : "";
// v38.1: Terms line bada; Paid alag line hata di (table mein hi dikhta hai)
const payFt = withPrice ? `<div class="terms">Terms: <b>${esc(e.PaymentTerms)}</b> ${e.TermsDetail?"· "+esc(e.TermsDetail):""}</div>` : "";
// v38: A5 LANDSCAPE — ek sheet, beech mein line, left ORIGINAL / right DUPLICATE (same content)
const unitOf = i => esc(i.Unit||"Box");
const itemRowsU = withPrice
? items.map(i=>`<tr><td>${esc(i.ItemName)}${i.Src==="OV"?" °":""}</td><td class="r">${i.Qty} ${unitOf(i)}</td><td class="r">${num(i.Price).toFixed(2)}</td><td class="r">${num(i.Amount).toFixed(2)}</td></tr>`).join("")
: items.map(i=>`<tr><td>${esc(i.ItemName)}${i.Src==="OV"?" °":""}</td><td class="r">${i.Qty} ${unitOf(i)}</td></tr>`).join("");
const half = (label) => `<div class="half">
<div class="copy">${label}</div>
<div class="hd"><div><h1>${esc(String(e.Type||"Estimate").toUpperCase())}</h1><div class="eid">${e.EstimateID}</div></div>
<div style="text-align:right">Date: ${fmtDate(e.Date)}<br>Salesman: ${esc(e.Salesman)}</div></div>
<div><b>${esc(e.CustomerName)}</b> · ${esc(e.Phone)}<br>${e.DeliveryAddress? `<b>${e.Type==="Return"?"Return from":"Deliver to"}:</b> ${esc(e.DeliveryAddress)}${e.DeliveryPhone?" · Ph: "+esc(e.DeliveryPhone):""}` : esc(e.Address)}</div>
<table><tr><th>Item</th><th class="r">Qty</th>${withPrice?'<th class="r">Price</th><th class="r">Amount</th>':''}</tr>
${itemRowsU}
${totals}</table>
<div class="ft">
Send labor: <span class="badge">${esc(e.SendLabor)}</span> &nbsp; Delivery: <span class="badge">${esc(e.DeliveryType||"Regular")}</span><br>
${payFt}
Created: ${esc(e.CreatedAt)} by ${esc(e.CreatedBy)} ${e.Status==="Cancelled"?"<b style='color:#C0392B'> · CANCELLED</b>":""}
</div></div>`;
const html=`<!DOCTYPE html><html><head><title>${e.EstimateID}</title><style>
@page{size:A5 landscape;margin:5mm}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#111}
.sheet{display:flex;width:100%;box-sizing:border-box;min-height:136mm}
.half{width:50%;box-sizing:border-box;padding:2mm 3mm;position:relative}
.half:first-child{border-right:1.5px solid #0B1D33}
.copy{text-align:center;font-size:8.5px;letter-spacing:2px;font-weight:bold;color:#0B1D33;margin-bottom:2px}
h1{font-size:13px;margin:0;letter-spacing:1.5px} .eid{font-size:14px;font-weight:bold;margin-top:1px;letter-spacing:.5px}
.hd{display:flex;justify-content:space-between;border-bottom:2px solid #0B1D33;padding-bottom:4px;margin-bottom:5px}
table{width:100%;border-collapse:collapse;margin:4px 0} th,td{border:1px solid #999;padding:2.5px 4px;text-align:left;font-size:8.5px}
th{background:#0B1D33;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact} .r{text-align:right;white-space:nowrap} .tot td{font-weight:bold}
.ft{margin-top:5px;font-size:8px} .terms{font-size:11px;margin:3px 0} .bal td{font-weight:bold;font-size:10px;background:#EEF2F7;-webkit-print-color-adjust:exact;print-color-adjust:exact} .badge{display:inline-block;border:1px solid #0B1D33;padding:1px 5px;border-radius:8px;font-weight:bold}
@media screen{body{background:#eee;padding:10px} .sheet{background:#fff;width:210mm;min-height:148mm;margin:auto;box-shadow:0 2px 8px #0003}}
</style></head><body>
<div class="sheet">${half("ORIGINAL")}${half("DUPLICATE")}</div>
</body></html>`;
printHTML(html);
}
/* ===== v26 SECURITY (frontend) =====
 *  alog(action, detail, count) → queue → 3s baad ek batch server (logAccess); logout par turant flush.
 *  wmText/wmWrap → har print/PDF par faint diagonal watermark "Naam · dd/mm/yyyy HH:mm".
 *  scrWM() → screen par halka naam (bank-app jaisa) — screenshot leak par pata chale kisne liya. */
window._alQ=[];
function alog(action, detail, count){
try{ window._alQ.push([action, String(detail||"").slice(0,300), count||1]); clearTimeout(window._alT); window._alT=setTimeout(alFlush, 3000); }catch(e){}
}
async function alFlush(){
const q=window._alQ; if(!q||!q.length||!CRED||!CRED.t) return;
window._alQ=[];
try{ await gsRun("logAccess",[q.slice(0,50)]); }catch(e){ /* log fail par app nahi rukti */ }
}
function wmText(){ const d=new Date(); const p=n=>String(n).padStart(2,"0"); return (USER?USER.Name:"")+" · "+p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()+" "+p(d.getHours())+":"+p(d.getMinutes()); }
function wmWrap(html){
if(!USER) return html;
const t=esc(wmText());
const wm=`<style>.__wm{position:fixed;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999}.__wm span{font-family:Arial;font-size:34px;font-weight:700;color:#1a2b44;opacity:.11;transform:rotate(-28deg);white-space:nowrap;letter-spacing:1px}.__wmf{font-family:Arial;font-size:9px;color:#889;margin-top:14px;text-align:right}@media print{.__wm{position:fixed}}</style>
<div class="__wm"><span>${t}</span></div><div class="__wmf">${t}</div>`;
return html.indexOf("</body>")>-1 ? html.replace("</body>", wm+"</body>") : html+wm;
}
function scrWM(on){
let el=document.getElementById("scr-wm");
if(!on){ if(el) el.remove(); return; }
if(!USER) return;
if(!el){ el=document.createElement("div"); el.id="scr-wm"; el.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:150px;align-content:start;padding:40px 0"; document.body.appendChild(el); }
const t=esc(wmText());
let h=""; for(let i=0;i<30;i++) h+=`<span style="display:block;transform:rotate(-24deg);font-size:12px;font-weight:700;color:#0B1D33;opacity:.055;white-space:nowrap;text-align:center;font-family:Arial;padding-top:${(i%3)*40}px">${t}</span>`;
el.innerHTML=h;
}
function printHTML(html, noWM){
const w=window.open("","_blank");
if(!w) return toast("Allow popups to download PDF.");
if(!noWM) html=wmWrap(html); // v26 watermark (v35.2: quotation par nahi)
w.document.write(html); w.document.close();
w.onload=()=>setTimeout(()=>w.print(),300);
setTimeout(()=>{try{w.print()}catch(_){}} ,700);
}


function printCustomers(list, fsm, f){
if(!isAdmin()) return toast("Customers list export sirf Admin kar sakta hai."); // v26 export lock
alog("print_customers", "rows "+list.length+" · "+(fsm==="all"?"all salesmen":fsm)+" · "+f, list.length);
const fbr=window._cuBr||"all", grp=!!window._cuGrp;
const total=list.reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0);
// v41: Weekly collection sheet format — S.No | Customer | Phone | Salesman | Outstanding | Days purana | Collected (blank, haath se bharne ke liye)
const days=c=>{ try{ const a=custAging(c.CustomerID); return a&&a.oldestDays? a.oldestDays : 0; }catch(e){ return 0; } };
const row=(c,i)=>{ const b=customerOutstanding(c.CustomerID), d=days(c); return `<tr><td>${i+1}</td><td><b>${esc(c.Name)}</b></td><td>${esc(c.Phone)}</td><td>${esc(c.Salesman||"—")}</td><td class="r"><b>${money(b)}</b></td><td class="r" style="${d>60?'color:#C0392B;font-weight:700':d>30?'color:#B9640F;font-weight:700':''}">${d?d+" din":"—"}</td><td class="blank"></td></tr>`; };
const rowsHtml = grp
? cuGroups(list).map(gr=>`<tr style="background:#0B1D33;color:#fff"><td colspan="4"><b>${esc(gr.sm)}</b> (${gr.rows.length} customers)</td><td class="r"><b>${money(gr.total)}</b></td><td></td><td></td></tr>
${gr.rows.map(row).join("")}`).join("")
: list.map(row).join("");
const wk=(()=>{ const d=new Date(); const e=new Date(d); e.setDate(d.getDate()+6); return d.toLocaleDateString('en-IN')+" – "+e.toLocaleDateString('en-IN'); })();
printHTML(`<!DOCTYPE html><html><head><title>Collection sheet</title><style>
@page{size:8.27in 11.69in;margin:10mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:16px;margin:0 0 2px} table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #999;padding:5px 6px;font-size:10.5px} th{background:#0B1D33;color:#fff;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.r{text-align:right} .muted{color:#777} .blank{min-width:110px;width:110px}
tr{page-break-inside:avoid} thead{display:table-header-group}
.sig{display:flex;justify-content:space-between;margin-top:28px;font-size:11px} .sig div{width:30%;border-top:1px solid #333;padding-top:4px;text-align:center}
</style></head><body>
<h1>BSC TILES — Weekly Collection Sheet</h1>
<div class="muted">Week: <b>${wk}</b> · Branch: ${fbr==='all'?'All':fbr==='__none'?'HO':esc(fbr)} · ${fsm==='all'?'All salesmen':esc(fsm)} · ${f==='due'?'Payment due':f==='zero'?'Zero outstanding':'All customers'}${grp?' · Grouped by salesman':''} · Printed: ${new Date().toLocaleDateString('en-IN')} · Customers: ${list.length}</div>
<div style="margin-top:4px"><b>Market se total lena: ${money(total)}</b> &nbsp; <span class="muted">"Collected" column manager haath se bhare — kis customer se kitna aaya.</span></div>
<table><thead><tr><th>S.No</th><th>Customer name</th><th>Phone</th><th>Salesman</th><th class="r">Outstanding</th><th class="r">Days purana</th><th>Collected (₹)</th></tr></thead>
${rowsHtml}
<tr><td colspan="4" class="r"><b>TOTAL</b></td><td class="r"><b>${money(total)}</b></td><td></td><td class="blank"></td></tr>
</table>
<div class="sig"><div>Admin sign</div><div>Manager sign (received)</div><div>Manager sign (returned)</div></div>
</body></html>`);
}
function vCustomers(){
const q=window._cuQ||"", f=window._cuF||"all", fsm=window._cuSm||"all", fbr=window._cuBr||"all", grp=!!window._cuGrp;
let list=myCustomers();
if(isAdmin() && fbr!=="all") list=list.filter(c=>{const b=userBranch(c.Salesman); return fbr==="__none"? b==="" : b===fbr;});
if((isMgr()||isAdmin()) && fsm!=="all") list=list.filter(c=>String(c.Salesman||"")===fsm);
if(q) list=list.filter(c=>(c.Name+" "+c.Phone).toLowerCase().includes(q.toLowerCase()));
if(f!=="all") list=list.filter(c=>{const b=customerOutstanding(c.CustomerID); if(f==="due") return b>0.009; if(f==="zero") return b<=0.009; const d=custAging(c.CustomerID).oldestDays; return b>0.009 && (f==="d30"? d>30 : f==="d60"? d>60 : d>90);}); // v36 aging filters
const so=window._cuSort||"name";
list=[...list].sort((a,b)=> so==="amt" ? (customerOutstanding(b.CustomerID)-customerOutstanding(a.CustomerID)) : so==="age" ? (custAging(b.CustomerID).oldestDays-custAging(a.CustomerID).oldestDays) : String(a.Name).localeCompare(String(b.Name)));
if(window._cuPrint){ window._cuPrint=0; const pl=list, pf=fsm, pff=f; setTimeout(()=>printCustomers(pl, pf, pff), 60); }
return `
<div class="toolbar">
<input id="q-cu" placeholder="Search customer…" value="${esc(q)}" oninput="window._cuQ=this.value;window._refocusId=this.id;render()">
<select onchange="window._cuF=this.value;render()">
<option value="all" ${f==='all'?'selected':''}>All customers</option>
<option value="due" ${f==='due'?'selected':''}>Outstanding more than 0</option>
<option value="zero" ${f==='zero'?'selected':''}>Zero outstanding</option>
<option value="d30" ${f==='d30'?'selected':''}>⏳ 30+ din purana</option>
<option value="d60" ${f==='d60'?'selected':''}>⏳ 60+ din purana</option>
<option value="d90" ${f==='d90'?'selected':''}>⏳ 90+ din purana</option>
</select>
<select onchange="window._cuSort=this.value;render()">
<option value="name" ${(window._cuSort||'name')==='name'?'selected':''}>Sort: Name (A-Z)</option>
<option value="amt" ${window._cuSort==='amt'?'selected':''}>Sort: Outstanding (high→low)</option>
<option value="age" ${window._cuSort==='age'?'selected':''}>Sort: Sabse purana pehle</option>
</select>
${isAdmin()? `<select onchange="window._cuBr=this.value;admSyncBr(this.value);render()">
<option value="all" ${fbr==='all'?'selected':''}>All branches</option>
${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${fbr===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
<option value="__none" ${fbr==='__none'?'selected':''}>HO / no branch</option>
</select>`:""}
${(isMgr()||isAdmin())? `<select onchange="window._cuSm=this.value;render()">
<option value="all" ${fsm==='all'?'selected':''}>All salesmen</option>
${salesmen().map(s=>`<option ${fsm===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}
</select>`:""}
${(isMgr()||isAdmin())? `<button class="btn ${grp?'':'ghost'} small" onclick="window._cuGrp=!window._cuGrp;render()">👥 Group by salesman</button>`:""}
${canRecordPay()? `<button class="btn" onclick="openPaymentForm()">＋ Record payment</button>`:""}
${isAdmin()? `<button class="btn dark" onclick="window._cuPrint=1;render()">🖨 Export PDF</button>`:""}
</div>
<div class="card stat warn" style="max-width:380px;margin-bottom:1rem"><div class="v">${money(list.reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0))}</div><div class="l">Total receivable from market${fsm!=='all'?' — '+esc(fsm):''}</div></div>
${list.length? `<div class="tbl-wrap"><table><tr><th>Customer</th><th>Phone</th><th>Salesman</th><th>Address</th><th style="text-align:right">Outstanding</th><th>Purana</th><th></th></tr>
${(grp? cuGroupRows(list) : list.map(c=>cuRow(c)).join(""))}
</table></div>` : `<div class="card empty">No customers yet. Customers are created automatically when a lead's estimate is saved.</div>`}`;
}
function cuRow(c){
const b=customerOutstanding(c.CustomerID);
return `<tr class="click" onclick="openLedger('${c.CustomerID}')">
<td><b>${esc(c.Name)}</b></td><td>${esc(c.Phone)}</td><td>${esc(c.Salesman||"—")}</td><td class="muted">${esc(c.Address)}</td>
<td style="text-align:right"><b style="color:${b>0.01?'var(--bad)':'var(--ok)'}">${money(b)}</b></td>
<td>${b>0.01?agePill(c.CustomerID):""}</td>
<td><button class="btn small ghost" onclick="event.stopPropagation();openLedger('${c.CustomerID}')">Ledger</button></td></tr>`;
}
function cuGroups(list){
const g={};
list.forEach(c=>{ const k=c.Salesman||"— No salesman —"; (g[k]=g[k]||[]).push(c); });
return Object.keys(g).sort().map(k=>({sm:k, rows:g[k], total:g[k].reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0)}));
}
function cuGroupRows(list){
return cuGroups(list).map(gr=>`
<tr style="background:var(--navy);color:#fff"><td colspan="4"><b>👤 ${esc(gr.sm)}</b> <span style="opacity:.7">· ${gr.rows.length} customers</span></td>
<td style="text-align:right"><b>${money(gr.total)}</b></td><td></td><td></td></tr>
${gr.rows.map(c=>cuRow(c)).join("")}`).join("");
}
function ledgerEntries(custId){
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId);
const rows=[];
if(c && num(c.OpeningBalance)) rows.push({date:String(c.CreatedAt||"").slice(0,10)||"0000-00-00", ref:"OPENING", desc:"Opening balance", debit:num(c.OpeningBalance), credit:0});
(DB.Expenses||[]).forEach(x=>{
if(x.Category==="Customer Return" && c && String(x.CategoryDetail||"").trim().toLowerCase()===String(c.Name||"").trim().toLowerCase())
rows.push({date:String(x.Date).slice(0,10), ref:x.ExpenseID, desc:"Cash/GPay refund to customer"+(x.Comments?" — "+x.Comments:""), debit:num(x.Amount), credit:0});
});
(DB.Estimates||[]).forEach(e=>{
if(e.CustomerID!==custId||e.Status==="Cancelled") return;
const its=itemsOf(e.EstimateID);
// v36.2: har item ka total + items total + cartage/unloading/discount + grand total — customer ko poora hisaab dikhe
const desc=its.map(i=>`${i.ItemName} (${i.Qty} × ${money(i.Price)} = ${money(num(i.Amount)||num(i.Qty)*num(i.Price))})`).join(", ");
const extras=[]; const itT=num(e.ItemsTotal)||its.reduce((t,i)=>t+(num(i.Amount)||num(i.Qty)*num(i.Price)),0);
if(its.length>1 || num(e.Cartage)||num(e.Unloading)||num(e.Discount)) extras.push("Items "+money(itT));
if(num(e.Cartage)) extras.push("Cartage "+(e.Type==="Return"?"−":"+")+money(e.Cartage));
if(num(e.Unloading)) extras.push("Unloading "+(e.Type==="Return"?"−":"+")+money(e.Unloading));
if(num(e.Discount)) extras.push("Discount −"+money(e.Discount));
const sumLine = extras.length ? " | "+extras.join(" · ")+" = "+money(e.GrandTotal) : "";
rows.push({date:String(e.Date).slice(0,10), ref:e.EstimateID, est:true, desc:(e.Type==="Return"?"RETURN — ":"")+desc+sumLine, debit:e.Type==="Return"?0:num(e.GrandTotal), credit:e.Type==="Return"?num(e.GrandTotal):0, dispatch:e.DispatchStatus});
});
(DB.Payments||[]).forEach(p=>{
if(p.CustomerID!==custId) return;
if(p.Source==="Rebate"){
if(p.CashStatus!=="Approved") return;
rows.push({date:String(p.Date).slice(0,10), ref:p.PaymentID, desc:"Rebate / Discount"+(p.Comments?" — "+p.Comments:""), descPrint:"Rebate / Discount", debit:0, credit:num(p.Amount)});
return;
}
rows.push({date:String(p.Date).slice(0,10), ref:p.PaymentID, desc:"Payment received — "+p.Source+(p.SourceDetail?" ("+p.SourceDetail+")":"")+(p.Comments?" · "+p.Comments:""), descPrint:"Payment received — "+(p.Source==="GPay Others"?"GPay":p.Source)+(p.Source==="Cheque"&&p.SourceDetail?" ("+p.SourceDetail+")":""), debit:0, credit:num(p.Amount)});
});
rows.sort((a,b)=> a.date<b.date?-1: a.date>b.date?1:0);
let bal=0; rows.forEach(r=>{ bal+=r.debit-r.credit; r.bal=bal; });
return rows;
}
function ledgerHTML(custId, forPrint){
const c=DB.Customers.find(x=>x.CustomerID===custId);
const rows=ledgerEntries(custId);
const custBal=customerOutstanding(custId);
const lastOfDay={}; rows.forEach((r,i)=>lastOfDay[r.date]=i);
return `<table ${forPrint?'':'style="min-width:700px"'}>
<tr><th>Date</th><th>Ref</th><th>Items dispatched / details</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Overdue days</th><th style="text-align:right">Day-end outstanding</th></tr>
${rows.map((r,i)=>`<tr><td>${r.date}</td><td>${(!forPrint && r.est)? `<a href="javascript:void 0" onclick="openEstimate('${r.ref}')" style="font-weight:700;color:var(--blue)">${esc(r.ref)}</a>` : esc(r.ref)}</td><td>${esc(forPrint && r.descPrint ? r.descPrint : r.desc)}${(r.dispatch && !forPrint)?` <span class="pill p-gray" style="font-size:.65rem">${esc(r.dispatch)}</span>`:""}</td>
<td style="text-align:right">${r.debit?money(r.debit):""}</td><td style="text-align:right">${r.credit?money(r.credit):""}</td>
<td style="text-align:right">${r.debit && custBal>0.009 ? `<span class="pill ${daysSince(r.date)>15?'p-bad':'p-warn'}">${daysSince(r.date)} days</span>` : ""}</td>
<td style="text-align:right">${lastOfDay[r.date]===i?`<b>${money(r.bal)}</b>`:`<span class="muted">${money(r.bal)}</span>`}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No transactions.</td></tr>`}
</table>`;
}
function openLedger(custId){
const c=DB.Customers.find(x=>x.CustomerID===custId); if(!c) return;
alog("ledger_open", c.Name+" ("+custId+")"); // v26 audit
const bal=customerOutstanding(custId);
openModal("Ledger — "+c.Name, `
<div class="rowline"><span>Phone / Address</span><b>${esc(c.Phone)} · ${esc(c.Address)}</b></div>
<div class="rowline"><span>Current outstanding</span><b style="color:${bal>0.01?'var(--bad)':'var(--ok)'}">${money(bal)}</b></div>
${agingBoxHTML(custId)}
<div style="margin:.8rem 0;display:flex;gap:.5rem;flex-wrap:wrap">
<button class="btn" onclick="printLedger('${custId}')">🖨 Export PDF</button>
<button class="btn" style="background:#25D366" onclick="waLedger('${custId}')">📲 WhatsApp PDF</button>
<button class="btn dark" onclick="openPayFollowup('${custId}')">💬 Payment Followup</button>
${canRecordPay()? `<button class="btn ghost" onclick="openPaymentForm('${custId}')">＋ Record payment</button>`:""}
</div>
<div class="tbl-wrap">${ledgerHTML(custId)}</div>`);
}
function ledgerPrintHTML(custId){
const c=DB.Customers.find(x=>x.CustomerID===custId);
const bal=customerOutstanding(custId);
return `<!DOCTYPE html><html><head><title>Ledger ${esc(c.Name)}</title><style>
@page{size:8.27in 11.69in;margin:12mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:16px;margin:0 0 2px} table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #999;padding:4px 6px;font-size:10px} th{background:#0B1D33;color:#fff;text-align:left}
.pill{font-size:8px;border:1px solid #999;border-radius:6px;padding:0 3px} .muted{color:#777}.empty{text-align:center;color:#777}
</style></head><body>
<h1>BSC TILES — Customer Ledger</h1>
<div><b>${esc(c.Name)}</b> · ${esc(c.Phone)} · ${esc(c.Address)}</div>
<div>Generated: ${nowStr()} &nbsp; | &nbsp; <b>Current outstanding: ${money(bal)}</b></div>
${ledgerHTML(custId, true)}
</body></html>`;
}
function printLedger(custId){
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId); alog("print_ledger", (c?c.Name:"")+" ("+custId+")");
printHTML(ledgerPrintHTML(custId));
}
/** v16: Ledger ka PDF server par banta hai (Drive link) aur WhatsApp share khulta hai —
 *  Salesman / Manager / Admin sab ke liye (jo bhi ledger khol sakta hai). */
async function waLedger(custId){
const c=DB.Customers.find(x=>x.CustomerID===custId); if(!c) return;
const bal=customerOutstanding(custId);
busy(true,"Ledger PDF ban raha hai…");
try{
const res=await gsRun("ledgerPdf",["Ledger "+c.Name+" "+todayStr(), wmWrap(ledgerPrintHTML(custId))]); // v26: server PDF par bhi watermark
busy(false);
const digits=String(c.Phone||"").replace(/\D/g,"");
const ph=digits.length===10? "91"+digits : digits;
const msg="Namaste 🙏 "+c.Name+" ji,\nBSC Tiles ki taraf se aapka ledger attached hai.\n\nCurrent outstanding: "+money(bal)+"\nDhanyawad 🙏";
const linkMsg="Namaste 🙏 "+c.Name+" ji,\nBSC Tiles ki taraf se aapka ledger:\n\n📄 Ledger PDF: "+res.url+"\n\nCurrent outstanding: "+money(bal)+"\nDhanyawad 🙏";
/* v25: PDF file SEEDHA share — phone ka share sheet khulta hai (WhatsApp chuno → contact chuno → PDF attach).
 * navigator.share sirf button-click ke andar chal sakta hai, isliye pehle modal, phir click par share. */
let file=null;
try{
if(res.b64 && window.File){
const bin=atob(res.b64); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
file=new File([arr], (res.name||"Ledger.pdf"), {type:"application/pdf"});
}
}catch(_e){ file=null; }
const canShare = !!(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]}));
window._waL={file:file, msg:msg, linkMsg:linkMsg, ph:ph, url:res.url, name:c.Name};
openModal("📲 Ledger WhatsApp par bhejo — "+c.Name, `
<div class="muted" style="margin-bottom:.8rem">Outstanding: <b>${money(bal)}</b> · ${esc(c.Phone||"")}</div>
${canShare? `<button class="btn" style="width:100%;background:#25D366;margin-bottom:.6rem;justify-content:center" onclick="waLedgerShare()">📲 WhatsApp par PDF bhejo (seedha file)</button>
<p class="muted" style="font-size:.75rem;margin:0 0 .8rem">Share sheet khulega → WhatsApp chuno → <b>${esc(c.Name)}</b> ka contact chuno → PDF attach hoke jayegi (koi link nahi).</p>`
: `<p class="muted" style="font-size:.78rem;margin:0 0 .8rem">Is device par seedha file-share support nahi hai (phone par WhatsApp app ke saath chalta hai). Neeche se PDF download karke WhatsApp par attach karo, ya link wala message bhejo.</p>`}
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
<button class="btn ghost small" onclick="waLedgerDownload()">⬇ PDF download</button>
<button class="btn ghost small" onclick="waLedgerLink()">🔗 Link wala message bhejo</button>
</div>`);
}catch(e){ busy(false); toast("PDF nahi bana: "+e.message); }
}
function waLedgerShare(){
const w=window._waL; if(!w||!w.file) return toast("PDF ready nahi hai.");
alog("wa_ledger","share: "+w.name);
navigator.share({files:[w.file], title:"Ledger — "+w.name, text:w.msg}).then(()=>{ closeModal(); toast("Share ho gaya ✓"); }).catch(e=>{ if(e && e.name!=="AbortError") toast("Share nahi hua: "+e.message); });
}
function waLedgerDownload(){
const w=window._waL; if(!w) return; alog("wa_ledger","download: "+w.name);
if(w.file){ const u=URL.createObjectURL(w.file); const a=document.createElement("a"); a.href=u; a.download=w.file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
else window.open(w.url,"_blank");
}
function waLedgerLink(){
const w=window._waL; if(!w) return; alog("wa_ledger","link: "+w.name);
window.open((w.ph? "https://wa.me/"+w.ph : "https://wa.me/")+"?text="+encodeURIComponent(w.linkMsg), "_blank");
}
function openPaymentForm(custId){
if(!canRecordPay()) return toast("Your role does not have record-payment rights.");
const custByLead=new Set((DB.Customers||[]).map(c=>c.CreatedFromLead).filter(Boolean));
const phones=new Set((DB.Customers||[]).map(c=>String(c.Phone).trim()));
const wonLeads=(DB.Leads||[]).filter(l=>l.Status==="Won" && !custByLead.has(l.LeadID) && !phones.has(String(l.Phone).trim()) && inMyBranch(l.Salesman));
const opts=[...myCustomers()].sort((a,b)=>String(a.Name).localeCompare(String(b.Name))).map(c=>`<option value="${c.CustomerID}" ${c.CustomerID===custId?'selected':''}>${esc(c.Name)} — ${esc(c.Phone)} (Due: ${money(customerOutstanding(c.CustomerID))})</option>`).join("")
+ wonLeads.map(l=>`<option value="LEAD:${l.LeadID}">🟢 ${esc(l.Name)} — ${esc(l.Phone)} (Won lead — ADVANCE, customer auto-banega)</option>`).join("");
openModal("Record payment received", `
<label>Customer <span class="req">*</span></label><select id="py-cust">${opts}</select>
<label>Amount <span class="req">*</span></label><input type="number" id="py-amt" min="1">
<label>Source <span class="req">*</span></label>
<select id="py-src" onchange="pySrcChanged()">
<option>Cash</option><option>NEFT BSC</option><option>Card Swipe</option><option>Cheque</option><option>GPay Others</option><option>Rebate (Discount)</option></select>
<div id="py-srcd-w" style="display:none"><label>GPay received by? <span class="req">*</span></label><select id="py-srcd">${gpayHeadOpts()}</select></div>
${chequeFieldsHtml("py")}
${bankBillingHtml("py")}
<label>Date <span id="py-date-note" style="text-transform:none;color:var(--warn)"></span></label><input type="date" id="py-date" value="${todayStr()}">
<label id="py-com-l">Comments</label><textarea id="py-com" rows="2" placeholder="e.g. part payment, against estimate…"></textarea>
<div style="margin-top:1rem"><button class="btn" onclick="savePayment()">Save payment</button></div>`);
window._pyVoice=null; window._pyFile=null;
pySrcChanged();
}
// v22.1/v22.2: NEFT BSC / Card Swipe billing block — GENERIC helpers (Record Payment + Estimate + Advance token sab jagah same)
const PY_BANK_SRCS=["NEFT BSC","Card Swipe","Cheque"]; // v25: Cheque bhi bank entry hai (billing block + accountant check)
/* v25: Cheque → cheque number + cheque date; SourceDetail mein "Cheque #<no> dt <dd/mm/yyyy>" save hota hai (GPay head jaisa, koi naya column nahi) */
function chequeFieldsHtml(pfx){
return `<div id="${pfx}-chq-w" style="display:none;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.4rem">
<div><label>Cheque number <span class="req">*</span></label><input id="${pfx}-chqno" placeholder="e.g. 123456" inputmode="numeric"></div>
<div><label>Cheque date <span class="req">*</span></label><input type="date" id="${pfx}-chqdt" value="${todayStr()}"></div></div>`;
}
function chqToggle(pfx,src){ const w=$(pfx+"-chq-w"); if(w) w.style.display = src==="Cheque" ? "grid" : "none"; }
function chequeDetail(no,dt){
no=String(no||"").trim(); dt=String(dt||"").slice(0,10);
if(!no) return {err:"Cheque number mandatory hai."};
if(!dt) return {err:"Cheque date mandatory hai."};
const d=dt.split("-"); return {str:"Cheque #"+no+" dt "+d[2]+"/"+d[1]+"/"+d[0], no:no, dt:dt};
}
function bankBillingHtml(pfx){
return `<div id="${pfx}-bank-w" style="display:none;border:1.5px dashed var(--line);border-radius:10px;padding:.6rem .8rem;margin-top:.6rem;background:#FAFCFF">
<b style="font-size:.85rem">🏦 Bank entry — billing info (accountant ke liye)</b>
<label>Billing details <span style="text-transform:none;font-weight:500">(optional, short)</span></label><input id="${pfx}-bdet" placeholder="e.g. kis firm ke naam bill banna hai">
<label>Billing item names <span class="req">*</span></label><textarea id="${pfx}-bitems" rows="3" placeholder="kaunse items ka bill banna hai — item names likho"></textarea>
<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem;align-items:center">
<button type="button" class="btn ghost small" onclick="$('${pfx}-voice').click()">🎙 Voice note (optional)</button><span id="${pfx}-voice-s" class="muted"></span>
</div>
<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.4rem;align-items:center">
<button type="button" class="btn ghost small" onclick="$('${pfx}-file').click()">📎 Upload photo / PDF (optional)</button><span id="${pfx}-file-s" class="muted"></span>
</div>
<p class="muted" style="font-size:.73rem;margin:.3rem 0 0">Hint: GST CERTIFICATE yahan attach karo (photo ya PDF)</p>
<input type="file" id="${pfx}-voice" accept="audio/*" style="display:none" onchange="bkPickVoice(this,'_${pfx}Voice','${pfx}-voice-s')">
<input type="file" id="${pfx}-file" accept="image/*,application/pdf" style="display:none" onchange="bkPickFile(this,'_${pfx}File','${pfx}-file-s')">
</div>`;
}
function bkPickVoice(input,key,spanId){
const f=input.files && input.files[0]; input.value=""; if(!f) return;
if(f.size>4*1024*1024) return toast("Voice note 4MB se chhota rakho.");
const r=new FileReader();
r.onload=()=>{ window[key]={data:r.result,name:f.name}; $(spanId).textContent="✓ "+f.name; };
r.readAsDataURL(f);
}
function bkPickFile(input,key,spanId){
const f=input.files && input.files[0]; input.value=""; if(!f) return;
if(f.type==="application/pdf"){
if(f.size>5*1024*1024) return toast("PDF 5MB se chhota rakho.");
const r=new FileReader();
r.onload=()=>{ window[key]={data:r.result,name:f.name}; $(spanId).textContent="✓ "+f.name; };
r.readAsDataURL(f);
return;
}
const img=new Image();
img.onload=()=>{
const c=document.createElement("canvas");
const s=Math.min(1, 1280/Math.max(img.width,img.height));
c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
c.getContext("2d").drawImage(img,0,0,c.width,c.height);
window[key]={data:c.toDataURL("image/jpeg",0.75),name:"photo.jpg"};
$(spanId).textContent="✓ photo ready";
};
img.src=URL.createObjectURL(f);
}
async function bkUpload(key,prefix){
const o=window[key]; if(!o||!o.data) return "";
const r=await gsRun("saveTaskFile",[o.data, prefix+"_"+Date.now()+"_"+(o.name||"file")]);
return (r&&r.url)||"";
}
function pySrcChanged(){
const src=$("py-src").value;
$("py-srcd-w").style.display = src==="GPay Others" ? "block" : "none";
chqToggle("py",src); // v25
if($("py-bank-w")) $("py-bank-w").style.display = PY_BANK_SRCS.includes(src) ? "block" : "none";
const cash = src==="Cash";
$("py-date").disabled = cash;
if(cash) $("py-date").value = todayStr();
$("py-date-note").textContent = cash ? "— Cash: locked to today's date (cash in hand)" : (src==="Rebate (Discount)" ? "— Rebate: applies to ledger only after Admin approval" : "");
if($("py-com-l")) $("py-com-l").innerHTML = (src==="GPay Others") ? 'Comments <span class="req">*</span> — mandatory for GPay Others' : (src==="Rebate (Discount)") ? 'Reason <span class="req">*</span> — why is this rebate being given' : 'Comments';
}
async function savePayment(){
let cid=$("py-cust").value; const amt=num($("py-amt").value);
if(!cid||amt<=0) return toast("Customer and amount are mandatory.");
if($("py-src").value==="GPay Others"){
if(!$("py-srcd").value) return toast("Select who received the GPay.");
if(!$("py-com").value.trim()) return toast("Comments are mandatory for GPay Others.");
}
const isRebate = $("py-src").value==="Rebate (Discount)";
if(isRebate && !$("py-com").value.trim()) return toast("Rebate reason is mandatory.");
// v22.1: NEFT BSC / Card Swipe → billing item names mandatory
const isBank = PY_BANK_SRCS.includes($("py-src").value);
const bDet = isBank? $("py-bdet").value.trim() : "";
const bItems = isBank? $("py-bitems").value.trim() : "";
if(isBank && !bItems) return toast("Billing item names mandatory hain — kaunse items ka bill banna hai.");
let chqStr="";
if($("py-src").value==="Cheque"){ const ck=chequeDetail($("py-chqno").value,$("py-chqdt").value); if(ck.err) return toast(ck.err); chqStr=ck.str; } // v25
const isLead = cid.startsWith("LEAD:");
busy(true,"Saving payment…");
try{
let vUrl="", fUrl="";
if(isBank && window._pyVoice){ busy(true,"Voice note upload ho raha hai…"); vUrl=await bkUpload('_pyVoice','pay_voice'); }
if(isBank && window._pyFile){ busy(true,"File upload ho rahi hai…"); fUrl=await bkUpload('_pyFile','pay_file'); }
busy(true,"Saving payment…");
if(isLead){
const l=DB.Leads.find(x=>x.LeadID===cid.slice(5));
if(!l){ busy(false); return toast("Lead not found."); }
const _cObj3={CustomerID:nextId("Customers","CustomerID","CU"),Name:l.Name,Phone:l.Phone,Address:l.Address||"",CreatedFromLead:l.LeadID,Salesman:l.Salesman,CreatedBy:USER.Name,CreatedAt:nowStr(),OpeningBalance:0};
await appendRow("Customers",_cObj3); cid=_cObj3.CustomerID; // v35.3
DB.Customers=DB.Customers||[]; DB.Customers.push(_cObj3);
}
const c=DB.Customers.find(x=>x.CustomerID===cid);
const isCash=$("py-src").value==="Cash";
const comBase=$("py-com").value.trim();
await appendRow("Payments",{PaymentID:nextId("Payments","PaymentID","PY"),Date:(isCash? todayStr() : ($("py-date").value||todayStr())),CustomerID:cid,CustomerName:c.Name,Amount:amt,
Source:isRebate?"Rebate":$("py-src").value,SourceDetail:($("py-src").value==="GPay Others"&&$("py-srcd"))?$("py-srcd").value:chqStr,EstimateID:"",ReceivedBy:USER.Name,Timestamp:nowStr(),Comments:isLead?("ADVANCE"+(comBase?" — "+comBase:"")):comBase,
CashStatus:isRebate?"Pending Approval":(isCash?"Accepted":""),AcceptedBy:(!isRebate&&isCash)?USER.Name:"",AcceptedAt:(!isRebate&&isCash)?nowStr():"",
BillingDetails:bDet,BillingItems:bItems,VoiceURL:vUrl,FileURL:fUrl});
busy(false); closeModal(); toast(isRebate? "Rebate request sent ✓ — it will apply to the ledger after Admin approval" : isLead? "Advance recorded ✓ — customer created; make the estimate on this customer" : "Payment recorded ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function vOutstanding(){
const f=window._outSm||"all", fbr=window._outBr||"all"; // v23: branch filter (CRM/Admin)
const canBr=(USER.Role==="CRM"||isAdmin());
let base=myCustomers();
if(canBr && fbr!=="all") base=base.filter(c=>{const b=userBranch(c.Salesman); return fbr==="__none"? b==="" : b===fbr;});
if(f!=="all") base=base.filter(c=>String(c.Salesman||"")===f);
const oso=window._outSort||"amt";
const rows=base.map(c=>({c,bal:customerOutstanding(c.CustomerID)})).filter(x=>Math.abs(x.bal)>0.009)
.sort((a,b)=> oso==="name" ? String(a.c.Name).localeCompare(String(b.c.Name)) : b.bal-a.bal);
const total=rows.reduce((s,x)=>s+x.bal,0);
return `
<div class="toolbar">
<label style="margin:0">Salesman</label>
<select style="max-width:260px" onchange="window._outSm=this.value;render()">
<option value="all" ${f==='all'?'selected':''}>All salesmen</option>
${salesmen().map(s=>`<option ${f===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}
</select>
${canBr? `<select style="max-width:220px" onchange="window._outBr=this.value;admSyncBr(this.value);render()" title="Branch filter">
<option value="all" ${fbr==='all'?'selected':''}>All branches</option>
${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${fbr===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
<option value="__none" ${fbr==='__none'?'selected':''}>HO / no branch</option>
</select>`:""}
<select style="max-width:240px" onchange="window._outSort=this.value;render()">
<option value="amt" ${oso==='amt'?'selected':''}>Sort: Amount (high→low)</option>
<option value="name" ${oso==='name'?'selected':''}>Sort: Name (A-Z)</option>
</select>
</div>
<div class="card stat warn" style="max-width:360px;margin-bottom:1rem"><div class="v">${money(total)}</div><div class="l">Total outstanding — ${f==='all'?'all salesmen':esc(f)}</div></div>
${rows.length? `<div class="tbl-wrap"><table><tr><th>Customer</th><th>Phone</th><th>Salesman</th><th style="text-align:right">Outstanding</th><th></th></tr>
${rows.map(x=>`<tr><td><b>${esc(x.c.Name)}</b></td><td>${esc(x.c.Phone)}</td><td>${esc(x.c.Salesman||"—")}</td>
<td style="text-align:right"><b style="color:${x.bal>0?'var(--bad)':'var(--ok)'}">${money(x.bal)}</b></td>
<td><button class="btn small ghost" onclick="openLedger('${x.c.CustomerID}')">Ledger / PDF</button></td></tr>`).join("")}
</table></div>`:`<div class="card empty">Nothing outstanding.</div>`}`;
}
const isTransferCat = c => /owner|wsale/i.test(String(c||""));
function vExpenses(){
const d = (window._exDate!==undefined) ? window._exDate : todayStr();
let list=[...(DB.Expenses||[])].filter(x=>inMyBranch(x.EnteredBy));
if(d) list=list.filter(x=>String(x.Date).slice(0,10)===d);
list=list.sort((a,b)=>a.Timestamp<b.Timestamp?1:-1).slice(0,200);
const tot=list.filter(x=>!isTransferCat(x.Category)).reduce((s,x)=>s+num(x.Amount),0);
const trf=list.filter(x=>isTransferCat(x.Category)).reduce((s,x)=>s+num(x.Amount),0);
return `
<div class="toolbar">
<input type="date" style="flex:0 1 auto;min-width:140px" value="${d}" onchange="window._exDate=this.value;render()">
<button class="btn ghost small" onclick="window._exDate='';render()">All dates</button>
<span class="pill p-blue">Expenses: ${money(tot)}</span>
${trf? `<span class="pill p-gray">Cash transfers (Owner/Wsale): ${money(trf)}</span>`:""}
<button class="btn" onclick="openExpenseForm()">＋ Expense entry</button>
${isAdmin()? `<button class="btn dark" onclick="openCatForm()">＋ New expense head</button>`:""}
</div>
<div class="tbl-wrap"><table><tr><th>Date</th><th>Category</th><th>Detail</th><th>Comments</th><th>Source</th><th>By</th><th style="text-align:right">Amount</th></tr>
${list.map(x=>`<tr><td>${fmtDate(x.Date)}</td><td>${esc(x.Category)}${isTransferCat(x.Category)?' <span class="pill p-gray">Transfer</span>':''}</td><td>${esc(x.CategoryDetail||"—")}</td><td>${esc(x.Comments||"—")}</td>
<td><span class="pill ${x.Source==='Cash'?'p-blue':'p-gray'}">${esc(x.Source)}</span></td><td>${esc(x.EnteredBy)}</td>
<td style="text-align:right"><b>${money(x.Amount)}</b></td></tr>`).join("") || "<tr><td colspan=7 class='empty'>No expenses yet.</td></tr>"}
</table></div>`;
}
function openExpenseForm(){
const cats=DB.ExpenseCategories||[];
openModal("Expense entry", `
<label>Amount <span class="req">*</span></label><input type="number" id="ex-amt" min="1">
<label>Category <span class="req">*</span></label>
<select id="ex-cat" onchange="expCatChanged()">${cats.map(c=>`<option value="${esc(c.Name)}" data-req="${esc(c.RequiresDetail)}" data-lbl="${esc(c.DetailLabel)}">${esc(c.Name)}</option>`).join("")}<option value="Vendor Payment" data-req="Yes" data-lbl="Kaunse vendor ko payment di?">Vendor Payment (vendor ledger)</option></select>
<div id="ex-det-w" style="display:none"><label id="ex-det-l">Detail <span class="req">*</span></label><span id="ex-det-slot"></span></div>
<label>Source <span class="req">*</span></label><select id="ex-src" onchange="exSrcChanged()"><option>Cash</option><option>GPay</option></select>
<div id="ex-date-w"><label>Date</label><input type="date" id="ex-date" value="${todayStr()}"></div>
<label>Comments <span class="req">*</span></label><textarea id="ex-com" rows="2" placeholder="Kis liye kharcha hua?"></textarea>
<div style="margin-top:1rem"><button class="btn" onclick="saveExpense()">Save expense</button></div>`);
expCatChanged(); exSrcChanged();
}
function exSrcChanged(){
const cash = $("ex-src").value==="Cash";
$("ex-date-w").style.display = cash ? "none" : "block";
if(cash) $("ex-date").value = todayStr();
}
function expCatChanged(){
const sel=$("ex-cat"), opt=sel.options[sel.selectedIndex];
const need=opt && opt.dataset.req==="Yes";
$("ex-det-w").style.display=need?"block":"none";
if(need){
$("ex-det-l").innerHTML=esc(opt.dataset.lbl||"Detail")+' <span class="req">*</span>';
if(opt.value==="Customer Return"){
$("ex-det-slot").innerHTML=`<select id="ex-det">${(DB.Customers||[]).map(c=>`<option value="${esc(c.Name)}">${esc(c.Name)} (Due: ${money(customerOutstanding(c.CustomerID))})</option>`).join("")}</select>`;
} else if(opt.value==="Vendor Payment"){
// v22: vendor dropdown — payment vendor ke ledger mein debit hogi
$("ex-det-slot").innerHTML=(DB.Vendors||[]).length? `<select id="ex-det">${(DB.Vendors||[]).map(v=>`<option value="${esc(v.Name)}">${esc(v.Name)} (Balance: ${money(vendorPurchTotal(v)-vendorPaidTotal(v))})</option>`).join("")}</select>` : `<input id="ex-det" placeholder="Pehle Vendor Management mein vendor banao" readonly style="background:#FDECEA">`;
} else {
$("ex-det-slot").innerHTML=`<input id="ex-det" placeholder="${esc(opt.dataset.lbl||"")}">`;
}
}
}
async function saveExpense(){
const amt=num($("ex-amt").value); if(amt<=0) return toast("Amount is mandatory.");
const com=$("ex-com").value.trim(); if(!com) return toast("Comments are mandatory.");
const sel=$("ex-cat"), opt=sel.options[sel.selectedIndex];
let det=""; if(opt.dataset.req==="Yes"){ det=$("ex-det").value.trim(); if(!det) return toast((opt.dataset.lbl||"Detail")+" is mandatory."); }
busy(true,"Saving expense…");
try{
await appendRow("Expenses",{ExpenseID:nextId("Expenses","ExpenseID","EX"),Date:($("ex-src").value==="Cash"? todayStr() : ($("ex-date").value||todayStr())),Amount:amt,Category:sel.value,CategoryDetail:det,Source:$("ex-src").value,EnteredBy:USER.Name,Timestamp:nowStr(),Comments:com});
busy(false); closeModal(); toast("Expense saved ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openCatForm(){
openModal("New expense head (Admin)", `
<label>Head name <span class="req">*</span></label><input id="ec-name">
<label>Requires a detail field?</label><select id="ec-req"><option>No</option><option>Yes</option></select>
<label>Detail label (if yes)</label><input id="ec-lbl" placeholder="e.g. Vehicle number">
<div style="margin-top:1rem"><button class="btn" onclick="saveCat()">Create head</button></div>`);
}
async function saveCat(){
const n=$("ec-name").value.trim(); if(!n) return toast("Name required.");
busy(true,"Creating…");
try{
await appendRow("ExpenseCategories",{CategoryID:nextId("ExpenseCategories","CategoryID","EC"),Name:n,RequiresDetail:$("ec-req").value,DetailLabel:$("ec-lbl").value.trim(),CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Expense head created ✓");
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function userBranch(name){
const u=(DB.Users||[]).find(x=>String(x.Name).trim().toLowerCase()===String(name||"").trim().toLowerCase());
return u? (u.Branch||"") : "";
}
function brMatch(name){
const br=window._dbBr;
if(!isAdmin() || !br || br==="all") return true;
if(br==="__none") return userBranch(name)==="";
return userBranch(name)===br;
}
function cashOn(date){
const rec=(DB.Payments||[]).filter(p=>p.Source==="Cash" && p.CashStatus==="Accepted" && String(p.AcceptedAt||p.Date).slice(0,10)===date && (isMgr()? p.AcceptedBy===USER.Name : inMyBranch(p.AcceptedBy||p.ReceivedBy)) && brMatch(p.AcceptedBy||p.ReceivedBy));
const exp=(DB.Expenses||[]).filter(x=>x.Source==="Cash" && x.CashStatus!=="Pending" && String(x.Date).slice(0,10)===date && inMyBranch(x.EnteredBy) && brMatch(x.EnteredBy));
return {rec,exp};
}
/* v24.1: OPENING BALANCE ab BRANCH-WISE — har branch ka apna cash bucket.
 * Pehle cashBase koi bhi latest opening utha leta tha (Hambran ka 9966 Civil ko lag raha tha).
 * brKey = exact branch naam, ya "" (HO / bina-branch). */
function cashBase(date, brKey){
let best=null;
(DB.Daybook||[]).forEach(r=>{
const d=String(r.Date||"").slice(0,10);
if(!d || d>date || r.OpeningBalance==="" || r.OpeningBalance==null) return;
if(brKey!==undefined && String(r.Branch||"").trim()!==brKey) return; // sirf isi branch ki opening rows
if(!best || d>best.d) best={d, amt:num(r.OpeningBalance)};
});
return best;
}
function openingBalanceFor(brKey, date){
brKey=String(brKey||"").trim();
const base=cashBase(date, brKey);
let bal=base? base.amt : 0;
const fromD=base? base.d : "";
(DB.Payments||[]).forEach(p=>{
const ad=String(p.AcceptedAt||p.Date).slice(0,10);
if(!(p.Source==="Cash" && p.CashStatus==="Accepted" && ad<date && (!fromD || ad>=fromD))) return;
if(isMgr()){ if(p.AcceptedBy===USER.Name) bal+=num(p.Amount); } // manager ka cash book = uske accepted cash (pehle jaisa)
else if(String(userBranch(p.AcceptedBy||p.ReceivedBy)||"").trim()===brKey) bal+=num(p.Amount);
});
(DB.Expenses||[]).forEach(x=>{
const xd=String(x.Date).slice(0,10);
if(!(x.Source==="Cash" && x.CashStatus!=="Pending" && xd<date && (!fromD || xd>=fromD))) return;
if(isMgr()){ if(inMyBranch(x.EnteredBy)) bal-=num(x.Amount); }
else if(String(userBranch(x.EnteredBy)||"").trim()===brKey) bal-=num(x.Amount);
});
return bal;
}
function openingBalance(date){
if(isMgr()) return openingBalanceFor(USER.Branch, date); // manager = apni branch ka opening
// Admin "All branches" = sab branch-buckets ka sum (har bucket apni opening + apna cash)
const keys={};
(DB.Branches||[]).forEach(b=>{ keys[String(b.Name||"").trim()]=1; });
keys[""]=1; // HO / bina-branch bucket
(DB.Daybook||[]).forEach(r=>{ if(r.OpeningBalance!=="" && r.OpeningBalance!=null) keys[String(r.Branch||"").trim()]=1; });
let t=0; Object.keys(keys).forEach(k=>{ t+=openingBalanceFor(k, date); });
return t;
}
function openCashOpeningForm(){
// v24.1: opening ab BRANCH-WISE set hota hai
const rows=(DB.Daybook||[]).filter(r=>r.OpeningBalance!==""&&r.OpeningBalance!=null).sort((a,b)=>String(a.Date)<String(b.Date)?1:-1).slice(0,8);
openModal("Set Cash Opening Balance (Admin)", `
<p class="muted">Us branch ke us din SUBAH ka cash-in-hand — usi branch ka cash book yahin se shuru hoga.</p>
<label>Branch <span class="req">*</span></label>
<select id="co-br">${(DB.Branches||[]).map(b=>`<option>${esc(b.Name)}</option>`).join("")}<option value="__none">HO / no branch</option></select>
<label>Date <span class="req">*</span></label><input type="date" id="co-date" value="${todayStr()}">
<label>Opening amount (₹) <span class="req">*</span></label><input type="number" id="co-amt" min="0">
<div style="margin-top:1rem"><button class="btn" onclick="saveCashOpening()">Save opening balance</button></div>
${rows.length?`<div class="section-h"><h3>Set ki hui openings</h3><div class="ln"></div></div>
${rows.map(r=>`<div class="rowline"><span>${esc(String(r.Date).slice(0,10))} — <b>${esc(String(r.Branch||"").trim()||"⚠ (branch nahi likhi — kisi bucket ki nahi)")}</b></span><b>${money(r.OpeningBalance)}</b></div>`).join("")}
<p class="muted" style="margin-top:.4rem">⚠ Bina-branch wali purani rows ab kisi branch par nahi lagti — sheet ke Daybook tab mein unke Branch column (H) mein sahi branch naam likh do (bilkul waisa jaisa Branches mein hai), ya OpeningBalance khaali kar do.</p>`:""}`);
}
async function saveCashOpening(){
const d=$("co-date").value, a=num($("co-amt").value);
const br=$("co-br")? ($("co-br").value==="__none"?"":$("co-br").value) : "";
if(!d) return toast("Enter a date.");
busy(true,"Saving opening balance…");
try{
await appendRow("Daybook",{Date:d, OpeningBalance:a, CashReceived:"", CashExpenses:"", ClosingBalance:"", ClosedBy:USER.Name, ClosedAt:nowStr(), Branch:br});
busy(false); closeModal(); toast("Opening set ✓ — "+(br||"HO")+" · "+d+" se "+money(a)); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function acceptCashExp(id){
const x=(DB.Expenses||[]).find(e=>e.ExpenseID===id); if(!x) return;
busy(true,"Accepting cash return…");
try{
await updateFields("Expenses", x, {CashStatus:"Accepted", AcceptedBy:USER.Name, AcceptedAt:nowStr()});
busy(false); toast("Cash return accepted ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function acceptCash(pid){
const p=(DB.Payments||[]).find(x=>x.PaymentID===pid); if(!p) return;
busy(true,"Accepting cash…");
try{
await updateFields("Payments", p, {CashStatus:"Accepted", AcceptedBy:USER.Name, AcceptedAt:nowStr()});
busy(false); toast("Cash accepted ✓ — added to today's cash book"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* v23: us din ke saare Bank / GPay receipts (NEFT BSC + Card Swipe + GPay Others) —
 * Manager apni branch ke, Admin sab (ya branch-filter se). Payment ki Date se match hota hai. */
const DB_BANK_SRCS=["NEFT BSC","Card Swipe","Cheque","GPay Others"]; // v25: Cheque bhi
function bankOn(date){
return (DB.Payments||[]).filter(p=>DB_BANK_SRCS.includes(p.Source) && String(p.Date).slice(0,10)===date && inMyBranch(p.ReceivedBy) && brMatch(p.ReceivedBy))
.sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?-1:1);
}
function bankDetailStr(p){
return [p.EstimateID, p.SourceDetail?(p.Source==="Cheque"?p.SourceDetail:"GPay: "+p.SourceDetail):"", p.Comments, p.BillingItems?("Items: "+p.BillingItems):"", p.BillingDetails].filter(Boolean).join(" · ")||"—";
}
function vDaybook(){
if(USER._cvMgr && USER.Role!=="Manager") window._dbDate=todayStr(); // v34 cover: sirf aaj ka cash book
const date=window._dbDate||todayStr();
const {rec,exp}=cashOn(date);
const op=openingBalance(date);
const tRec=rec.reduce((s,p)=>s+num(p.Amount),0), tExp=exp.reduce((s,x)=>s+num(x.Amount),0);
const close=op+tRec-tExp;
const pendCash=(DB.Payments||[]).filter(p=>p.Source==="Cash" && p.CashStatus==="Pending" && inMyBranch(p.ReceivedBy) && brMatch(p.ReceivedBy));
const pendExp=(DB.Expenses||[]).filter(x=>x.Source==="Cash" && x.CashStatus==="Pending" && inMyBranch(x.EnteredBy) && brMatch(x.EnteredBy));
const dbBr=window._dbBr||"all";
const brMode=isAdmin() && dbBr!=="all";
return `
${canAcceptCash()&&(pendCash.length||pendExp.length)? `<div class="card" style="border-left:4px solid var(--warn);margin-bottom:1rem">
<b>💰 Cash acceptance pending (${pendCash.length+pendExp.length})</b>
<div class="muted" style="margin-bottom:.4rem">Jab cash actual mein haath se aaye/jaaye tab Accept karo — tabhi cash book mein judega.</div>
${pendCash.map(p=>`<div class="rowline"><span>CASH IN — ${esc(p.CustomerName)} · <b>${money(p.Amount)}</b> · by ${esc(p.ReceivedBy)} · ${fmtDate(p.Date)} ${p.EstimateID?"· "+esc(p.EstimateID):""}</span><b><button class="btn small" onclick="acceptCash('${p.PaymentID}')">✓ Accept</button></b></div>`).join("")}
${pendExp.map(x=>`<div class="rowline"><span style="color:var(--bad)">CASH OUT — ${esc(x.CategoryDetail)} · <b>${money(x.Amount)}</b> · by ${esc(x.EnteredBy)} · ${esc(x.Comments||"")}</span><b><button class="btn small danger" onclick="acceptCashExp('${x.ExpenseID}')">✓ Accept</button></b></div>`).join("")}
</div>`:""}
<div class="toolbar">
<label style="margin:0">Date</label><input type="date" style="max-width:180px" value="${date}" onchange="window._dbDate=this.value;render()">
${(isAdmin()||isMgr())?`<button class="btn" onclick="printDaybook('${date}')">🖨 Export PDF</button>`:""}
${isAdmin()? `<select onchange="window._dbBr=this.value;admSyncBr(this.value);render()">
<option value="all" ${dbBr==='all'?'selected':''}>All branches (full cash book)</option>
${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${dbBr===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
<option value="__none" ${dbBr==='__none'?'selected':''}>HO / users without a branch</option>
</select>`:""}
${isAdmin()? `<button class="btn dark" onclick="openCashOpeningForm()">⚙ Opening balance</button>`:""}
</div>
${brMode? (()=>{ const bop=openingBalanceFor(dbBr==="__none"?"":dbBr, date); return `<div class="grid g4">
<div class="card stat"><div class="v">${money(bop)}</div><div class="l">Opening — ${esc(dbBr==='__none'?'HO':dbBr)}</div></div>
<div class="card stat ok"><div class="v">${money(tRec)}</div><div class="l">Cash received</div></div>
<div class="card stat bad"><div class="v">${money(tExp)}</div><div class="l">Cash expenses</div></div>
<div class="card stat"><div class="v">${money(bop+tRec-tExp)}</div><div class="l">Closing — ${esc(dbBr==='__none'?'HO':dbBr)} → carries to next day</div></div>
</div>`; })()
: `<div class="grid g4">
<div class="card stat"><div class="v">${money(op)}</div><div class="l">Opening balance</div></div>
<div class="card stat ok"><div class="v">${money(tRec)}</div><div class="l">Cash received</div></div>
<div class="card stat bad"><div class="v">${money(tExp)}</div><div class="l">Cash expenses</div></div>
<div class="card stat"><div class="v">${money(close)}</div><div class="l">Closing balance → carries to next day</div></div>
</div>`}
<div class="section-h"><h3>Cash received</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>From</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${rec.map(p=>`<tr><td>${esc(String(p.Timestamp).slice(11))}</td><td>${esc(p.CustomerName)}</td><td>${esc(p.Comments||p.EstimateID||p.SourceDetail||"—")}</td><td>${esc(p.ReceivedBy)}</td><td style="text-align:right">${money(p.Amount)}</td></tr>`).join("")||"<tr><td colspan=5 class='empty'>No cash received.</td></tr>"}
</table></div>
<div class="section-h"><h3>Cash expenses</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>Category</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${exp.map(x=>`<tr><td>${esc(String(x.Timestamp).slice(11))}</td><td>${esc(x.Category)}</td><td>${esc([x.CategoryDetail,x.Comments].filter(Boolean).join(" · ")||"—")}</td><td>${esc(x.EnteredBy)}</td><td style="text-align:right">${money(x.Amount)}</td></tr>`).join("")||"<tr><td colspan=5 class='empty'>No cash expenses.</td></tr>"}
</table></div>
${bankBookHTML(date)}`;
}
/* v23.1: 🏦 Bank / GPay section — cash expenses ke NEECHE, baaki sections jaisa hi
 * (us din ke saare NEFT BSC / Card Swipe / GPay Others receipts, details ke saath) */
function bankBookHTML(date){
const rows=bankOn(date);
const tot=rows.reduce((s,p)=>s+num(p.Amount),0);
return `<div class="section-h"><h3>🏦 Bank / GPay received</h3><div class="ln"></div><span class="pill p-ok">Total: ${money(tot)} · ${rows.length} entries</span></div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>Customer</th><th>Source</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${rows.map(p=>`<tr><td>${esc(String(p.Timestamp).slice(11))}</td><td><b>${esc(p.CustomerName)}</b></td>
<td><span class="pill ${p.Source==='GPay Others'?'p-blue':p.Source==='Cheque'?'p-warn':'p-ok'}">${esc(p.Source==="GPay Others"?"GPay":p.Source)}</span></td>
<td class="muted">${esc(bankDetailStr(p))}</td><td>${esc(p.ReceivedBy)}</td>
<td style="text-align:right"><b>${money(p.Amount)}</b></td></tr>`).join("")||"<tr><td colspan=6 class='empty'>Is din koi Bank / GPay entry nahi.</td></tr>"}
${rows.length?`<tr style="background:var(--navy);color:#fff"><td colspan="5" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>${money(tot)}</b></td></tr>`:""}
</table></div>`;
}
function printDaybook(date){
if(!(isAdmin()||isMgr())) return toast("Cash book export sirf Manager/Admin."); // v26 export lock
alog("print_daybook", date+(window._dbBr?" · "+window._dbBr:""));
const {rec,exp}=cashOn(date); const op=openingBalance(date);
const tRec=rec.reduce((s,p)=>s+num(p.Amount),0), tExp=exp.reduce((s,x)=>s+num(x.Amount),0);
const bank=bankOn(date); const tBank=bank.reduce((s,p)=>s+num(p.Amount),0); // v23.1: Bank/GPay bhi isi PDF mein
printHTML(`<!DOCTYPE html><html><head><title>Daybook ${date}</title><style>
@page{size:8.27in 11.69in;margin:12mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:16px;margin:0} h3{margin:10px 0 4px} table{width:100%;border-collapse:collapse}
th,td{border:1px solid #999;padding:4px 6px;font-size:10px} th{background:#0B1D33;color:#fff;text-align:left}
.sum td{font-weight:bold;background:#E8F0FB}</style></head><body>
<h1>BSC TILES — Daily Cash Book${(isAdmin()&&window._dbBr&&window._dbBr!=="all")? " — "+esc(window._dbBr==="__none"?"HO":window._dbBr):""}</h1><div>Date: <b>${date}</b> · Generated ${nowStr()} by ${esc(USER.Name)}</div>
<h3>Summary</h3><table>
${(isAdmin()&&window._dbBr&&window._dbBr!=="all")? (()=>{ const bop=openingBalanceFor(window._dbBr==="__none"?"":window._dbBr, date); return `
<tr><td>Opening balance (this branch)</td><td style="text-align:right">${money(bop)}</td></tr>
<tr><td>Cash received</td><td style="text-align:right">${money(tRec)}</td></tr>
<tr><td>Cash expenses</td><td style="text-align:right">${money(tExp)}</td></tr>
<tr class="sum"><td>Closing balance (this branch)</td><td style="text-align:right">${money(bop+tRec-tExp)}</td></tr>
<tr><td>Bank / GPay received (${bank.length} entries)</td><td style="text-align:right">${money(tBank)}</td></tr>`; })() : `
<tr><td>Opening balance</td><td style="text-align:right">${money(op)}</td></tr>
<tr><td>Cash received</td><td style="text-align:right">${money(tRec)}</td></tr>
<tr><td>Cash expenses</td><td style="text-align:right">${money(tExp)}</td></tr>
<tr class="sum"><td>Closing balance (carried forward)</td><td style="text-align:right">${money(op+tRec-tExp)}</td></tr>
<tr><td>Bank / GPay received (${bank.length} entries)</td><td style="text-align:right">${money(tBank)}</td></tr>`}</table>
<h3>Cash received</h3><table><tr><th>Time</th><th>From</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${rec.map(p=>`<tr><td>${esc(String(p.Timestamp).slice(11))}</td><td>${esc(p.CustomerName)}</td><td>${esc(p.Comments||p.EstimateID||p.SourceDetail||"—")}</td><td>${esc(p.ReceivedBy)}</td><td style="text-align:right">${money(p.Amount)}</td></tr>`).join("")||"<tr><td colspan=5>None</td></tr>"}</table>
<h3>Cash expenses</h3><table><tr><th>Time</th><th>Category</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${exp.map(x=>`<tr><td>${esc(String(x.Timestamp).slice(11))}</td><td>${esc(x.Category)}</td><td>${esc([x.CategoryDetail,x.Comments].filter(Boolean).join(" · ")||"—")}</td><td>${esc(x.EnteredBy)}</td><td style="text-align:right">${money(x.Amount)}</td></tr>`).join("")||"<tr><td colspan=5>None</td></tr>"}</table>
<h3>Bank / GPay received</h3><table><tr><th>Time</th><th>Customer</th><th>Source</th><th>Detail</th><th>By</th><th style="text-align:right">Amount</th></tr>
${bank.map(p=>`<tr><td>${esc(String(p.Timestamp).slice(11))}</td><td>${esc(p.CustomerName)}</td><td>${esc(p.Source==="GPay Others"?"GPay"+(p.SourceDetail?" ("+p.SourceDetail+")":""):p.Source==="Cheque"?(p.SourceDetail||"Cheque"):p.Source)}</td><td>${esc([p.EstimateID,p.Comments,p.BillingItems?("Items: "+p.BillingItems):"",p.BillingDetails].filter(Boolean).join(" · ")||"—")}</td><td>${esc(p.ReceivedBy)}</td><td style="text-align:right">${money(p.Amount)}</td></tr>`).join("")||"<tr><td colspan=6>None</td></tr>"}
${bank.length?`<tr class="sum"><td colspan="5" style="text-align:right">TOTAL Bank / GPay</td><td style="text-align:right">${money(tBank)}</td></tr>`:""}</table>
</body></html>`);
}


function vDispatch(){
const q=window._dpQ||"", f=window._dpF||"partpend", fbr=window._dpBr||"all"; // v23: branch filter
const brFilter = list => (fbr==="all") ? list : list.filter(e=>{const b=userBranch(e.Salesman); return fbr==="__none"? b==="" : b===fbr;});
let list=brFilter(crmHide(activeEstimates(DB.Estimates||[]))); // v23: Civil Line "No" estimates CRM se hidden
if(q) list=list.filter(e=>(e.EstimateID+" "+e.CustomerName).toLowerCase().includes(q.toLowerCase()));
const base=list; // v40.4: counters (branch + search ke baad, status filter se pehle)
const cnt=k=>base.filter(e=>(e.DispatchStatus||"PENDING FOR DISPATCH")===k).length;
const nPend=cnt("PENDING FOR DISPATCH"), nPart=cnt("PARTIALLY DISPATCHED"), nHold=cnt("ON HOLD"), nLate=base.filter(e=>promIsLate(e)).length;
if(f==="partpend") list=list.filter(e=>["PARTIALLY DISPATCHED","PENDING FOR DISPATCH"].includes(e.DispatchStatus||"PENDING FOR DISPATCH"));
else if(f==="slippend") list=list.filter(e=>e.SlipStatus==="Pending"); // v21.6: Slips Not Received filter
else if(f==="noprom") list=list.filter(e=>!promNA(e) && !promTimerStopped(e) && !e.PromisedAt); // v40 · v40.4
else if(f==="late") list=list.filter(e=>promIsLate(e)); // v40
else if(f!=="all") list=list.filter(e=>(e.DispatchStatus||"PENDING FOR DISPATCH")===f);
list=[...list].sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
const cxl=brFilter(crmHide(cancelledEstimates(DB.Estimates||[])));
const ST=["PENDING FOR DISPATCH","DISPATCHED","PARTIALLY DISPATCHED","ON HOLD"];
return `
<div class="toolbar">
<input id="q-dp" placeholder="Search estimate / customer…" value="${esc(q)}" oninput="window._dpQ=this.value;window._refocusId=this.id;render()">
<select onchange="window._dpF=this.value;render()">
<option value="all">All statuses</option>
<option value="partpend" ${f==='partpend'?'selected':''}>Partially Dispatched + Pending (dono)</option>
<option value="slippend" ${f==='slippend'?'selected':''}>Slips Not Received</option>
<option value="noprom" ${f==='noprom'?'selected':''}>⏰ Bina promised time</option>
<option value="late" ${f==='late'?'selected':''}>🔴 Deadline cross (late)</option>
${ST.map(s=>`<option ${f===s?'selected':''}>${s}</option>`).join("")}
</select>
<select onchange="window._dpBr=this.value;admSyncBr(this.value);render()" title="Branch filter">
<option value="all" ${fbr==='all'?'selected':''}>All branches</option>
${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${fbr===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
<option value="__none" ${fbr==='__none'?'selected':''}>HO / no branch</option>
</select>
</div>
<div class="dp-cnt" style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.2rem 0 .7rem">
${[["PENDING FOR DISPATCH",nPend,"Pending dispatch","var(--bad)"],["PARTIALLY DISPATCHED",nPart,"Partially dispatched","#B9640F"],["ON HOLD",nHold,"On hold","#6b7280"],["late",nLate,"🔴 Late (deadline cross)","var(--bad)"]].map(c=>`<button class="btn small ${f===c[0]?'':'ghost'}" style="${f===c[0]?'background:'+c[3]:'border-color:'+c[3]+';color:'+c[3]}" onclick="window._dpF='${c[0]}';render()"><b style="font-size:1rem">${c[1]}</b> ${c[2]}</button>`).join("")}
<span class="muted" style="align-self:center">· Showing ${list.length}</span>
</div>
${list.length? `<div class="tbl-wrap"><table class="dp-tbl"><tr><th>Date / Time · Salesman</th><th>Estimate</th><th>Delivery type</th><th>Promised dispatch</th><th>Items</th><th style="text-align:right">Total</th><th>Dispatch status</th></tr>
${list.map(e=>{
const dp=e.DispatchStatus||"PENDING FOR DISPATCH";
const dpc=(dp==="DISPATCHED"||dp==="RETURN GOODS RECEIVED")?"p-ok":dp==="PARTIALLY DISPATCHED"?"p-warn":dp==="ON HOLD"?"p-gray":"p-blue";
const _dt=String(e.CreatedAt||""), _tm=_dt.length>=16? _dt.slice(11,16) : ""; // v39: create date+time+salesman pehle column mein
const _dty=String(e.DeliveryType||"Regular"), _dtc=/urgent|express|same/i.test(_dty)?"p-bad":/pick|self/i.test(_dty)?"p-gray":"p-blue";
return `<tr class="${rowClass(e)}"><td style="white-space:nowrap"><b>${fmtDate(e.Date)}</b>${_tm?` <span class="muted">${_tm}</span>`:""}<div class="muted">${esc(e.Salesman)}</div></td>
<td style="min-width:150px"><b>${esc(e.EstimateID)}</b><div class="muted">${esc(e.CustomerName)} · ${esc(e.Phone)}</div>
<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.35rem"><button class="btn small" onclick="openDispatchUpdate('${e.EstimateID}')">Update</button>
${e.SlipStatus==="Pending"?`<button class="btn small" style="background:var(--ok)" onclick="markSlipReceived('${e.EstimateID}')">Slip ✓</button>`:""}
<button class="btn small ghost" onclick="openEstimate('${e.EstimateID}')">View</button></div></td>
<td><span class="pill ${_dtc}">${esc(_dty)}</span>${e.DeliveryAddress?`<div class="muted" style="font-size:.75rem">${esc(e.DeliveryAddress)}</div>`:""}</td>
<td>${promCell(e)}</td>
<td class="muted" style="min-width:160px;max-width:260px;font-size:.75rem">${itemsOf(e.EstimateID).map(i=>esc(i.ItemName)+(i.Src==="OV"?" <b style='color:#B9640F'>°OV</b>":"")+" ×"+i.Qty+(i.Unit?" "+esc(i.Unit):"")).join(", ")}</td>
<td style="text-align:right;white-space:nowrap"><b>${money(e.GrandTotal)}</b></td>
<td><span class="pill ${dpc}">${esc(dp)}</span>${e.AutoPerson?`<div class="muted">🛺 ${esc(e.AutoPerson)}</div>`:""}${e.DispatchNotes?`<div class="muted">${esc(e.DispatchNotes)}</div>`:""}
${e.SlipStatus==="Pending"?`<div><span class="pill p-bad">Slip NOT received</span></div>`:e.SlipStatus==="Received"?`<div><span class="pill p-ok">Slip ✓ ${esc(String(e.SlipReceivedAt).slice(0,10))}</span>${e.MgrSlipStatus==="Pending"?` <span class="pill p-warn" title="Manager ne abhi receive nahi ki">Mgr ⏳</span>`:e.MgrSlipStatus==="Received"?` <span class="pill p-ok">Mgr ✓</span>`:""}</div>`:""}
${dispStepsBar(e)}</td></tr>`;}).join("")}
</table></div>` : `<div class="card empty">No estimates.</div>`}
${USER.Role==="CRM"? "" : `<div class="section-h"><h3>Cancelled estimates</h3><div class="ln"></div></div>
${cxl.length? estTable(cxl):`<div class="card empty">None.</div>`}`}`; // v40.3: CRM ko cancelled list nahi
}
function openDispatchUpdate(id){
const e=DB.Estimates.find(x=>x.EstimateID===id);
const ST=["PENDING FOR DISPATCH","DISPATCHED","PARTIALLY DISPATCHED","ON HOLD","CANCELLED"];
if(e.Type==="Return") ST.splice(1,0,"RETURN GOODS RECEIVED");
openModal("Dispatch — "+id, `
<div class="rowline"><span>Customer</span><b>${esc(e.CustomerName)}</b></div>
<label>New status <span class="req">*</span></label>
<select id="dp-st" onchange="$('dp-auto-w').style.display=(this.value==='DISPATCHED'||this.value==='PARTIALLY DISPATCHED')?'block':'none'">${ST.map(s=>`<option ${s===(e.DispatchStatus||"PENDING FOR DISPATCH")?'selected':''}>${s}</option>`).join("")}</select>
<div id="dp-auto-w" style="display:${(e.DispatchStatus==='DISPATCHED'||e.DispatchStatus==='PARTIALLY DISPATCHED')?'block':'none'}">
<label>Kaunsa auto wala leke gaya? <span class="req">*</span></label><select id="dp-auto">${autoOpts(e.AutoPerson)}</select></div>
<label>Notes (e.g. why pending / what's on hold)</label><textarea id="dp-note" rows="2">${esc(e.DispatchNotes||"")}</textarea>
${(e.Type!=="Return" && !e.WADispatch)?`<label style="display:flex;align-items:center;gap:.4rem;margin:.6rem 0;text-transform:none;font-weight:600;cursor:pointer"><input type="checkbox" id="dp-wa" checked style="width:auto"> Dispatched par customer ko WhatsApp bhejo (auto person naam + number) — na bhejna ho to untick</label>`:""}
<div style="margin-top:1rem"><button class="btn" onclick="saveDispatch('${id}')">Save — logged with date & time</button></div>`);
}
async function saveDispatch(id){
const e=DB.Estimates.find(x=>x.EstimateID===id);
const st=$("dp-st").value, note=$("dp-note").value.trim();
const needAuto = st==="DISPATCHED"||st==="PARTIALLY DISPATCHED";
const autoP = needAuto ? $("dp-auto").value : (e.AutoPerson||"");
if(needAuto && !autoP) return toast("Select the auto person — who took the goods.");
busy(true,"Updating dispatch…");
try{
const ch={DispatchStatus:st, DispatchNotes:note, AutoPerson:autoP};
if(needAuto && e.SlipStatus!=="Received") ch.SlipStatus="Pending";
// v40: pehli baar DISPATCHED / PARTIALLY DISPATCHED → DispatchedAt + OnTime (1st promise se naapte hain)
const firstDisp = needAuto && !e.DispatchedAt;
if(firstDisp){ ch.DispatchedAt=nowStr(); ch.OnTime = e.PromisedAt ? (promMs(ch.DispatchedAt) <= promMs(e.PromisedAt) ? "On time" : "Late") : "No promise"; }
await updateFields("Estimates", e, ch);
if(firstDisp && e.Type!=="Return" && !e.WADispatch){ // customer ko WhatsApp — auto person naam + number (v40.2: untick → nahi)
let wa="";
if(!($("dp-wa")&&$("dp-wa").checked)) wa="skip (untick)";
else try{
const ap=(DB.AutoPersons||[]).find(a=>a.Name===autoP)||{};
const res=await gsRun("custNotify",["dispatched", {phone:e.Phone, name:e.CustomerName, est:id, auto:autoP, autoPhone:String(ap.DriverNumber||"")}]);
wa=(res&&res.ok)?"✓ "+nowStr().slice(0,16):"✗ "+String(res&&res.err||"fail").slice(0,60);
}catch(err){ wa="✗ "+String(err.message||"").slice(0,60); }
try{ await updateFields("Estimates", e, {WADispatch:wa}); }catch(e2){}
if(!wa.startsWith("✓") && !wa.startsWith("skip")) toast("Status saved — customer WhatsApp nahi gaya: "+wa.slice(2));
}
await appendRow("DispatchHistory",{HistoryID:nextId("DispatchHistory","HistoryID","DH"),EstimateID:id,Status:st,Notes:(needAuto?"Auto: "+autoP+(note?" · ":""):"")+note,ChangedBy:USER.Name,Timestamp:nowStr()});
busy(false); closeModal(); toast("Status updated & logged ✓"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function vAddCustomer(){
const mine=[...(DB.Customers||[])].filter(c=>c.CreatedBy===USER.Name).sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1).slice(0,10);
return `<div class="card" style="max-width:640px">
<div class="form-grid">
<div><label>Customer Name <span class="req">*</span></label><input id="ac-name"></div>
<div><label>Phone <span class="req">*</span></label><input id="ac-phone" inputmode="tel"></div>
<div class="full"><label>Address</label><input id="ac-addr"></div>
<div><label>Salesman <span class="req">*</span></label><select id="ac-sm"><option value="">— Select —</option>${salesmen().map(s=>`<option>${esc(s.Name)}</option>`).join("")}</select></div>
<div><label>Opening balance (currently due amount)</label><input type="number" id="ac-ob" value="0"></div>
</div>
<div style="margin-top:1rem"><button class="btn" onclick="saveCustomer()">Save customer</button></div>
</div>
${mine.length? `<div class="section-h"><h3>Recently added by you</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Name</th><th>Phone</th><th style="text-align:right">Opening balance</th><th>Added</th></tr>
${mine.map(c=>`<tr><td><b>${esc(c.Name)}</b></td><td>${esc(c.Phone)}</td><td style="text-align:right">${money(c.OpeningBalance)}</td><td class="muted">${esc(c.CreatedAt)}</td></tr>`).join("")}</table></div>`:""}`;
}
async function saveCustomer(){
const n=$("ac-name").value.trim(), p=$("ac-phone").value.trim(), sm=$("ac-sm").value;
if(!n||!p) return toast("Name and phone are mandatory.");
if(!sm) return toast("Selecting a salesman is mandatory — the customer will show under them.");
if((DB.Customers||[]).some(c=>String(c.Phone).trim()===p)) return toast("A customer with this phone number already exists.");
busy(true,"Saving customer…");
try{
const _acObj={CustomerID:nextId("Customers","CustomerID","CU"),Name:n,Phone:p,Address:$("ac-addr").value.trim(),
CreatedFromLead:"",Salesman:sm,CreatedBy:USER.Name,CreatedAt:nowStr(),OpeningBalance:num($("ac-ob").value)||0};
await appendRow("Customers",_acObj); DB.Customers=DB.Customers||[]; DB.Customers.push(_acObj); // v35.3
busy(false); toast("Customer saved ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function vReturns(){
const d=(window._retD!==undefined)? window._retD : todayStr();
let list=[...(DB.Estimates||[])].filter(e=>e.Type==="Return" && (canSeeAll() || (isMgr()? inMyBranch(e.Salesman) : e.Salesman===USER.Name)));
if(d) list=list.filter(e=>String(e.Date).slice(0,10)===d);
list.sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
return `<div class="toolbar">
${!isSales()? `<button class="btn" onclick="openEstimateForm(null,'Return')">＋ Issue Return Slip</button>` : `<span class="pill p-gray">Return slip Manager banata hai</span>`}
<label style="margin:0">Date</label><input type="date" value="${d}" onchange="window._retD=this.value;render()" style="max-width:170px">
<button class="btn ghost small" onclick="window._retD='';render()">All dates</button>
${d===todayStr()? `<span class="pill p-blue">Today's returns</span>` : d? `<span class="pill p-gray">${d}</span>` : `<span class="pill p-gray">All returns</span>`}
</div>
${estTable(list)}`;
}
function dispStepsBar(e){
if(e.Status==="Cancelled") return `<div class="pill p-bad" style="margin:.35rem 0">❌ Cancelled</div>`;
const dp=e.DispatchStatus||"PENDING FOR DISPATCH";
if(dp==="ON HOLD") return `<div class="pill p-gray" style="margin:.35rem 0">⏸ On hold</div>`;
if(e.Type==="Return"){
const done = dp==="RETURN GOODS RECEIVED"? 2 : 1;
return stepsBar([{ic:"🧾",label:"Slip issued",at:e.CreatedAt},{ic:"🏁",label:"Goods received",at:done===2?(e.LastEditedAt||""):""}], done, false);
}
const done = e.SlipStatus==="Received"? 3 : (dp==="DISPATCHED"? 2 : 1);
const midLabel = dp==="PARTIALLY DISPATCHED"? "Partially dispatched" : dp==="DISPATCHED"? "Dispatched" : "Dispatch";
return stepsBar([
{ic:"🧾",label:"Created",at:e.CreatedAt},
{ic:"🚚",label:midLabel,at:dp==="DISPATCHED"?(e.LastEditedAt||""):""},
{ic:"📄",label:"Slip received",at:e.SlipReceivedAt||""}
], done, false);
}
function vCheckDisp(){
const f=window._cdF||"partpend", q=window._cdQ||"", d=window._cdD||"";
let list=activeEstimates(myEstimates());
if(d) list=list.filter(e=>String(e.Date).slice(0,10)===d);
if(f==="pending") list=list.filter(e=>(e.DispatchStatus||"PENDING FOR DISPATCH")==="PENDING FOR DISPATCH");
if(f==="partpend") list=list.filter(e=>["PARTIALLY DISPATCHED","PENDING FOR DISPATCH"].includes(e.DispatchStatus||"PENDING FOR DISPATCH"));
if(f==="done") list=list.filter(e=>e.DispatchStatus==="DISPATCHED");
if(q) list=list.filter(e=>(e.EstimateID+" "+e.CustomerName).toLowerCase().includes(q.toLowerCase()));
list=[...list].sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
return `<div class="toolbar">
<input id="q-cd" placeholder="Search estimate no. / customer…" value="${esc(q)}" oninput="window._cdQ=this.value;window._refocusId=this.id;render()">
<input type="date" style="flex:0 1 auto;min-width:140px" value="${d}" onchange="window._cdD=this.value;render()" title="Dispatch date">
<select onchange="window._cdF=this.value;render()">
<option value="all" ${f==='all'?'selected':''}>All estimates</option>
<option value="pending" ${f==='pending'?'selected':''}>Pending dispatch</option>
<option value="partpend" ${f==='partpend'?'selected':''}>Partially dispatched / Pending</option>
<option value="done" ${f==='done'?'selected':''}>Dispatched</option>
</select></div>
${list.length? list.map(e=>{
const dp=e.DispatchStatus||"PENDING FOR DISPATCH";
const dpc=(dp==="DISPATCHED"||dp==="RETURN GOODS RECEIVED")?"p-ok":dp==="PARTIALLY DISPATCHED"?"p-warn":dp==="ON HOLD"?"p-gray":"p-blue";
return `<div class="card" style="margin-bottom:.7rem;border-left:4px solid ${dp==="DISPATCHED"||dp==="RETURN GOODS RECEIVED"?"var(--ok)":dp==="PARTIALLY DISPATCHED"?"var(--warn)":"var(--blue)"}">
<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center">
<div><b style="font-size:1.02rem">${esc(e.EstimateID)}</b> <span class="muted">· ${esc(e.CustomerName)} · ${fmtDate(e.Date)}</span>
<span class="pill ${dpc}">${esc(dp)}</span></div>
<div style="white-space:nowrap"><b>${money(e.GrandTotal)}</b>
<button class="btn small ghost" style="margin-left:.4rem" onclick="openEstimate('${e.EstimateID}')">View</button></div>
</div>
${dispStepsBar(e)}
${e.DispatchNotes?`<div class="muted" style="font-size:.8rem">📝 ${esc(e.DispatchNotes)}</div>`:""}
</div>`;}).join("") : `<div class="card empty">No estimates match this filter. 🎉</div>`}`;
}
function stockTable(list){
return list.length? `<div class="tbl-wrap"><table><tr><th>Item</th><th style="text-align:right">Available stock</th><th>Remarks</th></tr>
${list.map(x=>`<tr><td><b>${esc(x.ItemName)}</b></td><td style="text-align:right"><b>${esc(x.Qty)}</b></td><td class="muted">${esc(x.Remarks||"")}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">No matching items found.</div>`;
}
function stockFilter(){
const q = ($("st-q")?$("st-q").value:"").trim().toLowerCase();
const list = (DB.Stock||[]).filter(x=>String(x.ItemName).toLowerCase().includes(q))
.sort((a,b)=>String(a.ItemName).localeCompare(String(b.ItemName)));
$("st-list").innerHTML = stockTable(list);
}
function vStock(){
const meta=(DB.StockMeta||[])[0];
const list=[...(DB.Stock||[])].sort((a,b)=>String(a.ItemName).localeCompare(String(b.ItemName)));
setTimeout(()=>{ if($("st-q")) stockFilter(); },0);
return `
<div class="card" style="margin-bottom:1rem;display:flex;gap:.8rem;align-items:center;flex-wrap:wrap">
<span class="pill ${meta&&meta.UpdatedAt?'p-ok':'p-warn'}">${meta&&meta.UpdatedAt? "Stock updated on "+esc(meta.UpdatedAt)+(meta.UpdatedBy?" by "+esc(meta.UpdatedBy):"") : "Stock abhi update nahi hua"}</span>
<button class="btn ghost small" onclick="refreshData()">⟳ Refresh</button>
${String(USER.Role).trim().toUpperCase()==="EA"||isAdmin()? `<button class="btn small dark" onclick="openStockUpload()">📤 Excel se Stock Update</button> <button class="btn small ghost" onclick="markStockUpdated()">✓ Sirf timestamp</button>`:""}
</div>
<div class="toolbar"><input id="st-q" placeholder="Type item name… (e.g. 2x2 glossy)" autocomplete="off" oninput="stockFilter()"></div>
<div id="st-list">${stockTable(list)}</div>`;
}
// ===== EXCEL STOCK UPLOAD (CRM/Admin) =====
// Busy/Tally "Stock In Hand" export ya simple ItemName+Qty sheet — dono parse hote hain.
// SheetJS library sirf pehli baar upload par load hoti hai (app start par nahi — speed).
function loadSheetJS(){
return new Promise((res,rej)=>{
if(window.XLSX) return res();
const s=document.createElement("script");
s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
s.onload=()=>res();
s.onerror=()=>rej(new Error("Excel reader load nahi hua — internet check karke dobara try karo"));
document.head.appendChild(s);
});
}
function openStockUpload(){
window._stkRows=null;
openModal("📤 Excel se Stock Update", `
<p class="muted">Busy/Tally ka <b>Stock In Hand</b> export (jaisa accountant nikaalta hai) ya simple 2-column sheet (ItemName, Qty) — dono chalenge. Category headings aur totals apne aap skip ho jayenge.</p>
<div class="card" style="border-left:4px solid var(--warn);padding:.6rem .8rem;margin-bottom:.6rem;font-size:.85rem">⚠ Save karne par <b>poora Stock tab is file ke data se replace</b> ho jayega.</div>
<label>Excel file (.xlsx / .xls / .csv)</label>
<input type="file" id="stk-file" accept=".xlsx,.xls,.csv" onchange="stockFileChosen(this)">
<div id="stk-prev" style="margin-top:.8rem"></div>`);
}
function parseStockAoa(aoa){
// header row dhundo: jisme "Item Name" jaisa aur "Stock/Qty" jaisa column ho
let hi=-1, cn=-1, cq=-1;
for(let i=0;i<Math.min(aoa.length,30);i++){
const r=aoa[i]||[];
let n=-1,q=-1;
r.forEach((c,j)=>{
const s=String(c==null?"":c).trim().toLowerCase();
if(n<0 && /^item\s*name$|^item$|^name$|^design/.test(s)) n=j;
if(q<0 && /stock|qty|quantity/.test(s) && !/code/.test(s)) q=j;
});
if(n>-1 && q>-1){ hi=i; cn=n; cq=q; break; }
}
const out=[];
if(hi>-1){
for(let i=hi+1;i<aoa.length;i++){
const r=aoa[i]||[];
const name=String(r[cn]==null?"":r[cn]).trim();
const qty=r[cq];
if(!name || qty==null || qty===""){ continue; } // category heading / subtotal / grand total rows skip
const unit=String(r[cq+1]==null?"":r[cq+1]).trim().replace(/-+$/,"");
out.push([name, qty, unit]);
}
} else {
// simple sheet: col A = item, col B = qty, col C = remarks
for(let i=0;i<aoa.length;i++){
const r=aoa[i]||[];
const name=String(r[0]==null?"":r[0]).trim();
const qty=r[1];
if(!name || qty==null || qty==="") continue;
if(i===0 && isNaN(Number(qty))) continue; // header row skip
out.push([name, qty, String(r[2]==null?"":r[2]).trim()]);
}
}
return out;
}
async function stockFileChosen(inp){
const f=inp.files && inp.files[0]; if(!f) return;
busy(true,"File padh rahe hain…");
try{
await loadSheetJS();
const buf=await f.arrayBuffer();
const wb=XLSX.read(buf,{type:"array"});
const ws=wb.Sheets[wb.SheetNames[0]];
const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
const rows=parseStockAoa(aoa);
busy(false);
if(!rows.length){ $("stk-prev").innerHTML=`<div class="card" style="border-left:4px solid var(--bad)">⚠ Is file mein koi item nahi mila. Check karo ki isme "Item Name" + "Stock/Qty" columns hain.</div>`; return; }
window._stkRows=rows;
const neg=rows.filter(r=>num(r[1])<0).length;
$("stk-prev").innerHTML=`
<div class="rowline"><span>Items mile</span><b>${rows.length}</b></div>
${neg?`<div class="rowline"><span style="color:var(--warn)">⚠ Negative qty items (file mein minus stock)</span><b>${neg}</b></div>`:""}
<div class="tbl-wrap" style="margin-top:.5rem;max-height:230px;overflow-y:auto"><table>
<tr><th>Item</th><th style="text-align:right">Qty</th><th>Unit</th></tr>
${rows.slice(0,10).map(r=>`<tr><td>${esc(r[0])}</td><td style="text-align:right">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}
</table></div>
${rows.length>10?`<p class="muted">…aur ${rows.length-10} items (preview mein sirf pehle 10)</p>`:""}
<div style="margin-top:1rem"><button class="btn" onclick="saveStockUpload()">✓ Save — Stock tab update karo (${rows.length} items)</button></div>`;
}catch(e){ busy(false); toast("File read failed: "+e.message); }
}
async function saveStockUpload(){
const rows=window._stkRows; if(!rows || !rows.length) return;
busy(true,"Stock update ho raha hai… ("+rows.length+" items)");
try{
const res=await gsRun("replaceStock",[rows, USER.Name]);
await loadAllData("Naya stock aa raha hai…",["Stock","StockMeta"]);
busy(false); closeModal();
window._stkRows=null;
ROUTE="stock"; render();
toast("Stock updated ✓ — "+((res&&res.count)||rows.length)+" items · timestamp lag gaya");
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function markStockUpdated(){
busy(true,"Marking stock updated…");
try{
const meta=(DB.StockMeta||[])[0];
if(meta) await updateFields("StockMeta", meta, {UpdatedAt:nowStr(), UpdatedBy:USER.Name});
else await appendRow("StockMeta",{UpdatedAt:nowStr(), UpdatedBy:USER.Name});
busy(false);
await refreshData();
ROUTE="stock"; render();
toast("Stock updated ✓ — timestamp visible in all logins");
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function vItems(){
const q=window._itQ||"";
let list=(DB.Items||[]);
if(q) list=list.filter(x=>String(x.Name).toLowerCase().includes(q.toLowerCase()));
list=[...list].sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
return `<div class="toolbar">
<input id="q-it" placeholder="Search item…" value="${esc(q)}" oninput="window._itQ=this.value;window._refocusId=this.id;render()">
<button class="btn" onclick="openItemForm()">＋ Add item</button></div>
<div class="tbl-wrap"><table><tr><th>Item</th><th>Default price</th><th>Added by</th><th>Added on</th></tr>
${list.map(x=>`<tr><td><b>${esc(x.Name)}</b></td><td>${num(x.Price)?money(x.Price):"—"}</td><td>${esc(x.AddedBy)}</td><td>${fmtDate(x.CreatedAt)}</td></tr>`).join("")||"<tr><td colspan=4 class='empty'>No items yet. Add your first item.</td></tr>"}
</table></div>`;
}
function openItemForm(){
openModal("Add item", `
<label>Item name <span class="req">*</span></label><input id="im-name" placeholder="e.g. Kajaria 2x2 Glossy White">
<label>Default price (optional)</label><input type="number" id="im-price" min="0">
<div style="margin-top:1rem"><button class="btn" onclick="saveItem()">Save item</button></div>`);
}
async function saveItem(){
const n=$("im-name").value.trim(); if(!n) return toast("Item name required.");
if((DB.Items||[]).some(x=>String(x.Name).toLowerCase()===n.toLowerCase())) return toast("This item is already in the list.");
busy(true,"Saving item…");
try{
await appendRow("Items",{ItemID:nextId("Items","ItemID","IM"),Name:n,Price:num($("im-price").value)||"",AddedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Item added ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
// SPEED: latest payment-followup ka index ek baar per render — pehle har customer par poori list sort hoti thi
function lastPF(custId){
if(!window._pfIdx){
const m={};
(DB.PayFollowups||[]).forEach(f=>{
const k=f.CustomerID;
if(!m[k] || String(f.Timestamp)>String(m[k].Timestamp)) m[k]=f;
});
window._pfIdx=m;
}
return window._pfIdx[custId]||null;
}
function vPayFollow(){
if(isSales()) return `<div class="muted" style="font-size:.8rem;margin-bottom:.6rem">v32: Payment followup calls ab CRM karti hai. Aapko sirf wo customers dikhte hain jo CRM ne aapko <b>escalate</b> kiye (dispute / salesman se baat / visit).</div>${escList(USER.Name,false)}`;
const t=todayStr();
const fsm=window._pfSm||"all", fbr=window._pfBr||"all"; // v23: branch filter (CRM/Admin)
const canBr=(USER.Role==="CRM"||isAdmin());
let baseC=myCustomers();
if(canBr && fbr!=="all") baseC=baseC.filter(c=>{const b=userBranch(c.Salesman); return fbr==="__none"? b==="" : b===fbr;});
if((isMgr()||isAdmin()||USER.Role==="CRM") && fsm!=="all") baseC=baseC.filter(c=>String(c.Salesman||"")===fsm);
let rows=baseC.map(c=>({c,bal:customerOutstanding(c.CustomerID),pf:lastPF(c.CustomerID)})).filter(x=>x.bal>0.009);
// v33.4: search + today/overdue/all filter
const pfq=(window._pfQ||"").toLowerCase(), pff=window._pfF||"all";
if(pfq) rows=rows.filter(x=>(x.c.Name+" "+x.c.Phone+" "+(x.c.Salesman||"")).toLowerCase().includes(pfq));
const ndOf=x=>x.pf&&x.pf.NextFollowupDate?String(x.pf.NextFollowupDate).slice(0,10):"";
if(pff==="today") rows=rows.filter(x=>ndOf(x)===t);
else if(pff==="overdue") rows=rows.filter(x=>{const nd=ndOf(x); return !nd || nd<t;});
const pso=window._pfSort||"due";
rows.sort((a,b)=>{
if(pso==="name") return String(a.c.Name).localeCompare(String(b.c.Name));
if(pso==="amt") return b.bal-a.bal;
if(pso==="age") return custAging(b.c.CustomerID).oldestDays-custAging(a.c.CustomerID).oldestDays; // v36
const an=a.pf&&a.pf.NextFollowupDate?String(a.pf.NextFollowupDate).slice(0,10):"0000-00-00";
const bn=b.pf&&b.pf.NextFollowupDate?String(b.pf.NextFollowupDate).slice(0,10):"0000-00-00";
return an<bn?-1:1;
});
const due=rows.filter(x=>!x.pf || !x.pf.NextFollowupDate || String(x.pf.NextFollowupDate).slice(0,10)<=t).length;
return `
${(isMgr()||isAdmin()||USER.Role==="CRM")? `<div class="toolbar"><input id="q-pf" placeholder="Search customer / phone / salesman" value="${esc(window._pfQ||"")}" oninput="window._pfQ=this.value;window._refocusId=this.id;render()" style="max-width:240px">
<select style="max-width:190px" onchange="window._pfF=this.value;render()"><option value="all" ${pff==='all'?'selected':''}>All followups</option><option value="today" ${pff==='today'?'selected':''}>📅 Today's followups</option><option value="overdue" ${pff==='overdue'?'selected':''}>⚠️ Overdue / never done</option></select>
<label style="margin:0">Salesman</label>
<select style="max-width:260px" onchange="window._pfSm=this.value;render()">
<option value="all" ${fsm==='all'?'selected':''}>All salesmen</option>
${salesmen().map(s=>`<option ${fsm===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}
</select>
${canBr? `<select style="max-width:220px" onchange="window._pfBr=this.value;admSyncBr(this.value);render()" title="Branch filter">
<option value="all" ${fbr==='all'?'selected':''}>All branches</option>
${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${fbr===b.Name?'selected':''}>${esc(b.Name)}</option>`).join("")}
<option value="__none" ${fbr==='__none'?'selected':''}>HO / no branch</option>
</select>`:""}
<select style="max-width:240px" onchange="window._pfSort=this.value;render()">
<option value="due" ${(window._pfSort||'due')==='due'?'selected':''}>Sort: Next followup date</option>
<option value="amt" ${window._pfSort==='amt'?'selected':''}>Sort: Amount (high→low)</option>
<option value="name" ${window._pfSort==='name'?'selected':''}>Sort: Name (A-Z)</option>
<option value="age" ${window._pfSort==='age'?'selected':''}>Sort: Sabse purana paisa pehle</option>
</select></div>`:""}
<div class="card stat ${due?'bad':'ok'}" style="max-width:340px;margin-bottom:1rem"><div class="v">${due}</div><div class="l">Payment follow-ups due / never done</div></div>
${rows.length? `<div class="tbl-wrap"><table><tr><th>Customer</th><th style="text-align:right">Outstanding</th><th>Purana</th><th>Last followup</th><th>Next followup</th><th></th></tr>
${rows.map(x=>{
const nd=x.pf&&x.pf.NextFollowupDate?String(x.pf.NextFollowupDate).slice(0,10):"";
const late=!nd||nd<t, today=nd===t;
return `<tr><td><b>${esc(x.c.Name)}</b><div class="muted">${esc(x.c.Phone)} · ${esc(x.c.Salesman||"—")}</div></td>
<td style="text-align:right"><b style="color:var(--bad)">${money(x.bal)}</b></td>
<td>${agePill(x.c.CustomerID)}</td>
<td class="muted">${x.pf? fmtDate(x.pf.Date)+" — "+esc(x.pf.Comment).slice(0,60) : "Kabhi nahi hua"}</td>
<td>${nd? (late? `<span class="pill p-bad">${nd} · overdue</span>` : today? `<span class="pill p-warn">Today</span>` : nd) : `<span class="pill p-bad">Set nahi hai</span>`}</td>
<td style="white-space:nowrap"><button class="btn small" onclick="openPayFollowup('${x.c.CustomerID}')">💬 Followup</button>
<button class="btn small ghost" onclick="openLedger('${x.c.CustomerID}')">Ledger</button></td></tr>`;
}).join("")}
</table></div>` : `<div class="card empty">No customer payments pending. 🎉</div>`}`;
}
function openPayFollowup(custId){
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId); if(!c) return;
const bal=customerOutstanding(custId);
const hist=(DB.PayFollowups||[]).filter(f=>f.CustomerID===custId).sort((a,b)=>a.Timestamp<b.Timestamp?1:-1);
openModal("Payment Followup — "+c.Name, `
<div class="rowline"><span>Phone</span><b>${esc(c.Phone)}</b></div>
<div class="rowline"><span>Outstanding</span><b style="color:var(--bad)">${money(bal)}</b></div>
${agingBoxHTML(custId)}
${(()=>{ const ph=String(c.Phone||"").replace(/\D/g,""); return ph? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.5rem 0"><a class="btn small" href="tel:${ph}">📞 Call</a><a class="btn small" style="background:#25D366" href="https://wa.me/${ph.length===10?'91'+ph:ph}" target="_blank" rel="noopener">💬 WhatsApp</a><button class="btn small ghost" onclick="openLedger('${custId}')">📒 Ledger</button></div>`:""; })()}
<div class="form-grid">
<div><label>Outcome <span class="req">*</span></label><select id="pf-out" onchange="pfOutChg()"><option value="">— chuno —</option><option>Date promised</option><option>Paid – verify</option><option>No answer</option><option>Not reachable</option><option>Wrong number</option><option>Dispute</option><option>Wants salesman</option><option>Visit needed</option></select></div>
<div><label>Kaise</label><select id="pf-mode"><option>Call</option><option>WhatsApp</option><option>Visit</option></select></div>
<div><label>Next followup date <span class="req">*</span></label><input type="date" id="pf-next" value="${todayStr()}"></div>
</div>
<label>Customer ne kya bola? <span class="req">*</span></label><textarea id="pf-com" rows="2" placeholder="e.g. 15 tarikh ko cheque dega, abhi paisa tight hai…"></textarea>
${(!isSales() && c.Salesman)? `<label style="display:flex;align-items:center;gap:.5rem;text-transform:none;font-weight:600;margin-top:.5rem;cursor:pointer"><input type="checkbox" id="pf-esc" style="width:auto"> 🔺 Salesman (${esc(c.Salesman)}) ko escalate karo — uske dashboard par task banega</label>`:""}
<div style="margin-top:1rem"><button class="btn" onclick="savePayFollowup('${custId}')">Save followup</button></div>
<div class="section-h"><h3>Followup history</h3><div class="ln"></div></div>
<div class="hist">${hist.map(f=>`<div class="h-item"><b>${fmtDate(f.Date)}</b> <span class="muted">· by ${esc(f.DoneBy)} · ${esc(f.Timestamp)}</span>${f.Outcome?` <span class="pill ${f.Outcome==='Date promised'?'p-warn':/Dispute|salesman|Visit/.test(f.Outcome)?'p-bad':'p-gray'}">${esc(f.Outcome)}</span>`:""}${f.Escalated==="Y"?' <span class="pill p-bad">🔺 escalated</span>':""}<div>${esc(f.Comment)}</div>${num(f.PromisedAmount)?`<div class="muted">Promised: ${money(f.PromisedAmount)}</div>`:""}${f.NextFollowupDate?`<div class="muted">Next: ${fmtDate(f.NextFollowupDate)}</div>`:""}</div>`).join("") || "<div class='muted'>Abhi tak koi payment followup nahi hua.</div>"}</div>`);
}
function pfOutChg(){
const o=$("pf-out").value;
const esc=$("pf-esc"); if(esc && /Dispute|Wants salesman|Visit needed/.test(o)) esc.checked=true;
}
/* v32: structured followup — outcome/mode mandatory, comment ≥ 15 chars, "Date promised" par amount; escalate → salesman ko DelegationTask
 *  (Category-free: Title "🔺 Payment escalation …", Notes = CRM ka outcome+comment, DueDate +2 din). Salesman task Done kare = escalation band. */
async function savePayFollowup(custId){
const c=(DB.Customers||[]).find(x=>x.CustomerID===custId);
const com=$("pf-com").value.trim(), next=$("pf-next").value, out=$("pf-out")?$("pf-out").value:"", mode=$("pf-mode")?$("pf-mode").value:"", amt=""; // v33.4: promised amount field hataya, 15-letter rule hataya
if(!out) return toast("Outcome chuno.");
if(!com) return toast("Customer ne kya bola — likho.");
if(!next) return toast("Enter the next follow-up date.");
const escOn=$("pf-esc") && $("pf-esc").checked;
if(!saveOnce("pf:"+custId)) return; // v33.2 double-tap guard
busy(true,"Saving payment followup…");
try{
let taskId="";
if(escOn && c.Salesman){
const bal=customerOutstanding(custId); const due=new Date(); due.setDate(due.getDate()+2); const dd=due.toISOString().slice(0,10);
const trec={TaskID:nextId("DelegationTasks","TaskID","DG"),Title:"🔺 Payment escalation: "+c.Name+" — "+money(bal),Notes:"CRM ("+USER.Name+"): "+out+" · "+com+(amt?" · promised "+money(amt):"")+" · phone "+(c.Phone||""),AssignedTo:c.Salesman,AssignedBy:USER.Name,DueDate:dd,PhotoURL:"",VoiceURL:"",Status:"Pending",DoneAt:"",Comments:"",CreatedAt:nowStr()};
await appendRow("DelegationTasks",trec); DB.DelegationTasks=DB.DelegationTasks||[]; DB.DelegationTasks.push(trec); taskId=trec.TaskID;
}
const rec={PFID:nextId("PayFollowups","PFID","PF"),CustomerID:custId,CustomerName:c.Name,Date:todayStr(),Comment:com,NextFollowupDate:next,PromisedAmount:amt,DoneBy:USER.Name,Timestamp:nowStr(),Outcome:out,Mode:mode,Escalated:escOn?"Y":"",EscTaskID:taskId};
await appendRow("PayFollowups",rec); DB.PayFollowups=DB.PayFollowups||[]; DB.PayFollowups.push(rec); window._pfIdx=null;
busy(false); closeModal(); toast(escOn?"🔺 Escalated to "+c.Salesman+" + followup saved":"Payment followup saved ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
finally{ saveDone("pf:"+custId); }
}
/** Salesman ke open escalations (DelegationTask Pending + PF Escalated=Y) — dashboard/payfollow */
function escList(name, compact){
const tasks=(DB.DelegationTasks||[]).filter(t=>t.AssignedTo===name && t.Status!=="Done" && /^🔺 Payment escalation/.test(String(t.Title||"")));
const rows=tasks.map(t=>{ const pf=(DB.PayFollowups||[]).find(f=>f.EscTaskID===t.TaskID); const c=pf?(DB.Customers||[]).find(x=>x.CustomerID===pf.CustomerID):null; return {t,pf,c,bal:c?customerOutstanding(c.CustomerID):0}; });
if(!rows.length) return `<div class="card empty">${compact?"Koi payment escalation nahi 👍":"Abhi koi escalation nahi hai. 🎉"}</div>`;
const tday=todayStr();
return `<div class="tbl-wrap"><table><tr><th>Customer</th><th style="text-align:right">Outstanding</th><th>CRM ka note</th><th>Due</th><th></th></tr>
${rows.map(x=>`<tr class="${String(x.t.DueDate).slice(0,10)<tday?'row-red':'row-yellow'}"><td><b>${esc(x.c?x.c.Name:x.t.Title)}</b><div class="muted" style="font-size:.7rem">${esc(x.c?x.c.Phone||"":"")}</div></td><td style="text-align:right"><b style="color:var(--bad)">${money(x.bal)}</b></td><td style="white-space:normal;max-width:320px;font-size:.8rem">${esc(x.t.Notes||"")}</td><td>${fmtDate(String(x.t.DueDate).slice(0,10))}</td><td style="white-space:nowrap">${x.c?`<button class="btn small" onclick="openPayFollowup('${x.c.CustomerID}')">💬 Followup</button> <button class="btn small ghost" onclick="openLedger('${x.c.CustomerID}')">Ledger</button> `:""}<button class="btn small ghost" onclick="escDone('${esc(x.t.TaskID)}')">✅ Handled</button></td></tr>`).join("")}
</table></div>`;
}
async function escDone(taskId){
const t=(DB.DelegationTasks||[]).find(x=>x.TaskID===taskId); if(!t) return;
if(!confirm("Escalation band karein? (Pehle followup save kar liya ho to hi)")) return;
busy(true,"Closing escalation…");
try{ await updateFields("DelegationTasks", t, {Status:"Done", DoneAt:nowStr(), Comments:(t.Comments?t.Comments+" · ":"")+"Handled by "+USER.Name}); busy(false); toast("Escalation band ✓"); render(); }
catch(e){ busy(false); toast("Failed: "+e.message); }
}
window.escList=escList;
/* ===== v32: PAYMENT CALLS REPORT (Manager = branch, Admin = all/branch, CRM = apni calls) ===== */
function vPayCalls(){
if(!(isAdmin()||isMgr()||roleHas(/^CRM$/i)||hasMod("paycalls"))) return `<div class="card empty">Not allowed.</div>`;
const d=window._pcD||todayStr(), mode=window._pcMode||"day";
const from = mode==="day"? d : mode==="week"? (()=>{const x=new Date(d+"T00:00:00"); x.setDate(x.getDate()-6); return x.toISOString().slice(0,10);})() : d.slice(0,8)+"01";
const brSel=isAdmin()? (window._pcBr||"all") : (isMgr()? (USER.Branch||"all") : "all");
let L=(DB.PayFollowups||[]).filter(f=>{ const fd=String(f.Date).slice(0,10); return fd>=from && fd<=d; });
if(USER.Role==="CRM") L=L.filter(f=>f.DoneBy===USER.Name);
if(brSel!=="all"){ L=L.filter(f=>{ const c=(DB.Customers||[]).find(x=>x.CustomerID===f.CustomerID); const b=c?userBranch(c.Salesman||""):""; return brSel==="__none"? !b : (!b||b===brSel); }); }
L=[...L].sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1);
const talked=L.filter(f=>!/No answer|Not reachable|Wrong number/.test(f.Outcome||"") && f.Outcome);
const promised=L.filter(f=>f.Outcome==="Date promised"); const promAmt=promised.reduce((s,f)=>s+num(f.PromisedAmount),0);
const escs=L.filter(f=>f.Escalated==="Y");
const byCaller=anGroup(L, f=>f.DoneBy, ()=>1); const byOut=anGroup(L, f=>f.Outcome||"(purana / no outcome)", ()=>1);
// open escalations (period se alag — sab pending)
const openEsc=(DB.DelegationTasks||[]).filter(t=>t.Status!=="Done" && /^🔺 Payment escalation/.test(String(t.Title||""))).filter(t=>{ if(brSel==="all") return true; const b=userBranch(t.AssignedTo||""); return brSel==="__none"? !b : (!b||b===brSel); });
// promise accuracy: promised in period whose date <= today → paid after?
const tday=todayStr();
const promDue=promised.filter(f=>f.NextFollowupDate && String(f.NextFollowupDate).slice(0,10)<=tday);
const kept=promDue.filter(f=>(DB.Payments||[]).some(p=>p.CustomerID===f.CustomerID && String(p.Date).slice(0,10)>=String(f.Date).slice(0,10) && num(p.Amount)>=num(f.PromisedAmount)*0.9));
// batch-entry flag: same caller, 5+ followups within 5 minutes
const flags=[]; const byC={}; L.forEach(f=>{ (byC[f.DoneBy]=byC[f.DoneBy]||[]).push(String(f.Timestamp)); });
Object.entries(byC).forEach(([k,ts])=>{ ts.sort(); for(let i=0;i+4<ts.length;i++){ if((new Date(ts[i+4].replace(" ","T"))-new Date(ts[i].replace(" ","T")))<5*60000){ flags.push(k+": 5+ followups 5 min ke andar ("+ts[i].slice(11,16)+")"); break; } } });
return `<div class="toolbar">
<select style="max-width:150px" onchange="window._pcMode=this.value;render()"><option value="day" ${mode==='day'?'selected':''}>Aaj / ek din</option><option value="week" ${mode==='week'?'selected':''}>7 din</option><option value="month" ${mode==='month'?'selected':''}>Mahina</option></select>
<input type="date" value="${d}" max="${todayStr()}" style="max-width:160px" onchange="window._pcD=this.value;render()">
${isAdmin()?`<select style="max-width:170px" onchange="window._pcBr=this.value;render()"><option value="all" ${brSel==='all'?'selected':''}>🏢 All branches</option>${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${brSel===b.Name?'selected':''}>📍 ${esc(b.Name)}</option>`).join("")}<option value="__none" ${brSel==='__none'?'selected':''}>HO</option></select>`:isMgr()?`<span class="pill p-blue">📍 ${esc(USER.Branch||"All")}</span>`:""}
</div>
<div class="grid g4">
<div class="card stat"><div class="v">${L.length}</div><div class="l">Followup calls (${from===d?fmtDate(d):fmtDate(from)+" → "+fmtDate(d)})</div></div>
<div class="card stat ok"><div class="v">${talked.length}</div><div class="l">Baat hui (${L.length?Math.round(talked.length/L.length*100):0}%)</div></div>
<div class="card stat warn"><div class="v">${money(promAmt)}</div><div class="l">Promised (${promised.length} customers)</div></div>
<div class="card stat ${openEsc.length?'bad':'ok'}"><div class="v">${openEsc.length}</div><div class="l">Open escalations (sab)</div></div>
</div>
${flags.length?`<div class="card" style="border-left:4px solid var(--bad);background:#FFF5F5;margin-top:.6rem"><b>⚠ Check karo</b><ul style="margin:.3rem 0 0 1.1rem;padding:0;font-size:.8rem">${flags.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
<div class="grid g3" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Outcome-wise</b><div style='margin-top:.5rem'>"+anHBars(byOut,{fmt:v=>v+" calls"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Calls by</b><div style='margin-top:.5rem'>"+anHBars(byCaller,{fmt:v=>v+" calls"})+"</div>")}
${anBox(`<b style='font-size:.8rem'>Promise accuracy</b><div class='muted' style='font-size:.72rem;margin:.3rem 0'>Jinki promised date aa gayi: ${promDue.length} · paisa aaya: ${kept.length}</div><div style='font-size:1.6rem;font-weight:800;color:${promDue.length&&kept.length/promDue.length>=0.6?'var(--ok)':'var(--bad)'}'>${promDue.length?Math.round(kept.length/promDue.length*100)+"%":"—"}</div>`)}
</div>
${openEsc.length?`<div class="section-h" style="margin-top:1rem"><h3>🔺 Open escalations</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Customer</th><th>Salesman</th><th>Due</th><th>Din</th><th>CRM note</th></tr>${openEsc.map(t=>{const dd=String(t.DueDate).slice(0,10); const age=Math.round((new Date(tday)-new Date(String(t.CreatedAt).slice(0,10)))/86400000); return `<tr class="${dd<tday?'row-red':''}"><td><b>${esc(String(t.Title).replace(/^🔺 Payment escalation: /,""))}</b></td><td>${esc(t.AssignedTo)}</td><td>${fmtDate(dd)}</td><td>${age}</td><td style="white-space:normal;max-width:300px;font-size:.78rem">${esc(t.Notes||"")}</td></tr>`;}).join("")}</table></div>`:""}
<div class="section-h" style="margin-top:1rem"><h3>Calls — kya bola customer ne</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>Customer</th><th>Salesman</th><th>Outcome</th><th style="text-align:right">Promised</th><th>Next</th><th>Customer ne kya bola</th><th>By</th></tr>
${L.map(f=>{ const c=(DB.Customers||[]).find(x=>x.CustomerID===f.CustomerID); return `<tr class="${/Dispute|Wants salesman|Visit/.test(f.Outcome||"")?'row-yellow':''}"><td style="white-space:nowrap">${esc(String(f.Timestamp||"").slice(0,16))}</td><td><b>${esc(f.CustomerName)}</b><div class="muted" style="font-size:.7rem">${esc(c?c.Phone||"":"")}</div></td><td>${esc(c?c.Salesman||"—":"—")}</td><td>${f.Outcome?`<span class="pill ${f.Outcome==='Date promised'?'p-warn':/Dispute|salesman|Visit/.test(f.Outcome)?'p-bad':'p-gray'}">${esc(f.Outcome)}</span>`:"—"}${f.Mode?`<div class="muted" style="font-size:.68rem">${esc(f.Mode)}</div>`:""}${f.Escalated==="Y"?' 🔺':''}</td><td style="text-align:right">${num(f.PromisedAmount)?money(f.PromisedAmount):"—"}</td><td>${f.NextFollowupDate?fmtDate(String(f.NextFollowupDate).slice(0,10)):"—"}</td><td style="white-space:normal;max-width:320px;font-size:.8rem">${esc(f.Comment||"")}</td><td>${esc(f.DoneBy||"")}</td></tr>`; }).join("")||"<tr><td colspan=8 class='empty'>Is period mein koi followup nahi.</td></tr>"}
</table></div>`;
}
window.vPayCalls=vPayCalls;
function autoOpts(sel){
return `<option value="">— Select auto person —</option>` + (DB.AutoPersons||[]).map(x=>`<option ${x.Name===sel?'selected':''}>${esc(x.Name)}</option>`).join("");
}
function vAutos(){
const list=[...(DB.AutoPersons||[])].sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
return `<div class="card" style="max-width:560px;margin-bottom:1rem">
<div class="form-grid">
<div><label>Auto person ka naam <span class="req">*</span></label><input id="au-name"></div>
<div><label>Driver number <span class="req">*</span></label><input id="au-num" inputmode="tel"></div>
</div>
<div style="margin-top:.8rem"><button class="btn" onclick="saveAutoPerson()">＋ Add auto person</button></div>
</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>Name</th><th>Driver number</th><th>Added by</th></tr>
${list.map(x=>`<tr><td><b>${esc(x.Name)}</b></td><td>${esc(x.DriverNumber)}</td><td class="muted">${esc(x.CreatedBy)}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">No auto persons yet. Add one from above.</div>`}`;
}
async function saveAutoPerson(){
const n=$("au-name").value.trim(), d=$("au-num").value.trim();
if(!n||!d) return toast("Naam aur driver number dono mandatory.");
if((DB.AutoPersons||[]).some(x=>String(x.Name).toLowerCase()===n.toLowerCase())) return toast("This auto person already exists.");
busy(true,"Saving…");
try{
await appendRow("AutoPersons",{Name:n,DriverNumber:d,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); toast("Auto person added ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* ===== v19: FILL IMS ENTRIES (EA/Admin) =====
 * Accounting exports (Date Wise Item Details): Col A=Date, B=Bill No, D=Party, F=Item, H=Qty.
 * Sale = Out, Sale Return = In, Purchase = In. SKU + Category "Item List" tab se match. */
const IMS_TYPES={
sale:{label:"Sale", inout:"Out", pill:"p-bad", ic:"🔴"},
salereturn:{label:"Sale Return", inout:"In", pill:"p-ok", ic:"🟢"},
purchase:{label:"Purchase", inout:"In", pill:"p-blue", ic:"🔵"}
};
/* v20: NBSP + bracket spacing bhi normalize — "DK(3 PCS)" aur "DK (3 PCS)" ek jaise ho jaate hain,
 * "(5PCS)" aur "(5 PCS)" bhi. List aur file dono isi se guzarte hain, isliye compare hamesha same base par. */
function imsNorm(s){
return String(s==null?"":s).replace(/\u00A0/g," ").trim().toUpperCase()
.replace(/\s*\(\s*/g," (").replace(/\s*\)/g,")")
.replace(/\((\d+)\s*PCS?\.?\)/g,"($1 PCS)")
.replace(/\s+/g," ").trim();
}
/* Busy ke item naam mein operators trailing junk daal dete hain — "75 PCS", "BNO 608",
 * batch "250610/18/06/2025", leading "TILE " — fallback match ke liye safai */
function imsCleanItem(s){
let n=imsNorm(s);
n=n.replace(/^TILE\s+/,"");
// v24.3: BNO ke sab variants — "BNO 608", "BNO. 250910", "B NO 975 , 30/7/2025", "B.NO", "BTNO 22/5/26", "BATCH NOT CONFIRMED"
n=n.replace(/\s+B\.?\s*T?\s*NO\.?(\s+.*)?$/,"");
n=n.replace(/\s+BATCH(\s+.*)?$/,"");
// v24.3: trailing date narration — "... 30/06/2026 ,BNO 165", "... 16/5/26 , 05-16-A" (teeno hisse zaroori, isliye "1/2" jaise size safe)
n=n.replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*([,\/].*)?$/,"");
n=n.replace(/\s+\d{6}\s*([\/,].*)?$/,"");
n=n.replace(/(\s+\d+\s*PCS?\.?)+$/,""); // v20.1: "30 PCS"/"1PC"/"3 PCS 30 PCS" sab
n=n.replace(/\s+B\.?\s*T?\s*NO\.?(\s+.*)?$/,""); // qty-suffix hatne ke baad phir se (order: "X 30 PCS BNO. 1" jaisa)
return n.replace(/\s+/g," ").trim();
}
/* v24.3: LAST-RESORT prefix match — Busy operators item ke aage manmani narration likh dete hain
 * (batch codes "F-16-02", "SAMPLE", "DIRECT FROM JINDAL"...) jo kisi regex se cover nahi hoti.
 * Rule: cleaned file-name Item List ke kisi naam se SHURU ho, word-boundary par (agla char space/bracket),
 * list-naam >=6 chars, aur sabse LAMBA match jeete. Exact/clean/pack matches pehle hi try ho chuke hote hain,
 * isliye "DYNA P4" vs "DYNA P4 (3 PCS)" jaise pack-pairs par ye kabhi nahi chalta. */
function imsPrefixHit(c,imap){
if(!c) return null;
let best=null;
for(const ln in imap){
if(ln.length>=6 && c.length>ln.length && c.lastIndexOf(ln,0)===0){
const ch=c.charAt(ln.length);
if(ch===" "||ch==="("){ if(!best||ln.length>best.length) best=ln; }
}
}
return best?imap[best]:null;
}
/* Item List ke naam se "(5PCS)"/"(3 PCS)" pack-suffix hata kar secondary index —
 * file mein "2X4 60503" aata hai, list mein "2X4 60503 (3 PCS)" hai */
function imsStripPack(s){ return imsNorm(s).replace(/\(\s*\d+\s*PCS?\.?\s*\)/g," ").replace(/\s+/g," ").trim(); }
function canFillIMS(){ return isAdmin() || String(USER.Role).trim().toUpperCase()==="EA"; }
function vFillIMS(){
if(!canFillIMS()) return `<div class="card empty">Ye module EA / Admin ke liye hai.</div>`;
const t=window._imsType||"";
return `
<div class="card" style="max-width:720px">
<p class="muted" style="font-size:.82rem">Accounting software ka <b>Date Wise Item Details</b> export (.xlsx) upload karo — entries IMS sheet ke <b>In/Out (Manual)</b> tab mein jaayengi. Har item ka SKU code aur category <b>Item List</b> tab se apne aap match hota hai; jo item match nahi hoga wo list mein dikhega (save nahi hoga).</p>
<label>1️⃣ Entry type <span class="req">*</span></label>
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
${Object.keys(IMS_TYPES).map(k=>`<button class="btn ${t===k?'':'ghost'}" onclick="window._imsType='${k}';window._imsParsed=null;render()">${IMS_TYPES[k].ic} ${IMS_TYPES[k].label} <span style="opacity:.75">(${IMS_TYPES[k].inout})</span></button>`).join("")}
</div>
${t?`
<label style="margin-top:1rem">2️⃣ Excel file (.xlsx / .xls)</label>
<input type="file" id="ims-file" accept=".xlsx,.xls" onchange="imsFileChosen(this)">
<div id="ims-prev" style="margin-top:.8rem"></div>`:""}
</div>`;
}
function imsCellDate(v){
if(v instanceof Date && !isNaN(v)){ const y=v.getFullYear(); if(y>2000&&y<2100) return {y:y,m:v.getMonth()+1,d:v.getDate()}; return null; }
if(typeof v==="number" && v>20000 && v<80000 && window.XLSX && XLSX.SSF){ const p=XLSX.SSF.parse_date_code(v); if(p&&p.y>2000&&p.y<2100) return {y:p.y,m:p.m,d:p.d}; }
return null;
}
async function imsFileChosen(inp){
const f=inp.files&&inp.files[0]; if(!f) return;
const tk=window._imsType, T=IMS_TYPES[tk];
if(!T) return toast("Pehle entry type chuno.");
busy(true,"File padh rahe hain…");
try{
await loadSheetJS();
// v20: HAR upload par Item List fresh read — naya item list mein add karke bina refresh kiye
// dobara upload karo to bhi match ho jaata hai (pehle purani cached list se match hota tha)
window._imsItems=await gsRun("readIMSItems");
const buf=await f.arrayBuffer();
const wb=XLSX.read(buf,{type:"array",cellDates:true});
const ws=wb.Sheets[wb.SheetNames[0]];
const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
// report type detect — "From" row ka Col E (ESTIMATE / SALE RETURN / GST PURCHASE)
let detected="";
for(let i=0;i<Math.min(aoa.length,12);i++){
const r=aoa[i]||[];
if(String(r[0]||"").trim().toLowerCase()==="from"){ detected=imsNorm(r[4]); break; }
}
let detKey="";
if(detected.indexOf("RETURN")>-1) detKey="salereturn";
else if(detected.indexOf("PURCHASE")>-1) detKey="purchase";
else if(detected.indexOf("ESTIMATE")>-1||detected.indexOf("SALE")>-1) detKey="sale";
// data rows parse + item-date aggregate (ek item ek din = ek entry, bills ka sum)
const agg={}; let lines=0, dtMin=null, dtMax=null;
for(const r of aoa){
if(!r) continue;
const pd=imsCellDate(r[0]);
if(!pd) continue; // header / page-break / Total rows skip
const item=String(r[5]==null?"":r[5]).trim();
const qty=Number(r[7]);
if(!item||!isFinite(qty)||qty<=0) continue;
const ds=("0"+pd.d).slice(-2)+"/"+("0"+pd.m).slice(-2)+"/"+pd.y;
const key=imsNorm(item)+"|"+ds;
if(!agg[key]) agg[key]={item:item,date:ds,qty:0,ord:pd.y*10000+pd.m*100+pd.d};
agg[key].qty+=qty; lines++;
const dv=agg[key].ord;
if(dtMin===null||dv<dtMin) dtMin=dv;
if(dtMax===null||dv>dtMax) dtMax=dv;
}
const entries=Object.values(agg).sort((a,b)=>a.ord-b.ord||a.item.localeCompare(b.item));
busy(false);
const w=$("ims-prev");
if(!entries.length){ w.innerHTML=`<div class="card" style="border-left:4px solid var(--bad)">⚠ File mein koi entry nahi mili. Check karo ki ye "Date Wise Item Details" export hai (Col A date, Col F item, Col H qty).</div>`; window._imsParsed=null; return; }
// SKU match — Item List se (space-normalized, case-insensitive)
// 1) exact  2) file-name cleaned (PCS/BNO/batch junk hata kar)  3) list ka pack-suffix "(3 PCS)" hata kar (sirf unique par)
const imap={}, pmap={};
(window._imsItems||[]).forEach(r=>{
const nm=imsNorm(r[1]); if(!nm) return;
const o={sku:String(r[0]||"").trim(), cat:String(r[2]||"").trim()};
if(!imap[nm]) imap[nm]=o;
const pk=imsStripPack(r[1]);
if(pk&&pk!==nm){ if(pmap[pk]===undefined) pmap[pk]=o; else pmap[pk]=null; } // duplicate stripped-name → ambiguous, use nahi karna
});
const rows=[], unm={}, fz={}; let unmEntries=0;
entries.forEach(e=>{
// v20: file-side pack-strip bhi last-resort mein — "X (3 PCS) 30 PCS" clean hoke "X (3 PCS)",
// aur agar list mein sirf "X" ho to file ka "(3 PCS)" hata kar bhi try hota hai
const cn=imsCleanItem(e.item), fs=imsStripPack(cn);
let hit=imap[imsNorm(e.item)] || imap[cn] || pmap[imsNorm(e.item)] || pmap[cn] || imap[fs] || pmap[fs] || null;
if(!hit){ hit=imsPrefixHit(cn,imap)||imsPrefixHit(fs,imap); if(hit&&hit.sku&&fz[e.item]===undefined) fz[e.item]=hit; } // v24.3 narration match
const q=Math.round(e.qty*100)/100;
if(hit&&hit.sku) rows.push([hit.sku, T.inout, e.date, q, e.item, hit.cat]);
else { unm[e.item]=(unm[e.item]||0)+q; unmEntries++; }
});
const unmNames=Object.keys(unm).sort();
window._imsParsed={rows:rows};
const fd=n=>{ const s=String(n); return s.slice(6,8)+"/"+s.slice(4,6)+"/"+s.slice(0,4); };
w.innerHTML=`
${detKey&&detKey!==tk?`<div class="card" style="border-left:4px solid var(--bad);padding:.6rem .8rem;margin-bottom:.6rem;font-size:.85rem">⚠ <b>Type mismatch!</b> Aapne <b>${IMS_TYPES[tk].label}</b> chuna hai par file <b>${IMS_TYPES[detKey].label}</b> ki lag rahi hai ("${esc(detected)}"). Save karne se pehle type check kar lo.</div>`:""}
<div class="rowline"><span>File period</span><b>${fd(dtMin)} → ${fd(dtMax)}</b></div>
<div class="rowline"><span>Bill lines padhi</span><b>${lines}</b></div>
<div class="rowline"><span>Entries (item + date wise joda hua)</span><b>${entries.length}</b></div>
<div class="rowline"><span>Item List (abhi fresh load hui)</span><b>${(window._imsItems||[]).length} items</b></div>
<div class="rowline"><span style="color:var(--ok)">✓ SKU match ho gaye</span><b>${rows.length}</b></div>
${Object.keys(fz).length?`<div class="rowline"><span style="color:var(--warn)">✂ Narration hata ke match hue (check kar lo)</span><b>${Object.keys(fz).length} items</b></div>
<div class="card" style="border-left:4px solid var(--warn);padding:.5rem .8rem;margin:.3rem 0;font-size:.75rem;max-height:120px;overflow-y:auto">${Object.keys(fz).sort().map(k=>`<div>${esc(k)} <span class="muted">→ SKU ${esc(fz[k].sku)}</span></div>`).join("")}</div>`:""}
${unmNames.length?`<div class="rowline"><span style="color:var(--bad)">⚠ Match NAHI hue (save nahi honge)</span><b>${unmEntries} entries (${unmNames.length} items)</b></div>
<div class="card" style="border-left:4px solid var(--warn);padding:.6rem .8rem;margin:.4rem 0;font-size:.8rem;max-height:150px;overflow-y:auto">
Ye items IMS ki <b>Item List</b> tab mein nahi mile — wahan add karke dobara upload karna:<br>${unmNames.map(n=>`• ${esc(n)} <span class="muted">(qty ${unm[n]})</span>`).join("<br>")}
</div>`:""}
<div class="tbl-wrap" style="margin-top:.5rem;max-height:240px;overflow-y:auto"><table>
<tr><th>Date</th><th>SKU</th><th>Item</th><th style="text-align:right">Qty</th><th>In/Out</th><th>Category</th></tr>
${rows.slice(0,12).map(r=>`<tr><td>${esc(r[2])}</td><td>${esc(r[0])}</td><td>${esc(r[4])}</td><td style="text-align:right">${esc(r[3])}</td><td><span class="pill ${T.pill}">${esc(r[1])}</span></td><td>${esc(r[5])}</td></tr>`).join("")}
</table></div>
${rows.length>12?`<p class="muted">…aur ${rows.length-12} entries (preview mein pehli 12)</p>`:""}
${rows.length?`<div style="margin-top:1rem"><button class="btn" style="background:var(--ok)" onclick="saveIMSEntries()">✅ Save — ${rows.length} entries In/Out (Manual) mein</button></div>`:""}`;
}catch(e){ busy(false); toast("File read failed: "+e.message); }
}
async function saveIMSEntries(force){
const P=window._imsParsed;
if(!P||!P.rows||!P.rows.length) return toast("Save karne ke liye koi matched entry nahi.");
busy(true,P.rows.length+" entries IMS sheet mein save ho rahi hain…");
try{
const res=await gsRun("appendIMSEntries",[P.rows, USER.Name, !!force]);
busy(false);
if(res&&res.needConfirm){
if(confirm("⚠ "+res.dup+" / "+res.total+" entries (same SKU + date + qty + In/Out) sheet mein PEHLE SE hain — shayad ye file dobara upload ho rahi hai.\n\nFir bhi sab save karein?")) return saveIMSEntries(true);
return;
}
const n=(res&&res.count)||P.rows.length;
window._imsParsed=null; window._imsType="";
render();
toast(n+" entries In/Out (Manual) mein save ho gayi ✓",4000);
}catch(e){ busy(false); toast("Failed: "+e.message,4500); }
}
/* ===== v21: IMS / PURCHASE (Admin + EA) =====
 * Dashboard (bands + 30d/monthly analytics + SF helper) | Reorder → Indent (EA banaye/Admin approve, Admin direct) | Indent approval | Create PO.
 * Saara data ek `readIMSDash` call se aata hai (server-side aggregated) — window._IMSD mein cache, actions ke baad null karke fresh reload. */
const IMS_BANDS={red:["🔴 Critical","p-bad"],yellow:["🟠 Reorder zone","p-warn"],green:["🟢 Healthy","p-ok"],purple:["🟣 Excess","p-blue"],na:["⚪ Max nahi","p-gray"]};
function imsBandOf(c,max){ if(!max) return "na"; const p=c/max*100; return p<=33?"red":p<=66?"yellow":p<=100?"green":"purple"; }
function imsRowsAll(){ const D=window._IMSD; if(!D) return [];
return D.items.map(it=>{ const c=Math.round((D.closing[it.sku]||0)*100)/100, placed=Math.round((D.placed[it.sku]||0)*100)/100;
const sug=Math.max(0,Math.round((it.max-c-placed)*100)/100);
return Object.assign({},it,{closing:c,placed:placed,sug:sug,pct:it.max?Math.round(c/it.max*1000)/10:null,days:(it.adc&&c>0)?Math.round(c/it.adc):null,out30:Math.round((D.out30[it.sku]||0)*100)/100,band:imsBandOf(c,it.max)});});}
function imsCatOpts(sel){ const cats=[...new Set(imsRowsAll().map(r=>r.cat).filter(Boolean))].sort(); return `<option value="">Sab categories</option>`+cats.map(c=>`<option ${sel===c?'selected':''}>${esc(c)}</option>`).join(""); }
function imsMonLbl(m){ const p=m.split("-"); return ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1]]+" "+p[0]; }
/* v21.3: sheet jaisi puri-row highlight — red/yellow/green + violet (excess) */
function imsRowCls(band){ return {red:"row-red",yellow:"row-yellow",green:"row-green",purple:"row-violet"}[band]||""; }
const IMS_VIOLET_CSS=`<style>tr.row-violet td{background:#E2D9F3!important}tr.row-violet td:first-child{box-shadow:inset 4px 0 0 #7E57C2}</style>`;
function canIMSDash(){ return isAdmin() || String(USER.Role).toLowerCase().indexOf("purchase")>-1; }
function vIMSDash(){
if(!canIMSDash()) return `<div class="card empty">Ye module Admin / Purchase Manager ke liye hai.</div>`;
if(!window._IMSD){
busy(true,"IMS data load ho raha hai…");
gsRun("readIMSDash").then(d=>{ window._IMSD=d; busy(false); if(ROUTE==="imsdash") render(); }).catch(e=>{ busy(false); toast("Load failed: "+e.message,4000); });
return `<div class="card empty">IMS data load ho raha hai…</div>`;
}
const tb=window._imsTb||"dash";
const pend=window._IMSD.indents.filter(x=>x.status==="Pending Approval").length;
return `${IMS_VIOLET_CSS}<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
${[["dash","📊 Dashboard"],["reorder","🛒 Reorder"],["ind","🧾 Indents"+(pend?" ("+pend+")":"")],["po","📄 PO"]].map(t=>`<button class="btn ${tb===t[0]?'':'ghost'} small" onclick="window._imsTb='${t[0]}';render()">${t[1]}</button>`).join("")}
<button class="btn ghost small" style="margin-left:auto" onclick="window._IMSD=null;render()">⟳ Refresh</button></div>
<p class="muted" style="margin-bottom:.8rem;font-size:.75rem">Data: ${esc(window._IMSD.at)} · ${window._IMSD.items.length} SKUs (Item List)</p>
${tb==="dash"?imsTabDash():tb==="reorder"?imsTabReorder():tb==="ind"?imsTabInd():imsTabPO()}`;
}
function imsTabDash(){
const rows=imsRowsAll();
const cnt={red:0,yellow:0,green:0,purple:0,na:0}; rows.forEach(r=>cnt[r.band]++);
const band=window._imsBand||"", cat=window._imsCat||"", q=(window._imsQ||"").toLowerCase();
let list=rows.filter(r=>(!band||r.band===band)&&(!cat||r.cat===cat)&&(!q||(r.name+" "+r.sku).toLowerCase().includes(q)));
list.sort((a,b)=>(a.pct==null?9999:a.pct)-(b.pct==null?9999:b.pct));
const fast=rows.filter(r=>r.out30>0).sort((a,b)=>b.out30-a.out30).slice(0,10);
const maxOut=fast.length?fast[0].out30:1;
const dead=rows.filter(r=>r.closing>0&&!r.out30).sort((a,b)=>b.closing-a.closing);
const D=window._IMSD;
const monSet={}; Object.keys(D.monthly).forEach(s=>Object.keys(D.monthly[s]).forEach(k=>monSet[k]=1));
const mons=Object.keys(monSet).sort().reverse();
const mon=window._imsMon&&monSet[window._imsMon]?window._imsMon:(mons[0]||"");
const mrows=rows.map(r=>({name:r.name,q:Math.round(((D.monthly[r.sku]||{})[mon]||0)*100)/100})).filter(x=>x.q>0).sort((a,b)=>b.q-a.q);
const mmax=mrows.length?mrows[0].q:1;
const catAgg={}; rows.forEach(r=>{ if(r.out30) catAgg[r.cat||"—"]=(catAgg[r.cat||"—"]||0)+r.out30; });
const catList=Object.keys(catAgg).map(c=>({c:c,q:Math.round(catAgg[c]*100)/100})).sort((a,b)=>b.q-a.q);
const cmax=catList.length?catList[0].q:1;
const sfUp=rows.filter(r=>r.band==="red"&&r.days!=null&&r.lead&&r.days<=r.lead).sort((a,b)=>(a.days==null?0:a.days)-(b.days==null?0:b.days)).slice(0,10);
const sfDn=rows.filter(r=>r.pct!=null&&r.pct>=150).sort((a,b)=>b.pct-a.pct).slice(0,10);
const bar=(v,mx,col)=>`<div style="background:var(--sky);border-radius:4px;height:8px"><div style="width:${Math.max(2,Math.round(v/mx*100))}%;background:${col};height:8px;border-radius:4px"></div></div>`;
return `
<div class="grid g4" style="margin-bottom:1rem">
${[["red","bad"],["yellow","warn"],["green","ok"],["purple",""]].map(bc=>`<div class="card stat ${bc[1]}" style="cursor:pointer;padding:.8rem 1rem;${band===bc[0]?'outline:2.5px solid var(--blue);':''}" onclick="window._imsBand=window._imsBand==='${bc[0]}'?'':'${bc[0]}';render()"><div class="v">${cnt[bc[0]]}</div><div class="l">${IMS_BANDS[bc[0]][0]}</div></div>`).join("")}
</div>
<div class="toolbar"><select onchange="window._imsCat=this.value;render()">${imsCatOpts(cat)}</select>
<input placeholder="🔍 Item dhundo…" value="${esc(window._imsQ||"")}" onchange="window._imsQ=this.value;render()">
${band?`<span class="pill ${IMS_BANDS[band][1]}">${IMS_BANDS[band][0]} — hatane ke liye card dobara dabao</span>`:""}</div>
<div class="tbl-wrap" style="max-height:340px;overflow-y:auto"><table>
<tr><th>Item</th><th>Category</th><th style="text-align:right">Closing</th><th style="text-align:right">Max</th><th style="text-align:right">Avail%</th><th style="text-align:right">Din bache</th><th style="text-align:right">30d Out</th></tr>
${list.slice(0,120).map(r=>`<tr class="${imsRowCls(r.band)}"><td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.sku)}</span></td><td>${esc(r.cat)}</td><td style="text-align:right"><b>${r.closing}</b></td><td style="text-align:right">${r.max||"—"}</td><td style="text-align:right"><span class="pill ${IMS_BANDS[r.band][1]}">${r.pct==null?"—":r.pct+"%"}</span></td><td style="text-align:right">${r.days==null?"—":r.days}</td><td style="text-align:right">${r.out30||""}</td></tr>`).join("")}
</table></div>
${list.length>120?`<p class="muted">…aur ${list.length-120} items — filter/search use karo</p>`:""}
<div class="grid g2" style="margin-top:1rem">
<div class="card"><h3 style="margin-bottom:.6rem">⚡ Sabse zyada bike — last 30 din</h3>
${fast.map(r=>`<div style="margin-bottom:.45rem"><div style="display:flex;justify-content:space-between;font-size:.82rem;gap:.5rem"><span>${esc(r.name)}</span><b>${r.out30}</b></div>${bar(r.out30,maxOut,"var(--blue)")}</div>`).join("")||`<div class="empty">30 din mein koi Out entry nahi</div>`}</div>
<div class="card"><h3 style="margin-bottom:.6rem">🐢 30 din mein bilkul nahi bike — ${dead.length} items</h3>
${dead.slice(0,10).map(r=>`<div class="rowline"><span>${esc(r.name)} <span class="muted">· ${esc(r.cat)}</span></span><b>${r.closing}</b></div>`).join("")||`<div class="empty">Sab kuch chal raha hai 👍</div>`}
${dead.length>10?`<p class="muted" style="margin-top:.4rem">…aur ${dead.length-10} (stock qty ke hisaab se sorted)</p>`:""}</div>
</div>
<div class="grid g2" style="margin-top:1rem">
<div class="card"><h3 style="margin-bottom:.6rem">📅 Month-by-month <select style="width:auto;margin-left:.4rem;font-size:.8rem;padding:.3rem" onchange="window._imsMon=this.value;render()">${mons.map(m=>`<option value="${m}" ${m===mon?'selected':''}>${imsMonLbl(m)}</option>`).join("")}</select></h3>
${mrows.slice(0,10).map(r=>`<div style="margin-bottom:.45rem"><div style="display:flex;justify-content:space-between;font-size:.82rem;gap:.5rem"><span>${esc(r.name)}</span><b>${r.q}</b></div>${bar(r.q,mmax,"var(--navy)")}</div>`).join("")||`<div class="empty">Is month koi Out nahi</div>`}</div>
<div class="card"><h3 style="margin-bottom:.6rem">🏷 Category-wise Out — last 30 din</h3>
${catList.map(x=>`<div style="margin-bottom:.45rem"><div style="display:flex;justify-content:space-between;font-size:.82rem"><span>${esc(x.c)}</span><b>${x.q}</b></div>${bar(x.q,cmax,"#5C8FD6")}</div>`).join("")||`<div class="empty">Data nahi</div>`}</div>
</div>
<div class="card" style="margin-top:1rem;border-left:4px solid var(--warn)"><h3 style="margin-bottom:.6rem">🎛 Safety Factor helper — 15 din wala kaam</h3>
<div class="grid g2">
<div><b style="font-size:.85rem">⬆ SF badhao — lead time se pehle khatam ho jayega:</b>
${sfUp.map(r=>`<div class="rowline"><span>${esc(r.name)}<br><span class="muted">${r.days} din bacha · lead ${r.lead} din · SF abhi ${r.sf}</span></span><span class="pill p-bad">${r.pct}%</span></div>`).join("")||`<p class="muted" style="margin-top:.4rem">Abhi koi nahi 👍</p>`}</div>
<div><b style="font-size:.85rem">⬇ Max/SF ghatao — bahut zyada stock pada hai:</b>
${sfDn.map(r=>`<div class="rowline"><span>${esc(r.name)}<br><span class="muted">closing ${r.closing} vs max ${r.max} · SF ${r.sf}</span></span><span class="pill p-blue">${r.pct}%</span></div>`).join("")||`<p class="muted" style="margin-top:.4rem">Abhi koi nahi 👍</p>`}</div>
</div><p class="muted" style="margin-top:.5rem">Badlav IMS sheet ki <b>Item List</b> tab mein manually karo (Safety Factor column) — Max Level khud adjust ho jayega.</p></div>
${isAdmin()?`<div class="card" style="margin-top:1rem"><h3>⚙ ADC update</h3><p class="muted" style="margin:.3rem 0 .5rem">Average Daily Consumption last N din ki sales se recalc karke Item List mein likhega (0 = poora data). Mahine mein ek baar kaafi hai.</p><div style="display:flex;gap:.5rem;max-width:320px"><input id="ims-adc-days" type="number" value="30" min="0" max="365"><button class="btn" onclick="imsADC()">Update ADC</button></div></div>`:""}`;
}
function imsTabReorder(){
const rows=imsRowsAll();
const cat=window._imsRCat||"", q=(window._imsRQ||"").toLowerCase(), all=!!window._imsRAll;
let list=rows.filter(r=>(all||r.sug>0)&&(!cat||r.cat===cat)&&(!q||(r.name+" "+r.sku).toLowerCase().includes(q)));
list.sort((a,b)=>(a.pct==null?9999:a.pct)-(b.pct==null?9999:b.pct));
return `<div class="toolbar">
<select onchange="window._imsRCat=this.value;render()">${imsCatOpts(cat)}</select>
<input placeholder="🔍 Item…" value="${esc(window._imsRQ||"")}" onchange="window._imsRQ=this.value;render()">
<label class="rad"><input type="checkbox" ${all?'checked':''} onchange="window._imsRAll=this.checked;render()" style="width:auto"> Sab items dikhao</label></div>
<p class="muted" style="font-size:.78rem;margin-bottom:.5rem">Suggested qty = Max Level − Closing − Already Placed (indent jo factory mein hai). Qty edit kar sakte ho. ${isAdmin()?"Admin ka indent seedha final hota hai.":"Aapka indent Admin approval ke baad final hoga."}</p>
<div class="tbl-wrap" style="max-height:420px;overflow-y:auto"><table>
<tr><th></th><th>Item</th><th>Category</th><th style="text-align:right">Closing</th><th style="text-align:right">Max</th><th style="text-align:right">Placed</th><th style="text-align:right">MOQ</th><th style="width:95px">Qty</th></tr>
${list.slice(0,150).map((r,i)=>`<tr class="${imsRowCls(r.band)}">
<td><input type="checkbox" class="imsck" data-sku="${esc(r.sku)}" data-i="${i}" onchange="imsSelTgl()" style="width:auto"></td>
<td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.sku)} · <span class="pill ${IMS_BANDS[r.band][1]}" style="font-size:.62rem">${r.pct==null?"—":r.pct+"%"}</span> ${r.days!=null?`· ${r.days} din`:""}</span></td>
<td>${esc(r.cat)}</td><td style="text-align:right">${r.closing}</td><td style="text-align:right">${r.max||"—"}</td><td style="text-align:right">${r.placed||""}</td><td style="text-align:right">${r.moq||""}</td>
<td><input type="number" id="ims-q-${i}" value="${r.sug||r.moq||""}" min="0" step="any" style="padding:.35rem .4rem"></td></tr>`).join("")}
</table></div>
${list.length>150?`<p class="muted">…aur ${list.length-150} — filter use karo</p>`:""}
<div style="margin-top:1rem"><button class="btn" style="background:var(--ok)" id="ims-ci-btn" onclick="imsCreateIndentUI()">🧾 Create Indent (0 items)</button></div>`;
}
function imsSelTgl(){ const n=document.querySelectorAll(".imsck:checked").length; const b=document.getElementById("ims-ci-btn"); if(b) b.textContent=`🧾 Create Indent (${n} items)`; }
async function imsCreateIndentUI(){
const cks=[...document.querySelectorAll(".imsck:checked")];
if(!cks.length) return toast("Pehle items select karo (checkbox).");
const items=[];
for(const ck of cks){
const sku=ck.getAttribute("data-sku"), inp=document.getElementById("ims-q-"+ck.getAttribute("data-i"));
const q=Number(inp&&inp.value);
if(!isFinite(q)||q<=0) return toast("Qty check karo: "+sku);
items.push({sku:sku,qty:q});
}
if(!confirm(items.length+" item ka indent "+(isAdmin()?"ban jayega (final — Placed to Factory).":"Admin approval ke liye jayega.")+" Theek hai?")) return;
busy(true,"Indent ban raha hai…");
try{
const res=await gsRun("imsCreateIndent",[items,USER.Name]);
busy(false); window._IMSD=null; window._imsTb="ind";
toast(res.ids.length+" indent bane ("+res.ids[0]+(res.ids.length>1?" se "+res.ids[res.ids.length-1]:"")+") — "+(res.status==="Placed to Factory"?"final ✓":"Admin approval pending ⏳"),5000);
render();
}catch(e){ busy(false); toast("Failed: "+e.message,4500); }
}
function imsTabInd(){
const D=window._IMSD, list=[...D.indents].reverse();
const pend=list.filter(x=>x.status==="Pending Approval");
window._imsPendInds=pend.map(p=>p.ind);
return `${isAdmin()&&pend.length?`<div class="card" style="border-left:4px solid var(--warn);padding:.7rem .9rem;margin-bottom:.8rem;display:flex;align-items:center;gap:.8rem;flex-wrap:wrap"><b>⏳ ${pend.length} indent approval pending</b><button class="btn small" style="background:var(--ok)" onclick="imsIndentAction(window._imsPendInds,'Placed to Factory')">✔ Sab approve</button></div>`:""}
<div class="tbl-wrap" style="max-height:480px;overflow-y:auto"><table>
<tr><th>Indent</th><th>Item</th><th style="text-align:right">Qty</th><th>Status</th><th>PO</th><th>Action</th></tr>
${list.map(x=>{
const pill=x.status==="Pending Approval"?"p-warn":x.status==="Placed to Factory"?"p-blue":x.status==="Reached Warehouse"?"p-ok":x.status==="Rejected"?"p-bad":"p-gray";
let act="";
if(x.status==="Pending Approval"&&isAdmin()) act=`<button class="btn small" style="background:var(--ok)" onclick="imsIndentAction(['${esc(x.ind)}'],'Placed to Factory')">✔</button> <button class="btn small danger" onclick="imsIndentAction(['${esc(x.ind)}'],'Rejected')">✖</button>`;
else if(x.status==="Placed to Factory") act=`<button class="btn small ghost" onclick="imsIndentAction(['${esc(x.ind)}'],'Reached Warehouse')">📦 Aa gaya</button>`;
return `<tr><td><b>${esc(x.ind)}</b><br><span class="muted">${esc(x.ts)}</span></td><td>${esc(x.name)}<br><span class="muted">${esc(x.cat)}</span></td><td style="text-align:right">${x.qty}</td><td><span class="pill ${pill}">${esc(x.status||"—")}</span></td><td>${esc(x.po)}</td><td style="white-space:nowrap">${act}</td></tr>`;
}).join("")||`<tr><td colspan="6" class="empty">Koi indent nahi</td></tr>`}
</table></div>`;
}
async function imsIndentAction(inds,status){
const label=status==="Placed to Factory"?"APPROVE":status==="Rejected"?"REJECT":"'maal aa gaya' mark";
if(!confirm(inds.length+" indent "+label+" karein?")) return;
busy(true,"Update ho raha hai…");
try{ await gsRun("imsSetIndentStatus",[inds,status,USER.Name]); busy(false); window._IMSD=null; toast("Ho gaya ✓"); render(); }
catch(e){ busy(false); toast("Failed: "+e.message,4500); }
}
function imsTabPO(){
const D=window._IMSD;
const pending=D.indents.filter(x=>x.status==="Placed to Factory"&&!x.po);
const g={}; pending.forEach(p=>{ const c=(p.cat||"OTHER").toUpperCase(); (g[c]=g[c]||[]).push(p); });
const cats=Object.keys(g).sort();
return `<div class="card" style="margin-bottom:1rem"><h3 style="margin-bottom:.5rem">PO ke liye taiyaar — approved indents (bina PO)</h3>
${cats.length?cats.map(c=>`<div class="rowline"><span><b>${esc(c)}</b> — ${g[c].length} item${g[c].length>1?"s":""}<br><span class="muted">${g[c].slice(0,4).map(x=>esc(x.name)).join(", ")}${g[c].length>4?" …":""}</span></span><span class="pill p-blue">1 PO</span></div>`).join(""):`<div class="empty">Kuch pending nahi — pehle Indents tab mein approve karo</div>`}
${cats.length?`<div style="margin-top:.8rem"><button class="btn" style="background:var(--ok)" onclick="imsCreatePOUI(${cats.length})">📄 Create PO — ${cats.length} PO banenge (category-wise)</button></div>`:""}</div>
<div class="card"><h3 style="margin-bottom:.5rem">Recent POs — click karke detail + WhatsApp</h3>
${[...D.pos].reverse().map(p=>`<div class="rowline" style="cursor:pointer" onclick="imsPOView('${esc(p.po)}')"><span><b>${esc(p.po)}</b> · ${esc(p.cat)} <span class="muted">(${(p.items||[]).length} items)</span></span><span class="muted">${esc(p.on)} · 👁 📱</span></div>`).join("")||`<div class="empty">Abhi koi PO nahi</div>`}</div>`;
}
function imsPOView(po){
const p=(window._IMSD&&window._IMSD.pos||[]).find(x=>x.po===po);
if(!p) return toast("PO nahi mila — refresh karke dekho");
openModal("📄 "+p.po+" — "+p.cat,`
<div class="rowline"><span>Date</span><b>${esc(p.on)}</b></div>
<div class="rowline"><span>Company (Category)</span><b>${esc(p.cat)}</b></div>
<div class="rowline"><span>Dealer</span><b>BANSAL</b></div>
<div class="tbl-wrap" style="margin-top:.6rem;max-height:260px;overflow-y:auto"><table>
<tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th></tr>
${(p.items||[]).map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.name)}</td><td style="text-align:right"><b>${esc(it.qty)}</b></td></tr>`).join("")}
</table></div>
<label>Remarks (optional — WhatsApp message mein jayega)</label>
<textarea id="ims-po-rem" rows="2" placeholder="jaise: urgent dispatch chahiye"></textarea>
<div style="margin-top:.9rem;display:flex;gap:.5rem;flex-wrap:wrap">
<button class="btn" style="background:#25D366" onclick="imsPOWa('${esc(p.po)}')">📱 Send via WhatsApp</button>
<button class="btn ghost" onclick="imsPOCopy('${esc(p.po)}')">📋 Message copy karo</button>
</div>`);
}
function imsPOMsg(po){
const p=(window._IMSD&&window._IMSD.pos||[]).find(x=>x.po===po);
if(!p) return "";
const rem=(document.getElementById("ims-po-rem")&&document.getElementById("ims-po-rem").value.trim())||"";
const items=(p.items||[]).map((it,i)=>(i+1)+". "+it.name+" — "+it.qty).join("\n");
return `Dear Sir/Mam
Greetings from Bansal Sales Corporation, Ludhiana (Punjab)!!!
Purchase Order Details: *${p.po}* (${p.on})
-------------------------
*Company Name:* ${p.cat}
Dealer Name:
BANSAL
*Order Details as follows:*
-------------------------
${items}
-------------------------
*Remarks:*
${rem||"—"}
-------------------------
-------------------------
Kindly confirm receipt of this purchase order and share the expected delivery timeline.
Warm regards,
Bansal Sales Corporation, Ludhiana
📞 8146270114
✉️ pulkit.bansal@bscinterio.com`;
}
function imsPOWa(po){
const msg=imsPOMsg(po);
if(!msg) return;
window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}
function imsPOCopy(po){
const msg=imsPOMsg(po);
if(!msg) return;
try{ navigator.clipboard.writeText(msg); toast("Message copy ho gaya ✓"); }
catch(e){ prompt("Copy karo:", msg); }
}
async function imsCreatePOUI(n){
if(!confirm(n+" PO banenge (har category ka ek). Proceed?")) return;
busy(true,"PO ban rahe hain…");
try{
const res=await gsRun("imsCreatePO",[USER.Name]);
busy(false); window._IMSD=null;
toast(res.pos.length+" PO bane ✓ "+res.pos.map(p=>p.po+" ("+p.cat+")").join(", ")+" — neeche list mein click karke WhatsApp bhejo",6500);
render();
}catch(e){ busy(false); toast("Failed: "+e.message,4500); }
}
async function imsADC(){
const d=Number(document.getElementById("ims-adc-days").value);
if(!isFinite(d)||d<0||d>365) return toast("Days 0-365 mein do (0 = poora data)");
if(!confirm("ADC "+(d?("last "+d+" din"):"poore data")+" ki sales se recalc hoke Item List mein likhega. Theek?")) return;
busy(true,"ADC update ho raha hai…");
try{ const r=await gsRun("imsUpdateADC",[d,USER.Name]); busy(false); window._IMSD=null; toast("ADC updated — "+r.days+" din ke data se ✓",4500); render(); }
catch(e){ busy(false); toast("Failed: "+e.message,4500); }
}
/* ===== v21.4: ZIVA INBOX (Admin) =====
 * Bot ERP sheet ke ZivaChats tab mein har chat log karta hai — yahan conversations + thread + reply.
 * Reply zivaSend se seedha WhatsApp API par jata hai (ERP Script Properties: WA_TOKEN + WA_PHONE_ID chahiye). */
function zivaMsgs(){
const rows=window._ZIVA||[];
return rows.map(r=>({t:String(r[0]||""),phone:String(r[1]||""),name:String(r[2]||""),dir:String(r[3]||""),type:String(r[4]||""),text:String(r[5]||"")})).filter(m=>m.phone);
}
function zivaConvs(){
const by={};
zivaMsgs().forEach(m=>{
if(!by[m.phone]) by[m.phone]={phone:m.phone,name:"",msgs:[]};
by[m.phone].msgs.push(m);
if(m.dir==="in"&&m.name&&m.name!=="Unknown") by[m.phone].name=m.name;
});
return Object.values(by).sort((a,b)=>{const la=a.msgs[a.msgs.length-1].t,lb=b.msgs[b.msgs.length-1].t;return la<lb?1:-1;});
}
function vZivaInbox(){
if(!isAdmin()) return `<div class="card empty">Ziva Inbox sirf Admin ke liye hai.</div>`;
if(!window._ZIVA){
busy(true,"Chats load ho rahi hain…");
gsRun("readZivaChats").then(d=>{ window._ZIVA=d||[]; busy(false); if(ROUTE==="zivainbox") render(); }).catch(e=>{ busy(false); toast("Load failed: "+e.message,4000); });
return `<div class="card empty">💬 Ziva ki chats load ho rahi hain…</div>`;
}
const sel=window._zvSel;
const convs=zivaConvs();
if(!sel){
return `<div class="toolbar"><b>💬 ${convs.length} conversations</b><button class="btn ghost small" style="margin-left:auto" onclick="window._ZIVA=null;render()">⟳ Refresh</button></div>
${convs.length?convs.map(c=>{
const last=c.msgs[c.msgs.length-1];
return `<div class="card" style="margin-bottom:.5rem;cursor:pointer;padding:.7rem .9rem" onclick="window._zvSel='${esc(c.phone)}';render()">
<div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center">
<b>${esc(c.name||c.phone)}</b><span class="muted" style="font-size:.72rem;white-space:nowrap">${esc(last.t.slice(5,16))}</span></div>
<div class="muted" style="font-size:.8rem;margin-top:.15rem">${last.dir==="out"?"↩ Ziva: ":""}${esc(last.text.slice(0,70))}${last.text.length>70?"…":""}</div>
<div class="muted" style="font-size:.68rem">📞 ${esc(c.phone)} · ${c.msgs.length} msgs</div></div>`;
}).join(""):`<div class="card empty">Abhi koi chat nahi. Bot v5.2 deploy hone ke baad nayi chats yahan aayengi.</div>`}`;
}
const conv=convs.filter(c=>c.phone===sel)[0];
if(!conv){ window._zvSel=""; return vZivaInbox(); }
const msgs=conv.msgs.slice(-200);
setTimeout(function(){ var t=document.getElementById("zv-thread"); if(t) t.scrollTop=t.scrollHeight; },80); // render ke baad neeche scroll
return `<div class="toolbar"><button class="btn ghost small" onclick="window._zvSel='';render()">← Sab chats</button>
<b>${esc(conv.name||conv.phone)}</b><span class="muted">📞 ${esc(conv.phone)}</span>
<button class="btn ghost small" style="margin-left:auto" onclick="window._ZIVA=null;render()">⟳</button></div>
<div class="card" style="max-height:56vh;overflow-y:auto;background:#EDF2F9" id="zv-thread">
${msgs.map(m=>{
const out=m.dir==="out";
return `<div style="display:flex;${out?"justify-content:flex-end":""};margin-bottom:.45rem">
<div style="max-width:78%;padding:.5rem .7rem;border-radius:${out?"12px 12px 2px 12px":"12px 12px 12px 2px"};background:${out?"#D7E8FF":"#fff"};border:1px solid var(--line);font-size:.86rem;white-space:pre-wrap;word-break:break-word">${esc(m.text)}<div class="muted" style="font-size:.62rem;margin-top:.2rem;text-align:right">${esc(m.t.slice(5,16))}${out&&m.name?" · "+esc(m.name):""}</div></div></div>`;
}).join("")}
</div>
<div style="display:flex;gap:.5rem;margin-top:.7rem">
<input id="zv-msg" placeholder="Reply likho… (Enter se send)" onkeydown="if(event.key==='Enter')zivaReply()" style="flex:1">
<button class="btn" onclick="zivaReply()">📤 Send</button></div>
<p class="muted" style="font-size:.72rem;margin-top:.4rem">Reply tabhi deliver hota hai jab samne wale ne pichhle 24 ghante mein Ziva ko message kiya ho (WhatsApp ka rule).</p>`;
}
async function zivaReply(){
const inp=document.getElementById("zv-msg");
const txt=(inp&&inp.value||"").trim();
if(!txt) return toast("Message likho pehle.");
const phone=window._zvSel;
busy(true,"Bhej rahe hain…");
try{
await gsRun("zivaSend",[phone, txt, USER.Name]);
busy(false);
(window._ZIVA=window._ZIVA||[]).push([nowStr(), phone, USER.Name+" (ERP)", "out", "text", txt]);
render();
toast("Bhej diya ✓");
}catch(e){ busy(false); toast("Failed: "+e.message,5000); }
}
const B2B_COLS=["VisitID","Date","DealerName","MA","PlanComments","Status","Review","NextAction","NextFollowupDate","HelpRequired","Reason","DoneAt","CreatedBy","CreatedAt"];
async function loadB2B(force){
if(window._B2B && !force) return;
busy(true,force?"Sheet se fresh data…":"Loading marketing schedule…");
try{ window._B2B = await gsRun("readB2B"); window._B2BAt=nowStr(); if(force) toast("⟳ Reloaded — "+Math.max(0,((window._B2B.sampling||[]).length-1))+" sampling rows · "+window._B2BAt.slice(11,16)); }
finally{ busy(false); }
}
function visitRows(){
const m=(window._B2B&&window._B2B.visits)||[];
const out=[];
for(let i=1;i<m.length;i++){
const r=m[i]; if(!r || !String(r[0]||"").trim()) continue;
const o={_row:i+1}; B2B_COLS.forEach((c,j)=>o[c]=r[j]!==undefined?r[j]:"");
o.Date=String(o.Date).slice(0,10);
out.push(o);
}
return out;
}
function nextVisitId(){
let mx=0;
visitRows().forEach(v=>{ const m=String(v.VisitID).match(/^V(\d+)$/); if(m) mx=Math.max(mx,parseInt(m[1],10)); });
return "V"+String(mx+1).padStart(4,"0");
}
async function appendVisit(obj){
const row=B2B_COLS.map(c=>obj[c]!==undefined?obj[c]:"");
const res=await gsRun("appendB2B",["Visits", row]);
if(res&&res.id) obj.VisitID=res.id;
window._B2B.visits.push(B2B_COLS.map(c=>obj[c]!==undefined?obj[c]:""));
return obj;
}
async function updateVisit(v, changes){
const idx={}; Object.keys(changes).forEach(k=>{ const j=B2B_COLS.indexOf(k); if(j>-1) idx[j]=changes[k]; });
await gsRun("updateB2B",["Visits", v.VisitID, idx]);
const m=window._B2B.visits;
for(let i=1;i<m.length;i++){ if(String(m[i][0])===String(v.VisitID)){ Object.keys(idx).forEach(j=>m[i][j]=idx[j]); break; } }
}
function dayName(d){ try{ return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(d+"T00:00:00").getDay()]; }catch(e){ return ""; } }
function maUsers(){ return (DB.Users||[]).filter(u=>u.Status!=="Inactive" && String(u.Role).toLowerCase().indexOf("marketing")>-1); }
function dealerNames(){
const s=new Set();
b2bDealers().forEach(n=>s.add(n));
visitRows().forEach(v=>{ const n=String(v.DealerName).trim(); if(n) s.add(n); });
sampRows().forEach(v=>{ const n=String(v.DealerName).trim(); if(n) s.add(n); });
return [...s].sort((a,b)=>a.localeCompare(b));
}
function isMktAdmin(){ return isAdmin(); }
function vMarketing(){
if(!window._B2B){
loadB2B().then(()=>{ if(ROUTE==="marketing") render(); }).catch(e=>toast("Could not load schedule: "+e.message));
return `<div class="card empty">Loading marketing schedule…</div>`;
}
if((window._mvMode||"day")==="week") return vMarketingWeek();
const d=window._mvD||todayStr();
const fma=window._mvMA||"all";
let rows=visitRows().filter(v=>v.Date===d);
if(!isMktAdmin()) rows=rows.filter(v=>String(v.MA)===USER.Name);
else if(fma!=="all") rows=rows.filter(v=>String(v.MA)===fma);
rows.sort((a,b)=>a.Status==="Planned"&&b.Status!=="Planned"?-1:1);
const planned=rows.filter(v=>v.Status==="Planned").length, done=rows.filter(v=>v.Status==="Done").length, miss=rows.filter(v=>v.Status==="Not Visited").length;
return `
<div class="toolbar">
<label style="margin:0">Date</label><input type="date" value="${d}" onchange="window._mvD=this.value;render()" style="max-width:170px">
<span class="pill p-blue">${dayName(d)}</span>
${isMktAdmin()? `<select onchange="window._mvMA=this.value;render()">
<option value="all" ${fma==='all'?'selected':''}>All associates</option>
${maUsers().map(u=>`<option ${fma===u.Name?'selected':''}>${esc(u.Name)}</option>`).join("")}</select>
<button class="btn" onclick="openVisitPlan()">＋ Plan a visit</button>` : `<button class="btn" onclick="openVisitAdhoc()">＋ New visit (outside plan)</button>
<button class="btn dark" onclick="openPlanChoice()">🗓 Create Market Plan</button>`}
<button class="btn ghost" onclick="openAddDealer()">＋ Add Dealer</button>
<button class="btn ghost" onclick="openAllDealers()">👥 All Dealers</button>
<button class="btn ghost small" onclick="window._mvMode='week';render()">📅 Week view</button>
<button class="btn ghost small" onclick="loadB2B(true).then(()=>render())">⟳</button>
</div>
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
<span class="pill p-warn">Planned: ${planned}</span>
<span class="pill p-ok">Done: ${done}</span>
<span class="pill ${miss?'p-bad':'p-gray'}">Not visited: ${miss}</span>
</div>
${rows.length? rows.map(v=>{
const st=v.Status||"Planned";
const bl=st==="Done"?"var(--ok)":st==="Not Visited"?"var(--bad)":"var(--warn)";
return `<div class="card" style="margin-bottom:.7rem;border-left:4px solid ${bl}">
<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center">
<div><b style="font-size:1.02rem">${esc(v.DealerName)}</b>
${isMktAdmin()?`<span class="muted"> · ${esc(v.MA)}</span>`:""}
<span class="pill ${st==='Done'?'p-ok':st==='Not Visited'?'p-bad':'p-warn'}" style="margin-left:.4rem">${esc(st)}</span>
${v.CreatedBy==="auto-followup"?`<span class="pill p-blue">Followup</span>`:""}
</div>
<div style="white-space:nowrap">
${st==="Planned"? `<button class="btn small" onclick="openVisitDone('${v.VisitID}')">✔ Visited</button>
<button class="btn small danger" onclick="openVisitMiss('${v.VisitID}')">✖ Not visited</button>`:""}
<button class="btn small ghost" onclick="openDealerLog('${esc(v.DealerName).replace(/'/g,"\\'")}')">📜 Log</button>
</div>
</div>
${v.PlanComments?`<div class="muted" style="margin-top:.3rem">📝 ${esc(v.PlanComments)}</div>`:""}
${st==="Done"?`<div style="margin-top:.4rem;font-size:.85rem">
<div><b>What the dealer said:</b> ${esc(v.Review)}</div>
${v.NextAction?`<div><b>Next action:</b> ${esc(v.NextAction)}</div>`:""}
${v.NextFollowupDate?`<div><b>Next followup:</b> ${esc(String(v.NextFollowupDate).slice(0,10))}</div>`:""}
${v.HelpRequired?`<div style="color:var(--bad)"><b>⚠ Help needed:</b> ${esc(v.HelpRequired)}</div>`:""}
</div>`:""}
${st==="Not Visited"?`<div style="margin-top:.4rem;font-size:.85rem">
<div><b>Why not visited:</b> ${esc(v.Reason)}</div>
${v.NextFollowupDate?`<div><b>Next followup:</b> ${esc(String(v.NextFollowupDate).slice(0,10))}</div>`:""}
</div>`:""}
</div>`;
}).join("") : `<div class="card empty">${d} (${dayName(d)}) has no visits ${isMktAdmin()?"plan":"aapke naam"} </div>`}`;
}
function openVisitPlan(){
openModal("Plan a visit (Admin)", `
<label>Dealer name <span class="req">*</span></label><input id="mv-dealer" list="mv-dealers" autocomplete="off">
<datalist id="mv-dealers">${dealerNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
<label>Visit date <span class="req">*</span></label><input type="date" id="mv-date" value="${window._mvD||todayStr()}">
<label>Comments</label><textarea id="mv-com" rows="2" placeholder="what to discuss / what to show"></textarea>
<label>Marketing associate <span class="req">*</span></label>
<select id="mv-ma"><option value="">— Select —</option>${maUsers().map(u=>`<option>${esc(u.Name)}</option>`).join("")}</select>
<div style="margin-top:1rem"><button class="btn" onclick="saveVisitPlan()">Save visit plan</button></div>`);
}
async function saveVisitPlan(){
const dl=$("mv-dealer").value.trim(), dt=$("mv-date").value, ma=$("mv-ma").value;
if(!dl||!dt||!ma) return toast("Dealer, date and associate — all three are mandatory.");
busy(true,"Saving plan…");
try{
await appendVisit({VisitID:nextVisitId(),Date:dt,DealerName:dl,MA:ma,PlanComments:$("mv-com").value.trim(),Status:"Planned",CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Visit plan saved ✓ — "+ma+" ko "+dt+" will see it on that date"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openVisitDone(id){
const v=visitRows().find(x=>x.VisitID===id); if(!v) return;
openModal("Visit done — "+v.DealerName, `
<label>Review by dealer <span class="req">*</span> (what the dealer said)</label><textarea id="vd-rev" rows="4"></textarea>
<label>Next action to be taken</label><input id="vd-act" placeholder="e.g. send samples, share rate list">
<label>Next followup date</label><input type="date" id="vd-next">
<label>Any help required?</label><input id="vd-help" placeholder="e.g. senior visit needed, special rate approval">
<div style="margin-top:1rem"><button class="btn" style="background:var(--ok)" onclick="saveVisitDone('${id}')">✅ Save — mark Done</button></div>`);
}
async function saveVisitDone(id){
const v=visitRows().find(x=>x.VisitID===id); if(!v) return;
const rev=$("vd-rev").value.trim(), act=$("vd-act").value.trim(), nx=$("vd-next").value, help=$("vd-help").value.trim();
if(!rev) return toast("Dealer review is mandatory.");
busy(true,"Saving visit…");
try{
await updateVisit(v,{Status:"Done",Review:rev,NextAction:act,NextFollowupDate:nx,HelpRequired:help,DoneAt:nowStr()});
if(nx) await appendVisit({VisitID:nextVisitId(),Date:nx,DealerName:v.DealerName,MA:v.MA,PlanComments:"Followup"+(act?" — "+act:""),Status:"Planned",CreatedBy:"auto-followup",CreatedAt:nowStr()});
busy(false); closeModal(); toast("Visit done ✓"+(nx?" — "+nx+" — a follow-up has been auto-planned":"")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openVisitMiss(id){
const v=visitRows().find(x=>x.VisitID===id); if(!v) return;
openModal("Not visited — "+v.DealerName, `
<label>Why couldn't you visit? <span class="req">*</span></label><textarea id="vm-rsn" rows="3"></textarea>
<label>Next followup date <span class="req">*</span></label><input type="date" id="vm-next">
<div style="margin-top:1rem"><button class="btn danger" onclick="saveVisitMiss('${id}')">Save — Not Visited</button></div>`);
}
async function saveVisitMiss(id){
const v=visitRows().find(x=>x.VisitID===id); if(!v) return;
const rsn=$("vm-rsn").value.trim(), nx=$("vm-next").value;
if(!rsn) return toast("Reason is mandatory — why the visit was missed.");
if(!nx) return toast("Next follow-up date is mandatory.");
busy(true,"Saving…");
try{
await updateVisit(v,{Status:"Not Visited",Reason:rsn,NextFollowupDate:nx});
await appendVisit({VisitID:nextVisitId(),Date:nx,DealerName:v.DealerName,MA:v.MA,PlanComments:"Follow-up (previous visit missed — "+rsn.slice(0,60)+")",Status:"Planned",CreatedBy:"auto-followup",CreatedAt:nowStr()});
busy(false); closeModal(); toast("Saved — "+nx+" — a follow-up has been auto-planned"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openMarketPlan(){
const area=window._mpArea||"all";
const dt=window._mpDate||todayStr();
const dealers=b2bDealerRows();
if(!dealers.length) return toast("DealerList tab is empty — add dealers first.");
const areas=[...new Set(dealers.map(d=>d.Area).filter(Boolean))].sort();
let list=dealers.map(d=>({d:d, due:dealerDueInfo(d)}));
if(area!=="all") list=list.filter(x=>x.d.Area===area);
list.sort((a,b)=>b.due.overdue-a.due.overdue);
const never=list.filter(x=>x.due.never).length;
const od=list.filter(x=>!x.due.never && x.due.overdue>0).length;
openModal("🗓 Create Market Plan — build your own schedule", `
<div class="toolbar" style="margin:0 0 .5rem">
<label style="margin:0">Visit date</label><input type="date" id="mp-date" value="${dt}" onchange="window._mpDate=this.value" style="max-width:160px">
<select onchange="window._mpArea=this.value;openMarketPlan()">
<option value="all" ${area==='all'?'selected':''}>All areas</option>
${areas.map(a=>`<option ${area===a?'selected':''}>${esc(a)}</option>`).join("")}</select>
</div>
<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">
<span class="pill p-bad">Overdue: ${od}</span>
<span class="pill p-warn">Never visited: ${never}</span>
<span class="pill p-gray">A=7 · B=15 · C=30 · D=45 days</span>
</div>
<p class="muted" style="font-size:.78rem;margin:.2rem 0 .5rem">Most overdue dealers are on top — tick them and create the plan. (Fill each dealer's Area/Potential in the DealerList sheet)</p>
<div style="max-height:45vh;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:.4rem">
${list.map((x,i)=>`<label style="display:flex;gap:.5rem;align-items:center;padding:.35rem .3rem;border-bottom:1px dashed var(--line);cursor:pointer">
<input type="checkbox" class="mp-chk" value="${esc(x.d.DealerName)}" style="width:auto">
<span style="flex:1"><b>${esc(x.d.DealerName)}</b>
${x.d.Potential?`<span class="pill ${x.d.Potential==='A'?'p-bad':x.d.Potential==='B'?'p-warn':'p-gray'}" style="margin-left:.3rem">${esc(x.d.Potential)}</span>`:""}
${x.d.Area?`<span class="muted" style="font-size:.75rem"> · ${esc(x.d.Area)}</span>`:""}
<div class="muted" style="font-size:.74rem">${x.due.never? "🆕 Never visited" : "Last visit: "+fmtDate(x.due.last)+" ("+x.due.txt+")"}${(!x.due.never && x.due.overdue>0)? ` · <b style="color:var(--bad)">${x.due.overdue} days OVERDUE</b>`:""}</div>
</span></label>`).join("")}
</div>
<label style="margin-top:.6rem">Comments (applied to all selected visits — optional)</label><input id="mp-com" placeholder="e.g. show the new catalogue">
<div style="margin-top:.8rem"><button class="btn" onclick="saveMarketPlan()">✅ Create plan for selected dealers</button></div>`);
}
async function saveMarketPlan(){
const dt=$("mp-date").value; if(!dt) return toast("Choose a visit date.");
const sel=[...document.querySelectorAll(".mp-chk:checked")].map(c=>c.value);
if(!sel.length) return toast("Tick at least one dealer.");
if(sel.length>15 && !confirm(sel.length+" visits in one day? Sure?")) return;
const com=$("mp-com").value.trim();
busy(true, sel.length+" visits are being planned…");
try{
for(const dl of sel){
await appendVisit({VisitID:nextVisitId(),Date:dt,DealerName:dl,MA:USER.Name,PlanComments:com||"Self-planned",Status:"Planned",CreatedBy:USER.Name+" (self)",CreatedAt:nowStr()});
}
busy(false); closeModal(); window._mvD=dt;
toast(sel.length+" visits planned ✓ — "+dt+" — visible in that day's schedule"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openVisitAdhoc(){
openModal("New visit (outside plan)", `
<label>Dealer name <span class="req">*</span></label><input id="va-dealer" list="va-dealers" autocomplete="off">
<datalist id="va-dealers">${dealerNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
<label>Visit date <span class="req">*</span></label><input type="date" id="va-date" value="${window._mvD||todayStr()}">
<label>Review by dealer <span class="req">*</span></label><textarea id="va-rev" rows="4"></textarea>
<label>Next action to be taken</label><input id="va-act">
<label>Next followup date</label><input type="date" id="va-next">
<label>Any help required?</label><input id="va-help">
<div style="margin-top:1rem"><button class="btn" style="background:var(--ok)" onclick="saveVisitAdhoc()">✅ Save visit</button></div>`);
}
async function saveVisitAdhoc(){
const dl=$("va-dealer").value.trim(), dt=$("va-date").value||todayStr(), rev=$("va-rev").value.trim(), act=$("va-act").value.trim(), nx=$("va-next").value, help=$("va-help").value.trim();
if(!dl) return toast("Enter the dealer name.");
if(!rev) return toast("Dealer review is mandatory.");
busy(true,"Saving visit…");
try{
// v16: visit MA ki chuni hui date par save hota hai — usi date ke page par dikhega
await appendVisit({VisitID:nextVisitId(),Date:dt,DealerName:dl,MA:USER.Name,PlanComments:"(Plan ke bahar — adhoc visit)",Status:"Done",Review:rev,NextAction:act,NextFollowupDate:nx,HelpRequired:help,DoneAt:nowStr(),CreatedBy:USER.Name,CreatedAt:nowStr()});
if(nx) await appendVisit({VisitID:nextVisitId(),Date:nx,DealerName:dl,MA:USER.Name,PlanComments:"Followup"+(act?" — "+act:""),Status:"Planned",CreatedBy:"auto-followup",CreatedAt:nowStr()});
busy(false); closeModal(); window._mvD=dt;
toast("Visit saved ✓ — "+dt+(nx?" — follow-up also planned":"")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/** Dealer ka POORA log — visits + sampling + returns, ek hi timeline mein (latest upar).
 *  fromAll=true → "All Dealers" list se khula hai, back button dikhta hai. */
function openDealerLog(name, fromAll){
const key=String(name).trim().toLowerCase();
const ev=[];
visitRows().forEach(v=>{ if(String(v.DealerName).trim().toLowerCase()===key) ev.push({d:String(v.Date).slice(0,10), k:"v", v:v}); });
sampRows().forEach(s=>{ if(String(s.DealerName).trim().toLowerCase()===key) ev.push({d:String(s.Date).slice(0,10), k:"s", s:s}); });
drRows().forEach(r=>{ if(String(r.DealerName).trim().toLowerCase()===key) ev.push({d:String(r.Date).slice(0,10), k:"r", r:r}); });
ev.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:0);
const nv=ev.filter(e=>e.k==="v").length, ns=ev.filter(e=>e.k==="s").length, nr=ev.filter(e=>e.k==="r").length;
const info=b2bDealerRows().find(d=>d.DealerName.trim().toLowerCase()===key);
openModal("📜 Dealer log — "+name, `
${fromAll?`<button class="btn ghost small" style="margin-bottom:.5rem" onclick="openAllDealers()">← All Dealers</button>`:""}
${info?`<div class="muted" style="margin-bottom:.4rem;font-size:.82rem">
${info.Area?`📍 ${esc(info.Area)} · `:""}${info.Potential?`Potential: <b>${esc(info.Potential)}</b> · `:""}${info.Phone?`📞 ${esc(info.Phone)}`:""}
${info.Notes?`<div>🗒 ${esc(info.Notes)}</div>`:""}</div>`:""}
<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">
<span class="pill p-blue">🧳 Visits: ${nv}</span>
<span class="pill p-warn">🧪 Sampling: ${ns}</span>
<span class="pill p-gray">↩ Returns: ${nr}</span>
</div>
<div class="hist">${ev.map(e=>{
if(e.k==="v"){ const v=e.v; return `<div class="h-item">
<b>${esc(v.Date)}</b> <span class="muted">(${dayName(v.Date)})</span> <span class="pill p-blue">🧳 Visit</span>
<span class="pill ${v.Status==='Done'?'p-ok':v.Status==='Not Visited'?'p-bad':'p-warn'}">${esc(v.Status)}</span>
<span class="muted">· ${esc(v.MA)}</span>
${v.PlanComments?`<div class="muted">📝 ${esc(v.PlanComments)}</div>`:""}
${v.Review?`<div><b>Review:</b> ${esc(v.Review)}</div>`:""}
${v.NextAction?`<div><b>Next action:</b> ${esc(v.NextAction)}</div>`:""}
${v.Reason?`<div><b>Not visited because:</b> ${esc(v.Reason)}</div>`:""}
${v.HelpRequired?`<div style="color:var(--bad)"><b>Help:</b> ${esc(v.HelpRequired)}</div>`:""}
${v.NextFollowupDate?`<div class="muted">Next followup: ${esc(String(v.NextFollowupDate).slice(0,10))}</div>`:""}
</div>`; }
if(e.k==="s"){ const s=e.s; const it=sampSheetItems(s); return `<div class="h-item">
<b>${esc(e.d)}</b> <span class="pill p-warn">🧪 Sampling</span> ${sampStPill(s.Status)}
<span class="muted">· ${esc(s.SampID)} · ${esc(s.MA)}</span>
<div style="font-size:.86rem"><b>Samples:</b> ${esc(s.SamplesList)}</div>
<div class="muted" style="font-size:.8rem">Discount: ${esc(s.Charges)}% · ${esc(s.Mode)}${it.length?` · 📋 Sheet: ${it.length} designs, ${it.reduce((t,x)=>t+(num(x.q)||1),0)} pcs`:""}</div>
${s.DispatchedAt?`<div class="muted" style="font-size:.8rem">🏁 ${s.Mode==="Self pick"?"Handed over":"Dispatched"}: ${esc(String(s.DispatchedAt).slice(0,10))}</div>`:""}
</div>`; }
const r=e.r; return `<div class="h-item">
<b>${esc(e.d)}</b> <span class="pill p-gray">↩ Return</span> <span class="muted">· ${esc(r.DRID)} · by ${esc(r.PostedBy)}</span>
<div style="font-size:.86rem">${esc(r.ItemsList)}</div>
${r.Comments?`<div class="muted" style="font-size:.8rem">💬 ${esc(r.Comments)}</div>`:""}
</div>`;
}).join("") || "<div class='muted'>No records for this dealer.</div>"}</div>`);
}
/** ALL DEALERS — poori list, search ke saath; kisi bhi dealer pe click = uska poora log */
function openAllDealers(){
window._adQ="";
openModal("👥 All Dealers", `
<input id="ad-q" placeholder="🔍 Dealer ka naam ya area type karo…" autocomplete="off" oninput="window._adQ=this.value;renderAllDealers()">
<div id="ad-list" style="margin-top:.6rem;max-height:62vh;overflow-y:auto"></div>`);
renderAllDealers();
setTimeout(()=>{ const q=$("ad-q"); if(q) q.focus(); },50);
}
function renderAllDealers(){
const w=$("ad-list"); if(!w) return;
const q=String(window._adQ||"").trim().toLowerCase();
const master=b2bDealerRows();
const known=new Set(master.map(d=>d.DealerName.trim().toLowerCase()));
const list=master.slice();
// DealerList ke bahar wale dealers bhi (jinke visits/sampling records hain)
dealerNames().forEach(n=>{ if(!known.has(String(n).trim().toLowerCase())) list.push({DealerName:n, Area:"", Potential:"", Phone:"", Notes:""}); });
let show=list;
if(q) show=list.filter(d=>d.DealerName.toLowerCase().indexOf(q)>-1 || d.Area.toLowerCase().indexOf(q)>-1);
w.innerHTML = `<div class="muted" style="font-size:.78rem;margin-bottom:.4rem">${show.length} dealers${q?` (filtered from ${list.length})`:""} — dealer pe click karo, uska poora log khulega</div>` +
(show.length? show.map(d=>{
const due=dealerDueInfo(d);
return `<div onclick="openDealerLog('${esc(d.DealerName).replace(/'/g,"\\'")}',true)" style="display:flex;gap:.5rem;align-items:center;padding:.5rem .4rem;border-bottom:1px dashed var(--line);cursor:pointer">
<span style="flex:1"><b>${esc(d.DealerName)}</b>
${d.Potential?`<span class="pill ${d.Potential==='A'?'p-bad':d.Potential==='B'?'p-warn':'p-gray'}" style="margin-left:.3rem">${esc(d.Potential)}</span>`:""}
${d.Area?`<span class="muted" style="font-size:.76rem"> · ${esc(d.Area)}</span>`:""}
<div class="muted" style="font-size:.74rem">${due.never? "🆕 Never visited" : "Last visit: "+fmtDate(due.last)+" ("+due.txt+")"}${(!due.never && due.overdue>0)?` · <b style="color:var(--bad)">${due.overdue} days overdue</b>`:""}</div>
</span>
<span style="color:var(--mut)">📜 ›</span>
</div>`;
}).join("") : `<div class="card empty">Koi dealer nahi mila${q?` — "${esc(q)}" se`:""}.</div>`);
}
const SAMP_COLS=["SampID","Date","DealerName","MA","SamplesList","Charges","Comments","TimeCommitDays","Mode","Status","ApprovedBy","ApprovedAt","ListGivenBy","ListGivenAt","ReadyBy","ReadyAt","RTDBy","RTDAt","DispatchedBy","DispatchedAt","CreatedAt","SheetItems","SheetCreatedBy","SheetCreatedAt","SheetComments"];
function sampRows(){
const m=(window._B2B&&window._B2B.sampling)||[];
const out=[];
for(let i=1;i<m.length;i++){
const r=m[i]; if(!r || !String(r[0]||"").trim()) continue;
const o={_row:i+1}; SAMP_COLS.forEach((c,j)=>o[c]=r[j]!==undefined?r[j]:"");
out.push(o);
}
return out;
}
function nextSampId(){
let mx=0;
sampRows().forEach(v=>{ const m=String(v.SampID).match(/^S(\d+)$/); if(m) mx=Math.max(mx,parseInt(m[1],10)); });
return "S"+String(mx+1).padStart(4,"0");
}
async function appendSamp(obj){
const row=SAMP_COLS.map(c=>obj[c]!==undefined?obj[c]:"");
const res=await gsRun("appendB2B",["Sampling", row]);
if(res&&res.id) obj.SampID=res.id;
window._B2B.sampling=window._B2B.sampling||[["h"]];
window._B2B.sampling.push(SAMP_COLS.map(c=>obj[c]!==undefined?obj[c]:""));
return obj;
}
async function updateSamp(s, changes){
const idx={}; Object.keys(changes).forEach(k=>{ const j=SAMP_COLS.indexOf(k); if(j>-1) idx[j]=changes[k]; });
await gsRun("updateB2B",["Sampling", s.SampID, idx]);
const m=window._B2B.sampling;
for(let i=1;i<m.length;i++){ if(String(m[i][0])===String(s.SampID)){ Object.keys(idx).forEach(j=>m[i][j]=idx[j]); break; } }
}
function parseTs(s){ const t=String(s||"").trim(); if(!t) return null; const d=new Date(t.replace(" ","T")); return isNaN(d)? null : d; }
function addDays(ts, days){ const d=parseTs(ts); if(!d) return null; return new Date(d.getTime()+days*24*3600*1000); }
function hrsDiff(a,b){ return Math.round((a.getTime()-b.getTime())/3600000); }
function timePill(plannedDate, actualTs){
if(!plannedDate) return "";
if(actualTs){
const a=parseTs(actualTs); if(!a) return "";
const late=hrsDiff(a,plannedDate);
return late>0? `<span class="pill p-bad">${late} hr LATE</span>` : `<span class="pill p-ok">On time ✓</span>`;
}
const left=hrsDiff(plannedDate,new Date());
return left<0? `<span class="pill p-bad">${-left} hr OVERDUE</span>` : `<span class="pill ${left<24?'p-warn':'p-blue'}">${left} hr left</span>`;
}
function sampDays(s){ return num(s.TimeCommitDays)||4; }
function sampStagePlan(s){
return {
crm: s.CreatedAt? addDays(s.CreatedAt, 2) : null,                     // v33: CRM sampling sheet — request ke 2 din (approval se PEHLE)
da:  s.ApprovedAt? addDays(s.ApprovedAt, 2) : null,                   // Dispatch Assistant: approval ke 2 din
dm:  s.ApprovedAt? addDays(s.ApprovedAt, sampDays(s)) : null         // Final dispatch: approval + committed days
};
}
function sampRoleView(){
const r=(String(USER.Role)+","+coverNow().map(c=>String(c.abs.Role||"")).join(",")).toLowerCase(); // v34: cover roles bhi
if(isAdmin()) return "admin";
if(r.indexOf("dispatch assistant")>-1) return "da";
if(r.indexOf("dispatch manager")>-1) return "dm";
if(r.indexOf("crm")>-1 && r.indexOf("wholesale")>-1) return "crm";
return "ma";
}
function stepsBar(steps, cur, failed){
// cur = kitne steps COMPLETE hain; steps[i]={ic,label,at}
return `<div style="display:flex;align-items:flex-start;margin:.55rem 0 .25rem;overflow-x:auto;padding-bottom:.2rem">
${steps.map((s,i)=>{
const done=i<cur, active=i===cur && !failed;
const col=failed? "var(--bad)" : done? "var(--ok)" : active? "var(--blue)" : "var(--line)";
const txtc=done? "var(--ok)" : active? "var(--blue)" : "var(--mut)";
return `${i>0?`<div style="flex:1;min-width:14px;height:2px;background:${i<cur?"var(--ok)":"var(--line)"};margin-top:16px"></div>`:""}
<div style="display:flex;flex-direction:column;align-items:center;min-width:56px">
<div style="width:34px;height:34px;border-radius:50%;border:2px solid ${col};display:flex;align-items:center;justify-content:center;font-size:.95rem;background:${done?"var(--ok)":"#fff"};${active?"box-shadow:0 0 0 4px rgba(37,99,235,.15);":""}">${done?"✓":s.ic}</div>
<div style="font-size:.62rem;font-weight:700;color:${txtc};margin-top:.25rem;text-align:center;line-height:1.15">${s.label}</div>
${s.at?`<div style="font-size:.56rem;color:var(--mut)">${String(s.at).slice(5,16)}</div>`:""}
</div>`;}).join("")}
</div>`;
}
function sampStepsBar(s){
const st=s.Status;
if(st==="Rejected") return `<div class="pill p-bad" style="margin:.4rem 0">❌ Rejected by ${esc(s.ApprovedBy)}</div>`;
/* v33 flow: Requested → Sheet made (CRM/Admin) → Approved (Admin) → Samples getting ready → Ready → To dispatch → Dispatched */
const steps=[
{ic:"📝",label:"Requested",at:s.CreatedAt},
{ic:"📋",label:"Sheet made",at:s.ListGivenAt},
{ic:"✅",label:"Approved",at:s.ApprovedAt},
{ic:"📦",label:"Ready",at:s.ReadyAt},
{ic:"🚚",label:"To dispatch",at:s.RTDAt},
{ic:"🏁",label:s.Mode==="Self pick"?"Handed over":"Dispatched",at:s.DispatchedAt}
];
// complete count: Requested hamesha done; phir har stage jiska timestamp hai
let done=1;
if(s.ListGivenAt) done=2;
if(s.ApprovedAt) done=3;
if(s.ReadyAt) done=4;
if(s.RTDAt) done=5;
if(s.DispatchedAt) done=6;
return stepsBar(steps, done, false);
}
function sampStPill(st){
let st2=st; const map={"Requested":"p-gray","Pending Approval":"p-blue","Approved":"p-warn","List Given":"p-blue","Samples Ready":"p-ok","Ready to Dispatch":"p-warn","Dispatched":"p-ok","Rejected":"p-bad"};
if(st==="Approved") st2="Samples getting ready"; // v33: Approved = DA ke paas, samples ban rahe hain
return `<span class="pill ${map[st]||'p-gray'}">${esc(st2)}</span>`;
}
/** Sampling sheet ke items JSON se wapas array — [{co,de,q}] */
function sampSheetItems(s){
try{ const a=JSON.parse(s.SheetItems||"[]"); return Array.isArray(a)? a : []; }catch(e){ return []; }
}
function sampCard(s, view){
const P=sampStagePlan(s);
const st=s.Status;
const bl=st==="Dispatched"?"var(--ok)":st==="Rejected"?"var(--bad)":st==="Pending Approval"?"var(--mut)":"var(--warn)";
let stageLine="", btns="";
/* v33 RIGHTS: Admin = sab; CRM Wholesale = sab stage chhod ke approval; DA = Samples Ready; DM = Dispatched; MA = sirf view */
const canSheet = view==="crm"||view==="admin";
const canStage = view==="crm"||view==="admin";
if(canSheet && (st==="Requested" || (st==="Approved" && !s.SheetItems))){ stageLine=`Sampling sheet to be made — ${timePill(P.crm)}`; btns=`<button class="btn small" onclick="openSampSheet('${s.SampID}')">🧾 Create Sampling Sheet</button>`; }
if(view==="admin" && st==="Pending Approval"){
stageLine=`Sheet ready — approval chahiye`;
btns=`<button class="btn small" style="background:var(--ok)" onclick="sampAction('${s.SampID}','approve')">✅ Approve</button>
<button class="btn small danger" onclick="sampAction('${s.SampID}','reject')">Reject</button>`;
}
if(canSheet && st==="Pending Approval"){ if(view==="crm") stageLine=`⏳ Admin approval pending`; btns+=` <button class="btn small ghost" onclick="openSampSheet('${s.SampID}')">✏️ Edit sheet</button>`; } // v33.1: approval se pehle edit
if((view==="da"||canStage) && ((st==="Approved" && s.SheetItems) || st==="List Given")){ /* List Given = purane flow ki rows */ stageLine=`Samples getting ready — ${timePill(P.da)}`; btns=`<button class="btn small" style="background:var(--ok)" onclick="sampAction('${s.SampID}','ready')">✅ Samples Ready</button>`; }
if(canStage && st==="Samples Ready"){ stageLine=`✅ Samples are READY (${esc(s.ReadyBy)} · ${esc(String(s.ReadyAt))})`; btns=`<button class="btn small" style="background:var(--ok)" onclick="sampAction('${s.SampID}','rtd')">🚚 Ready to Dispatch</button>`; }
if((view==="dm"||canStage) && st==="Ready to Dispatch"){ stageLine=`To be dispatched — ${timePill(P.dm)}`; btns=`<button class="btn small" style="background:var(--ok)" onclick="sampAction('${s.SampID}','dispatched')">${s.Mode==="Self pick"?"✅ Handed over (self pick)":"🏁 Dispatched"}</button>`; }
if(s.SheetItems) btns+=` <button class="btn small ghost" onclick="printSampSheet('${s.SampID}')">🖨 PDF</button> <button class="btn small ghost" onclick="sampSheetExcel('${s.SampID}')">📊 Excel</button>`;
const sheetItems=sampSheetItems(s);
return `<div class="card" style="margin-bottom:.7rem;border-left:4px solid ${bl}">
<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center">
<div><b style="font-size:1.02rem">${esc(s.DealerName)}</b> <span class="muted">· ${esc(s.SampID)} · ${esc(s.MA)}</span> ${sampStPill(st)}
<span class="pill p-gray">${esc(s.Mode)}</span><span class="pill p-gray">${sampDays(s)} days commit</span></div>
<div style="white-space:nowrap">${btns}</div>
</div>
${sampStepsBar(s)}
<div style="margin-top:.35rem;font-size:.85rem"><b>Samples:</b> ${esc(s.SamplesList)}</div>
<div class="muted" style="font-size:.82rem">Discount: ${esc(s.Charges)}%${s.Comments?" · "+esc(s.Comments):""} · Request: ${fmtDate(s.Date)}</div>
${sheetItems.length?`<div style="margin-top:.3rem;font-size:.82rem"><span class="pill p-blue">📋 Sampling sheet: ${sheetItems.length} designs · ${sheetItems.reduce((t,x)=>t+(num(x.q)||1),0)} pcs</span> <span class="muted">by ${esc(s.SheetCreatedBy||"")} · ${esc(String(s.SheetCreatedAt||"").slice(0,10))}</span></div>`:""}
${String(s.SheetComments||"").trim()?`<div style="margin-top:.25rem;font-size:.82rem">💬 <b>Sheet comments:</b> ${esc(s.SheetComments)}</div>`:""}
${stageLine?`<div style="margin-top:.35rem">${stageLine}</div>`:""}
${(view==="admin"||st==="Dispatched")? `<div style="margin-top:.4rem;font-size:.8rem" class="muted">
${s.ApprovedAt?`Approve: ${esc(s.ApprovedAt)} (${esc(s.ApprovedBy)})<br>`:""}
${s.ListGivenAt?`Sheet → DA: ${esc(s.ListGivenAt)} (${esc(s.ListGivenBy)}) ${timePill(P.crm,s.ListGivenAt)}<br>`:""}
${s.ReadyAt?`Ready: ${esc(s.ReadyAt)} (${esc(s.ReadyBy)}) ${timePill(P.da,s.ReadyAt)}<br>`:""}
${s.RTDAt?`Ready-to-dispatch: ${esc(s.RTDAt)} (${esc(s.RTDBy)})<br>`:""}
${s.DispatchedAt?`Dispatched: ${esc(s.DispatchedAt)} (${esc(s.DispatchedBy)}) ${timePill(P.dm,s.DispatchedAt)}`:""}
</div>`:""}
</div>`;
}
function vSampling(){
if(!window._B2B){
loadB2B().then(()=>{ if(ROUTE==="sampling") render(); }).catch(e=>toast("Load failed: "+e.message));
return `<div class="card empty">Loading sampling…</div>`;
}
const view=sampRoleView();
const spf=window._spF||"pending"; // v33.1: Pending (dispatch nahi hua, kisi bhi stage par) / Completed (Dispatched) / Rejected
const allRows=sampRows().sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
const all=allRows.filter(s=> spf==="pending" ? !["Dispatched","Rejected"].includes(s.Status) : spf==="done" ? s.Status==="Dispatched" : s.Status==="Rejected");
const cnt={pending:allRows.filter(s=>!["Dispatched","Rejected"].includes(s.Status)).length, done:allRows.filter(s=>s.Status==="Dispatched").length, rej:allRows.filter(s=>s.Status==="Rejected").length};
const filterBar=`<div class="tabs" style="margin-bottom:.6rem"><button class="tab ${spf==='pending'?'on':''}" onclick="window._spF='pending';render()">⏳ Samples pending (${cnt.pending})</button><button class="tab ${spf==='done'?'on':''}" onclick="window._spF='done';render()">✅ Completed (${cnt.done})</button><button class="tab ${spf==='rej'?'on':''}" onclick="window._spF='rej';render()">❌ Rejected (${cnt.rej})</button></div>`;
let sections="";
const newBtn=`<div class="toolbar"><button class="btn" onclick="openSampForm()">＋ New sampling request</button></div>${filterBar}`; // v33: MA + Admin + CRM Wholesale; v33.1 filter
if(view==="ma"){
const mine=all.filter(s=>s.MA===USER.Name);
sections=`${newBtn}${mine.length? mine.map(s=>sampCard(s,"ma")).join("") : `<div class="card empty">No sampling requests yet. When you get an order in the market, raise the request here.</div>`}`;
}
if(view==="admin"){
const pend=all.filter(s=>s.Status==="Pending Approval"), req=all.filter(s=>s.Status==="Requested");
sections=`${newBtn}<div class="section-h"><h3>Approval pending (${pend.length})</h3><div class="ln"></div></div>
${pend.length? pend.map(s=>sampCard(s,"admin")).join("") : `<div class="card empty">No sampling approvals pending.</div>`}
<div class="section-h"><h3>Sampling sheet to be made (${req.length})</h3><div class="ln"></div></div>
${req.length? req.map(s=>sampCard(s,"admin")).join("") : `<div class="card empty">—</div>`}
<div class="section-h"><h3>Full pipeline</h3><div class="ln"></div></div>
${all.filter(s=>!["Pending Approval","Requested"].includes(s.Status)).map(s=>sampCard(s,"admin")).join("") || `<div class="card empty">—</div>`}`;
}
if(view==="crm"){
const q0=all.filter(s=>s.Status==="Requested"||(s.Status==="Approved"&&!s.SheetItems)), qa=all.filter(s=>s.Status==="Pending Approval"), q1=all.filter(s=>(s.Status==="Approved"&&s.SheetItems)||s.Status==="List Given"), q2=all.filter(s=>s.Status==="Samples Ready"), q3=all.filter(s=>s.Status==="Ready to Dispatch");
sections=`${newBtn}<div class="section-h"><h3>Sampling sheet to be made (${q0.length})</h3><div class="ln"></div></div>
${q0.map(s=>sampCard(s,"crm")).join("") || `<div class="card empty">Nothing pending. 🎉</div>`}
<div class="section-h"><h3>Admin approval pending (${qa.length})</h3><div class="ln"></div></div>
${qa.map(s=>sampCard(s,"crm")).join("") || `<div class="card empty">—</div>`}
<div class="section-h"><h3>Samples getting ready (${q1.length})</h3><div class="ln"></div></div>
${q1.map(s=>sampCard(s,"crm")).join("") || `<div class="card empty">—</div>`}
<div class="section-h"><h3>Samples ready — send for dispatch (${q2.length})</h3><div class="ln"></div></div>
${q2.map(s=>sampCard(s,"crm")).join("") || `<div class="card empty">—</div>`}
<div class="section-h"><h3>Ready to dispatch (${q3.length})</h3><div class="ln"></div></div>
${q3.map(s=>sampCard(s,"crm")).join("") || `<div class="card empty">—</div>`}
<div class="section-h"><h3>Dispatched / rejected</h3><div class="ln"></div></div>
${all.filter(s=>["Dispatched","Rejected"].includes(s.Status)).slice(0,20).map(s=>sampCard(s,"view")).join("") || `<div class="card empty">—</div>`}`;
}
if(view==="da"){
const q=all.filter(s=>(s.Status==="Approved"&&s.SheetItems)||s.Status==="List Given");
sections=`<div class="section-h"><h3>Samples Requests — to be prepared (${q.length})</h3><div class="ln"></div></div>
${q.map(s=>sampCard(s,"da")).join("") || `<div class="card empty">No samples requests yet — they appear here once Admin approves the sampling sheet.</div>`}
<div class="section-h"><h3>Marked ready</h3><div class="ln"></div></div>
${all.filter(s=>["Samples Ready","Ready to Dispatch","Dispatched"].includes(s.Status)).slice(0,15).map(s=>sampCard(s,"view")).join("") || `<div class="card empty">—</div>`}`;
}
if(view==="dm"){
const q=all.filter(s=>s.Status==="Ready to Dispatch");
sections=`<div class="section-h"><h3>Sampling dispatch pending (${q.length})</h3><div class="ln"></div></div>
${q.map(s=>sampCard(s,"dm")).join("") || `<div class="card empty">No sampling dispatch pending. 🎉</div>`}
<div class="section-h"><h3>Dispatched</h3><div class="ln"></div></div>
${all.filter(s=>s.Status==="Dispatched").slice(0,15).map(s=>sampCard(s,"view")).join("") || `<div class="card empty">—</div>`}`;
}
if(spf!=="pending" && (view==="crm"||view==="admin")) sections=`${newBtn}${all.map(s=>sampCard(s,"view")).join("") || `<div class="card empty">—</div>`}`;
return `${sections}<div style="margin-top:.6rem" class="muted"><button class="btn ghost small" onclick="loadB2B(true).then(()=>render())">⟳ Reload</button> <span style="font-size:.72rem">Sheet se last load: ${esc(String(window._B2BAt||"").slice(11,16)||"—")}</span></div>`;
}
function openSampForm(){
openModal("New sampling request", `
${sampRoleView()!=="ma"? `<label>Marketing Associate <span class="req">*</span></label><select id="sp-ma">${(DB.Users||[]).filter(u=>u.Status!=="Inactive" && /marketing/i.test(String(u.Role||""))).map(u=>`<option>${esc(u.Name)}</option>`).join("")}<option>${esc(USER.Name)}</option></select>`:""}
<label>Dealer name <span class="req">*</span></label><input id="sp-dealer" list="sp-dealers" autocomplete="off">
<datalist id="sp-dealers">${dealerNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
<label>Samples list <span class="req">*</span> (which samples are needed)</label><textarea id="sp-list" rows="4"></textarea>
<label>Sampling charges — discount % <span class="req">*</span> (customer ko kitne % discount pe sampling di — mostly 50)</label><input type="number" id="sp-chg" value="50" min="0" max="100">
<label>Comments (optional)</label><input id="sp-com">
<label>Time commit (days)</label><input type="number" id="sp-days" value="4" min="1">
<label>Samples</label>
<div style="display:flex;gap:1.1rem;padding:.2rem 0">
<label class="rad"><input type="radio" name="sp-mode" value="Dispatch by us" checked style="width:auto"> Dispatch by us</label>
<label class="rad"><input type="radio" name="sp-mode" value="Self pick" style="width:auto"> Self pick</label>
</div>
<div style="margin-top:1rem"><button class="btn" onclick="saveSampReq()">Submit — CRM sampling sheet banayegi, phir Admin approval</button></div>`);
}
async function saveSampReq(){
const dl=$("sp-dealer").value.trim(), list=$("sp-list").value.trim(), chg=$("sp-chg").value;
if(!dl) return toast("Dealer name is mandatory.");
if(!list) return toast("Samples list is mandatory.");
if(chg===""||num(chg)<0||num(chg)>100) return toast("Discount % enter karo — 0 se 100 ke beech (mostly 50).");
if(!saveOnce("samp:"+dl)) return; // v33.2
busy(true,"Submitting request…");
try{
await appendSamp({SampID:nextSampId(),Date:todayStr(),DealerName:dl,MA:($("sp-ma")?$("sp-ma").value:USER.Name),SamplesList:list,Charges:num(chg),
Comments:$("sp-com").value.trim(),TimeCommitDays:num($("sp-days").value)||4,
Mode:document.querySelector('input[name="sp-mode"]:checked').value,Status:"Requested",CreatedAt:nowStr()}); // v33: pehle sheet, phir approval
busy(false); closeModal(); toast("Sampling request submitted ✓ — CRM sampling sheet banayegi, phir Admin approve karega"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
finally{ saveDone("samp:"+dl); }
}
async function sampAction(id, act){
const s=sampRows().find(x=>x.SampID===id); if(!s) return;
const ts=nowStr();
const map={
approve:{Status:"Approved",ApprovedBy:USER.Name,ApprovedAt:ts},
reject:{Status:"Rejected",ApprovedBy:USER.Name,ApprovedAt:ts},
listgiven:{Status:"List Given",ListGivenBy:USER.Name,ListGivenAt:ts},
ready:{Status:"Samples Ready",ReadyBy:USER.Name,ReadyAt:ts},
rtd:{Status:"Ready to Dispatch",RTDBy:USER.Name,RTDAt:ts},
dispatched:{Status:"Dispatched",DispatchedBy:USER.Name,DispatchedAt:ts}
};
const v=sampRoleView(); // v33 rights
if((act==="approve"||act==="reject") && v!=="admin") return toast("Approval sirf Admin.");
if(act==="ready" && !["admin","crm","da"].includes(v)) return toast("Not allowed.");
if(act==="rtd" && !["admin","crm"].includes(v)) return toast("Not allowed.");
if(act==="dispatched" && !["admin","crm","dm"].includes(v)) return toast("Not allowed.");
if(act==="reject" && !confirm("Reject this sampling request?")) return;
busy(true,"Updating…");
try{
await updateSamp(s, map[act]);
busy(false); toast("Done ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* ================= SAMPLING SHEET (CRM Wholesale) =================
SampleSheet tab (B2B sheet): Column A = Company, Column B = DesignName.
CRM approval ke baad company select karta hai → us company ke saare designs
Qty 1 ke saath add ho jaate hain → ✕ se cut, qty edit → save = status List Given → PDF print. */
function ssMasterRows(){
const m=(window._B2B&&window._B2B.samplesheet)||[];
const out=[];
for(let i=1;i<m.length;i++){
const co=String((m[i]&&m[i][0])||"").trim(), de=String((m[i]&&m[i][1])||"").trim(), rt=num(String((m[i]&&m[i][2])||"").replace(/[^\d.]/g,""));
if(co&&de) out.push({Company:co, Design:de, Rate:rt}); // v37: Rate col C
}
return out;
}
function ssCompanies(){ return [...new Set(ssMasterRows().map(r=>r.Company))].sort((a,b)=>a.localeCompare(b)); }
function ssDesigns(co){ return ssMasterRows().filter(r=>r.Company.toLowerCase()===String(co).trim().toLowerCase()).map(r=>r.Design); }
function ssDesignRows(co){ return ssMasterRows().filter(r=>r.Company.toLowerCase()===String(co).trim().toLowerCase()); }
function ssWithPrice(){ return !!(window._ssPrice); }
function ssLineTotal(x){ return (num(x.q)||1)*num(x.r); }
function ssGrand(items){ return items.reduce((t,x)=>t+ssLineTotal(x),0); }
/* v37: sheet ka price mode SheetComments ke saath nahi — items JSON mein har item ka r (rate) aur sheet-level flag SheetItems mein pehla element nahi; simple: items mein r, aur "withPrice" alag key sampSheetMeta */
function sampSheetPrice(s){ try{ const a=JSON.parse(s.SheetItems||"[]"); return Array.isArray(a) && a.some(x=>x && x.wp); }catch(e){ return false; } }
function openSampSheet(id){
const s=sampRows().find(x=>x.SampID===id); if(!s) return;
const cos=ssCompanies();
if(!cos.length) return toast('SampleSheet tab khaali hai — B2B sheet ke "SampleSheet" tab mein Column A: Company, Column B: Design Name bharo, phir ⟳ Reload karke dobara try karo.', 5000);
window._ssItems = sampSheetItems(s).map(x=>({co:x.co,de:x.de,q:x.q,r:num(x.r)}));
window._ssPrice = sampSheetPrice(s);
openModal("🧾 Sampling Sheet — "+s.SampID, `
<div class="total-box" style="margin-top:0">
<div class="rowline"><span>Dealer name</span><b>${esc(s.DealerName)}</b></div>
<div class="rowline"><span>Marketing Associate (requested by)</span><b>${esc(s.MA)}</b></div>
<div class="rowline"><span>Approved by</span><b>${esc(s.ApprovedBy||"—")}</b></div>
<div class="rowline"><span>Date of approval</span><b>${esc(String(s.ApprovedAt||"").slice(0,10)||"—")}</b></div>
<div class="rowline" style="border:none"><span>Sampling discount %</span><b><input type="number" id="ss-disc" value="${esc(s.Charges)}" min="0" max="100" style="width:90px;padding:.3rem .5rem;text-align:right" oninput="renderSsItems()"> %</b></div>
</div>
${s.SamplesList?`<div class="muted" style="margin-top:.4rem;font-size:.8rem">📝 MA ki request: ${esc(s.SamplesList)}</div>`:""}
<div style="display:flex;gap:.6rem;align-items:center;margin:.6rem 0;flex-wrap:wrap"><b style="font-size:.85rem">💰 Sheet with price?</b>
<label style="display:flex;align-items:center;gap:.3rem;text-transform:none;font-weight:600;margin:0;cursor:pointer"><input type="radio" name="ss-wp" value="0" ${!window._ssPrice?'checked':''} onchange="window._ssPrice=false;renderSsItems()" style="width:auto"> Without price</label>
<label style="display:flex;align-items:center;gap:.3rem;text-transform:none;font-weight:600;margin:0;cursor:pointer"><input type="radio" name="ss-wp" value="1" ${window._ssPrice?'checked':''} onchange="window._ssPrice=true;renderSsItems()" style="width:auto"> With price (rate/pc × qty = total)</label></div>
<label>Select company — kaunsi company ki sample kit deni hai <span class="req">*</span></label>
<div style="display:flex;gap:.5rem;align-items:center">
<select id="ss-co">${cos.map(c=>`<option>${esc(c)}</option>`).join("")}</select>
<button type="button" class="btn small" style="white-space:nowrap" onclick="ssAddCompany()">＋ Add samples</button>
</div>
<p class="muted" style="font-size:.75rem;margin-top:.3rem">Company select karke ＋ Add dabao — us company ke saare designs neeche Qty 1 pc ke saath aa jayenge. Koi design nahi deni to ✕ se cut karo, zyada pc deni ho to qty badha do. Aur company ke samples add karne ho to fir se company select karke ＋ Add dabao.</p>
<label>Apni marzi ki item — khud type karke add karo (optional)</label>
<div style="display:grid;grid-template-columns:1fr 74px 84px auto;gap:.5rem;align-items:center">
<input id="ss-cust-name" placeholder="Item / design ka naam likho…" autocomplete="off" onkeydown="if(event.key==='Enter'){event.preventDefault();ssAddCustom();}">
<input type="number" id="ss-cust-qty" value="1" min="1" title="Qty (pc)">
<input type="number" id="ss-cust-rate" placeholder="Rate/pc" min="0" step="0.01" title="Rate per pc (with-price sheet ke liye)">
<button type="button" class="btn small" style="white-space:nowrap" onclick="ssAddCustom()">＋ Add item</button>
</div>
<p class="muted" style="font-size:.75rem;margin-top:.3rem">Jo item company list mein nahi hai — uska naam aur qty likh ke ＋ Add item dabao. Sheet pe "${esc(SS_CUSTOM_CO)}" ke neeche print hogi.</p>
<div id="ss-items" style="margin-top:.6rem"></div>
<label>Comments (sheet/PDF pe print honge — optional)</label>
<textarea id="ss-comments" rows="2" placeholder="e.g. urgent hai, packing dhyan se karna, dealer ko Monday tak chahiye…">${esc(s.SheetComments||"")}</textarea>
<div style="margin-top:1rem"><button class="btn" style="background:var(--ok)" onclick="saveSampSheet('${id}')">✅ Create Sampling Sheet — save (status: List Given)</button></div>`);
renderSsItems();
}
/** Custom item — company list ke bahar wali item khud type karke add karo */
const SS_CUSTOM_CO="Other Items";
function ssAddCustom(){
const nmEl=$("ss-cust-name"), qEl=$("ss-cust-qty");
const nm=nmEl? nmEl.value.trim() : "", q=num(qEl? qEl.value : 1)||0;
if(!nm) return toast("Item ka naam likho.");
if(q<=0) return toast("Qty 1 ya zyada likho.");
window._ssItems=window._ssItems||[];
const have=new Set(window._ssItems.map(x=>String(x.co+"||"+x.de).toLowerCase()));
if(have.has(String(SS_CUSTOM_CO+"||"+nm).toLowerCase())) return toast('"'+nm+'" pehle se added hai — list mein qty badha do.');
window._ssItems.push({co:SS_CUSTOM_CO, de:nm, q:q, r:num($("ss-cust-rate")&&$("ss-cust-rate").value)});
nmEl.value=""; qEl.value=1; if($("ss-cust-rate")) $("ss-cust-rate").value=""; nmEl.focus();
renderSsItems();
toast(nm+" add ho gaya ✓");
}
function ssAddCompany(){
const co=$("ss-co")? $("ss-co").value : ""; if(!co) return;
window._ssItems=window._ssItems||[];
const have=new Set(window._ssItems.map(x=>String(x.co+"||"+x.de).toLowerCase()));
let added=0;
ssDesignRows(co).forEach(r=>{ const de=r.Design;
if(have.has(String(co+"||"+de).toLowerCase())) return;
window._ssItems.push({co:co, de:de, q:1, r:num(r.Rate)}); added++;
});
renderSsItems();
toast(added? co+" ke "+added+" designs add ho gaye ✓ (Qty 1 pc)" : co+" ke saare designs pehle se added hain");
}
function renderSsItems(){
const w=$("ss-items"); if(!w) return;
const items=window._ssItems||[];
if(!items.length){ w.innerHTML=`<div class="card empty">Abhi koi design add nahi hua — upar se company select karke ＋ Add dabao.</div>`; return; }
const byCo={};
items.forEach((x,i)=>{ (byCo[x.co]=byCo[x.co]||[]).push(i); });
w.innerHTML = Object.keys(byCo).map(co=>`
<div style="background:var(--navy);color:#fff;border-radius:8px 8px 0 0;padding:.45rem .7rem;font-weight:700;font-size:.85rem;margin-top:.6rem">${co===SS_CUSTOM_CO?"✍️":"🏭"} ${esc(co)} <span style="opacity:.7">· ${byCo[co].length} designs</span></div>
<div style="border:1px solid var(--line);border-top:none;border-radius:0 0 8px 8px;padding:.4rem .5rem">
${(()=>{ const wp=ssWithPrice(); const cols=wp?"1fr 64px 84px 90px 34px":"1fr 74px 34px"; return `
<div style="display:grid;grid-template-columns:${cols};gap:.35rem;font-size:.68rem;font-weight:700;color:var(--mut);padding:0 .1rem .2rem">
<span>DESIGN</span><span>QTY (PC)</span>${wp?'<span>RATE/PC</span><span style="text-align:right">TOTAL</span>':''}<span></span></div>
${byCo[co].map(i=>{ const x=items[i]; return `
<div style="display:grid;grid-template-columns:${cols};gap:.35rem;align-items:center;margin-bottom:.3rem">
<span style="font-size:.88rem">${esc(x.de)}</span>
<input type="number" min="1" value="${esc(x.q)}" oninput="window._ssItems[${i}].q=this.value;ssLineUpd(${i})" style="padding:.35rem .5rem">
${wp?`<input type="number" min="0" step="0.01" value="${num(x.r)||""}" placeholder="rate" oninput="window._ssItems[${i}].r=this.value;ssLineUpd(${i})" style="padding:.35rem .5rem">
<b id="ss-lt-${i}" style="text-align:right;font-size:.85rem">${money(ssLineTotal(x))}</b>`:""}
<button type="button" title="Yeh design cut karo" style="background:#FDECEA;color:var(--bad);border:none;border-radius:6px;height:32px;cursor:pointer" onclick="window._ssItems.splice(${i},1);renderSsItems()">✕</button>
</div>`;}).join("")}`; })()}
</div>`).join("") + `<div class="rowline" style="margin-top:.5rem"><span><b>Total</b></span><b>${items.length} designs · ${items.reduce((t,x)=>t+(num(x.q)||1),0)} pcs${ssWithPrice()?` · <span id="ss-grand">${money(ssGrand(items))}</span>`:""}</b></div>${ssWithPrice()?(()=>{ const d=num($("ss-disc")&&$("ss-disc").value); const g=ssGrand(items); return d?`<div class="rowline"><span>Less discount ${d}%</span><b>−${money(g*d/100)}</b></div><div class="rowline" style="font-size:1.02rem"><span><b>NET PAYABLE</b></span><b id="ss-net">${money(g-g*d/100)}</b></div>`:""; })():""}`;
}
function ssLineUpd(i){ const x=window._ssItems[i]; const el=$("ss-lt-"+i); if(el) el.textContent=money(ssLineTotal(x)); const g=$("ss-grand"); if(g) g.textContent=money(ssGrand(window._ssItems)); const n=$("ss-net"); if(n){ const d=num($("ss-disc")&&$("ss-disc").value), gg=ssGrand(window._ssItems); n.textContent=money(gg-gg*d/100); } }
async function saveSampSheet(id){
const s=sampRows().find(x=>x.SampID===id); if(!s) return;
const items=(window._ssItems||[]).filter(x=>String(x.de||"").trim());
if(!items.length) return toast("Kam se kam ek design add karo.");
for(const x of items){ if(num(x.q)<=0) return toast('"'+x.de+'": qty 1 ya zyada likho.'); x.q=num(x.q); x.r=num(x.r); }
const wp=ssWithPrice();
if(wp){ const noRate=items.filter(x=>!(x.r>0)); if(noRate.length && !confirm(noRate.length+" item ka rate khaali/0 hai ("+noRate.slice(0,3).map(x=>x.de).join(", ")+(noRate.length>3?"…":"")+"). Phir bhi with-price save karein?")) return; }
items.forEach((x,i)=>{ if(wp) x.wp=1; else delete x.wp; });
busy(true,"Sampling sheet save ho rahi hai…");
try{
const ts=nowStr();
const scom=$("ss-comments")? $("ss-comments").value.trim() : "";
const dEl=$("ss-disc"); const disc = dEl && dEl.value!=="" ? Math.min(100,Math.max(0,num(dEl.value))) : num(s.Charges); // v37.1: discount edit
await updateSamp(s,{Charges:disc, Status:(s.Status==="Approved"?"Approved":"Pending Approval"),ListGivenBy:USER.Name,ListGivenAt:s.ListGivenAt||ts, // v33: sheet → Admin approval (purani approved request par Approved hi rehta hai); v33.1 edit par pehli sheet-date rehti hai
SheetItems:JSON.stringify(items),SheetCreatedBy:USER.Name,SheetCreatedAt:ts,SheetComments:scom});
busy(false);
openModal("Sampling Sheet saved ✓", `
<p style="margin:.4rem 0"><b>${esc(s.DealerName)}</b> — ${items.length} designs · ${items.reduce((t,x)=>t+x.q,0)} pcs</p>
<p class="muted">Sheet save ho gayi — ab Admin approval ke baad Dispatch Assistant ko dikhegi. PDF abhi bhi nikaal sakte ho.</p>
<div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
<button class="btn" onclick="printSampSheet('${id}')">🖨 Export PDF</button> <button class="btn ghost" onclick="sampSheetExcel('${id}')">📊 Export Excel</button>
<button class="btn ghost" onclick="closeModal()">Close</button>
</div>`);
toast("Sampling sheet ban gayi ✓ — status: List Given");
render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* v36.1: Sampling sheet → Excel (.xls, HTML-table format — Excel/Sheets dono kholte hain; koi library nahi) */
function sampSheetExcel(id){
const s=sampRows().find(x=>x.SampID===id); if(!s) return;
const items=sampSheetItems(s); if(!items.length) return toast("Is request ki sampling sheet abhi bani nahi hai.");
alog("print_sampling", id+" (excel)");
const byCo={}; items.forEach(x=>{ (byCo[x.co]=byCo[x.co]||[]).push(x); });
let sn=0; const tot=items.reduce((t,x)=>t+(num(x.q)||1),0);
const wp=sampSheetPrice(s); const nc=wp?6:4; const grand=ssGrand(items);
const rows=Object.keys(byCo).map(co=>`<tr><td colspan="${nc}" style="background:#0B1D33;color:#fff;font-weight:bold">${esc(co)} — ${byCo[co].length} designs</td></tr>`+byCo[co].map(x=>{ sn++; return `<tr><td>${sn}</td><td>${esc(co)}</td><td>${esc(x.de)}</td><td style="text-align:right">${num(x.q)||1}</td>${wp?`<td style="text-align:right">${num(x.r)}</td><td style="text-align:right">${ssLineTotal(x)}</td>`:""}</tr>`; }).join("")).join("");
const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sampling ${esc(s.SampID)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>td,th{border:1px solid #999;padding:4px;font-family:Arial;font-size:11pt} th{background:#0B1D33;color:#fff}</style></head><body>
<table><tr><td colspan="${nc}" style="font-size:14pt;font-weight:bold;border:none">BSC TILES — SAMPLING SHEET ${esc(s.SampID)}</td></tr>
<tr><td colspan="${nc}" style="border:none">Dealer: ${esc(s.DealerName)} · MA: ${esc(s.MA)} · Sheet date: ${esc(String(s.SheetCreatedAt||"").slice(0,10))} · Discount: ${esc(s.Charges)}% · ${esc(s.Mode)}</td></tr>
<tr><td colspan="${nc}" style="border:none">Approved by: ${esc(s.ApprovedBy||"—")} (${esc(String(s.ApprovedAt||"").slice(0,10)||"—")}) · Sheet by: ${esc(s.SheetCreatedBy||"")} · Time commit: ${sampDays(s)} days${String(s.SheetComments||"").trim()?" · Comments: "+esc(s.SheetComments):""}</td></tr>
<tr><td colspan="${nc}" style="border:none"></td></tr>
<tr><th>#</th><th>Company</th><th>Design</th><th>Qty (pc)</th>${wp?'<th>Rate/pc</th><th>Total</th>':''}</tr>${rows}
<tr><td colspan="3" style="font-weight:bold;text-align:right">TOTAL — ${items.length} designs</td><td style="font-weight:bold;text-align:right">${tot}</td>${wp?`<td></td><td style="font-weight:bold;text-align:right">${grand}</td>`:""}</tr>${wp&&num(s.Charges)?`<tr><td colspan="${nc-1}" style="text-align:right">Less sampling discount ${esc(s.Charges)}%</td><td style="text-align:right">-${Math.round(grand*num(s.Charges))/100}</td></tr><tr><td colspan="${nc-1}" style="font-weight:bold;text-align:right">NET PAYABLE</td><td style="font-weight:bold;text-align:right">${Math.round((grand-grand*num(s.Charges)/100)*100)/100}</td></tr>`:""}</table></body></html>`;
const blob=new Blob(["\ufeff"+html],{type:"application/vnd.ms-excel"}); const u=URL.createObjectURL(blob);
const a=document.createElement("a"); a.href=u; a.download="Sampling_"+s.SampID+"_"+String(s.DealerName||"").replace(/[^\w]+/g,"_")+".xls"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
toast("📊 Excel download ho gaya");
}
function printSampSheet(id){
alog("print_sampling", id);
const s=sampRows().find(x=>x.SampID===id); if(!s) return;
const items=sampSheetItems(s);
if(!items.length) return toast("Is request ki sampling sheet abhi bani nahi hai.");
const byCo={};
items.forEach(x=>{ (byCo[x.co]=byCo[x.co]||[]).push(x); });
let sn=0;
const wp=sampSheetPrice(s); const nc=wp?5:3; // v37: with-price → Rate/pc + Total columns
const rowsHtml=Object.keys(byCo).map(co=>`
<tr><td colspan="${nc}" style="background:#0B1D33;color:#fff;font-weight:bold">${esc(co)} — ${byCo[co].length} designs</td></tr>
${byCo[co].map(x=>{ sn++; return `<tr><td class="r" style="width:34px">${sn}</td><td>${esc(x.de)}</td><td class="r" style="width:70px">${num(x.q)||1} pc</td>${wp?`<td class="r" style="width:80px">${num(x.r).toFixed(2)}</td><td class="r" style="width:90px">${money(ssLineTotal(x))}</td>`:""}</tr>`; }).join("")}`).join("");
const totPcs=items.reduce((t,x)=>t+(num(x.q)||1),0); const grand=ssGrand(items);
printHTML(`<!DOCTYPE html><html><head><title>Sampling Sheet ${esc(s.SampID)}</title><style>
@page{size:8.27in 11.69in;margin:12mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:16px;margin:0 0 2px;letter-spacing:1px} table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #999;padding:4px 6px;font-size:10px} th{background:#0B1D33;color:#fff;text-align:left}
.r{text-align:right} .muted{color:#777}
.hd{display:flex;justify-content:space-between;border-bottom:2px solid #0B1D33;padding-bottom:6px;margin-bottom:6px}
.box{border:1px solid #999;border-radius:6px;padding:6px 8px;margin-top:6px;line-height:1.6}
.sig{display:flex;justify-content:space-between;margin-top:40px;gap:10px} .sig div{border-top:1px solid #333;width:170px;text-align:center;padding-top:4px;font-size:10px}
.tot td{font-weight:bold;background:#E8F0FB}
</style></head><body>
<div class="hd"><div><h1>BSC TILES — SAMPLING SHEET</h1><div>${esc(s.SampID)}</div></div>
<div style="text-align:right">Sheet date: ${esc(String(s.SheetCreatedAt||"").slice(0,10))}<br>Discount: <b>${esc(s.Charges)}%</b> · ${esc(s.Mode)}</div></div>
<div class="box">
<b>Dealer:</b> ${esc(s.DealerName)} &nbsp;·&nbsp; <b>Marketing Associate:</b> ${esc(s.MA)}<br>
<b>Approved by:</b> ${esc(s.ApprovedBy||"—")} &nbsp;·&nbsp; <b>Date of approval:</b> ${esc(String(s.ApprovedAt||"").slice(0,10)||"—")}<br>
<b>Sheet created by:</b> ${esc(s.SheetCreatedBy||"")} &nbsp;·&nbsp; <b>Time commit:</b> ${sampDays(s)} days
</div>
<table><tr><th style="width:34px">#</th><th>Design</th><th class="r" style="width:70px">Qty</th>${wp?'<th class="r" style="width:80px">Rate/pc</th><th class="r" style="width:90px">Total</th>':''}</tr>
${rowsHtml}
<tr class="tot"><td colspan="2" class="r">TOTAL — ${items.length} designs</td><td class="r">${totPcs} pcs</td>${wp?`<td></td><td class="r">${money(grand)}</td>`:""}</tr>${wp&&num(s.Charges)?`<tr class="tot"><td colspan="${nc-1}" class="r">Less sampling discount ${esc(s.Charges)}%</td><td class="r">−${money(grand*num(s.Charges)/100)}</td></tr><tr class="tot"><td colspan="${nc-1}" class="r">NET PAYABLE</td><td class="r">${money(grand-grand*num(s.Charges)/100)}</td></tr>`:""}</table>
${String(s.SheetComments||"").trim()?`<div class="box" style="margin-top:10px"><b>Comments:</b> ${esc(s.SheetComments)}</div>`:""}
<div class="sig"><div>CRM (Wholesale)</div><div>Dispatch Assistant</div><div>Dispatch Manager</div></div>
</body></html>`);
}
function vWholesale(){
return `${isAdmin()? `<div class="grid g3" style="margin-bottom:.8rem">
<div class="card click-tile" style="border:2px solid var(--brand)" onclick="ROUTE='wsacct';render()"><div class="ic">🧾</div><h3>Wholesale Accounts <span class="pill p-blue">NEW</span></h3><p class="muted">Masters · Purchase/Sale/Hold vouchers · Batchwise stock · Payments · Ledgers</p></div>
</div>`:""}<div class="grid g3">
<div class="card click-tile" onclick="ROUTE='marketing';render()"><div class="ic">🧳</div><h3>Marketing Visits</h3><p class="muted">Dealer visit planning, reviews, followups</p></div>
<div class="card click-tile" onclick="ROUTE='sampling';render()"><div class="ic">🧪</div><h3>Sampling</h3><p class="muted">Sample requests — approval se dispatch tak</p></div>
<div class="card click-tile" onclick="ROUTE='postreturn';render()"><div class="ic">↩</div><h3>Dealer Returns</h3><p class="muted">Goods returned by dealers</p></div>
</div>`;
}
const DR_COLS=["DRID","Date","DealerName","ItemsList","Comments","PostedBy","CreatedAt"];
function drRows(){
const m=(window._B2B&&window._B2B.dreturns)||[];
const out=[];
for(let i=1;i<m.length;i++){
const r=m[i]; if(!r || !String(r[0]||"").trim()) continue;
const o={_row:i+1}; DR_COLS.forEach((c,j)=>o[c]=r[j]!==undefined?r[j]:"");
out.push(o);
}
return out;
}
function b2bDealers(){ return b2bDealerRows().map(d=>d.DealerName); }
function b2bDealerRows(){
const m=(window._B2B&&window._B2B.dealers)||[];
const out=[];
for(let i=1;i<m.length;i++){
const r=m[i]||[];
const nm=String(r[0]||"").trim(); if(!nm) continue;
out.push({DealerName:nm, Area:String(r[1]||"").trim(), Potential:String(r[2]||"").trim().toUpperCase(), Phone:String(r[3]||"").trim(), Notes:String(r[4]||"").trim()});
}
return out.sort((a,b)=>a.DealerName.localeCompare(b.DealerName));
}
function dealerFreqDays(pot){ return pot==="A"?7 : pot==="B"?15 : pot==="C"?30 : pot==="D"?45 : 30; }
function dealerLastVisit(name){
let last="";
visitRows().forEach(v=>{
if(String(v.DealerName).trim().toLowerCase()!==String(name).trim().toLowerCase()) return;
if(v.Status!=="Done") return;
if(String(v.Date)>last) last=String(v.Date).slice(0,10);
});
return last;
}
function dealerDueInfo(d){
const last=dealerLastVisit(d.DealerName);
const freq=dealerFreqDays(d.Potential);
if(!last) return {last:"", overdue:9999, txt:"Never visited", never:true};
const days=Math.round((new Date(todayStr()+"T00:00:00") - new Date(last+"T00:00:00"))/86400000);
return {last:last, overdue:days-freq, days:days, txt:days+" days ago", never:false};
}
/** ===== v18: ADD DEALER + AI WEEKLY MARKET PLAN + WEEK VIEW ===== */
const dlKey=s=>String(s||"").trim().toLowerCase();
function mvYmd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function mvMondayOf(offsetWeeks){ const d=new Date(todayStr()+"T00:00:00"); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow+(offsetWeeks||0)*7); return mvYmd(d); }
function mvWeekDates(ws){ const out=[]; const d=new Date(ws+"T00:00:00"); for(let i=0;i<6;i++){ out.push(mvYmd(d)); d.setDate(d.getDate()+1);} return out; } // Mon..Sat
function aiNextMonday(){ const d=new Date(todayStr()+"T00:00:00"); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()+(7-dow)); return mvYmd(d); }
function b2bBeats(){
const m=(window._B2B&&window._B2B.beats)||[];
const s=new Set();
for(let i=1;i<m.length;i++){ const b=String((m[i]||[])[0]||"").trim(); if(b) s.add(b.toUpperCase()); }
b2bDealerRows().forEach(d=>{ if(d.Area) s.add(d.Area.toUpperCase()); });
return [...s].sort();
}
/* ---- ADD NEW DEALER (Admin + MA) ---- */
function openAddDealer(){
const beats=b2bBeats();
openModal("＋ Add New Dealer", `
<label>Dealer name <span class="req">*</span></label><input id="nd-name" autocomplete="off" placeholder="jaise: SHARMA TILES SAMRALA">
<label>Phone number</label><input id="nd-phone" inputmode="numeric" placeholder="10-digit mobile (optional)">
<label>Beat / Route <span class="req">*</span></label>
<select id="nd-beat" onchange="$('nd-newbeat-wrap').style.display=this.value==='__new'?'block':'none'">
<option value="">— Select beat —</option>
${beats.map(b=>`<option>${esc(b)}</option>`).join("")}
<option value="__new">➕ Add new beat…</option>
</select>
<div id="nd-newbeat-wrap" style="display:none"><label>New beat name <span class="req">*</span></label><input id="nd-newbeat" placeholder="jaise: SAMRALA ROAD"></div>
<label>Potential <span class="req">*</span></label>
<select id="nd-pot">
<option value="">— Select —</option>
<option value="A">A — 2 Lac+ / month</option>
<option value="B">B — 1-2 Lac / month</option>
<option value="C">C — 1 Lac se kam</option>
<option value="D">D — abhi applicable nahi</option>
</select>
<p class="muted" style="font-size:.76rem;margin-top:.4rem">Visit frequency: A = har hafte · B = 15 din · C = 30 din · D = 45 din</p>
<div style="margin-top:1rem"><button class="btn" onclick="saveAddDealer()">✅ Save dealer</button></div>`);
}
async function saveAddDealer(){
const name=$("nd-name").value.trim(), phone=$("nd-phone").value.trim(), pot=$("nd-pot").value;
let beat=$("nd-beat").value;
if(beat==="__new") beat=$("nd-newbeat").value.trim().toUpperCase();
if(!name) return toast("Dealer ka naam likho.");
if(!beat) return toast("Beat chuno ya nayi beat ka naam likho.");
if(!pot) return toast("Potential (A/B/C/D) chuno.");
if(phone && phone.replace(/\D/g,"").length<10) return toast("Phone 10 digit ka do, ya khaali chhod do.");
if(b2bDealerRows().some(d=>dlKey(d.DealerName)===dlKey(name))) return toast("Ye dealer already list mein hai.");
busy(true,"Saving dealer…");
try{
const res=await gsRun("addB2BDealer",[name,beat,pot,phone,USER.Name]);
if(!window._B2B.dealers || !window._B2B.dealers.length) window._B2B.dealers=[["DealerName","Area","Potential","Phone","Notes","AddedBy","AddedAt"]];
window._B2B.dealers.push([name,beat,pot,phone,"",USER.Name,nowStr()]);
if(res&&res.newBeat){ if(!window._B2B.beats||!window._B2B.beats.length) window._B2B.beats=[["Beats"]]; window._B2B.beats.push([beat]); }
busy(false); closeModal(); toast("Dealer added ✓ — "+name+" ("+beat+" · Potential "+pot+")"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* ---- PLAN CHOICE: Self ya AI ---- */
function openPlanChoice(){
openModal("🗓 Create Market Plan", `
<div class="grid g2">
<div class="card click-tile" style="padding:1.6rem 1rem" onclick="openMarketPlan()"><div class="ic">✍️</div><h3>Self Plan</h3><p class="muted" style="font-size:.8rem">Khud dealers tick karke kisi bhi din ka plan banao</p></div>
<div class="card click-tile" style="padding:1.6rem 1rem" onclick="window._aiwk=null;openAIWeekPlan()"><div class="ic">🤖</div><h3>AI Weekly Plan</h3><p class="muted" style="font-size:.8rem">AI pura agla hafta bana dega — beats, potential, followups, samples sab dekh kar</p></div>
</div>`);
}
/* ---- AI WEEKLY PLAN — rule engine (koi API nahi, instant + explainable)
 *  1) Pichhle 14 din mein dispatched samples → feedback visit MANDATORY
 *  2) Week mein pehle se Planned visits (followup commitments) apni date par fixed (🔒)
 *  3) Frequency due: A=7d B=15d C=30d D=45d — jitna overdue utna upar, potential ka weight alag
 *  4) Beat clustering — ek din ek hi route (bada beat agle din continue)
 *  5) Max 4 dealers/din suggest; MA edit karke badal sakta hai ---- */
function aiWeekDraft(){
const ws=aiNextMonday(), days=mvWeekDates(ws);
const me=USER.Name;
const all=visitRows();
const my=all.filter(v=>String(v.MA)===me);
const pinned={}; days.forEach(d=>pinned[d]=[]);
const inWeek=new Set();
my.forEach(v=>{ const d=String(v.Date).slice(0,10); if(v.Status==="Planned" && days.indexOf(d)>-1){ pinned[d].push(v); inWeek.add(dlKey(v.DealerName)); } });
const dl=b2bDealerRows(); const dmap={}; dl.forEach(x=>dmap[dlKey(x.DealerName)]=x);
const mand={};
sampRows().forEach(s=>{
if(String(s.MA)!==me || s.Status!=="Dispatched" || !s.DispatchedAt) return;
const dd=String(s.DispatchedAt).slice(0,10);
if(dd>=ws) return;
const gap=Math.round((new Date(ws+"T00:00:00")-new Date(dd+"T00:00:00"))/86400000);
if(gap>14) return;
const k=dlKey(s.DealerName);
const visited=all.some(v=>v.Status==="Done" && dlKey(v.DealerName)===k && String(v.Date).slice(0,10)>=dd);
if(!visited && !inWeek.has(k)) mand[k]="🧪 Samples "+fmtDate(dd)+" ko dispatch hue — feedback visit (mandatory)";
});
const potW=p=>p==="A"?40:p==="B"?25:p==="C"?10:0;
const toWs=Math.round((new Date(ws+"T00:00:00")-new Date(todayStr()+"T00:00:00"))/86400000);
const cands=[];
dl.forEach(d=>{
const k=dlKey(d.DealerName);
if(inWeek.has(k)) return;
const due=dealerDueInfo(d), freq=dealerFreqDays(d.Potential);
let sc=0, why="", isM=!!mand[k];
if(isM){ sc=1000; why=mand[k]; }
else if(due.never){ sc=60+potW(d.Potential); why="🆕 Kabhi visit nahi hui — pehli visit"+(d.Potential?" ("+d.Potential+" potential)":""); }
else{
const atEnd=due.days+toWs+5; // week ke aakhri din tak itne din ho jayenge
if(atEnd<freq) return; // is week due hi nahi
sc=Math.min(59,atEnd-freq)+potW(d.Potential);
why=(d.Potential||"?")+" potential · last visit "+fmtDate(due.last)+" ("+due.days+" din pehle · har "+freq+" din due)";
}
cands.push({name:d.DealerName, beat:d.Area||"(No beat)", pot:d.Potential, sc:sc, why:why, mand:isM});
});
// mandatory dealer jo DealerList mein nahi (sirf sampling record mein) — usse bhi lo
Object.keys(mand).forEach(k=>{
if(cands.some(c=>dlKey(c.name)===k)) return;
const s=sampRows().find(x=>dlKey(x.DealerName)===k);
if(s) cands.push({name:s.DealerName, beat:"(No beat)", pot:"", sc:1000, why:mand[k], mand:true});
});
const byBeat={};
cands.forEach(c=>{ (byBeat[c.beat]=byBeat[c.beat]||[]).push(c); });
const beats=Object.keys(byBeat).map(b=>{
const list=byBeat[b].sort((x,y)=>y.sc-x.sc);
return {beat:b, list:list, sc:list.slice(0,4).reduce((s,x)=>s+x.sc,0)+(list.some(x=>x.mand)?5000:0)};
}).sort((a,b)=>b.sc-a.sc);
const CAP=4;
const daysOut=days.map(d=>({date:d, items:pinned[d].map(v=>{
const info=dmap[dlKey(v.DealerName)]||{};
return {name:v.DealerName, beat:info.Area||"", pot:info.Potential||"", why:"🔒 "+(v.PlanComments||"Pehle se planned"), existing:true, vid:v.VisitID};
})}));
let bi=0;
for(let di=0; di<daysOut.length; di++){
const day=daysOut[di];
while(day.items.length<CAP && bi<beats.length){
const b=beats[bi];
while(day.items.length<CAP && b.list.length) day.items.push(b.list.shift());
if(!b.list.length) bi++; else break; // beat bacha → agle din wahi beat continue
}
}
let leftovers=[].concat.apply([],beats.map(b=>b.list));
const mandLeft=leftovers.filter(c=>c.mand);
leftovers=leftovers.filter(c=>!c.mand);
mandLeft.forEach(c=>{ daysOut.slice().sort((a,b)=>a.items.length-b.items.length)[0].items.push(c); });
return {ws:ws, days:daysOut, skipped:leftovers.length};
}
function openAIWeekPlan(){
if(!window._B2B) return toast("Data load ho raha hai — thoda ruko.");
if(!window._aiwk) window._aiwk=aiWeekDraft();
renderAIWeekPlan();
}
function renderAIWeekPlan(){
const W=window._aiwk;
const dayShort=["Mon","Tue","Wed","Thu","Fri","Sat"];
const total=W.days.reduce((s,d)=>s+d.items.length,0);
const newCnt=W.days.reduce((s,d)=>s+d.items.filter(i=>!i.existing).length,0);
const inPlan=new Set(); W.days.forEach(d=>d.items.forEach(i=>inPlan.add(dlKey(i.name))));
const addable=dealerNames().filter(n=>!inPlan.has(dlKey(n)));
openModal("🤖 AI Weekly Plan — "+fmtDate(W.ws)+" se", `
<p class="muted" style="font-size:.77rem;margin-bottom:.5rem">Rules: 🧪 sample-dispatch feedback mandatory · 🔒 committed followups fixed · A=7d B=15d C=30d D=45d · ek din ek beat · ~4 dealers/din. Kuch bhi hatao, din badlo ya add karo — fer Submit.</p>
${W.skipped?`<div class="muted" style="font-size:.77rem;margin-bottom:.5rem">ℹ️ ${W.skipped} due dealers is week fit nahi hue — agle week auto-suggest ho jayenge.</div>`:""}
<datalist id="aiwk-dl">${addable.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
${W.days.map((day,di)=>`
<div class="card" style="margin-bottom:.6rem;padding:.7rem .8rem">
<div style="display:flex;justify-content:space-between;align-items:center">
<b>${dayName(day.date)} <span class="muted" style="font-weight:400;font-size:.77rem">${fmtDate(day.date)}</span></b>
<span class="pill ${day.items.length>4?'p-bad':day.items.length?'p-blue':'p-gray'}">${day.items.length} visits</span>
</div>
${day.items.map((it,ii)=>`
<div style="display:flex;gap:.45rem;align-items:flex-start;padding:.4rem 0;border-bottom:1px dashed var(--line)">
<span style="flex:1;min-width:0">
<b>${esc(it.name)}</b>
${it.pot?`<span class="pill ${it.pot==='A'?'p-bad':it.pot==='B'?'p-warn':'p-gray'}" style="margin-left:.25rem">${esc(it.pot)}</span>`:""}
${it.mand?`<span class="pill p-bad" style="margin-left:.25rem">Mandatory</span>`:""}
${it.beat?`<span class="muted" style="font-size:.73rem"> · ${esc(it.beat)}</span>`:""}
<div class="muted" style="font-size:.72rem">${esc(it.why||"")}</div>
</span>
${it.existing?`<span class="muted" style="font-size:.7rem;white-space:nowrap;margin-top:.2rem">🔒 already planned</span>`:`
<select style="width:auto;padding:.28rem .3rem;font-size:.8rem" onchange="aiMoveItem(${di},${ii},this.value)">
${W.days.map((d2,j)=>`<option value="${j}" ${j===di?'selected':''}>${dayShort[j]}</option>`).join("")}
</select>
<button class="btn small danger" onclick="aiRemoveItem(${di},${ii})">✕</button>`}
</div>`).join("")||`<div class="muted" style="font-size:.8rem;padding:.3rem 0">Koi visit nahi — neeche se add kar sakte ho</div>`}
<div style="display:flex;gap:.4rem;margin-top:.45rem">
<input list="aiwk-dl" id="aiadd-${di}" placeholder="＋ dealer add karo…" style="flex:1;padding:.4rem .5rem;font-size:.85rem">
<button class="btn ghost small" onclick="aiAddItem(${di})">Add</button>
</div>
</div>`).join("")}
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;align-items:center">
<button class="btn" style="background:var(--ok)" onclick="submitAIWeekPlan()">✅ Submit — ${newCnt} nayi visits</button>
<button class="btn ghost" onclick="window._aiwk=null;openAIWeekPlan()">♻️ Regenerate</button>
<span class="muted" style="font-size:.78rem">Total ${total} visits (${total-newCnt} pehle se planned)</span>
</div>`);
}
function aiMoveItem(di,ii,nj){
const W=window._aiwk; nj=parseInt(nj,10);
if(nj===di||isNaN(nj)) return;
const it=W.days[di].items.splice(ii,1)[0];
W.days[nj].items.push(it);
renderAIWeekPlan();
}
function aiRemoveItem(di,ii){
const W=window._aiwk;
const it=W.days[di].items[ii];
if(it.mand && !confirm("Ye visit MANDATORY hai — samples dispatch hue hain, feedback lena zaroori hai. Pakka hatana hai?")) return;
W.days[di].items.splice(ii,1);
renderAIWeekPlan();
}
function aiAddItem(di){
const W=window._aiwk;
const inp=$("aiadd-"+di); const name=((inp&&inp.value)||"").trim();
if(!name) return toast("Dealer ka naam likho ya list se chuno.");
if(W.days.some(d=>d.items.some(i=>dlKey(i.name)===dlKey(name)))) return toast(name+" pehle se plan mein hai.");
const info=b2bDealerRows().find(d=>dlKey(d.DealerName)===dlKey(name))||{};
W.days[di].items.push({name:name, beat:info.Area||"", pot:info.Potential||"", why:"✍️ Khud add kiya", mand:false});
renderAIWeekPlan();
}
async function submitAIWeekPlan(){
const W=window._aiwk;
const objs=[];
W.days.forEach(day=>day.items.forEach(it=>{
if(it.existing) return;
objs.push({VisitID:"V0000", Date:day.date, DealerName:it.name, MA:USER.Name, PlanComments:String(it.why||"AI weekly plan"), Status:"Planned", CreatedBy:USER.Name+" (AI plan)", CreatedAt:nowStr()});
}));
if(!objs.length) return toast("Plan mein koi nayi visit nahi hai.");
if(!confirm(objs.length+" nayi visits plan hongi — "+fmtDate(W.ws)+" wala week. Submit karein?")) return;
busy(true, objs.length+" visits save ho rahi hain…");
try{
const rows=objs.map(o=>B2B_COLS.map(c=>o[c]!==undefined?o[c]:""));
const res=await gsRun("appendVisitsBulk",[rows]);
rows.forEach((r,i)=>{ if(res&&res.ids&&res.ids[i]) r[0]=res.ids[i]; window._B2B.visits.push(r); });
busy(false); closeModal();
window._aiwk=null; window._mvMode="week";
window._mvWkOff=Math.round((new Date(W.ws+"T00:00:00")-new Date(mvMondayOf(0)+"T00:00:00"))/(7*86400000));
toast(objs.length+" visits planned ✓ — pura week ka schedule ready"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* ---- WEEK VIEW — MA apna, Admin sab MAs ka pura week dekh sakta hai ---- */
function vMarketingWeek(){
const off=window._mvWkOff||0;
const ws=mvMondayOf(off), days=mvWeekDates(ws);
const fma=window._mvMA||"all";
let all=visitRows().filter(v=>{ const d=String(v.Date).slice(0,10); return d>=days[0]&&d<=days[5]; });
if(!isMktAdmin()) all=all.filter(v=>String(v.MA)===USER.Name);
else if(fma!=="all") all=all.filter(v=>String(v.MA)===fma);
const planned=all.filter(v=>v.Status==="Planned").length, done=all.filter(v=>v.Status==="Done").length, miss=all.filter(v=>v.Status==="Not Visited").length;
return `
<div class="toolbar">
<button class="btn ghost small" onclick="window._mvWkOff=${off-1};render()">‹ Prev</button>
<span class="pill p-blue">${fmtDate(days[0])} → ${fmtDate(days[5])}${off===0?" · is week":off===1?" · agla week":""}</span>
<button class="btn ghost small" onclick="window._mvWkOff=${off+1};render()">Next ›</button>
${isMktAdmin()? `<select onchange="window._mvMA=this.value;render()">
<option value="all" ${fma==='all'?'selected':''}>All associates</option>
${maUsers().map(u=>`<option ${fma===u.Name?'selected':''}>${esc(u.Name)}</option>`).join("")}</select>` : `<button class="btn dark small" onclick="openPlanChoice()">🗓 Create Market Plan</button>`}
<button class="btn ghost small" onclick="window._mvMode='day';render()">📆 Day view</button>
<button class="btn ghost small" onclick="loadB2B(true).then(()=>render())">⟳</button>
</div>
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
<span class="pill p-warn">Planned: ${planned}</span>
<span class="pill p-ok">Done: ${done}</span>
<span class="pill ${miss?'p-bad':'p-gray'}">Not visited: ${miss}</span>
<span class="pill p-gray">Total: ${all.length}</span>
</div>
<div class="grid g3">
${days.map(d=>{
const list=all.filter(v=>String(v.Date).slice(0,10)===d).sort((a,b)=>a.Status==="Planned"&&b.Status!=="Planned"?-1:1);
const isToday=d===todayStr();
return `<div class="card" style="padding:.75rem .85rem${isToday?';outline:2px solid var(--blue)':''}">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem">
<b>${dayName(d)}${isToday?' <span class="pill p-blue">Aaj</span>':''}</b>
<span class="muted" style="font-size:.76rem">${fmtDate(d)}</span>
</div>
${list.length? list.map(v=>`<div style="padding:.35rem 0;border-bottom:1px dashed var(--line);font-size:.85rem">
<b>${esc(v.DealerName)}</b>
<span class="pill ${v.Status==='Done'?'p-ok':v.Status==='Not Visited'?'p-bad':'p-warn'}" style="margin-left:.25rem">${esc(v.Status)}</span>
${isMktAdmin()?`<div class="muted" style="font-size:.73rem">👤 ${esc(v.MA)}</div>`:""}
${v.PlanComments?`<div class="muted" style="font-size:.72rem">📝 ${esc(v.PlanComments)}</div>`:""}
${v.Status==="Planned"&&!isMktAdmin()?`<div style="margin-top:.3rem"><button class="btn small" onclick="openVisitDone('${v.VisitID}')">✔ Visited</button> <button class="btn small danger" onclick="openVisitMiss('${v.VisitID}')">✖</button></div>`:""}
</div>`).join("") : `<div class="muted" style="font-size:.78rem">—</div>`}
</div>`;
}).join("")}
</div>`;
}
function drCanSee(){
const r=String(USER.Role).toLowerCase();
return isAdmin() || r.indexOf("dispatch assistant")>-1 || r.indexOf("dispatch manager")>-1;
}
function vPostReturn(){
if(!window._B2B){
loadB2B().then(()=>{ if(ROUTE==="postreturn") render(); }).catch(e=>toast("Load failed: "+e.message));
return `<div class="card empty">Loading…</div>`;
}
if(!drCanSee()) return `<div class="card empty">This module is for Dispatch Assistant / Dispatch Manager.</div>`;
const isDA=String(USER.Role).toLowerCase().indexOf("dispatch assistant")>-1;
const drd=(window._drD!==undefined)? window._drD : todayStr();
let list=drRows();
if(drd) list=list.filter(d=>String(d.Date).slice(0,10)===drd);
list.sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
return `
<div class="toolbar">
${(isDA||isAdmin())? `<button class="btn" onclick="openDrForm()">＋ Post Return</button>`:""}
<label style="margin:0">Date</label><input type="date" value="${drd}" onchange="window._drD=this.value;render()" style="max-width:170px">
<button class="btn ghost small" onclick="window._drD='';render()">All dates</button>
${drd===todayStr()? `<span class="pill p-blue">Today's returns</span>` : drd? `<span class="pill p-gray">${drd}</span>` : `<span class="pill p-gray">All</span>`}
<button class="btn ghost small" onclick="loadB2B(true).then(()=>render())">⟳</button>
</div>
${list.length? list.map(d=>`<div class="card" style="margin-bottom:.7rem;border-left:4px solid var(--warn)">
<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
<b style="font-size:1.02rem">${esc(d.DealerName)}</b>
<span class="muted">${esc(d.DRID)} · ${fmtDate(d.Date)}</span></div>
<div style="margin-top:.35rem;font-size:.88rem">${esc(d.ItemsList)}</div>
${d.Comments?`<div class="muted" style="font-size:.82rem;margin-top:.25rem">💬 ${esc(d.Comments)}</div>`:""}
<div class="muted" style="font-size:.78rem;margin-top:.25rem">Posted by ${esc(d.PostedBy)}</div>
</div>`).join("") : `<div class="card empty">No dealer returns posted yet.</div>`}`;
}
function openDrForm(){
openModal("Post Return (goods returned by dealer)", `
<label>Dealer name <span class="req">*</span></label>
<input id="dr-dealer" list="dr-dealers" autocomplete="off" placeholder="🔍 type to search…">
<datalist id="dr-dealers">${b2bDealers().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
<label>Items</label>
<div id="dr-items"></div>
<datalist id="dr-itemlist">${(DB.Items||[]).map(i=>`<option value="${esc(i.Name)}">`).join("")}</datalist>
<button type="button" class="btn ghost small" style="margin:.2rem 0 .5rem" onclick="addDrItemRow()">＋ Add more items</button>
<label>Comments (optional)</label><textarea id="dr-com" rows="2"></textarea>
<div style="margin-top:1rem"><button class="btn" onclick="saveDrReturn()">Submit return</button></div>`);
setTimeout(()=>addDrItemRow(),30);
}
function addDrItemRow(){
const w=$("dr-items"); if(!w) return;
const d=document.createElement("div");
d.className="dr-row"; d.style.cssText="display:grid;grid-template-columns:1fr 72px 84px 34px;gap:.35rem;margin-bottom:.35rem";
d.innerHTML=`<input class="dr-item" list="dr-itemlist" autocomplete="off" placeholder="🔍 Search item…">
<input type="number" class="dr-qty" placeholder="Qty" min="0" step="any">
<select class="dr-unit"><option>Boxes</option><option>Pcs</option></select>
<button type="button" class="btn ghost small" style="padding:.35rem" onclick="this.parentNode.remove()">✕</button>`;
w.appendChild(d);
}
async function saveDrReturn(){
const dl=$("dr-dealer").value.trim();
if(!dl) return toast("Select a dealer.");
const rows=[...document.querySelectorAll("#dr-items .dr-row")];
const items=[];
for(const r of rows){
const nm=r.querySelector(".dr-item").value.trim(), q=num(r.querySelector(".dr-qty").value);
const un=r.querySelector(".dr-unit")? r.querySelector(".dr-unit").value : "Boxes";
if(!nm) continue;
if(q<=0) return toast('"'+nm+'": enter quantity.');
items.push(nm+" ×"+q+" "+un.toLowerCase());
}
if(!items.length) return toast("Add at least one item.");
busy(true,"Posting return…");
try{
const row=DR_COLS.map(c=>({DRID:nextDrId(),Date:todayStr(),DealerName:dl,ItemsList:items.join(" | "),Comments:$("dr-com").value.trim(),PostedBy:USER.Name,CreatedAt:nowStr()})[c]);
const res=await gsRun("appendB2B",["DealerReturns", row]);
window._B2B.dreturns=window._B2B.dreturns||[["h"]];
if(res&&res.id) row[0]=res.id;
window._B2B.dreturns.push(row);
busy(false); closeModal(); toast("Return posted ✓ — visible to the Dispatch Manager"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function nextDrId(){
let mx=0;
drRows().forEach(v=>{ const m=String(v.DRID).match(/^DR(\d+)$/); if(m) mx=Math.max(mx,parseInt(m[1],10)); });
return "DR"+String(mx+1).padStart(4,"0");
}
const DG_TAB="DelegationTasks";
function dgAll(){ return (DB.DelegationTasks||[]); }
function dgMine(){ const me=String(USER.Name).trim().toLowerCase(); return dgAll().filter(t=>String(t.AssignedTo).trim().toLowerCase()===me); }
function dgSeesAll(){ return isAdmin() || String(USER.Role).trim().toUpperCase()==="EA"; }
function dgCanAssign(){ return isAdmin(); }
function dgDayDiff(a,b){ return Math.round((new Date(a+"T00:00:00") - new Date(b+"T00:00:00"))/86400000); }
function dgFlag(t){
const due=String(t.DueDate).slice(0,10);
if(!due) return {c:"gray", txt:"No due date", late:0};
if(t.Status==="Done"){
const dd=dgDayDiff(String(t.DoneAt).slice(0,10), due);
if(dd<=0) return {c:"g", txt:"On time ✓", late:0};
if(dd<=2) return {c:"y", txt:dd+" days late", late:dd};
return {c:"r", txt:dd+" days late", late:dd};
}
const od=dgDayDiff(todayStr(), due);
if(od>2) return {c:"r", txt:od+" days OVERDUE", late:od};
if(od>0) return {c:"y", txt:od+" days OVERDUE", late:od};
return {c:"p", txt: od===0? "Due today!" : ("Due in "+(-od)+" din"), late:0};
}
function dgPill(f){
const cls=f.c==="g"?"p-ok":f.c==="y"?"p-warn":f.c==="r"?"p-bad":f.c==="p"?"p-blue":"p-gray";
return `<span class="pill ${cls}">${esc(f.txt)}</span>`;
}
function dgCard(){
const pend=dgMine().filter(t=>t.Status!=="Done");
if(!pend.length) return "";
const top=[...pend].sort((a,b)=>String(a.DueDate)<String(b.DueDate)?-1:1).slice(0,3);
return `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--warn)">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
<b>📌 Your assigned tasks — ${pend.length} pending</b>
<button class="btn small" onclick="ROUTE='taskmgmt';render()">View / mark Done →</button></div>
${top.map(t=>`<div style="margin-top:.4rem;font-size:.86rem"><b>${esc(t.Title)}</b> ${dgPill(dgFlag(t))} <span class="muted">· ${esc(t.AssignedBy)} assigned</span></div>`).join("")}
</div>`;
}
function vTaskMgmt(){
const tab=window._dgTab||"pending";
const fst=window._dgSt||"all";
let list = dgSeesAll()? dgAll() : dgMine();
if(dgSeesAll() && fst!=="all") list=list.filter(t=>String(t.AssignedTo)===fst);
const pend=list.filter(t=>t.Status!=="Done").sort((a,b)=>String(a.DueDate)<String(b.DueDate)?-1:1);
const done=list.filter(t=>t.Status==="Done").sort((a,b)=>String(a.DoneAt)<String(b.DoneAt)?1:-1);
const rows = tab==="pending"? pend : done;
const staff=(DB.Users||[]).filter(u=>u.Status!=="Inactive").sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
return `
<div class="toolbar">
${dgCanAssign()? `<button class="btn" onclick="openDgAssign()">＋ Assign task</button>`:""}
${dgSeesAll()? `<select onchange="window._dgSt=this.value;render()">
<option value="all" ${fst==='all'?'selected':''}>All staff</option>
${staff.map(u=>`<option ${fst===u.Name?'selected':''}>${esc(u.Name)}</option>`).join("")}</select>`:""}
<button class="btn ${tab==='pending'?'':'ghost'}" onclick="window._dgTab='pending';render()">Pending (${pend.length})</button>
<button class="btn ${tab==='done'?'':'ghost'}" onclick="window._dgTab='done';render()">Completed (${done.length})</button>
</div>
${dgCanAssign()? dgScoreSection() : ""}
${rows.length? rows.map(t=>dgTaskCard(t)).join("") : `<div class="card empty">${tab==='pending'?'No pending tasks. 🎉':'No completed tasks yet.'}</div>`}`;
}
function dgTaskCard(t){
const f=dgFlag(t);
const bl=t.Status==="Done"?(f.c==="g"?"var(--ok)":f.c==="y"?"var(--warn)":"var(--bad)"):(f.c==="r"?"var(--bad)":f.c==="y"?"var(--warn)":"var(--blue)");
const mine=String(t.AssignedTo).trim().toLowerCase()===String(USER.Name).trim().toLowerCase();
return `<div class="card" style="margin-bottom:.7rem;border-left:4px solid ${bl}">
<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center">
<div><b style="font-size:1.02rem">${esc(t.Title)}</b> ${dgPill(f)}
${dgSeesAll()?`<span class="pill p-gray">${esc(t.AssignedTo)}</span>`:""}</div>
<div style="white-space:nowrap">
${mine && t.Status!=="Done"? `<button class="btn small" style="background:var(--ok)" onclick="dgMarkDone('${t.TaskID}')">✅ Done</button>`:""}
<button class="btn small ghost" onclick="openDgComment('${t.TaskID}')">💬 Comment</button>
</div></div>
<div class="muted" style="font-size:.83rem;margin-top:.25rem">${esc(t.AssignedBy)} assigned · Due: ${fmtDate(t.DueDate)}${t.Status==="Done"?` · Done: ${esc(String(t.DoneAt)).slice(0,16)}`:""}</div>
${t.Notes?`<div style="margin-top:.35rem;font-size:.87rem">📝 ${esc(t.Notes)}</div>`:""}
<div style="margin-top:.35rem">
${t.PhotoURL?`<a class="doc-chip" href="${esc(t.PhotoURL)}" target="_blank" rel="noopener">📷 view photo</a> `:""}
${t.VoiceURL?`<a class="doc-chip" href="${esc(t.VoiceURL)}" target="_blank" rel="noopener">🎙 play voice note</a>`:""}
</div>
${t.Comments?`<div style="margin-top:.4rem;font-size:.8rem;background:var(--bg);border-radius:8px;padding:.5rem;white-space:pre-wrap">${esc(t.Comments)}</div>`:""}
</div>`;
}
function openDgAssign(){
const staff=(DB.Users||[]).filter(u=>u.Status!=="Inactive").sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
window._dgPhoto=""; window._dgVoice="";
openModal("Assign task", `
<label>Task title <span class="req">*</span></label><input id="dg-title">
<label>Task for (staff) <span class="req">*</span></label>
<select id="dg-to"><option value="">— Select —</option>${staff.map(u=>`<option>${esc(u.Name)}</option>`).join("")}</select>
<label>Notes</label><textarea id="dg-notes" rows="3"></textarea>
<label>Due date <span class="req">*</span></label><input type="date" id="dg-due" value="${todayStr()}">
<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem">
<button type="button" class="btn ghost small" onclick="$('dg-photo').click()">📷 Attach photo</button><span id="dg-photo-s" class="muted"></span>
<button type="button" class="btn ghost small" onclick="$('dg-voice').click()">🎙 Attach voice note</button><span id="dg-voice-s" class="muted"></span>
</div>
<input type="file" id="dg-photo" accept="image/*" style="display:none" onchange="dgPickPhoto(this)">
<input type="file" id="dg-voice" accept="audio/*" style="display:none" onchange="dgPickVoice(this)">
<p class="muted" style="font-size:.75rem">Voice note: record with your phone recorder and attach it here (or attach an existing file).</p>
<div style="margin-top:1rem"><button class="btn" onclick="saveDgTask()">Assign task</button></div>`);
}
function dgPickPhoto(input){
const f=input.files && input.files[0]; input.value=""; if(!f) return;
const img=new Image();
img.onload=()=>{
const c=document.createElement("canvas");
const s=Math.min(1, 900/Math.max(img.width,img.height));
c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
c.getContext("2d").drawImage(img,0,0,c.width,c.height);
window._dgPhoto=c.toDataURL("image/jpeg",0.7);
$("dg-photo-s").textContent="✓ photo ready";
};
img.src=URL.createObjectURL(f);
}
function dgPickVoice(input){
const f=input.files && input.files[0]; input.value=""; if(!f) return;
if(f.size>4*1024*1024) return toast("Keep the voice note under 4MB.");
const r=new FileReader();
r.onload=()=>{ window._dgVoice=r.result; window._dgVoiceName=f.name; $("dg-voice-s").textContent="✓ "+f.name; };
r.readAsDataURL(f);
}
async function saveDgTask(){
const ti=$("dg-title").value.trim(), to=$("dg-to").value, due=$("dg-due").value;
if(!ti) return toast("Enter a task title.");
if(!to) return toast("Select the staff member this task is for.");
if(!due) return toast("Enter a due date.");
busy(true,"Assigning task…");
try{
let purl="", vurl="";
if(window._dgPhoto){ const r=await gsRun("saveTaskFile",[window._dgPhoto, "task_photo_"+Date.now()+".jpg"]); purl=(r&&r.url)||""; }
if(window._dgVoice){ const r=await gsRun("saveTaskFile",[window._dgVoice, "task_voice_"+Date.now()+"_"+(window._dgVoiceName||"note.m4a")]); vurl=(r&&r.url)||""; }
await appendRow(DG_TAB,{TaskID:nextId(DG_TAB,"TaskID","DG"),Title:ti,Notes:$("dg-notes").value.trim(),AssignedTo:to,AssignedBy:USER.Name,DueDate:due,PhotoURL:purl,VoiceURL:vurl,Status:"Pending",DoneAt:"",Comments:"",CreatedAt:nowStr()});
busy(false); closeModal(); toast("Task assigned ✓ — "+to+" can now see it"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function dgMarkDone(id){
const t=dgAll().find(x=>x.TaskID===id); if(!t) return;
if(!confirm('"'+t.Title+'" — work completed — mark as Done?')) return;
busy(true,"Marking done…");
try{
await updateFields(DG_TAB, t, {Status:"Done", DoneAt:nowStr()});
busy(false); toast("Done ✓ "+(dgFlag(t).c==="g"?"— on time! 👍":"")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openDgComment(id){
openModal("Comment", `
<label>Write a comment</label><textarea id="dg-com" rows="3" placeholder="e.g. waiting for material / will be done by day after"></textarea>
<div style="margin-top:1rem"><button class="btn" onclick="saveDgComment('${id}')">Save comment</button></div>`);
}
async function saveDgComment(id){
const t=dgAll().find(x=>x.TaskID===id); if(!t) return;
const c=$("dg-com").value.trim(); if(!c) return toast("Write a comment.");
busy(true,"Saving…");
try{
const line="["+nowStr().slice(0,16)+" · "+USER.Name+"] "+c;
await updateFields(DG_TAB, t, {Comments:(t.Comments? t.Comments+"\n":"")+line});
busy(false); closeModal(); toast("Comment saved ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function dgWeekRange(anyDate){
const d=new Date(anyDate+"T00:00:00");
const day=(d.getDay()+6)%7; // Mon=0
const mon=new Date(d); mon.setDate(d.getDate()-day);
const sun=new Date(mon); sun.setDate(mon.getDate()+6);
const f=x=>x.toISOString().slice(0,10);
return {from:f(mon), to:f(sun)};
}
function dgScoreSection(){
const emp=window._dgScEmp||"", ref=window._dgScD||todayStr();
const staff=(DB.Users||[]).filter(u=>u.Status!=="Inactive");
const wr=dgWeekRange(ref);
let body="";
if(emp){
const tasks=dgAll().filter(t=>String(t.AssignedTo)===emp && String(t.DueDate).slice(0,10)>=wr.from && String(t.DueDate).slice(0,10)<=wr.to);
const g=tasks.filter(t=>dgFlag(t).c==="g").length;
const y=tasks.filter(t=>dgFlag(t).c==="y").length;
const r=tasks.filter(t=>dgFlag(t).c==="r").length;
const p=tasks.filter(t=>dgFlag(t).c==="p").length;
const scored=tasks.length;
const score=scored? Math.round(g*100/scored) : 0;
body = scored? `
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.5rem 0">
<span class="pill p-ok">🟢 On time: ${g}</span><span class="pill p-warn">🟡 1-2 days late: ${y}</span>
<span class="pill p-bad">🔴 2+ days late/overdue: ${r}</span>${p?`<span class="pill p-blue">⏳ Not yet due: ${p}</span>`:""}
</div>
<div class="card stat ${score>=70?'ok':score>=40?'warn':'bad'}" style="max-width:300px"><div class="v">${score}%</div><div class="l">Score = green ÷ total (${g}/${scored})</div></div>
<div style="margin-top:.6rem">${tasks.map(t=>{const f=dgFlag(t);return `<div style="font-size:.85rem;margin-bottom:.25rem">${f.c==="g"?"🟢":f.c==="y"?"🟡":f.c==="r"?"🔴":"⏳"} <b>${esc(t.Title)}</b> <span class="muted">due ${fmtDate(t.DueDate)}${t.Status==="Done"?" · done "+esc(String(t.DoneAt)).slice(0,10):" · PENDING"}</span></div>`;}).join("")}</div>`
: `<div class="card empty">${esc(emp)} ko is week (${wr.from} se ${wr.to}) had no tasks due this week.</div>`;
}
return `<div class="card" style="margin-bottom:1rem">
<b>📊 Weekly scoring (Monday–Sunday)</b>
<div class="toolbar" style="margin:.5rem 0 0">
<select onchange="window._dgScEmp=this.value;render()">
<option value="">— Choose employee —</option>
${staff.map(u=>`<option ${emp===u.Name?'selected':''}>${esc(u.Name)}</option>`).join("")}</select>
<input type="date" value="${ref}" onchange="window._dgScD=this.value;render()" style="max-width:170px" title="Pick any date of that week">
<span class="pill p-blue">Week: ${wr.from} → ${wr.to}</span>
</div>
${body}
</div>`;
}
function haversineM(lat1,lng1,lat2,lng2){
const R=6371000, r=x=>x*Math.PI/180;
const dLat=r(lat2-lat1), dLng=r(lng2-lng1);
const a=Math.sin(dLat/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;
return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
function officesWithLoc(){ return (DB.Branches||[]).filter(b=>num(b.Lat) && num(b.Lng)); }
function myOffice(){
const offs=officesWithLoc();
if(!offs.length) return null;
if(USER.Branch){ const b=offs.find(x=>x.Name===USER.Branch); if(b) return b; }
return offs[0];
}
function myAttToday(type){
const t=todayStr(), un=String(USER.Username).toLowerCase();
return (DB.Attendance||[]).find(a=>String(a.Username).toLowerCase()===un && String(a.Date).slice(0,10)===t && a.Type===type);
}
/** ===== v16: PER-STAFF SHIFT TIMINGS =====
 *  Har user ke Users tab mein: WeekdayIn/WeekdayOut, SundayPolicy (Off / All / Two), SundayIn/SundayOut.
 *  Khali ho to fallback: branch InTime → 10:00–19:00 (Sunday 10:00–13:30). */
const ATT_GRACE_MIN=10;
const hm2min = t => { const m=String(t||"").match(/^(\d{1,2}):(\d{2})/); return m? (+m[1])*60+(+m[2]) : 0; };
function officeOf(u){
const offs=(DB.Branches||[]);
if(u && u.Branch){ const b=offs.find(x=>x.Name===u.Branch); if(b) return b; }
return offs[0]||null;
}
function isSunday(ds){ try{ return new Date(ds+"T00:00:00").getDay()===0; }catch(e){ return false; } }
function sunPolicy(u){
const p=String((u&&u.SundayPolicy)||"").toLowerCase();
if(p.indexOf("all")>-1||p.indexOf("har")>-1) return "ALL";
if(p.indexOf("2")>-1||p.indexOf("two")>-1) return "TWO";
return "OFF";
}
function shiftFor(u, ds){
if(isSunday(ds)) return {in:String(u.SundayIn||"10:00").slice(0,5), out:String(u.SundayOut||"13:30").slice(0,5), sunday:true};
const off=officeOf(u);
const inT=String(u.WeekdayIn || (off&&off.InTime? String(off.InTime):"") || "10:00").slice(0,5);
return {in:inT, out:String(u.WeekdayOut||"19:00").slice(0,5), sunday:false};
}
function shiftLabel(u){
const w=String(u.WeekdayIn||"10:00").slice(0,5)+"–"+String(u.WeekdayOut||"19:00").slice(0,5);
const p=sunPolicy(u);
const s=p==="OFF"?"Off":(String(u.SundayIn||"10:00").slice(0,5)+"–"+String(u.SundayOut||"13:30").slice(0,5)+(p==="TWO"?" · koi 2":" · sab"));
return w+" · Sun: "+s;
}
function getGPS(){
return new Promise((res,rej)=>{
if(!navigator.geolocation) return rej(new Error("GPS is not available on this device"));
navigator.geolocation.getCurrentPosition(
p=>res({lat:p.coords.latitude, lng:p.coords.longitude, acc:p.coords.accuracy}),
e=>rej(new Error(e.code===1? "Location permission needed — tap Allow in the browser" : "Could not get location — turn GPS on and try again")),
{enableHighAccuracy:true, timeout:15000, maximumAge:0});
});
}
function markAtt(type){
if(myAttToday(type)) return toast("Today's "+type+" attendance is already marked ✓");
window._attPending={type};
let fi=document.getElementById("att-file");
if(!fi){
fi=document.createElement("input");
fi.type="file"; fi.id="att-file"; fi.accept="image/*";
fi.setAttribute("capture","user");
fi.style.position="fixed"; fi.style.left="-9999px"; fi.style.opacity="0";
fi.addEventListener("change",function(){ attSelfiePicked(this); });
document.body.appendChild(fi);
}
fi.click();
}
function attSelfiePicked(input){
const f=input.files && input.files[0]; input.value="";
if(!f) return;
const P=window._attPending; if(!P) return;
const img=new Image();
img.onload=()=>{
const c=document.createElement("canvas");
const s=Math.min(1, 720/Math.max(img.width,img.height));
c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
const ctx=c.getContext("2d");
ctx.drawImage(img,0,0,c.width,c.height);
// --- selfie ke neeche stamp: naam, IN/OUT, date-time, lat/long ---
const lines = [USER.Name+"  ·  "+P.type, nowStr()];
const fs=Math.max(13, Math.round(c.width*0.038));
const bh=Math.round(fs*1.5*lines.length + fs*0.8);
ctx.fillStyle="rgba(0,0,0,0.60)"; ctx.fillRect(0, c.height-bh, c.width, bh);
ctx.fillStyle="#fff"; ctx.textBaseline="top";
lines.forEach((ln,i)=>{ ctx.font=(i===0?"bold ":"")+fs+"px Arial"; ctx.fillText(ln, Math.round(fs*0.6), c.height-bh+Math.round(fs*0.4)+i*Math.round(fs*1.5)); });
const dataUrl=c.toDataURL("image/jpeg",0.68);
openModal("Attendance confirm — "+P.type, `
<div style="text-align:center"><img src="${dataUrl}" style="max-width:240px;border-radius:12px;border:3px solid var(--blue)"></div>
<div class="rowline"><span>Time</span><b>${nowStr().slice(11,16)}</b></div>
<div style="margin-top:1rem;display:flex;gap:.6rem">
<button class="btn" style="background:var(--ok)" onclick="saveAtt()">✅ Mark ${P.type}</button>
<button class="btn ghost" onclick="window._attPending=null;closeModal()">Cancel</button>
</div>`);
window._attPending.img=dataUrl;
};
img.src=URL.createObjectURL(f);
}
async function saveAtt(){
const P=window._attPending; if(!P||!P.img) return;
closeModal(); busy(true,"Saving attendance…");
try{
// v16: apne PERSONAL shift time se late count (Sunday ka alag time) + 10 min grace
// v25.1: OUT par bhi — shift OUT se pehle nikla (grace ke baad) to "early-out" minutes LateBy mein (late count hota hai)
const lateBy=attLateCalc(USER, todayStr(), P.type, nowStr().slice(11,16));
const rec={AttID:nextId("Attendance","AttID","AT"),Name:USER.Name,Username:USER.Username,Date:todayStr(),Time:nowStr().slice(11,19),
Type:P.type,Lat:"",Lng:"",DistanceM:"",SelfieURL:"",LateBy:lateBy,Timestamp:nowStr()};
const res=await gsRun("saveAttendance",[rec, P.img]);
rec.SelfieURL=(res&&res.url)||"";
DB.Attendance=DB.Attendance||[]; DB.Attendance.push(rec);
window._attPending=null;
busy(false); toast(P.type==="IN"? (lateBy>0? "IN marked ✓ — "+lateBy+" min late" : "IN marked ✓ — on time! 👍") : (lateBy>0? "OUT marked ✓ — shift se "+lateBy+" min pehle (early-out count hoga)" : "OUT marked ✓")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* v25.1: IN → shift IN ke baad kitne min late; OUT → shift OUT se kitne min PEHLE nikla (dono par grace). 0 = theek. */
function attLateCalc(u, ds, type, hm){
const sh=shiftFor(u, ds);
const raw = type==="IN" ? hm2min(hm)-hm2min(sh.in) : hm2min(sh.out)-hm2min(hm);
return raw>ATT_GRACE_MIN ? raw : 0;
}
function attIsManual(a){ return /^Manual/i.test(String(a.DistanceM||"")); }
/* v25.1: Admin manual attendance entry — kisi bhi employee ki IN/OUT, date + time se; LateBy/early-out auto */
function openAttManual(){
if(!isAdmin()) return;
const users=(DB.Users||[]).filter(u=>u.Status!=="Inactive").sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
openModal("✍️ Manual attendance entry (Admin)", `
<label>Employee <span class="req">*</span></label><select id="am-u">${users.map(u=>`<option value="${esc(u.Username)}">${esc(u.Name)} — ${esc(u.Role)}${u.Branch?" ("+esc(u.Branch)+")":""}</option>`).join("")}</select>
<div class="form-grid">
<div><label>Date <span class="req">*</span></label><input type="date" id="am-d" value="${todayStr()}" max="${todayStr()}"></div>
<div><label>Type <span class="req">*</span></label><select id="am-t"><option>IN</option><option>OUT</option></select></div>
<div><label>Time <span class="req">*</span></label><input type="time" id="am-hm"></div>
<div><label>Reason / note</label><input id="am-note" placeholder="e.g. phone kharab tha, field duty"></div>
</div>
<p class="muted" style="font-size:.75rem">Late / early-out employee ke shift time se auto calculate hoga (${ATT_GRACE_MIN} min grace). Entry par ✍️ Manual + aapka naam dikhega.</p>
<div style="margin-top:1rem"><button class="btn" onclick="saveAttManual()">Save entry</button></div>`);
}
async function saveAttManual(){
const un=$("am-u").value, ds=$("am-d").value, type=$("am-t").value, hm=$("am-hm").value, note=$("am-note").value.trim();
const u=(DB.Users||[]).find(x=>x.Username===un); if(!u) return toast("Employee chuno.");
if(!ds||!hm) return toast("Date aur time dono mandatory.");
if(ds>todayStr()) return toast("Future date par attendance nahi lag sakti.");
const dup=(DB.Attendance||[]).find(a=>String(a.Username).toLowerCase()===un.toLowerCase() && String(a.Date).slice(0,10)===ds && a.Type===type);
if(dup) return toast(u.Name+" ki "+ds+" "+type+" entry pehle se hai ("+String(dup.Time).slice(0,5)+")"+(attIsManual(dup)?" — manual":"")+". Sheet se hata kar dobara karo.");
if(type==="OUT"){ const inR=(DB.Attendance||[]).find(a=>String(a.Username).toLowerCase()===un.toLowerCase() && String(a.Date).slice(0,10)===ds && a.Type==="IN"); if(inR && hm2min(hm)<=hm2min(String(inR.Time).slice(0,5))) return toast("OUT time IN ("+String(inR.Time).slice(0,5)+") se pehle nahi ho sakta."); }
const lateBy=attLateCalc(u, ds, type, hm);
if(!saveOnce("att:"+un+ds+type)) return; // v33.2
const rec={AttID:nextId("Attendance","AttID","AT"),Name:u.Name,Username:u.Username,Date:ds,Time:hm+":00",Type:type,Lat:"",Lng:"",DistanceM:"Manual by "+USER.Name+(note?" — "+note:""),SelfieURL:"",LateBy:lateBy,Timestamp:nowStr()};
busy(true,"Saving manual entry…");
try{
await appendRow("Attendance", rec);
DB.Attendance=DB.Attendance||[]; DB.Attendance.push(rec);
busy(false); closeModal(); toast("✍️ "+u.Name+" "+type+" "+ds+" "+hm+" saved"+(lateBy?(type==="IN"?" — "+lateBy+" min late":" — "+lateBy+" min jaldi gaya"):"")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
finally{ saveDone("att:"+un+ds+type); }
}
/* v30: Admin → staff ko WhatsApp par attendance report (date range, multi-select). Free-text pehle; window band ho to
 *  ERP PendingMsgs mein queue + nudge template (erp_pending_message) — bot user ke agle reply par report deliver karta hai. */
function openAttSend(){
if(!isAdmin()) return;
const t=todayStr(); const users=(DB.Users||[]).filter(u=>u.Status!=="Inactive" && !/admin|switch/i.test(String(u.Role||"")) && String(u.Phone||"").replace(/\D/g,"").length>=10).sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
const noPh=(DB.Users||[]).filter(u=>u.Status!=="Inactive" && !/admin|switch/i.test(String(u.Role||"")) && String(u.Phone||"").replace(/\D/g,"").length<10).map(u=>u.Name);
openModal("📤 Attendance report WhatsApp par bhejo", `
<div class="form-grid"><div><label>From</label><input type="date" id="as-from" value="${t.slice(0,8)}01" max="${t}"></div><div><label>To</label><input type="date" id="as-to" value="${t}" max="${t}"></div></div>
<label style="margin-top:.6rem">Users <span class="req">*</span> <a href="javascript:void 0" onclick="document.querySelectorAll('.as-u').forEach(c=>c.checked=true)" style="font-weight:400">sab</a> · <a href="javascript:void 0" onclick="document.querySelectorAll('.as-u').forEach(c=>c.checked=false)" style="font-weight:400">koi nahi</a></label>
<div style="max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:.4rem .6rem">
${users.map(u=>`<label style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0;text-transform:none;font-weight:500;cursor:pointer"><input type="checkbox" class="as-u" value="${esc(u.Username)}" style="width:auto"> ${esc(u.Name)} <span class="muted" style="font-size:.72rem">${esc(u.Role)}${u.Branch?" · "+esc(u.Branch):""}</span></label>`).join("")||"<div class='empty'>Koi user nahi (phone chahiye)</div>"}
</div>
${noPh.length?`<p class="muted" style="font-size:.72rem">Phone nahi hai: ${esc(noPh.join(", "))}</p>`:""}
<p class="muted" style="font-size:.72rem">Har user ko uski apni report: date-wise IN/OUT, total present/absent/half day/late. Jisne 24h mein Ziva ko msg nahi kiya, use pehle "report ready hai — ok reply karo" template jayega; reply par Ziva poori report bhej degi.</p>
<div style="margin-top:1rem"><button class="btn" onclick="sendAttReports()">📤 Send</button></div>`);
}
function attReportText(u, from, to){
const R=attRangeData(u, from, to);
const dd=d=>d.slice(8,10)+"/"+d.slice(5,7);
let m="🕘 *Attendance report — "+u.Name+"*\n"+dd(from)+"/"+from.slice(0,4)+" se "+dd(to)+"/"+to.slice(0,4)+" tak\n\n";
R.days.forEach(x=>{
const inT=x.R&&x.R.IN? String(x.R.IN.Time).slice(0,5) : "—", outT=x.R&&x.R.OUT? String(x.R.OUT.Time).slice(0,5) : "—";
let tag=""; if(x.status==="Late"){ const a=[]; if(x.R.IN&&num(x.R.IN.LateBy)>0) a.push(x.R.IN.LateBy+"m late"); if(x.R.OUT&&num(x.R.OUT.LateBy)>0) a.push(x.R.OUT.LateBy+"m jaldi"); tag=" ⚠️ "+a.join(", "); }
else if(x.status==="Half Day") tag=" 🟠 half day"; else if(x.status==="Absent") tag=" ❌ ABSENT"; else if(x.status==="Sunday Off"||x.status==="Sunday") tag=" (Sun)";
m+=dd(x.ds)+(x.sun?" Sun":"")+"  IN "+inT+"  OUT "+outT+tag+"\n";
});
m+="\n📊 *Total*: Present "+R.present+" · Absent "+R.absent+" · Half day "+R.half+" · Late/early "+R.late+(R.pol==="TWO"?" · Sunday duty "+R.sunDone+"/2":"")+"\n\n— Ziva, Bansal Tiles";
return m;
}
async function sendAttReports(){
const from=$("as-from").value, to=$("as-to").value; if(!from||!to||from>to) return toast("Date range sahi chuno.");
const sel=[...document.querySelectorAll(".as-u:checked")].map(c=>c.value); if(!sel.length) return toast("Kam se kam ek user chuno.");
if(!window._attFull){ try{ await loadAllData("Attendance history…",["Attendance"]); window._attFull=1; }catch(e){} }
busy(true,"Reports bhej rahe hain… 0/"+sel.length);
let sent=0, queued=0, fail=[];
for(let i=0;i<sel.length;i++){
const u=(DB.Users||[]).find(x=>x.Username===sel[i]); if(!u) continue;
try{
const r=await gsRun("zivaSendOrQueue",[u.Phone, attReportText(u, from, to), "attendance report"]);
if(r&&r.queued) queued++; else sent++;
}catch(e){ fail.push(u.Name+": "+String(e.message).slice(0,60)); }
busy(true,"Reports bhej rahe hain… "+(i+1)+"/"+sel.length);
}
busy(false); closeModal();
alog("att_report_send", from+"→"+to+" · "+sel.length+" users", sel.length);
toast("✅ "+sent+" bheje"+(queued?" · ⏳ "+queued+" queue (reply par milenge)":"")+(fail.length?" · ❌ "+fail.length+" fail":""), 6000);
if(fail.length) setTimeout(()=>alert("Fail:\n"+fail.join("\n")), 300);
}
function attBanner(){
if(!window._p2) return ""; // v27: Attendance tab abhi aaya nahi — galat "not marked" mat dikhao
if(myAttToday("IN")) return "";
return `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--bad);display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
<b>🕘 Today's attendance is not marked yet!</b>
<button class="btn" onclick="markAtt('IN')">📸 Mark my attendance (IN)</button>
</div>`;
}
/** v16: MONTHLY ATTENDANCE REPORT — kisi user ka poora month:
 *  Present / Absent / Half Day / Late, Sunday policy ke hisaab se. */
/* v30: attMonthData → generic attRangeData(u, from, to); month = range ka special case */
function attMonthData(u, ym){ const y=+ym.slice(0,4), m=+ym.slice(5,7); const dim=new Date(y,m,0).getDate(); return attRangeData(u, ym+"-01", ym+"-"+String(dim).padStart(2,"0")); }
function attRangeData(u, from, to){
const today=todayStr();
const byDate={};
(DB.Attendance||[]).forEach(a=>{
if(String(a.Username).toLowerCase()!==String(u.Username).toLowerCase()) return;
const ds=String(a.Date).slice(0,10);
if(ds<from||ds>to) return;
byDate[ds]=byDate[ds]||{};
if(a.Type==="IN" && !byDate[ds].IN) byDate[ds].IN=a;
if(a.Type==="OUT") byDate[ds].OUT=a;
});
const joined=String(u.CreatedAt||"").slice(0,10);
const pol=sunPolicy(u);
let present=0,absent=0,half=0,late=0,sunDone=0;
const days=[];
const cur=new Date(from+"T00:00:00"), end=new Date(to+"T00:00:00");
for(; cur<=end; cur.setDate(cur.getDate()+1)){
const ds=cur.getFullYear()+"-"+String(cur.getMonth()+1).padStart(2,"0")+"-"+String(cur.getDate()).padStart(2,"0");
if(ds>today) break;
if(joined && ds<joined) continue;
const sun=isSunday(ds);
const R=byDate[ds];
const sh=shiftFor(u, ds);
let status, hrs="";
if(R && R.IN){
present++;
if(sun) sunDone++;
const lb=num(R.IN.LateBy);
const eb=R.OUT? num(R.OUT.LateBy) : 0; // v25.1: OUT row ka LateBy = early-out minutes
if(lb>0||eb>0) late++;
status = (lb>0||eb>0) ? "Late" : "Present";
if(R.OUT){
const worked=hm2min(String(R.OUT.Time))-hm2min(String(R.IN.Time));
const shMin=Math.max(60, hm2min(sh.out)-hm2min(sh.in));
// Half day = kaam ke ghante shift ke AADHE se kam (IN–OUT se auto)
if(worked>0 && worked<shMin/2){ half++; status="Half Day"; }
if(worked>0) hrs=Math.floor(worked/60)+"h "+(worked%60)+"m";
}
} else if(sun){
if(pol==="ALL" && ds<today){ status="Absent"; absent++; } else status = pol==="OFF" ? "Sunday Off" : "Sunday";
} else if(ds<today){ status="Absent"; absent++; }
else status="—";
days.push({ds,sun,R,status,hrs});
}
return {present,absent,half,late,sunDone,pol,days};
}
function vAttendance(){
const inA=myAttToday("IN"), outA=myAttToday("OUT");
const d=window._attD||todayStr();
/* v25: Manager ko apni branch ki team ki attendance (daily table + monthly report dropdown) — Admin ko sab */
const canTeam=isAdmin()||(USER.Role==="Manager" && !!USER.Branch); // v34: cover-manager ko team attendance nahi
const teamUsers=(DB.Users||[]).filter(u=>u.Status!=="Inactive" && (isAdmin() || (String(u.Branch||"")===String(USER.Branch||"") && u.Role!=="Admin")));
const teamUN=new Set(teamUsers.map(u=>String(u.Username)));
const team=(DB.Attendance||[]).filter(a=>String(a.Date).slice(0,10)===d && (isAdmin() || teamUN.has(String(a.Username)))).sort((a,b)=>a.Time<b.Time?-1:1);
const mySh=shiftFor(USER, todayStr());
const ym=window._attYM||todayStr().slice(0,7);
let repU=USER;
if(canTeam && window._attRepU){ const x=teamUsers.find(u=>u.Username===window._attRepU); if(x) repU=x; }
const rep=attMonthData(repU, ym);
return `
<div class="grid g2">
<div class="card" style="text-align:center;padding:1.6rem 1rem;border-left:4px solid ${inA?'var(--ok)':'var(--warn)'}">
<div style="font-size:2rem">🌅</div><h3>IN</h3>
${inA? `<p><span class="pill p-ok">Marked ✓ ${esc(inA.Time).slice(0,5)}</span>${num(inA.LateBy)>0?` <span class="pill p-bad">${inA.LateBy} min late</span>`:` <span class="pill p-ok">On time</span>`}</p>`
: `<button class="btn" onclick="markAtt('IN')">📸 Mark IN</button>`}
</div>
<div class="card" style="text-align:center;padding:1.6rem 1rem;border-left:4px solid ${outA?'var(--ok)':'var(--line)'}">
<div style="font-size:2rem">🌆</div><h3>OUT</h3>
${outA? `<p><span class="pill p-ok">Marked ✓ ${esc(outA.Time).slice(0,5)}</span></p>`
: inA? `<button class="btn dark" onclick="markAtt('OUT')">📸 Mark OUT</button>` : `<p class="muted">Mark IN first</p>`}
</div>
</div>
<p class="muted" style="margin-top:.5rem">📸 Mark attendance from the office selfie spot — your name and date-time get stamped on the photo automatically. Aapka aaj ka time: <b>${esc(mySh.in)}–${esc(mySh.out)}</b>${mySh.sunday?" (Sunday)":""} — IN time + ${ATT_GRACE_MIN} min grace ke baad late count hota hai.</p>
${canTeam? `
<div class="toolbar" style="margin-top:1rem">
${isAdmin()?`<button class="btn dark small" onclick="openOfficeLocForm()">⚙ Set office location</button><button class="btn small" onclick="openAttManual()">✍️ Manual entry</button><button class="btn small dark" onclick="openAttSend()">📤 Send report (WhatsApp)</button>`:`<span class="pill p-blue">📍 ${esc(USER.Branch)} team</span>`}
<label style="margin:0">Team attendance</label><input type="date" value="${d}" onchange="window._attD=this.value;render()" style="max-width:170px">
</div>
${team.length? `<div class="tbl-wrap"><table><tr><th>Employee</th><th>Type</th><th>Time</th><th>Late</th><th>Selfie</th></tr>
${team.map(a=>`<tr class="${num(a.LateBy)>0?'row-yellow':''}"><td><b>${esc(a.Name)}</b>${attIsManual(a)?`<div class="muted" style="font-size:.68rem">✍️ ${esc(a.DistanceM)}</div>`:""}</td>
<td><span class="pill ${a.Type==='IN'?'p-blue':'p-gray'}">${esc(a.Type)}</span></td>
<td>${esc(String(a.Time)).slice(0,5)}</td>
<td>${num(a.LateBy)>0? `<span class="pill p-bad">${a.LateBy} min ${a.Type==='IN'?'late':'jaldi gaya'}</span>`:`<span class="pill p-ok">On time</span>`}</td>
<td>${a.SelfieURL? `<a class="doc-chip" href="${esc(a.SelfieURL)}" target="_blank" rel="noopener">📷 View</a>`:"—"}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">${d} — no attendance marked on this date.</div>`}` : ""}
<div class="section-h"><h3>${repU.Username===USER.Username?"My monthly report":"Monthly report — "+esc(repU.Name)}</h3><div class="ln"></div></div>
<div class="toolbar">
<input type="month" value="${ym}" onchange="window._attYM=this.value;render()" style="max-width:190px;flex:0 1 auto">
${canTeam? `<select style="max-width:230px" onchange="window._attRepU=this.value;render()">
${teamUsers.map(u=>`<option value="${esc(u.Username)}" ${repU.Username===u.Username?'selected':''}>${esc(u.Name)}</option>`).join("")}</select>`:""}
<span class="pill p-gray">Shift: ${esc(shiftLabel(repU))}</span>
${rep.pol==="TWO"?`<span class="pill ${rep.sunDone>=2?'p-ok':'p-warn'}">Sunday duty: ${rep.sunDone}/2 done</span>`:""}
</div>
<div class="grid g4" style="margin-bottom:1rem">
<div class="card stat ok"><div class="v">${rep.present}</div><div class="l">Total Present</div></div>
<div class="card stat bad"><div class="v">${rep.absent}</div><div class="l">Total Absent</div></div>
<div class="card stat warn"><div class="v">${rep.half}</div><div class="l">Total Half Days</div></div>
<div class="card stat warn"><div class="v">${rep.late}</div><div class="l">Late Entries (late IN / early OUT)</div></div>
</div>
${rep.days.length? `<div class="tbl-wrap"><table><tr><th>Date</th><th>Day</th><th>IN</th><th>OUT</th><th>Hours</th><th>Status</th><th>📷</th></tr>
${[...rep.days].reverse().map(x=>{
const pill = x.status==="Present"?"p-ok":x.status==="Late"||x.status==="Half Day"?"p-warn":x.status==="Absent"?"p-bad":"p-gray";
return `<tr class="${x.status==='Absent'?'row-red':x.status==='Half Day'?'row-orange':''}"><td>${fmtDate(x.ds)}</td><td>${x.sun?'<b>Sun</b>':dayName(x.ds).slice(0,3)}</td>
<td>${x.R&&x.R.IN? esc(String(x.R.IN.Time)).slice(0,5)+(num(x.R.IN.LateBy)>0?` <span class="pill p-bad">${x.R.IN.LateBy}m</span>`:"") : "—"}</td>
<td>${x.R&&x.R.OUT? esc(String(x.R.OUT.Time)).slice(0,5)+(num(x.R.OUT.LateBy)>0?` <span class="pill p-bad">${x.R.OUT.LateBy}m jaldi</span>`:"") : "—"}</td>
<td>${x.hrs||"—"}</td>
<td><span class="pill ${pill}">${x.status}</span>${x.status==="Late"?`<div class="muted" style="font-size:.68rem">${[num(x.R.IN.LateBy)>0?"Late IN "+x.R.IN.LateBy+"m":"", x.R.OUT&&num(x.R.OUT.LateBy)>0?"Shaam ko "+x.R.OUT.LateBy+" min jaldi gaya":""].filter(Boolean).join(" · ")}</div>`:""}${x.R&&((x.R.IN&&attIsManual(x.R.IN))||(x.R.OUT&&attIsManual(x.R.OUT)))?`<div class="muted" style="font-size:.68rem">✍️ ${esc([x.R.IN&&attIsManual(x.R.IN)?"IN: "+x.R.IN.DistanceM:"", x.R.OUT&&attIsManual(x.R.OUT)?"OUT: "+x.R.OUT.DistanceM:""].filter(Boolean).join(" · "))}</div>`:""}</td>
<td style="white-space:nowrap">${x.R&&x.R.IN&&x.R.IN.SelfieURL?`<a class="doc-chip" href="${esc(x.R.IN.SelfieURL)}" target="_blank" rel="noopener">IN</a> `:""}${x.R&&x.R.OUT&&x.R.OUT.SelfieURL?`<a class="doc-chip" href="${esc(x.R.OUT.SelfieURL)}" target="_blank" rel="noopener">OUT</a>`:""}${!(x.R&&((x.R.IN&&x.R.IN.SelfieURL)||(x.R.OUT&&x.R.OUT.SelfieURL)))?'<span class="muted">—</span>':""}</td></tr>`;
}).join("")}
</table></div>` : `<div class="card empty">Is month ka koi record nahi.</div>`}`;
}
function openOfficeLocForm(){
const offs=(DB.Branches||[]);
if(!offs.length) return toast("First create a branch from the Users screen.");
openModal("Set office location (Admin)", `
<label>Branch <span class="req">*</span></label><select id="ol-br">${offs.map(b=>`<option value="${b.BranchID}">${esc(b.Name)}</option>`).join("")}</select>
<div class="form-grid">
<div><label>Latitude</label><input id="ol-lat" inputmode="decimal"></div>
<div><label>Longitude</label><input id="ol-lng" inputmode="decimal"></div>
</div>
<button class="btn ghost small" style="margin:.4rem 0" onclick="getGPS().then(g=>{$('ol-lat').value=g.lat.toFixed(6);$('ol-lng').value=g.lng.toFixed(6);toast('Current location filled ✓ (accuracy ~'+Math.round(g.acc)+' m)');}).catch(e=>toast(e.message))">📍 Use my current location (press while standing at office)</button>
<div class="form-grid">
<div><label>Radius (meters)</label><input type="number" id="ol-rad" value="200"></div>
<div><label>Office IN time (later than this = late)</label><input type="time" id="ol-in" value="10:00"></div>
</div>
<div style="margin-top:1rem"><button class="btn" onclick="saveOfficeLoc()">Save office location</button></div>`);
}
async function saveOfficeLoc(){
const b=(DB.Branches||[]).find(x=>x.BranchID===$("ol-br").value); if(!b) return;
const lat=$("ol-lat").value.trim(), lng=$("ol-lng").value.trim();
if(!num(lat)||!num(lng)) return toast("Enter Lat/Lng — or press the 📍 current location button.");
busy(true,"Saving office location…");
try{
await updateFields("Branches", b, {Lat:lat, Lng:lng, RadiusM:num($("ol-rad").value)||200, InTime:$("ol-in").value||"10:00"});
busy(false); closeModal(); toast("Office location saved ✓ — "+b.Name); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function loadTasks(force){
if(window._TASKS && !force) return;
busy(true,"Loading checklist…");
try{ window._TASKS = await gsRun("readTasks"); }
finally{ busy(false); }
}
function taskRowsFrom(m, src){
const out=[];
for(let i=1;i<(m||[]).length;i++){
const r=m[i]; if(!r || !String(r[5]||"").trim()) continue;
out.push({src, name:String(r[0]||"").trim(), dept:String(r[2]||"").trim(), id:String(r[3]||"").trim(), freq:String(r[4]||"").trim(),
task:String(r[5]||"").trim(), planned:dmy(r[6]), plannedRaw:String(r[6]||""), actual:String(r[7]||""), status:String(r[8]||"").trim(), _i:i});
}
return out;
}
function taskRows(kind){
const T=window._TASKS||{};
if(kind==="D") return taskRowsFrom(T.dmaster,"D");
if(kind==="ND") return taskRowsFrom(T.master,"ND");
return taskRowsFrom(T.master,"ND").concat(taskRowsFrom(T.dmaster,"D"));
}
function srcPill(s){ return s==="D" ? `<span class="pill p-blue" style="font-size:.62rem">Daily</span>` : `<span class="pill p-gray" style="font-size:.62rem">Non-Daily</span>`; }
function vTasks(){
if(!window._TASKS){
loadTasks().then(()=>{ if(ROUTE==="tasks") render(); }).catch(e=>toast("Checklist did not load: "+e.message));
return `<div class="card empty">Loading checklist…</div>`;
}
const st=window._tkSt||"pending", fd=window._tkDoer||"all", fdept=window._tkDept||"all", q=window._tkQ||"", ty=window._tkType||"ND";
const t=todayStr();
const meUp=String(USER.Name).trim().toUpperCase();
const mineOnly = !isAdmin();
const all=taskRows(ty);
const base = mineOnly ? all.filter(r=>r.name.toUpperCase()===meUp) : all;
let rows=[...base];
if(fd!=="all") rows=rows.filter(r=>r.name===fd);
if(fdept!=="all") rows=rows.filter(r=>r.dept===fdept);
const isDoneT = r => r.status==="Done" || !!String(r.actual).trim();
if(st==="pending") rows=rows.filter(r=>!isDoneT(r));
if(st==="done") rows=rows.filter(isDoneT);
if(q) rows=rows.filter(r=>(r.task+" "+r.id).toLowerCase().includes(q.toLowerCase()));
rows.sort((a,b)=>(a.planned||"9999-99-99")<(b.planned||"9999-99-99")?-1:1);
if(st==="done") rows.reverse();
const pend=base.filter(r=>r.status!=="Done" && !String(r.actual).trim());
const overdue=pend.filter(r=>r.planned && r.planned<t).length;
const dueToday=pend.filter(r=>r.planned===t).length;
const doers=[...new Set(all.map(r=>r.name).filter(Boolean))].sort();
const depts=[...new Set(all.map(r=>r.dept).filter(Boolean))].sort();
return `
<div class="grid g3">
<div class="card stat ${overdue?'bad':'ok'}"><div class="v">${overdue}</div><div class="l">Overdue tasks</div></div>
<div class="card stat warn"><div class="v">${dueToday}</div><div class="l">Due today</div></div>
<div class="card stat"><div class="v">${pend.length}</div><div class="l">Total pending</div></div>
</div>
<div class="toolbar" style="margin-top:1rem">
<button class="btn ${ty==='ND'?'dark':'ghost'} small" onclick="window._tkType='ND';render()">📋 Non Daily</button>
<button class="btn ${ty==='D'?'dark':'ghost'} small" onclick="window._tkType='D';render()">📅 Daily</button>
<span style="border-left:1px solid var(--line);height:22px"></span>
<button class="btn ${st==='pending'?'':'ghost'} small" onclick="window._tkSt='pending';render()">Pending</button>
<button class="btn ${st==='done'?'':'ghost'} small" onclick="window._tkSt='done';render()">Done</button>
<input id="q-tk" placeholder="🔍 Task / Task ID search…" value="${esc(q)}" oninput="window._tkQ=this.value;window._refocusId=this.id;render()">
${isAdmin()? `<select onchange="window._tkDoer=this.value;render()"><option value="all" ${fd==='all'?'selected':''}>All doers</option>${doers.map(d=>`<option ${fd===d?'selected':''}>${esc(d)}</option>`).join("")}</select>
<select onchange="window._tkDept=this.value;render()"><option value="all" ${fdept==='all'?'selected':''}>All departments</option>${depts.map(d=>`<option ${fdept===d?'selected':''}>${esc(d)}</option>`).join("")}</select>`:""}
<button class="btn ghost small" onclick="loadTasks(true).then(()=>render())">⟳ Reload</button>
</div>
${rows.length? `<div class="tbl-wrap"><table>
<tr><th>Planned</th><th>Task</th><th>Doer</th><th>Dept</th><th>Freq</th><th>Status</th><th></th></tr>
${rows.slice(0,300).map(r=>{
const done=r.status==="Done" || !!String(r.actual).trim();
const late=!done && r.planned && r.planned<t;
const cls=done?"row-green":late?"row-red":(r.planned===t?"row-yellow":"");
return `<tr class="${cls}"><td style="white-space:nowrap">${esc(r.plannedRaw)}</td>
<td><b>${esc(r.task)}</b> <span class="muted">#${esc(r.id)}</span></td>
<td>${esc(r.name)}</td><td>${esc(r.dept)}</td><td>${esc(r.freq)}</td>
<td>${done? `<span class="pill p-ok">Done</span><div class="muted">${esc(String(r.actual).slice(0,10))}</div>` : late? `<span class="pill p-bad">Overdue</span>` : `<span class="pill p-warn">Pending</span>`}</td>
<td>${!done && (isAdmin()||r.name.toUpperCase()===meUp)? `<button class="btn small" onclick="confirmTask('${esc(r.id)}',${r._i},'${r.src}')">✓ Done</button>`:""}</td></tr>`;
}).join("")}
</table></div>
${rows.length>300?`<p class="muted">Sirf pehle 300 dikh rahe hain — filter/search use karo.</p>`:""}` : `<div class="card empty">Nothing found. 🎉</div>`}
<p class="muted" style="margin-top:.6rem">✓ Done dabane par Task ID + timestamp Consolidated tab mein log hota hai — wahi se sheet ki arrayformula ACTUAL bhar deti hai (Google Form waala hi system, sheet ka logic untouched). Naye tasks Task List tab mein hi banao.</p>`;
}
async function markTask(id, idx, kind){
if(!id) return toast("This task's Task ID is empty — check the checklist sheet.");
closeModal();
busy(true,"Marking task done…");
try{
await gsRun("markTaskDone",[id, kind||"ND"]);
const m = (kind==="D") ? window._TASKS.dmaster : window._TASKS.master;
if(m && m[idx]){ m[idx][7]=nowStr(); }
busy(false); toast("Task #"+id+" done ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function myDoerNames(){
const em=String(USER.Username||"").trim().toLowerCase();
const names=new Set();
[(window._TASKS&&window._TASKS.doers)||[], (window._TASKS&&window._TASKS.ddoers)||[]].forEach(dl=>{
for(let i=1;i<dl.length;i++){
const e=String(dl[i][2]||"").trim().toLowerCase();
if(e && em && e===em) names.add(String(dl[i][0]||"").trim().toUpperCase());
}
});
names.add(String(USER.Name||"").trim().toUpperCase());
return names;
}
function myPendingTasks(){
const t=todayStr(); const names=myDoerNames();
return taskRows().filter(r=> names.has(r.name.toUpperCase()) && r.status!=="Done" && !String(r.actual).trim() && r.planned && r.planned<=t)
.sort((a,b)=>(a.planned<b.planned?-1:1));
}
function myTasksCard(){
if(!window._TASKS){
loadTasks().then(()=>{ render(); }).catch(()=>{});
return `<div class="card" style="margin-bottom:1rem"><b>✅ My Tasks for Today</b> <span class="muted">Loading…</span></div>`;
}
const t=todayStr();
const list=myPendingTasks();
return `<div class="card" style="margin-bottom:1rem;border-left:4px solid ${list.length?'var(--warn)':'var(--ok)'}">
<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem;flex-wrap:wrap"><b>✅ My Tasks for Today</b><span class="pill ${list.length?'p-warn':'p-ok'}">${list.length} pending</span></div>
${list.length? list.slice(0,25).map(r=>`<div class="rowline"><span>${srcPill(r.src)} ${r.planned<t?'<span class="pill p-bad">Overdue</span> ':''}<b>${esc(r.task)}</b> <span class="muted">· ${esc(r.plannedRaw)} · #${esc(r.id)}</span></span>
<b><button class="btn small" onclick="confirmTask('${esc(r.id)}',${r._i},'${r.src}')">✓ Done</button></b></div>`).join("")
: `<div class="muted">Aaj ke sab tasks done. 🎉</div>`}
</div>`;
}
function confirmTask(id, idx, kind){
const m=((kind==="D")? (window._TASKS&&window._TASKS.dmaster) : (window._TASKS&&window._TASKS.master))||[]; const r=m[idx]||[];
openModal("Task complete?", `
<p style="font-size:1.05rem;margin:.3rem 0"><b>${esc(r[5]||"")}</b></p>
<p class="muted">Task #${esc(id)} · Planned: ${esc(r[6]||"")}</p>
<p style="margin-top:.9rem">Are you sure you have completed this task?<br><span class="muted">On pressing Yes, the current timestamp is recorded as Actual.</span></p>
<div style="margin-top:1.1rem;display:flex;gap:.6rem">
<button class="btn" style="background:var(--ok)" onclick="markTask('${esc(id)}',${idx},'${kind||"ND"}')">✅ Yes, Done</button>
<button class="btn ghost" onclick="closeModal()">No</button>
</div>`);
}
/* v23: PC role ko MANIK LAL ke checklist tasks Done karne ka right —
 * doer naam normalize karke match (extra spaces / case ignore). Sirf PC role par lagta hai. */
function pcCanDone(r){
if(String(USER.Role).trim().toUpperCase()!=="PC") return false;
return String(r.name||"").toUpperCase().replace(/\s+/g," ").trim().indexOf("MANIK LAL")>-1;
}
function pcChecklistView(){
return deoDashboard();
}
function deoDashboard(){
const tab=window._deoTab||"nondaily";
let body="";
if(tab==="nondaily"){
if(!window._TASKS){ loadTasks().then(()=>render()).catch(()=>{}); body=`<div class="card empty">Loading checklist…</div>`; }
else{
const t=todayStr();
const rows=taskRows("ND").filter(r=>r.status!=="Done" && !String(r.actual).trim() && r.planned && r.planned<=t)
.sort((a,b)=>(a.planned<b.planned?-1:1));
body= rows.length? `<div class="tbl-wrap"><table><tr><th>Planned</th><th>Doer</th><th>Task</th><th>Dept</th><th>Status</th><th></th></tr>
${rows.map(r=>{const late=r.planned<t; return `<tr class="${late?'row-red':'row-yellow'}"><td style="white-space:nowrap">${esc(r.plannedRaw)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.task)} <span class="muted">#${esc(r.id)}</span></td><td>${esc(r.dept)}</td><td>${late?'<span class="pill p-bad">Overdue</span>':'<span class="pill p-warn">Today</span>'}</td><td>${pcCanDone(r)?`<button class="btn small" onclick="confirmTask('${esc(r.id)}',${r._i},'${r.src}')">✓ Done</button>`:""}</td></tr>`;}).join("")}
</table></div>` : `<div class="card empty">All tasks done — no one needs a call. 🎉</div>`;
}
} else {
if(!window._TASKS){ loadTasks().then(()=>render()).catch(()=>{}); body=`<div class="card empty">Loading checklist…</div>`; }
else{
const t=todayStr();
const rows=taskRows("D").filter(r=>r.status!=="Done" && !String(r.actual).trim() && r.planned && r.planned<=t)
.sort((a,b)=>(a.planned<b.planned?-1:1));
body= rows.length? `<div class="tbl-wrap"><table><tr><th>Planned</th><th>Doer</th><th>Task</th><th>Dept</th><th>Status</th><th></th></tr>
${rows.map(r=>{const late=r.planned<t; return `<tr class="${late?'row-red':'row-yellow'}"><td style="white-space:nowrap">${esc(r.plannedRaw)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.task)} <span class="muted">#${esc(r.id)}</span></td><td>${esc(r.dept)}</td><td>${late?'<span class="pill p-bad">Overdue</span>':'<span class="pill p-warn">Today</span>'}</td><td>${pcCanDone(r)?`<button class="btn small" onclick="confirmTask('${esc(r.id)}',${r._i},'${r.src}')">✓ Done</button>`:""}</td></tr>`;}).join("")}
</table></div>` : `<div class="card empty">All of today's daily tasks are done. 🎉</div>`;
}
}
return `${attBanner()}${dgCard()}${myTasksCard()}
<div class="toolbar">
<button class="btn ${tab==='nondaily'?'':'ghost'}" onclick="window._deoTab='nondaily';render()">Non Daily Pending Task</button>
<button class="btn ${tab==='daily'?'':'ghost'}" onclick="window._deoTab='daily';render()">Daily Task Pending</button>
<button class="btn ghost small" onclick="loadTasks(true).then(()=>render())">⟳ Reload</button>
</div>
${body}`;
}
async function loadDocs(force){
if(window._DOCS && !force) return window._DOCS;
busy(true,"Loading documents from ID Proofs sheet…");
try{ window._DOCS = await gsRun("readDocs",[force?1:0]); }
finally{ busy(false); }
return window._DOCS;
}
function docCatMeta(){
return [
{key:"PERSONAL", label:"Personal", ic:"👤", sub:"Aadhar, PAN, Passport, DL, Insurance…"},
{key:"Business", label:"Business", ic:"🏢", sub:"Business documents"},
{key:"Vehicles", label:"Vehicles", ic:"🚗", sub:"RC, Insurance, Pollution, Tax, Permit"}
];
}
function docParse(cat){
const raw=(window._DOCS && window._DOCS[cat])||[];
let hi=-1;
for(let i=0;i<raw.length;i++){
const filled=raw[i].filter(c=>String(c.t||"").trim()).length;
if(filled>=2){ hi=i; break; }
}
if(hi<0) return {headers:[], rows:[]};
const headers=raw[hi].map((c,j)=> String(c.t||"").trim() || (j===0? (cat==="Vehicles"?"Vehicle No.":"Name") : ""));
let last=headers.length-1; while(last>0 && !headers[last]) last--;
const rows=raw.slice(hi+1).filter(r=>r.some(c=>String(c.t||"").trim()));
return {headers:headers.slice(0,last+1), rows, span:last+1};
}
function docCell(c){
const t=String((c&&c.t)||"").trim();
if(!t) return "—";
if(c.u) return `<a class="doc-chip" href="${esc(c.u)}" target="_blank" rel="noopener">📄 ${esc(t)}</a>`;
if(t.toUpperCase()==="NA") return `<span class="pill p-gray">NA</span>`;
if(t.toUpperCase().indexOf("PDF")>-1) return `<span class="pill p-warn" title="Link not attached">${esc(t)}</span>`;
return esc(t);
}
function docTable(cat){
const {headers, rows, span}=docParse(cat);
const q=($("doc-q")?$("doc-q").value:"").trim().toLowerCase();
const list=q? rows.filter(r=>String(r[0]&&r[0].t||"").toLowerCase().includes(q)) : rows;
if(!headers.length) return `<div class="card empty">No data in this category yet — fill it in the ID Proofs sheet's "${esc(cat)}" tab, then press Reload here.</div>`;
return `<div class="tbl-wrap"><table>
<tr>${headers.map((x,j)=>`<th${j===0?' style="position:sticky;left:0;z-index:2"':''}>${esc(x||"")}</th>`).join("")}</tr>
${list.map(r=>`<tr>${headers.map((x,j)=>`<td${j===0?' style="font-weight:800;background:#fff;position:sticky;left:0"':''}>${docCell(r[j]||{t:""})}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${span}" class="empty">Koi match nahi mila.</td></tr>`}
</table></div>`;
}
function docFilter(){ const cat=window._docCat; if(cat && $("doc-list")) $("doc-list").innerHTML=docTable(cat); }
function vMisc(){
if(!window._DOCS){
loadDocs().then(()=>{ if(ROUTE==="misc") render(); }).catch(e=>{ toast("Documents did not load: "+e.message); });
return `<div class="card empty">Loading documents…</div>`;
}
const cat=window._docCat||"";
if(!cat){
return `<div class="grid g3">
${docCatMeta().map(m=>{
const n=docParse(m.key).rows.length;
return `<div class="card click-tile" onclick="window._docCat='${m.key}';render()"><div class="ic">${m.ic}</div><h3>${m.label}</h3><p class="muted">${m.sub}</p><span class="pill p-blue" style="margin-top:.5rem">${n} records</span></div>`;
}).join("")}
</div>
<div style="margin-top:1.2rem"><button class="btn ghost small" onclick="loadDocs(true).then(()=>render())">⟳ Reload from sheet</button>
<button class="btn ghost small" onclick="ROUTE='home';render()">← BSC Dashboard</button></div>`;
}
const meta=docCatMeta().find(m=>m.key===cat);
return `
<div class="toolbar">
<button class="btn ghost small" onclick="window._docCat='';render()">← Categories</button>
<span class="pill p-blue">${meta.ic} ${meta.label}</span>
<input id="doc-q" placeholder="🔍 ${cat==='Vehicles'?'Type vehicle number…':'Type name…'}" autocomplete="off" oninput="docFilter()">
<button class="btn ghost small" onclick="loadDocs(true).then(()=>render())">⟳ Reload</button>
</div>
<div id="doc-list">${docTable(cat)}</div>
<p class="muted" style="margin-top:.6rem">📄 wale chip pe click karo to document khul jaayega. Yellow "PDF" ka matlab: sheet mein file ka link attach nahi hai — sheet mein us cell pe link laga do (Insert → Link), phir yahan clickable ho jaayega.</p>`;
}
function vEstCheck(){
const tab=window._ecTab||"pending";
const all=(DB.Estimates||[]);
const pendN=all.filter(e=>(e.CheckStatus||"")!=="Checked").length;
let list = tab==="pending" ? all.filter(e=>(e.CheckStatus||"")!=="Checked") : all.filter(e=>e.CheckStatus==="Checked");
list=[...list].sort((a,b)=>a.CreatedAt<b.CreatedAt?1:-1);
return `<div class="toolbar">
<button class="btn ${tab==='pending'?'':'ghost'}" onclick="window._ecTab='pending';render()">Check Pending (${pendN})</button>
<button class="btn ${tab==='checked'?'':'ghost'}" onclick="window._ecTab='checked';render()">Checked (${all.length-pendN})</button>
</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>ID</th><th>Date</th><th>Customer</th><th>Salesman</th><th style="text-align:right">Total</th>${tab==='checked'?'<th>Checked by</th>':''}<th></th></tr>
${list.map(e=>`<tr class="${rowClass(e)}"><td><b>${esc(e.EstimateID)}</b> <span class="muted">${esc(e.Type)}</span></td><td>${fmtDate(e.Date)}</td><td>${esc(e.CustomerName)}</td><td>${esc(e.Salesman)}</td>
<td style="text-align:right"><b>${money(e.GrandTotal)}</b></td>
${tab==='checked'? `<td class="muted">${esc(e.CheckedBy)} · ${esc(e.CheckedAt)}</td>`:''}
<td style="white-space:nowrap"><button class="btn small ghost" onclick="openEstimate('${e.EstimateID}')">View</button>
${tab==='pending'? `<button class="btn small" onclick="markEstChecked('${e.EstimateID}',true)">✓ Mark Checked</button>` : `<button class="btn small ghost" onclick="markEstChecked('${e.EstimateID}',false)">Undo</button>`}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">Nothing here.</div>`}`;
}
async function markEstChecked(id, on){
const e=(DB.Estimates||[]).find(x=>x.EstimateID===id); if(!e) return;
busy(true,"Updating…");
try{
await updateFields("Estimates", e, on? {CheckStatus:"Checked",CheckedBy:USER.Name,CheckedAt:nowStr()} : {CheckStatus:"",CheckedBy:"",CheckedAt:""});
busy(false); toast(on?"Marked checked ✓":"Moved back to pending"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function vPayCheck(){
const tab=window._pcTab||"pending", fs=window._pcSrc||"all", fh=window._pcHead||"all", fb=window._pcBr||"all";
let list=(DB.Payments||[]).filter(p=>p.Source && p.Source!=="Cash" && p.Source!=="Rebate");
if(isAdmin() && fb!=="all") list=list.filter(p=>{ const b=userBranch(p.ReceivedBy||""); return fb==="__none"? !b : b===fb; }); // v35.2 branch filter
if(fs!=="all") list=list.filter(p=>p.Source===fs);
if(fh!=="all") list=list.filter(p=>String(p.SourceDetail)===fh);
const pendN=list.filter(p=>(p.CheckStatus||"")!=="Checked").length;
const totN=list.length;
list = tab==="pending" ? list.filter(p=>(p.CheckStatus||"")!=="Checked") : list.filter(p=>p.CheckStatus==="Checked");
list=[...list].sort((a,b)=>a.Timestamp<b.Timestamp?1:-1);
const heads=[...new Set([...(DB.GpayHeads||[]).map(x=>x.Name), ...(DB.Payments||[]).filter(p=>p.Source==="GPay Others").map(p=>p.SourceDetail).filter(Boolean)])]; // v25: cheque details heads mein nahi
return `<div class="toolbar">
<button class="btn ${tab==='pending'?'':'ghost'}" onclick="window._pcTab='pending';render()">Check Pending (${pendN})</button>
<button class="btn ${tab==='checked'?'':'ghost'}" onclick="window._pcTab='checked';render()">Checked (${totN-pendN})</button>
${isAdmin()?`<select style="max-width:180px" onchange="window._pcBr=this.value;render()"><option value="all" ${fb==='all'?'selected':''}>🏢 All branches</option>${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${fb===b.Name?'selected':''}>📍 ${esc(b.Name)}</option>`).join("")}<option value="__none" ${fb==='__none'?'selected':''}>HO / no branch</option></select>`:""}
<select onchange="window._pcSrc=this.value;window._pcHead='all';render()">
<option value="all" ${fs==='all'?'selected':''}>All sources</option>
<option ${fs==='NEFT BSC'?'selected':''}>NEFT BSC</option>
<option ${fs==='GPay Others'?'selected':''}>GPay Others</option></select>
<select onchange="window._pcHead=this.value;render()">
<option value="all" ${fh==='all'?'selected':''}>All GPay heads</option>
${heads.map(x=>`<option ${fh===x?'selected':''}>${esc(x)}</option>`).join("")}</select>
<button class="btn dark small" onclick="openGpayHeadForm()">＋ GPay head</button>
</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>Date</th><th>Customer</th><th style="text-align:right">Amount</th><th>Source</th><th>GPay head</th><th>Comments</th><th>Received by</th>${tab==='checked'?'<th>Checked by</th>':''}<th></th></tr>
${list.map(p=>`<tr><td>${fmtDate(p.Date)}</td><td><b>${esc(p.CustomerName)}</b>${p.EstimateID?`<div class="muted">${esc(p.EstimateID)}</div>`:""}</td>
<td style="text-align:right"><b>${money(p.Amount)}</b></td>
<td><span class="pill ${p.Source==='NEFT BSC'?'p-blue':'p-warn'}">${esc(p.Source)}</span></td>
<td>${esc(p.SourceDetail||"—")}</td><td class="muted">${esc(p.Comments||"—")}</td><td>${esc(p.ReceivedBy)}</td>
${tab==='checked'? `<td class="muted">${esc(p.CheckedBy)} · ${esc(p.CheckedAt)}</td>`:''}
<td style="white-space:nowrap">${tab==='pending'? `<button class="btn small" onclick="markPayChecked('${p.PaymentID}',true)">✓ Mark Checked</button>` : `<button class="btn small ghost" onclick="markPayChecked('${p.PaymentID}',false)">Undo</button>`}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">Nothing here.</div>`}`;
}
async function markPayChecked(pid, on){
const p=(DB.Payments||[]).find(x=>x.PaymentID===pid); if(!p) return;
busy(true,"Updating…");
try{
await updateFields("Payments", p, on? {CheckStatus:"Checked",CheckedBy:USER.Name,CheckedAt:nowStr()} : {CheckStatus:"",CheckedBy:"",CheckedAt:""});
busy(false); toast(on?"Marked checked ✓":"Moved back to pending"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function openGpayHeadForm(){
openModal("Add GPay head (Admin)", `
<label>Head / person ka naam <span class="req">*</span></label><input id="gh-name" placeholder="e.g. Ricky">
<div style="margin-top:1rem"><button class="btn" onclick="saveGpayHead()">Save head</button></div>`);
}
async function saveGpayHead(){
if(!isAdmin()) return toast("Only Admin can add a GPay head.");
const n=$("gh-name").value.trim(); if(!n) return toast("Naam required.");
if((DB.GpayHeads||[]).some(x=>String(x.Name).toLowerCase()===n.toLowerCase())) return toast("This GPay head already exists.");
busy(true,"Saving…");
try{
await appendRow("GpayHeads",{Name:n,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("GPay head added ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function markSlipReceived(id){
const e=DB.Estimates.find(x=>x.EstimateID===id); if(!e) return;
busy(true,"Marking slip received…");
try{
await updateFields("Estimates", e, {SlipStatus:"Received", SlipReceivedAt:nowStr(), MgrSlipStatus:(e.MgrSlipStatus==="Received"?"Received":"Pending")}); // v39: ab manager ko slip jaani hai
busy(false); toast("Signed slip received ✓"); render();
}catch(err){ busy(false); toast("Failed: "+err.message); }
}
function vUsers(){
const list=DB.Users||[];
return `${coverTodayStrip()}
<div class="toolbar"><button class="btn" onclick="openUserForm()">＋ Create user</button>
<button class="btn" style="background:var(--ok)" onclick="openRoleForm()">＋ Create Role</button>
<button class="btn dark" onclick="openBranchForm()">＋ New Branch</button>
<span class="pill p-gray">Branches: ${(DB.Branches||[]).map(b=>esc(b.Name)).join(", ")||"none"}</span>
<span class="pill p-blue">Custom roles: ${(DB.Roles||[]).map(r=>esc(r.RoleName)).join(", ")||"none"}</span></div>
<div class="tbl-wrap"><table><tr><th>User</th><th>Username</th><th>Role</th><th>Branch</th><th>Phone</th><th>Timing</th><th>Status</th><th></th></tr>
${list.map(u=>`<tr>
<td><span class="avatar-sm">${u.PhotoURL?`<img src="${esc(photoURL(u.PhotoURL))}" referrerpolicy="no-referrer" onerror="this.remove()">`:esc(initials(u.Name))}</span> <b>${esc(u.Name)}</b></td>
<td>${esc(u.Username)}</td><td><span class="pill p-blue">${esc(u.Role)}</span></td><td>${esc(u.Branch||"—")}</td><td>${esc(u.Phone||"—")}</td>
<td class="muted" style="font-size:.78rem;white-space:nowrap">${esc(shiftLabel(u))}</td>
<td><span class="pill ${u.Status==='Inactive'?'p-bad':'p-ok'}">${esc(u.Status||"Active")}</span></td>
<td style="white-space:nowrap"><button class="btn small ghost" onclick="openUserTiming('${u.UserID}')">🕘 Timing</button>
${u.Status!=='Inactive' && String(u.Username).toLowerCase()!==String(USER.Username).toLowerCase()? `<button class="btn small" style="background:#b7791f" onclick="loginAs('${esc(u.Username)}')">🧪 Login as</button>`:""}
<button class="btn small ghost" onclick="openSubstitute('${esc(u.Username)}')">🔁 Substitute</button>
${u.Username!=='admin'? `<button class="btn small ghost" onclick="toggleUser('${u.UserID}')">${u.Status==='Inactive'?'Activate':'Deactivate'}</button>`:""}</td></tr>`).join("")}
</table></div>
<p class="muted" style="margin-top:.8rem">Note: passwords are stored in the Google Sheet — keep sheet sharing restricted to the owner.</p>`;
}
function openRoleForm(){
openModal("Create new Role / Profile (Admin)", `
<label>Role ka naam <span class="req">*</span></label><input id="rl-name" placeholder="e.g. Accountant, EA, PC">
<label>Kaunse modules is role ko dikhne chahiye? <span class="req">*</span></label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem .8rem;max-height:250px;overflow-y:auto;border:1px solid var(--line);border-radius:8px;padding:.7rem">
${Object.entries(MODULES).map(([k,v])=>`<label class="rad"><input type="checkbox" class="rl-mod" value="${k}" style="width:auto"> ${v[1]} ${v[0]}</label>`).join("")}
<label class="rad" style="grid-column:1/-1;border-top:1px dashed var(--line);padding-top:.45rem"><input type="checkbox" class="rl-mod" value="recordpay" style="width:auto"> 💳 Record Payment karne ka RIGHT (customers/ledger mein button aayega)</label>
</div>
<label>Data scope <span class="req">*</span></label>
<div style="display:flex;gap:1.1rem;flex-wrap:wrap;padding:.2rem 0">
<label class="rad"><input type="radio" name="rl-scope" value="Company" checked style="width:auto"> Company-wide (sab branches)</label>
<label class="rad"><input type="radio" name="rl-scope" value="Branch" style="width:auto"> Branch-wide (sirf apni branch — user banate waqt branch dena hoga)</label>
</div>
<label class="rad" style="margin-top:.5rem"><input type="checkbox" id="rl-cash" style="width:auto"> 💰 Cash ACCEPT karne ka right (Daily Cash Book mein salesman ka cash accept kar sakega)</label>
<label>Notes (optional)</label><input id="rl-note" placeholder="This role's work / responsibility">
<div style="margin-top:1rem"><button class="btn" onclick="saveRole()">Create role</button></div>`);
}
async function saveRole(){
const n=$("rl-name").value.trim();
if(!n) return toast("Role ka naam required.");
if(BUILTIN_ROLES.some(b=>b.toLowerCase()===n.toLowerCase())) return toast("This is a built-in role — choose another name.");
if((DB.Roles||[]).some(r=>String(r.RoleName).toLowerCase()===n.toLowerCase())) return toast("This role already exists.");
const mods=[...document.querySelectorAll(".rl-mod:checked")].map(x=>x.value);
if(!mods.length) return toast("Select at least one module.");
const scope=document.querySelector('input[name="rl-scope"]:checked').value;
busy(true,"Creating role…");
try{
await appendRow("Roles",{RoleName:n,Modules:mods.join(","),Scope:scope,CanAcceptCash:$("rl-cash").checked?"Yes":"No",Notes:$("rl-note").value.trim(),CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Role '"+n+"' created ✓ — it will now appear in the Create User role dropdown"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openBranchForm(){
openModal("New Branch (Admin)", `
<label>Branch ka naam <span class="req">*</span></label><input id="br-name" placeholder="e.g. Branch 1 — Main Road">
<div style="margin-top:1rem"><button class="btn" onclick="saveBranch()">Create branch</button></div>`);
}
async function saveBranch(){
const n=$("br-name").value.trim(); if(!n) return toast("Branch ka naam required.");
if((DB.Branches||[]).some(b=>String(b.Name).toLowerCase()===n.toLowerCase())) return toast("This branch already exists.");
busy(true,"Creating branch…");
try{
await appendRow("Branches",{BranchID:nextId("Branches","BranchID","BR",2),Name:n,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Branch created ✓ — it will now appear in the branch dropdown while creating users"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/** v16: timing fields — Create User aur Timing edit dono modals mein same fields */
function timingFieldsHTML(u){
u=u||{};
const pol=sunPolicy(u);
return `
<div><label>Roz ka IN time</label><input type="time" id="ut-win" value="${esc(String(u.WeekdayIn||"10:00").slice(0,5))}"></div>
<div><label>Roz ka OUT time</label><input type="time" id="ut-wout" value="${esc(String(u.WeekdayOut||"19:00").slice(0,5))}"></div>
<div><label>Sunday policy</label><select id="ut-spol">
<option value="Off" ${pol==="OFF"?"selected":""}>Sunday OFF</option>
<option value="All" ${pol==="ALL"?"selected":""}>Har Sunday aana hai</option>
<option value="Two" ${pol==="TWO"?"selected":""}>Month mein koi bhi 2 Sunday</option></select></div>
<div><label>&nbsp;</label><span class="muted" style="font-size:.75rem">"Koi 2" = Sunday absent count nahi hota, sirf 2 Sunday aana zaroori</span></div>
<div><label>Sunday IN time</label><input type="time" id="ut-sin" value="${esc(String(u.SundayIn||"10:00").slice(0,5))}"></div>
<div><label>Sunday OUT time</label><input type="time" id="ut-sout" value="${esc(String(u.SundayOut||"13:30").slice(0,5))}"></div>`;
}
function openUserForm(){
openModal("Create user", `
<div class="form-grid">
<div><label>Full name <span class="req">*</span></label><input id="us-name"></div>
<div><label>Phone</label><input id="us-phone"></div>
<div><label>Username <span class="req">*</span></label><input id="us-user"></div>
<div><label>Password <span class="req">*</span></label><input id="us-pass"></div>
<div><label>Role <span class="req">*</span></label><select id="us-role">
<option>Salesman</option><option>Manager</option><option>Data Entry</option><option>CRM</option><option>Admin</option>
${(DB.Roles||[]).map(r=>`<option>${esc(r.RoleName)}</option>`).join("")}</select></div>
<div><label>Branch <span class="muted">(required for Salesman/Manager)</span></label><select id="us-branch"><option value="">—</option>${(DB.Branches||[]).map(b=>`<option>${esc(b.Name)}</option>`).join("")}</select></div>
${timingFieldsHTML(null)}
<div class="full"><label>Photo URL (shown on welcome screen)</label><input id="us-photo" placeholder="https://…"></div>
</div>
<div style="margin-top:1rem"><button class="btn" onclick="saveUser()">Create user</button></div>`);
}
function openUserTiming(uid){
const u=(DB.Users||[]).find(x=>x.UserID===uid); if(!u) return;
openModal("🕘 Timing — "+u.Name, `
<div class="form-grid">${timingFieldsHTML(u)}</div>
<p class="muted" style="margin-top:.6rem">Late = IN time + ${ATT_GRACE_MIN} min grace ke baad. Half day = kaam ke ghante us din ki shift ke aadhe se kam (IN–OUT se auto). Sunday ka time alag set hota hai.</p>
<div style="margin-top:1rem"><button class="btn" onclick="saveUserTiming('${uid}')">Save timing</button></div>`);
}
async function saveUserTiming(uid){
const u=(DB.Users||[]).find(x=>x.UserID===uid); if(!u) return;
busy(true,"Saving timing…");
try{
await updateFields("Users",u,{WeekdayIn:$("ut-win").value,WeekdayOut:$("ut-wout").value,SundayPolicy:$("ut-spol").value,SundayIn:$("ut-sin").value,SundayOut:$("ut-sout").value});
busy(false); closeModal(); toast("Timing saved ✓ — "+u.Name); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function saveUser(){
const n=$("us-name").value.trim(), un=$("us-user").value.trim(), pw=$("us-pass").value;
if(!n||!un||!pw) return toast("Name, username and password are mandatory.");
if((DB.Users||[]).some(u=>u.Username.toLowerCase()===un.toLowerCase())) return toast("Username already exists.");
busy(true,"Creating user…");
try{
const role=$("us-role").value, br=$("us-branch").value;
const rdNew=(DB.Roles||[]).find(r=>String(r.RoleName)===role);
if((["Salesman","Manager"].includes(role) || (rdNew && rdNew.Scope==="Branch")) && !br) { busy(false); return toast("Branch selection is required for this role."); }
if(role==="Manager" && br && (DB.Users||[]).some(u=>u.Role==="Manager" && (u.Branch||"")===br && u.Status!=="Inactive")) { busy(false); return toast("Is branch ka ek Manager already hai — ek branch, ek manager."); }
await appendRow("Users",{UserID:nextId("Users","UserID","U",3),Name:n,Username:un,Password:pw,Role:role,Phone:$("us-phone").value.trim(),PhotoURL:$("us-photo").value.trim(),Status:"Active",CreatedAt:nowStr(),Branch:br,
WeekdayIn:$("ut-win").value,WeekdayOut:$("ut-wout").value,SundayPolicy:$("ut-spol").value,SundayIn:$("ut-sin").value,SundayOut:$("ut-sout").value});
busy(false); closeModal(); toast("User created ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function toggleUser(uid){
const u=DB.Users.find(x=>x.UserID===uid);
busy(true,"Updating user…");
try{ await updateFields("Users",u,{Status:u.Status==="Inactive"?"Active":"Inactive"}); busy(false); render(); }
catch(e){ busy(false); toast("Failed: "+e.message); }
}
function vScorecard(){
const per=window._scPer||"week";
const {from,to}=periodRange(per);
const leads=(DB.Leads||[]).filter(l=>l.Salesman===USER.Name);
const attended=leads.filter(l=>inRange(l.Date,from,to)).length;
const fups=(DB.Followups||[]).filter(f=>f.DoneBy===USER.Name && inRange(f.Date,from,to));
const won=fups.filter(f=>f.Outcome==="Deal Won"), lost=fups.filter(f=>f.Outcome==="Deal Lost");
const {rev, saleCount}=smRevenue(USER.Name, from, to);
const conv=fups.length? Math.round(won.length/fups.length*100):0;
const avg=saleCount? rev/saleCount:0;
return `
<div class="toolbar"><select style="max-width:240px" onchange="window._scPer=this.value;render()">
<option value="week" ${per==='week'?'selected':''}>Weekly (last 7 days)</option>
<option value="month" ${per==='month'?'selected':''}>Monthly (last 30 days)</option></select></div>
<div class="grid g3">
<div class="card stat"><div class="v">${attended}</div><div class="l">Total leads attended</div></div>
<div class="card stat"><div class="v">${fups.length}</div><div class="l">Followups done</div></div>
<div class="card stat ok"><div class="v">${won.length}</div><div class="l">Deals won</div></div>
<div class="card stat bad"><div class="v">${lost.length}</div><div class="l">Deals lost</div></div>
<div class="card stat"><div class="v">${conv}%</div><div class="l">Conversion (won ÷ meetings)</div></div>
<div class="card stat warn"><div class="v">${money(avg)}</div><div class="l">Average sale value (per estimate)</div></div>
</div>
<div class="card stat ok" style="margin-top:1rem;max-width:360px"><div class="v">${money(rev)}</div><div class="l">Revenue generated (${per==='week'?'7 days':'30 days'}) — sab estimates − returns</div></div>`;
}
$("li-pass").addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
window._FILE_OK = true;
/* ===== v22: STOCK MANAGEMENT + VENDOR MANAGEMENT (Manager + Admin) =====
 *  Godown → Category → Item (opening stock ke saath) → Purchase (vendor se, stock plus)
 *  → Estimate mein ST toggle se stock minus → Vendor ledger (purchase = credit, expense "Vendor Payment" = debit)
 *  Tabs: Godowns, StockCategories, StockItems, Purchases, Vendors, StockOut (sheet mein auto-create hote hain) */
function canStockMgmt(){ return isAdmin()||(isMgr() && /civil/i.test(String(USER.Branch||"")))||hasMod("stockmgmt"); } // v23.2: Manager sirf Civil Lines branch ka
function canVendorMgmt(){ return isAdmin()||(isMgr() && /civil/i.test(String(USER.Branch||"")))||hasMod("vendormgmt"); } // v23.2
function gdName(id){ const g=(DB.Godowns||[]).find(x=>x.GodownID===id); return g?g.Name:String(id||"—"); }
// v28.2: IN = purchases + customer returns (StockOut rows RefType "Return"); OUT = sale estimates
const SO_IN_TYPES=["Return","Adjust+"]; // v28.3: StockOut tab ke ye RefType IN ginte hain (Return + manual plus)
function siIn(siid){ return (DB.Purchases||[]).filter(p=>p.SIID===siid).reduce((s,p)=>s+num(p.Qty),0) + (DB.StockOut||[]).filter(o=>o.SIID===siid && SO_IN_TYPES.includes(o.RefType)).reduce((s,o)=>s+num(o.Qty),0); }
function siOut(siid){ return (DB.StockOut||[]).filter(o=>o.SIID===siid && !SO_IN_TYPES.includes(o.RefType)).reduce((s,o)=>s+num(o.Qty),0); }
/* v28.3: MANUAL ADJUSTMENT (+/−) — Admin only. StockOut row: RefType "Adjust+" (IN) / "Adjust-" (OUT), RefID = reason. */
function openStockAdjust(siid){
if(!isAdmin()) return toast("Manual adjustment sirf Admin.");
const si=(DB.StockItems||[]).find(x=>x.SIID===siid); if(!si) return;
const cl=siClosing(si);
openModal("⚖️ Stock adjust — "+si.Name, `
<div class="rowline"><span>Godown</span><b>${esc(gdName(si.GodownID))}</b></div>
<div class="rowline"><span>Abhi closing</span><b>${cl}</b></div>
<div class="form-grid" style="margin-top:.6rem">
<div><label>Type <span class="req">*</span></label><select id="adj-t"><option value="Adjust+">➕ Plus (stock badhao)</option><option value="Adjust-">➖ Minus (stock ghatao)</option></select></div>
<div><label>Qty <span class="req">*</span></label><input type="number" id="adj-q" min="0.01" step="0.01" inputmode="decimal" placeholder="e.g. 5"></div>
<div><label>Date</label><input type="date" id="adj-d" value="${todayStr()}"></div>
<div><label>Reason <span class="req">*</span></label><input id="adj-r" placeholder="e.g. purana return, breakage, physical count"></div>
</div>
<p class="muted" style="font-size:.75rem">Item ledger mein "Adjust+ / Adjust-" ke saath reason aur aapka naam dikhega.</p>
<div style="margin-top:1rem"><button class="btn" onclick="saveStockAdjust('${esc(siid)}')">Save adjustment</button></div>`);
}
async function saveStockAdjust(siid){
if(!isAdmin()) return;
const si=(DB.StockItems||[]).find(x=>x.SIID===siid); if(!si) return;
const t=$("adj-t").value, q=num($("adj-q").value), d=$("adj-d").value||todayStr(), r=$("adj-r").value.trim();
if(q<=0) return toast("Qty 0 se zyada daalo."); if(!r) return toast("Reason mandatory hai.");
busy(true,"Saving adjustment…");
try{
const rec={OutID:nextId("StockOut","OutID","SO",5),Date:d,SIID:si.SIID,ItemName:si.Name,GodownID:si.GodownID,Qty:q,RefType:t,RefID:r,By:USER.Name,Timestamp:nowStr()};
await appendRow("StockOut",rec); DB.StockOut=DB.StockOut||[]; DB.StockOut.push(rec);
alog("stock_adjust", si.Name+" "+t+q+" · "+r);
busy(false); closeModal(); toast((t==="Adjust+"?"➕ ":"➖ ")+q+" — "+si.Name+" · closing ab "+siClosing(si)); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function siClosing(si){ return num(si.OpeningStock)+siIn(si.SIID)-siOut(si.SIID); }

function vStockMgmt(){
if(!canStockMgmt()) return `<div class="card empty">This module is for Manager / Admin.</div>`;
const tab=window._smTab||"stock";
const head=`<div class="toolbar">
<button class="btn ${tab==='stock'?'':'ghost'} small" onclick="window._smTab='stock';render()">🏬 Stock</button>
<button class="btn ${tab==='purchase'?'':'ghost'} small" onclick="window._smTab='purchase';render()">🛒 Purchases</button>
<span style="flex:1"></span>
<button class="btn dark small" onclick="openGodownForm()">＋ Godown</button>
<button class="btn dark small" onclick="openStockCatForm()">＋ Category</button>
<button class="btn small" style="background:var(--ok)" onclick="openStockItemForm()">＋ Item</button>
</div>`;
return head + (tab==="purchase" ? smPurchases() : smStock());
}

/* ---- STOCK VIEW (godown-wise, category-wise grouping) ---- */
/* v24.2: ZOHO-INSPIRED STOCK UI — pehle sirf CATEGORY cards, click par us category ke items.
 * Search karne par seedha matching items dikhte hain (category ke paar). */
function smCss(){
if(document.getElementById("sm2-css")) return;
const st=document.createElement("style"); st.id="sm2-css";
st.textContent=`
.sm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:.8rem;margin-top:.9rem}
.sm-cat{background:#fff;border:1px solid #e4e9f2;border-radius:14px;padding:1rem .95rem;cursor:pointer;position:relative;transition:box-shadow .15s,transform .15s,border-color .15s}
.sm-cat:hover{box-shadow:0 8px 22px rgba(11,29,51,.10);transform:translateY(-2px);border-color:#c9d6ea}
.sm-cat .dot{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;color:#fff;margin-bottom:.6rem}
.sm-cat h4{margin:0 0 .25rem;font-size:.92rem;line-height:1.25;word-break:break-word}
.sm-cat .meta{font-size:.75rem;color:#6b7a90}
.sm-cat .qty{font-weight:800;font-size:1.05rem;margin-top:.35rem}
.sm-cat .alert{position:absolute;top:.6rem;right:.6rem;background:#fdecec;color:#c0392b;font-size:.66rem;font-weight:700;padding:.15rem .45rem;border-radius:99px}
.sm-cat .chev{position:absolute;bottom:.7rem;right:.8rem;color:#b7c3d4;font-weight:800}
.sm-bc{display:flex;align-items:center;gap:.5rem;margin:.2rem 0 .8rem;font-weight:700}
.sm-bc a{color:var(--blue,#1a73e8);cursor:pointer;text-decoration:none}
.sm-bc .sep{color:#9aa8bd}
.sm-chip{display:inline-flex;align-items:center;gap:.3rem;background:#f2f6fc;border:1px solid #e0e8f4;border-radius:99px;padding:.22rem .7rem;font-size:.74rem;font-weight:700;color:#33445e;margin-right:.45rem}
.sm-chip.bad{background:#fdecec;border-color:#f5c9c9;color:#c0392b}
.sm-chip.ok{background:#e9f7ef;border-color:#c9e9d6;color:#1e8e4e}`;
document.head.appendChild(st);
}
function smCatColor(n){
const P=["#4A6CF7","#12977C","#E67E22","#8E44AD","#C0392B","#16A085","#2C6E9B","#B7791F","#5D6D7E","#AD1457"];
let h=0; String(n).split("").forEach(c=>{ h=(h*31+c.charCodeAt(0))>>>0; });
return P[h%P.length];
}
function smOpenCat(c){ window._smCat=c||null; window._smQ=""; render(); }
function smItemRow_(s, showCat){
const cin=siIn(s.SIID), cout=siOut(s.SIID), cl=num(s.OpeningStock)+cin-cout;
return `<tr class="click ${cl<0?'row-red':cl===0?'row-yellow':''}" onclick="openItemLedger('${s.SIID}')" title="Click = item ledger">
<td><b>${esc(s.Name)}</b> <span class="muted" style="font-size:.7rem">▸ ledger</span></td>
${showCat?`<td>${esc(s.Category||"—")}</td>`:""}
<td>${esc(gdName(s.GodownID))}</td>
<td style="text-align:right">${num(s.OpeningStock)}</td><td style="text-align:right">${cin}</td><td style="text-align:right">${cout}</td>
<td style="text-align:right"><b>${cl}</b>${isAdmin()?` <button class="btn small ghost" style="padding:.1rem .4rem;margin-left:.3rem" onclick="event.stopPropagation();openStockAdjust('${s.SIID}')" title="Manual adjustment">⚖️</button>`:""}</td></tr>`;
}
function smStock(){
smCss();
const gs=myGodowns(); // v23.2: apni branch ke godowns hi
if(!gs.length) return `<div class="card empty">Abhi koi godown nahi hai — upar <b>＋ Godown</b> se pehla godown banao, phir category, phir items.</div>`;
const g=(window._smG && (window._smG==="all"||gs.some(x=>x.GodownID===window._smG)))? window._smG : "all";
window._smG=g;
const q=(window._smQ||"").toLowerCase();
const _gset=new Set(gs.map(x=>x.GodownID)); // v23.2: dusri branch ke godown ke items filter
let items=(DB.StockItems||[]).filter(s=>_gset.has(s.GodownID));
if(g!=="all") items=items.filter(s=>s.GodownID===g);
const toolbar=`
<div class="toolbar">
<select style="max-width:220px" onchange="window._smG=this.value;render()">
<option value="all" ${g==='all'?'selected':''}>All godowns</option>
${gs.map(x=>`<option value="${esc(x.GodownID)}" ${g===x.GodownID?'selected':''}>${esc(x.Name)}</option>`).join("")}
</select>
<input id="q-sm" placeholder="Search item / category…" value="${esc(window._smQ||"")}" oninput="window._smQ=this.value;window._refocusId=this.id;render()">
<button class="btn ghost small" onclick="smStockPdf()">🖨 Export PDF</button>
</div>`;
// ---- SEARCH MODE: seedha matching items (sab categories mein se) ----
if(q){
const hits=items.filter(s=>(s.Name+" "+s.Category).toLowerCase().includes(q)).sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
return toolbar+`
<div class="sm-bc"><a onclick="smOpenCat(null)">🏬 Stock</a><span class="sep">›</span><span>Search: "${esc(window._smQ)}" — ${hits.length} items</span></div>
${hits.length? `<div class="tbl-wrap"><table><tr><th>Item</th><th>Category</th><th>Godown</th><th style="text-align:right">Opening</th><th style="text-align:right">IN</th><th style="text-align:right">OUT</th><th style="text-align:right">Closing</th></tr>${hits.map(s=>smItemRow_(s,true)).join("")}</table></div>`
: `<div class="card empty">"${esc(window._smQ)}" se koi item match nahi hua.</div>`}`;
}
// group by category
const cats={};
items.forEach(s=>{ const k=s.Category||"(No category)"; (cats[k]=cats[k]||[]).push(s); });
const catNames=Object.keys(cats).sort();
// ---- ITEM VIEW: ek category ke items ----
if(window._smCat && cats[window._smCat]){
const cn=window._smCat;
const list=cats[cn].sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
let tot=0, negz=0;
const rows=list.map(s=>{ const cl=siClosing(s); tot+=cl; if(cl<=0) negz++; return smItemRow_(s,false); }).join("");
return toolbar+`
<div class="sm-bc"><a onclick="smOpenCat(null)">🏬 Stock</a><span class="sep">›</span><span style="color:${smCatColor(cn)}">${esc(cn)}</span></div>
<div style="margin-bottom:.7rem">
<span class="sm-chip">${list.length} items</span>
<span class="sm-chip ok">Closing: ${tot}</span>
${negz?`<span class="sm-chip bad">⚠ ${negz} zero/negative</span>`:""}
${g!=="all"?`<span class="sm-chip">📦 ${esc(gdName(g))}</span>`:""}
</div>
<div class="tbl-wrap"><table><tr><th>Item</th><th>Godown</th><th style="text-align:right">Opening</th><th style="text-align:right">IN (purchase)</th><th style="text-align:right">OUT (sale)</th><th style="text-align:right">Closing</th></tr>${rows}</table></div>
<div style="margin-top:.8rem"><button class="btn ghost small" onclick="smOpenCat(null)">← Back to categories</button></div>`;
}
window._smCat=null;
// ---- CATEGORY VIEW (default): sirf category cards ----
let totCl=0, totNegz=0;
const cards=catNames.map(cn=>{
const list=cats[cn];
let ct=0, nz=0;
list.forEach(s=>{ const cl=siClosing(s); ct+=cl; if(cl<=0) nz++; });
totCl+=ct; totNegz+=nz;
const col=smCatColor(cn);
const initials=String(cn).replace(/[^A-Za-z0-9 ]/g,"").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase()||"•";
return `<div class="sm-cat" data-c="${esc(cn)}" onclick="smOpenCat(this.dataset.c)">
${nz?`<span class="alert">⚠ ${nz}</span>`:""}
<div class="dot" style="background:${col}">${esc(initials)}</div>
<h4>${esc(cn)}</h4>
<div class="meta">${list.length} item${list.length>1?"s":""}</div>
<div class="qty" style="color:${ct<0?'var(--bad)':'inherit'}">${ct} <span class="meta" style="font-weight:600">qty</span></div>
<span class="chev">›</span>
</div>`;
}).join("");
return toolbar+`
<div class="grid g3" style="margin-bottom:.2rem">
<div class="card stat"><div class="v">${items.length}</div><div class="l">Items ${g==='all'?'(all godowns)':'— '+esc(gdName(g))}</div></div>
<div class="card stat ok"><div class="v">${totCl}</div><div class="l">Total closing qty</div></div>
<div class="card stat warn"><div class="v">${totNegz}</div><div class="l">Zero / negative stock</div></div>
</div>
${catNames.length? `<div class="sm-grid">${cards}</div><p class="muted" style="margin-top:.7rem">Category par click karo — uske items khulenge. Item par click = ledger.</p>`
: `<div class="card empty">Koi item nahi — upar <b>＋ Item</b> se banao (godown + category + opening stock ke saath).</div>`}`;
}
function smStockPdf(){
alog("print_stock", "stock list");
const gs=myGodowns(); // v23.2
const g=window._smG||"all";
const _gset=new Set(gs.map(x=>x.GodownID));
let items=(DB.StockItems||[]).filter(s=>_gset.has(s.GodownID));
if(g!=="all") items=items.filter(s=>s.GodownID===g);
const cats={};
items.forEach(s=>{ const k=s.Category||"(No category)"; (cats[k]=cats[k]||[]).push(s); });
const catNames=Object.keys(cats).sort();
let body="", tot=0;
catNames.forEach(cn=>{
const list=cats[cn].sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
let catCl=0;
let rows="";
list.forEach(s=>{
const cin=siIn(s.SIID), cout=siOut(s.SIID), cl=num(s.OpeningStock)+cin-cout;
catCl+=cl; tot+=cl;
rows+=`<tr><td>${esc(s.Name)}</td><td>${esc(gdName(s.GodownID))}</td><td style="text-align:right">${num(s.OpeningStock)}</td><td style="text-align:right">${cin}</td><td style="text-align:right">${cout}</td><td style="text-align:right"><b>${cl}</b></td></tr>`;
});
body+=`<h3>${esc(cn)} — ${list.length} items · closing ${catCl}</h3>
<table><tr><th>Item</th><th>Godown</th><th style="text-align:right">Opening</th><th style="text-align:right">IN</th><th style="text-align:right">OUT</th><th style="text-align:right">Closing</th></tr>${rows}
<tr class="sum"><td colspan="5">Subtotal — ${esc(cn)}</td><td style="text-align:right">${catCl}</td></tr></table>`;
});
printHTML(`<!DOCTYPE html><html><head><title>Stock ${todayStr()}</title><style>
@page{size:8.27in 11.69in;margin:12mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:16px;margin:0} h3{margin:12px 0 4px} table{width:100%;border-collapse:collapse}
th,td{border:1px solid #999;padding:4px 6px;font-size:10px} th{background:#0B1D33;color:#fff;text-align:left}
.sum td{font-weight:bold;background:#E8F0FB}</style></head><body>
<h1>BSC TILES — Godown Stock Report${g!=="all"?" — "+esc(gdName(g)):""}</h1>
<div>Date: <b>${todayStr()}</b> · Generated ${nowStr()} by ${esc(USER.Name)} · Total closing qty: <b>${tot}</b></div>
${body||"<p>No items.</p>"}
</body></html>`);
}

/* ---- GODOWN / CATEGORY / ITEM FORMS ---- */
function openGodownForm(){
// v23.2: godown branch-wise — Manager ka godown apni branch par auto; Admin branch chunta hai
openModal("New godown", `
<label>Godown name <span class="req">*</span></label><input id="gd-name" placeholder="e.g. Main Godown / Dugri Godown">
${isAdmin()? `<label>Branch <span class="req">*</span></label><select id="gd-br">${(DB.Branches||[]).map(b=>`<option>${esc(b.Name)}</option>`).join("")}</select>`
: `<p class="muted" style="margin-top:.5rem">Branch: <b>${esc(USER.Branch||"—")}</b> (aapki branch par ban jayega)</p>`}
<div style="margin-top:1rem"><button class="btn" onclick="saveGodown()">Save godown</button></div>
${myGodowns().length?`<div class="section-h"><h3>Existing godowns</h3><div class="ln"></div></div>${myGodowns().map(x=>`<div class="rowline"><span>${esc(x.Name)}${x.Branch?` <span class="pill p-gray" style="font-size:.66rem">${esc(x.Branch)}</span>`:""}</span><b class="muted">${esc(x.GodownID)}</b></div>`).join("")}`:""}`);
}
async function saveGodown(){
const n=$("gd-name").value.trim(); if(!n) return toast("Godown name likho.");
if((DB.Godowns||[]).some(x=>String(x.Name).toLowerCase()===n.toLowerCase())) return toast("Is naam ka godown already hai.");
const br=isAdmin()? ($("gd-br")?$("gd-br").value:"") : (USER.Branch||""); // v23.2
busy(true,"Saving godown…");
try{
await appendRow("Godowns",{GodownID:nextId("Godowns","GodownID","GD"),Name:n,CreatedBy:USER.Name,CreatedAt:nowStr(),Branch:br});
busy(false); closeModal(); toast("Godown added ✓"+(br?" — "+br:"")); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
/* v23.2: ITEM LEDGER — stock item par click karo to opening + saare IN (purchases) + OUT (estimate ST) running balance ke saath */
function openItemLedger(siid){
const si=(DB.StockItems||[]).find(x=>x.SIID===siid); if(!si) return;
const rows=[{d:String(si.CreatedAt||"").slice(0,10), ts:String(si.CreatedAt||""), ref:"OPENING", desc:"Opening stock — by "+(si.CreatedBy||""), in:num(si.OpeningStock), out:0}];
(DB.Purchases||[]).forEach(p=>{ if(p.SIID!==siid) return;
rows.push({d:String(p.Date).slice(0,10), ts:String(p.Timestamp||""), ref:p.PurchID, desc:"Purchase — "+(p.VendorName||"")+" · qty "+p.Qty+" @ "+p.Rate+(p.Notes?" · "+p.Notes:""), in:num(p.Qty), out:0}); });
(DB.StockOut||[]).forEach(o=>{ if(o.SIID!==siid) return;
const isIn=SO_IN_TYPES.includes(o.RefType);
rows.push({d:String(o.Date).slice(0,10), ts:String(o.Timestamp||""), ref:o.RefID||o.OutID, est:o.RefType==="Estimate"||o.RefType==="Return", desc:(o.RefType||"Out")+(/^Adjust/.test(o.RefType)?" — "+(o.RefID||""):"")+" — by "+(o.By||""), in:isIn?num(o.Qty):0, out:isIn?0:num(o.Qty)}); });
rows.sort((a,b)=> a.d<b.d?-1 : a.d>b.d?1 : (a.ts<b.ts?-1:1));
let bal=0; rows.forEach(r=>{ bal+=r.in-r.out; r.bal=bal; });
openModal("📦 "+si.Name+" — Item Ledger", `
<div class="rowline"><span>Godown</span><b>${esc(gdName(si.GodownID))}</b></div>
<div class="rowline"><span>Category</span><b>${esc(si.Category||"—")}</b></div>
<div class="rowline"><span>Current closing</span><b style="color:${bal<0?'var(--bad)':bal===0?'var(--warn)':'var(--ok)'}">${bal}</b></div>
${isAdmin()?`<div style="margin:.5rem 0"><button class="btn small ghost" onclick="openStockAdjust('${esc(siid)}')">⚖️ Manual adjustment (+/−)</button></div>`:""}
<div class="tbl-wrap" style="margin-top:.8rem"><table style="min-width:0"><tr><th>Date</th><th>Detail</th><th style="text-align:right">IN</th><th style="text-align:right">OUT</th><th style="text-align:right">Balance</th></tr>
${rows.map(r=>`<tr><td style="white-space:nowrap">${esc(r.d)}</td>
<td>${r.est?`<a href="javascript:void 0" onclick="closeModal();openEstimate('${esc(r.ref)}')"><b>${esc(r.ref)}</b></a>`:`<b>${esc(r.ref)}</b>`}<div class="muted">${esc(r.desc)}</div></td>
<td style="text-align:right;color:var(--ok)">${r.in?("+"+r.in):""}</td><td style="text-align:right;color:var(--bad)">${r.out?("−"+r.out):""}</td>
<td style="text-align:right"><b>${r.bal}</b></td></tr>`).join("")}
</table></div>
<p class="muted" style="margin-top:.5rem">IN = purchase entries · OUT = estimates (ST toggle) — opening se running balance. Estimate ID par click karke poora estimate khul jaata hai.</p>`);
}
function openStockCatForm(){
openModal("New stock category", `
<label>Category name <span class="req">*</span></label><input id="sc-name" placeholder="e.g. Tiles / Sanitary / Adhesive">
<div style="margin-top:1rem"><button class="btn" onclick="saveStockCat()">Save category</button></div>
${(DB.StockCategories||[]).length?`<div class="section-h"><h3>Existing categories</h3><div class="ln"></div></div>${(DB.StockCategories||[]).map(x=>`<div class="rowline"><span>${esc(x.Name)}</span><b class="muted">${esc(x.CatID)}</b></div>`).join("")}`:""}`);
}
async function saveStockCat(){
const n=$("sc-name").value.trim(); if(!n) return toast("Category name likho.");
if((DB.StockCategories||[]).some(x=>String(x.Name).toLowerCase()===n.toLowerCase())) return toast("Ye category already hai.");
busy(true,"Saving category…");
try{
await appendRow("StockCategories",{CatID:nextId("StockCategories","CatID","SC"),Name:n,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Category added ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openStockItemForm(){
const gs=myGodowns(), cs=DB.StockCategories||[]; // v23.2
if(!gs.length) return toast("Pehle godown banao (＋ Godown).");
if(!cs.length) return toast("Pehle category banao (＋ Category).");
openModal("New stock item", `
<label>Godown <span class="req">*</span></label><select id="si-gd">${gs.map(x=>`<option value="${esc(x.GodownID)}">${esc(x.Name)}</option>`).join("")}</select>
<label>Category <span class="req">*</span></label><select id="si-cat">${cs.map(x=>`<option value="${esc(x.Name)}">${esc(x.Name)}</option>`).join("")}</select>
<label>Item name <span class="req">*</span></label><input id="si-name" placeholder="e.g. Kajaria 2x2 Glossy White">
<label>Opening stock <span class="req">*</span></label><input type="number" id="si-open" value="0" min="0">
<div style="margin-top:1rem"><button class="btn" onclick="saveStockItem()">Save item</button></div>`);
}
async function saveStockItem(){
const gd=$("si-gd").value, cat=$("si-cat").value, n=$("si-name").value.trim(), op=num($("si-open").value);
if(!n) return toast("Item name likho.");
if(op<0) return toast("Opening stock negative nahi ho sakta.");
if((DB.StockItems||[]).some(s=>s.GodownID===gd && String(s.Name).trim().toLowerCase()===n.toLowerCase())) return toast("Ye item is godown mein already hai.");
busy(true,"Saving item…");
try{
await appendRow("StockItems",{SIID:nextId("StockItems","SIID","SI"),GodownID:gd,Category:cat,Name:n,OpeningStock:op,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Item added ✓ — opening stock "+op); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}

/* ---- PURCHASE ENTRY (vendor se — stock plus + vendor ledger credit) ---- */
let PUR_ITEMS=null;
function vendorOpts(sel){
return `<option value="">— Select vendor —</option>`+[...(DB.Vendors||[])].sort((a,b)=>String(a.Name).localeCompare(String(b.Name))).map(v=>`<option value="${esc(v.VendorID)}" ${v.VendorID===sel?'selected':''}>${esc(v.Name)}</option>`).join("");
}
function purRowsHtml(){
const g=window._purG;
const gi=(DB.StockItems||[]).filter(s=>s.GodownID===g).sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
return PUR_ITEMS.map((x,i)=>`
<div style="display:grid;grid-template-columns:1fr 80px 100px 92px 30px;gap:.35rem;align-items:center;margin-bottom:.4rem">
<select onchange="PUR_ITEMS[${i}].SIID=this.value;purCalc()"><option value="">— Item —</option>${gi.map(s=>`<option value="${esc(s.SIID)}" ${s.SIID===x.SIID?'selected':''}>${esc(s.Name)} (${esc(s.Category)}) · stock ${siClosing(s)}</option>`).join("")}</select>
<input type="number" placeholder="Qty" value="${esc(x.Qty)}" min="0" oninput="PUR_ITEMS[${i}].Qty=this.value;purCalc()">
<input type="number" placeholder="Rate" value="${esc(x.Rate)}" min="0" oninput="PUR_ITEMS[${i}].Rate=this.value;purCalc()">
<input id="pur-amt-${i}" value="${money(num(x.Qty)*num(x.Rate))}" readonly style="background:#F4F7FB">
<button class="del" style="background:#FDECEA;color:var(--bad);border:none;border-radius:6px;height:34px" onclick="PUR_ITEMS.splice(${i},1);$('pur-items').innerHTML=purRowsHtml();purCalc()">✕</button>
</div>`).join("");
}
function addPurRow(){ PUR_ITEMS.push({SIID:"",Qty:"",Rate:""}); $("pur-items").innerHTML=purRowsHtml(); purCalc(); }
function purCalc(){
let t=0;
PUR_ITEMS.forEach((x,i)=>{ const a=num(x.Qty)*num(x.Rate); t+=a; const el=$("pur-amt-"+i); if(el) el.value=money(a); });
if($("pur-total")) $("pur-total").textContent=money(t);
}
function smPurchases(){
const gs=myGodowns(); // v23.2
if(!gs.length) return `<div class="card empty">Pehle godown banao (＋ Godown), phir items, phir purchase enter hogi.</div>`;
if(!PUR_ITEMS) PUR_ITEMS=[{SIID:"",Qty:"",Rate:""}];
const g=(window._purG && gs.some(x=>x.GodownID===window._purG))? window._purG : gs[0].GodownID;
window._purG=g;
const bills={};
(DB.Purchases||[]).forEach(p=>{ (bills[p.PurchID]=bills[p.PurchID]||[]).push(p); });
const ids=Object.keys(bills).sort().reverse().slice(0,25);
return `
<div class="card" style="max-width:780px;margin-bottom:1rem">
<b>🛒 New purchase entry</b>
<p class="muted" style="margin:.3rem 0 .5rem">Purchase save hote hi item ka stock <b>plus</b> ho jaata hai aur vendor ke ledger mein <b>credit</b> (udhaar) chadh jaata hai.</p>
<div class="form-grid">
<div><label>Date</label><input type="date" id="pur-date" value="${todayStr()}"></div>
<div><label>Vendor <span class="req">*</span></label><div style="display:flex;gap:.4rem"><select id="pur-vendor" style="flex:1">${vendorOpts(window._purV)}</select><button type="button" class="btn dark small" onclick="openVendorForm()">＋ New</button></div></div>
<div><label>Godown <span class="req">*</span></label><select id="pur-gd" onchange="window._purG=this.value;PUR_ITEMS=[{SIID:'',Qty:'',Rate:''}];render()">${gs.map(x=>`<option value="${esc(x.GodownID)}" ${g===x.GodownID?'selected':''}>${esc(x.Name)}</option>`).join("")}</select></div>
</div>
<label>Items <span class="req">*</span> (qty + rate)</label>
<div id="pur-items">${purRowsHtml()}</div>
<button type="button" class="btn ghost small" onclick="addPurRow()">＋ Item row</button>
<div class="total-box"><div class="rowline" style="border:none;padding:0"><span>Total purchase</span><b id="pur-total">₹0</b></div></div>
<label>Notes (bill no. etc.)</label><input id="pur-notes" placeholder="optional">
<div style="margin-top:.8rem"><button class="btn" onclick="savePurchase()">Save purchase — stock plus hoga</button></div>
</div>
<div class="section-h"><h3>Recent purchases</h3><div class="ln"></div></div>
${ids.length? `<div class="tbl-wrap"><table><tr><th>ID</th><th>Date</th><th>Vendor</th><th>Godown</th><th>Items</th><th style="text-align:right">Total</th><th>By</th></tr>
${ids.map(id=>{
const rows=bills[id];
const tot=rows.reduce((s,p)=>s+num(p.Amount),0);
return `<tr><td><b>${esc(id)}</b></td><td>${fmtDate(rows[0].Date)}</td><td>${esc(rows[0].VendorName)}</td><td>${esc(gdName(rows[0].GodownID))}</td>
<td class="muted">${rows.map(p=>esc(p.ItemName)+" ×"+p.Qty+" @"+p.Rate).join(", ")}</td>
<td style="text-align:right"><b>${money(tot)}</b></td><td>${esc(rows[0].EnteredBy)}</td></tr>`;}).join("")}
</table></div>` : `<div class="card empty">Abhi koi purchase nahi.</div>`}`;
}
async function savePurchase(){
const vid=$("pur-vendor").value;
if(!vid) return toast("Vendor select karo — nahi hai to ＋ New se banao.");
const v=(DB.Vendors||[]).find(x=>x.VendorID===vid); if(!v) return toast("Vendor nahi mila.");
window._purV=vid;
const dt=$("pur-date").value||todayStr();
const rows=PUR_ITEMS.filter(x=>x.SIID && num(x.Qty)>0);
if(!rows.length) return toast("Kam se kam ek item select karo qty ke saath.");
for(const x of rows){ if(num(x.Rate)<=0) return toast("Har item ka rate daalo."); }
busy(true,"Saving purchase…");
try{
const pid=nextId("Purchases","PurchID","PUR");
const note=$("pur-notes").value.trim();
for(const x of rows){
const si=(DB.StockItems||[]).find(s=>s.SIID===x.SIID);
await appendRow("Purchases",{RowID:nextId("Purchases","RowID","PRW",5),PurchID:pid,Date:dt,VendorID:v.VendorID,VendorName:v.Name,GodownID:si.GodownID,SIID:si.SIID,ItemName:si.Name,Qty:num(x.Qty),Rate:num(x.Rate),Amount:num(x.Qty)*num(x.Rate),Notes:note,EnteredBy:USER.Name,Timestamp:nowStr()});
}
PUR_ITEMS=[{SIID:"",Qty:"",Rate:""}];
busy(false); toast("Purchase "+pid+" saved ✓ — stock update ho gaya"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}

/* ---- VENDOR MANAGEMENT (add + ledger) ---- */
function vendorPurchTotal(v){ return (DB.Purchases||[]).filter(p=>p.VendorID===v.VendorID).reduce((s,p)=>s+num(p.Amount),0); }
function vendorPaidTotal(v){ return (DB.Expenses||[]).filter(x=>x.Category==="Vendor Payment" && String(x.CategoryDetail).trim()===String(v.Name).trim()).reduce((s,x)=>s+num(x.Amount),0); }
function vVendorMgmt(){
if(!canVendorMgmt()) return `<div class="card empty">This module is for Manager / Admin.</div>`;
const q=(window._vdQ||"").toLowerCase();
let vs=[...(DB.Vendors||[])].sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
if(q) vs=vs.filter(v=>String(v.Name).toLowerCase().includes(q));
const rows=vs.map(v=>{ const pur=vendorPurchTotal(v), paid=vendorPaidTotal(v); return {v,pur,paid,bal:pur-paid}; });
const totBal=rows.reduce((s,x)=>s+x.bal,0);
return `
<div class="toolbar">
<input id="q-vd" placeholder="Search vendor…" value="${esc(window._vdQ||"")}" oninput="window._vdQ=this.value;window._refocusId=this.id;render()">
<button class="btn" onclick="openVendorForm()">＋ Add vendor</button>
</div>
<div class="card stat ${totBal>0?'warn':'ok'}" style="max-width:360px;margin-bottom:1rem"><div class="v">${money(totBal)}</div><div class="l">Total payable to vendors</div></div>
${rows.length? `<div class="tbl-wrap"><table><tr><th>Vendor</th><th style="text-align:right">Purchases</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance (payable)</th><th></th></tr>
${rows.map(x=>`<tr class="click" onclick="openVendorLedger('${x.v.VendorID}')"><td><b>${esc(x.v.Name)}</b><div class="muted">${esc(x.v.VendorID)}</div></td>
<td style="text-align:right">${money(x.pur)}</td><td style="text-align:right">${money(x.paid)}</td>
<td style="text-align:right"><b style="color:${x.bal>0.009?'var(--bad)':'var(--ok)'}">${money(x.bal)}</b></td>
<td><button class="btn small ghost" onclick="event.stopPropagation();openVendorLedger('${x.v.VendorID}')">Ledger</button></td></tr>`).join("")}
</table></div>` : `<div class="card empty">Koi vendor nahi — ＋ Add vendor se banao. Purchase entry ke andar se bhi ban jaata hai.</div>`}`;
}
function openVendorForm(){
openModal("New vendor", `
<label>Vendor name <span class="req">*</span></label><input id="vd-name" placeholder="e.g. Kajaria Ceramics / Somany">
<div style="margin-top:1rem"><button class="btn" onclick="saveVendor()">Save vendor</button></div>`);
}
async function saveVendor(){
const n=$("vd-name").value.trim(); if(!n) return toast("Vendor name likho.");
if((DB.Vendors||[]).some(v=>String(v.Name).toLowerCase()===n.toLowerCase())) return toast("Is naam ka vendor already hai.");
busy(true,"Saving vendor…");
try{
const v=await appendRow("Vendors",{VendorID:nextId("Vendors","VendorID","VD"),Name:n,CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); closeModal(); toast("Vendor added ✓");
const sel=$("pur-vendor");
if(sel){ window._purV=v.VendorID; sel.innerHTML=vendorOpts(v.VendorID); } else render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function openVendorLedger(vid){
const v=(DB.Vendors||[]).find(x=>x.VendorID===vid); if(!v) return;
const bills={};
(DB.Purchases||[]).filter(p=>p.VendorID===vid).forEach(p=>{ (bills[p.PurchID]=bills[p.PurchID]||[]).push(p); });
const entries=[];
Object.keys(bills).forEach(id=>{
const rows=bills[id];
entries.push({date:String(rows[0].Date).slice(0,10), ts:String(rows[0].Timestamp), desc:"Purchase "+id+" — "+rows.map(p=>p.ItemName+" ×"+p.Qty).join(", ")+(rows[0].Notes?" · "+rows[0].Notes:""), cr:rows.reduce((s,p)=>s+num(p.Amount),0), dr:0});
});
(DB.Expenses||[]).filter(x=>x.Category==="Vendor Payment" && String(x.CategoryDetail).trim()===String(v.Name).trim()).forEach(x=>{
entries.push({date:String(x.Date).slice(0,10), ts:String(x.Timestamp), desc:"Payment — "+x.Source+(x.Comments?" · "+x.Comments:"")+" (by "+x.EnteredBy+")", cr:0, dr:num(x.Amount)});
});
entries.sort((a,b)=> a.date===b.date ? (a.ts<b.ts?-1:1) : (a.date<b.date?-1:1));
let bal=0;
const rowsHtml=entries.map(e=>{ bal+=e.cr-e.dr; return `<tr><td>${e.date}</td><td>${esc(e.desc)}</td><td style="text-align:right">${e.cr?money(e.cr):"—"}</td><td style="text-align:right">${e.dr?money(e.dr):"—"}</td><td style="text-align:right"><b>${money(bal)}</b></td></tr>`; }).join("");
openModal("Vendor Ledger — "+v.Name, `
<div class="rowline"><span>Total purchases</span><b>${money(vendorPurchTotal(v))}</b></div>
<div class="rowline"><span>Total paid</span><b>${money(vendorPaidTotal(v))}</b></div>
<div class="rowline"><span>Balance payable</span><b style="color:${bal>0.009?'var(--bad)':'var(--ok)'}">${money(bal)}</b></div>
<p class="muted" style="margin:.5rem 0">Payment dene ke liye: <b>Expenses → ＋ Expense entry → Category "Vendor Payment"</b> → vendor chuno. Wo yahan ledger mein debit ho jaayegi.</p>
${entries.length? `<div class="tbl-wrap" style="margin-top:.5rem"><table><tr><th>Date</th><th>Detail</th><th style="text-align:right">Purchase (Cr)</th><th style="text-align:right">Payment (Dr)</th><th style="text-align:right">Balance</th></tr>${rowsHtml}</table></div>` : `<div class="card empty">Abhi koi entry nahi.</div>`}`);
}

/* ===== v22.1: CHECK BANK ENTRIES (Accountant + Admin) =====
 *  NEFT BSC / Card Swipe payments ki list — estimate no, customer, salesman,
 *  billing details/items, voice note + photo/PDF (GST certificate) view, mark checked. */
const BK_SRCS=["NEFT BSC","Card Swipe","Cheque"]; // v25: Cheque bhi accountant check mein
function canBankCheck(){ return isAdmin() || hasMod("bankcheck") || String(USER.Role).toLowerCase().indexOf("accountant")>-1; }
function paySalesman(p){
if(p.EstimateID){ const e=(DB.Estimates||[]).find(x=>x.EstimateID===p.EstimateID); if(e && e.Salesman) return e.Salesman; }
const c=(DB.Customers||[]).find(x=>x.CustomerID===p.CustomerID);
return (c && c.Salesman) || "—";
}
function vBankCheck(){
if(!canBankCheck()) return `<div class="card empty">This module is for Accountant / Admin.</div>`;
const tab=window._bkTab||"unchecked";
const fs=window._bkSrc||"all";
const q=(window._bkQ||"").toLowerCase();
let list=(DB.Payments||[]).filter(p=>BK_SRCS.includes(p.Source));
if(fs!=="all") list=list.filter(p=>p.Source===fs);
if(tab==="unchecked") list=list.filter(p=>p.AcctCheckStatus!=="Checked");
else list=list.filter(p=>p.AcctCheckStatus==="Checked");
if(q) list=list.filter(p=>(p.CustomerName+" "+p.EstimateID+" "+p.BillingDetails+" "+p.BillingItems+" "+p.Comments+" "+p.SourceDetail).toLowerCase().includes(q));
list=[...list].sort((a,b)=>a.Timestamp<b.Timestamp?1:-1).slice(0,300);
const unCount=(DB.Payments||[]).filter(p=>BK_SRCS.includes(p.Source) && p.AcctCheckStatus!=="Checked").length;
return `
<div class="toolbar">
<button class="btn ${tab==='unchecked'?'':'ghost'} small" onclick="window._bkTab='unchecked';render()">🔴 Unchecked (${unCount})</button>
<button class="btn ${tab==='checked'?'':'ghost'} small" onclick="window._bkTab='checked';render()">✅ Checked</button>
<select style="max-width:170px" onchange="window._bkSrc=this.value;render()">
<option value="all" ${fs==='all'?'selected':''}>NEFT + Card + Cheque (sab)</option>
<option ${fs==='NEFT BSC'?'selected':''}>NEFT BSC</option>
<option ${fs==='Card Swipe'?'selected':''}>Card Swipe</option>
<option ${fs==='Cheque'?'selected':''}>Cheque</option>
</select>
<input id="q-bk" placeholder="Search customer / estimate / billing…" value="${esc(window._bkQ||"")}" oninput="window._bkQ=this.value;window._refocusId=this.id;render()">
</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>Date</th><th>Estimate</th><th>Customer</th><th>Salesman</th><th style="text-align:right">Amount</th><th>Source</th><th>Billing details</th><th>Billing items</th><th>Attachments</th>${tab==='checked'?'<th>Checked by</th>':''}<th></th></tr>
${list.map(p=>`<tr>
<td>${fmtDate(p.Date)}<div class="muted" style="font-size:.7rem">by ${esc(p.ReceivedBy)}</div></td>
<td>${p.EstimateID?`<a href="javascript:void 0" onclick="openEstimate('${esc(p.EstimateID)}')" style="font-weight:700;color:var(--blue)">${esc(p.EstimateID)}</a>`:"—"}</td>
<td><b>${esc(p.CustomerName)}</b></td>
<td>${esc(paySalesman(p))}</td>
<td style="text-align:right"><b>${money(p.Amount)}</b></td>
<td><span class="pill ${p.Source==='NEFT BSC'?'p-blue':p.Source==='Cheque'?'p-warn':'p-gray'}">${esc(p.Source)}</span>${p.Source==='Cheque'&&p.SourceDetail?`<div style="font-size:.72rem;font-weight:700;margin-top:.2rem">${esc(p.SourceDetail)}</div>`:""}</td>
<td>${esc(p.BillingDetails||"—")}</td>
<td style="max-width:260px;white-space:normal">${esc(p.BillingItems||"—")}${p.Comments?`<div class="muted" style="font-size:.72rem">💬 ${esc(p.Comments)}</div>`:""}</td>
<td style="white-space:nowrap">${p.VoiceURL?`<a class="doc-chip" href="${esc(p.VoiceURL)}" target="_blank" rel="noopener">🎙 voice</a> `:""}${p.FileURL?`<a class="doc-chip" href="${esc(p.FileURL)}" target="_blank" rel="noopener">📎 file</a>`:""}${!p.VoiceURL&&!p.FileURL?'<span class="muted">—</span>':""}</td>
${tab==='checked'?`<td>${esc(p.AcctCheckedBy||"—")}<div class="muted" style="font-size:.7rem">${esc(String(p.AcctCheckedAt||"").slice(0,16))}</div></td>`:""}
<td>${tab==='unchecked'?`<button class="btn small" style="background:var(--ok)" onclick="bankMarkChecked('${esc(p.PaymentID)}')">✓ Checked</button>`:""}</td>
</tr>`).join("")}
</table></div>` : `<div class="card empty">${tab==='unchecked'?"Sab bank entries checked hain. 🎉":"Abhi koi checked entry nahi."}</div>`}`;
}
async function bankMarkChecked(pid){
const p=(DB.Payments||[]).find(x=>x.PaymentID===pid); if(!p) return;
busy(true,"Marking checked…");
try{
await updateFields("Payments", p, {AcctCheckStatus:"Checked", AcctCheckedBy:USER.Name, AcctCheckedAt:nowStr()} /* v31: accountant ka apna check — Admin ke Payments Checker (CheckStatus) se alag */);
busy(false); toast("Entry checked ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}

/* ===== v25: ANALYSIS MODULE (Manager = apni branch; Admin = all / branch filter; custom role via Roles "analysis") =====
 *  Types: sales | expense | collection | salesmen | items | aging
 *  Charts = hand-made SVG/CSS (koi library nahi) — mobile par fast, PDF export mein bhi aate hain.
 *  Period: Month picker YA From–To. Branch scope: Salesman (estimates/customers), EnteredBy (expenses), ReceivedBy (payments). */
function canAnalysis(){ return isAdmin()||isMgr()||hasMod("analysis"); }
function anState(){
if(!window._an){ const t=todayStr(); window._an={type:"sales",mode:"month",ym:t.slice(0,7),from:t.slice(0,8)+"01",to:t,cu:true,br:"all"}; }
return window._an;
}
function anSet(k,v){ anState()[k]=v; render(); }
function anRange(){
const a=anState();
if(a.mode==="month"){ const y=Number(a.ym.slice(0,4)), m=Number(a.ym.slice(5,7)); const last=new Date(y,m,0).getDate(); return {from:a.ym+"-01", to:a.ym+"-"+String(last).padStart(2,"0")}; }
let from=a.from||todayStr(), to=a.to||todayStr(); if(from>to){ const t=from; from=to; to=t; }
return {from,to};
}
function anBranch(){
if(isAdmin()) return anState().br||"all";
if(isMgr()) return USER.Branch||"all";
const rd=roleDef(); if(rd && rd.Scope==="Branch" && USER.Branch) return USER.Branch;
return "all";
}
function anIn(name){
const b=anBranch(); if(!b||b==="all") return true;
const pb=userBranch(name||"");
if(b==="__none") return pb==="";
return !pb || pb===b; // inMyBranch jaisa: bina-branch users sabko dikhte hain
}
function anDays(from,to){ return Math.round((new Date(to)-new Date(from))/86400000)+1; }
function anPrev(r){ const n=anDays(r.from,r.to); const f=new Date(r.from); f.setDate(f.getDate()-n); const t=new Date(r.from); t.setDate(t.getDate()-1); const s=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); return {from:s(f),to:s(t)}; }
function anPct(cur,prev){ if(!prev) return cur?"<span class='pill p-gray'>pehle 0</span>":""; const p=Math.round((cur-prev)/Math.abs(prev)*100); return `<span class="pill ${p>=0?'p-ok':'p-bad'}">${p>=0?"▲":"▼"} ${Math.abs(p)}% vs pichhla period</span>`; }
const AN_COLORS=["#2563EB","#16A34A","#F59E0B","#DC2626","#7C3AED","#0891B2","#DB2777","#65A30D","#EA580C","#475569","#0D9488","#9333EA","#B45309","#1D4ED8"];
function anShort(n){ n=Number(n)||0; const a=Math.abs(n); const f=(v,d)=>v.toFixed(d).replace(/\.?0+$/,""); if(a>=1e7) return f(n/1e7,2)+"Cr"; if(a>=1e5) return f(n/1e5,2)+"L"; if(a>=1e3) return f(n/1e3,1)+"K"; return String(Math.round(n)); }
function anDD(d){ return d.slice(8,10)+"/"+d.slice(5,7); }
function anMon(ym){ return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(ym.slice(5,7))-1]+" "+ym.slice(2,4); }
/* --- CSS horizontal bars: rows [{label, value, sub?, color?}] --- */
function anHBars(rows, opt){
opt=opt||{}; const fmt=opt.fmt||money; const max=Math.max(...rows.map(r=>Math.abs(r.value)),1);
if(!rows.length) return `<div class="empty">Koi data nahi.</div>`;
const ck=r=>opt.onclick? ` onclick="${opt.onclick}('${esc(String(r.key!==undefined?r.key:r.label)).replace(/'/g,"\\'")}')" style="cursor:pointer" title="Detail dekho"`:"";
return `<div class="an-hb">${rows.map((r,i)=>`<div style="margin-bottom:.45rem"${ck(r)}>
<div style="display:flex;justify-content:space-between;font-size:.78rem;gap:.5rem"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(r.label)}</b>${r.sub?` <span class="muted">${esc(r.sub)}</span>`:""}</span><b style="white-space:nowrap">${fmt(r.value)}</b></div>
<div style="background:#EEF2F7;border-radius:6px;height:12px;overflow:hidden"><div style="width:${Math.max(1,Math.round(Math.abs(r.value)/max*100))}%;height:100%;background:${r.color||AN_COLORS[i%AN_COLORS.length]};border-radius:6px"></div></div></div>`).join("")}</div>`;
}
/* --- SVG vertical bars (trend): pts [{x, y, y2?}] --- */
function anVBars(pts, opt){
opt=opt||{}; if(!pts.length) return `<div class="empty">Koi data nahi.</div>`; const fmt=opt.fmt||money;
const W=760, H=250, L=52, R=10, T=16, B=44; const iw=W-L-R, ih=H-T-B;
const max=Math.max(...pts.map(p=>Math.max(p.y||0,p.y2||0)),1);
const n=pts.length, bw=iw/n, gap=Math.min(6,bw*0.2), w1=(bw-gap)/(opt.two?2:1);
const step=Math.max(1,Math.ceil(n/12));
const grid=[0,.25,.5,.75,1].map(g=>`<line x1="${L}" x2="${W-R}" y1="${T+ih-ih*g}" y2="${T+ih-ih*g}" stroke="#E5E9F0"/><text x="${L-6}" y="${T+ih-ih*g+4}" font-size="10" text-anchor="end" fill="#667">${anShort(max*g)}</text>`).join("");
const bars=pts.map((p,i)=>{
const x=L+i*bw+gap/2; const h=Math.max(0,(p.y||0)/max*ih), h2=Math.max(0,(p.y2||0)/max*ih);
return `<rect x="${x}" y="${T+ih-h}" width="${w1}" height="${h}" rx="2" fill="${opt.c1||'#2563EB'}"><title>${esc(p.x)}: ${fmt(p.y||0)}</title></rect>`+
(opt.two?`<rect x="${x+w1}" y="${T+ih-h2}" width="${w1}" height="${h2}" rx="2" fill="${opt.c2||'#16A34A'}"><title>${esc(p.x)}: ${fmt(p.y2||0)}</title></rect>`:"")+
(i%step===0?`<text x="${x+(bw-gap)/2}" y="${H-B+14}" font-size="10" text-anchor="middle" fill="#445">${esc(p.x)}</text>`:"")+
(n<=16&&(p.y||0)>0?`<text x="${x+w1/2}" y="${T+ih-h-3}" font-size="9" text-anchor="middle" fill="#334">${anShort(p.y)}</text>`:"");
}).join("");
const leg=opt.two?`<text x="${L}" y="${H-6}" font-size="10" fill="#445"><tspan fill="${opt.c1||'#2563EB'}">■</tspan> ${esc(opt.l1||"")} &nbsp; <tspan fill="${opt.c2||'#16A34A'}">■</tspan> ${esc(opt.l2||"")}</text>`:"";
return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${grid}${bars}${leg}</svg>`;
}
/* --- SVG line (trend) --- */
function anLine(pts, opt){
opt=opt||{}; if(!pts.length) return `<div class="empty">Koi data nahi.</div>`;
const W=760, H=230, L=52, R=14, T=16, B=34; const iw=W-L-R, ih=H-T-B;
const max=Math.max(...pts.map(p=>p.y||0),1); const n=pts.length; const sx=i=>L+(n===1?iw/2:i*iw/(n-1)); const sy=v=>T+ih-(v||0)/max*ih;
const step=Math.max(1,Math.ceil(n/10));
const grid=[0,.25,.5,.75,1].map(g=>`<line x1="${L}" x2="${W-R}" y1="${T+ih-ih*g}" y2="${T+ih-ih*g}" stroke="#E5E9F0"/><text x="${L-6}" y="${T+ih-ih*g+4}" font-size="10" text-anchor="end" fill="#667">${anShort(max*g)}</text>`).join("");
const d=pts.map((p,i)=>(i?"L":"M")+sx(i).toFixed(1)+" "+sy(p.y).toFixed(1)).join(" ");
const area=d+` L${sx(n-1).toFixed(1)} ${T+ih} L${sx(0).toFixed(1)} ${T+ih} Z`;
const dots=pts.map((p,i)=>`<circle cx="${sx(i)}" cy="${sy(p.y)}" r="3" fill="${opt.c||'#2563EB'}"><title>${esc(p.x)}: ${money(p.y||0)}</title></circle>`+(i%step===0?`<text x="${sx(i)}" y="${H-B+14}" font-size="10" text-anchor="middle" fill="#445">${esc(p.x)}</text>`:"")).join("");
return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${grid}<path d="${area}" fill="${opt.c||'#2563EB'}" opacity=".12"/><path d="${d}" fill="none" stroke="${opt.c||'#2563EB'}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`;
}
/* --- SVG donut + legend: rows [{label,value}] --- */
function anPie(rows, opt){
opt=opt||{}; const fmt=opt.fmt||money;
rows=rows.filter(r=>r.value>0).sort((a,b)=>b.value-a.value);
if(!rows.length) return `<div class="empty">Koi data nahi.</div>`;
if(rows.length>8){ const rest=rows.slice(7).reduce((s,r)=>s+r.value,0); rows=rows.slice(0,7).concat([{label:"Others ("+(rows.length-7)+")",value:rest}]); }
const tot=rows.reduce((s,r)=>s+r.value,0); const cx=90, cy=90, r=78, ri=46; let ang=-Math.PI/2;
const segs=rows.map((s,i)=>{
const a=s.value/tot*2*Math.PI; if(rows.length===1) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${AN_COLORS[i]}"/>`;
const x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang), x2=cx+r*Math.cos(ang+a), y2=cy+r*Math.sin(ang+a); const lg=a>Math.PI?1:0; ang+=a;
return `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${lg} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${AN_COLORS[i%AN_COLORS.length]}"><title>${esc(s.label)}: ${fmt(s.value)} (${Math.round(s.value/tot*100)}%)</title></path>`;
}).join("");
return `<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
<svg viewBox="0 0 180 180" style="width:170px;height:170px;flex:0 0 auto" xmlns="http://www.w3.org/2000/svg">${segs}<circle cx="${cx}" cy="${cy}" r="${ri}" fill="#fff"/><text x="${cx}" y="${cy-4}" font-size="11" text-anchor="middle" fill="#667">${esc(opt.center||"Total")}</text><text x="${cx}" y="${cy+12}" font-size="13" font-weight="700" text-anchor="middle" fill="#123">${anShort(tot)}</text></svg>
<div style="flex:1 1 180px;font-size:.78rem">${rows.map((s,i)=>`<div style="display:flex;justify-content:space-between;gap:.5rem;padding:.15rem 0;border-bottom:1px dashed #EEF2F7"><span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${AN_COLORS[i%AN_COLORS.length]};margin-right:.4rem"></span>${esc(s.label)}</span><span style="white-space:nowrap"><b>${fmt(s.value)}</b> <span class="muted">${Math.round(s.value/tot*100)}%</span></span></div>`).join("")}</div></div>`;
}
/* --- data helpers --- */
function anVal(e){ return anState().cu ? num(e.GrandTotal) : (num(e.ItemsTotal)-num(e.Discount)); }
function anEst(r){ return (DB.Estimates||[]).filter(e=>e.Status!=="Cancelled" && anIn(e.Salesman) && inRange(e.Date,r.from,r.to)); }
function anExp(r){ return (DB.Expenses||[]).filter(x=>anIn(x.EnteredBy) && inRange(x.Date,r.from,r.to)); }
function anPay(r){ return (DB.Payments||[]).filter(p=>anIn(p.ReceivedBy) && inRange(p.Date,r.from,r.to) && !(p.Source==="Rebate" && p.CashStatus!=="Approved")); }
/* Trend buckets: ≤45 din → daily, warna monthly */
function anBuckets(r){
const daily=anDays(r.from,r.to)<=45; const out=[];
if(daily){ const d=new Date(r.from); const end=new Date(r.to); while(d<=end){ const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); out.push({key:k,x:anDD(k)}); d.setDate(d.getDate()+1); } }
else{ let k=r.from.slice(0,7); const endK=r.to.slice(0,7); while(k<=endK){ out.push({key:k,x:anMon(k)}); let y=Number(k.slice(0,4)), m=Number(k.slice(5,7))+1; if(m>12){m=1;y++;} k=y+"-"+String(m).padStart(2,"0"); } }
return {daily, list:out};
}
function anTrend(r, list, dateOf, valOf, val2Of){
const b=anBuckets(r); const idx={}; b.list.forEach((x,i)=>idx[x.key]=i);
const pts=b.list.map(x=>({x:x.x,y:0,y2:0}));
list.forEach(o=>{ const d=String(dateOf(o)).slice(0,10); const k=b.daily?d:d.slice(0,7); const i=idx[k]; if(i==null) return; pts[i].y+=valOf(o); if(val2Of) pts[i].y2+=val2Of(o); });
return {pts, daily:b.daily};
}
function anGroup(list, keyOf, valOf){ const m={}; list.forEach(o=>{ const k=String(keyOf(o)||"—").trim()||"—"; if(!m[k]) m[k]={label:k,value:0,count:0}; m[k].value+=valOf(o); m[k].count++; }); return Object.values(m).sort((a,b)=>b.value-a.value); }
function anCard(v,l,cls){ return `<div class="card stat ${cls||""}"><div class="v" style="font-size:1.15rem">${v}</div><div class="l">${l}</div></div>`; }
function anSec(t,extra){ return `<div class="section-h" style="margin-top:1rem"><h3>${t}</h3><div class="ln"></div>${extra||""}</div>`; }
function anBox(h){ return `<div class="card" style="padding:.8rem 1rem">${h}</div>`; }
function anInsight(lines){ lines=lines.filter(Boolean); if(!lines.length) return ""; return `<div class="card" style="border-left:4px solid var(--blue);background:#F6F9FF;margin-top:1rem"><b>💡 Decision points</b><ul style="margin:.4rem 0 0 1.1rem;padding:0;font-size:.82rem;line-height:1.5">${lines.map(l=>`<li>${l}</li>`).join("")}</ul></div>`; }
/* ================= VIEW ================= */
function vAnalysis(){
if(!canAnalysis()) return `<div class="card empty">This module is for Manager / Admin.</div>`;
const a=anState(); const r=anRange();
const TYPES=[["sales","📈 Sales Analysis"],["expense","💸 Expense Analysis"],["collection","💰 Collection Analysis"],["salesmen","🧑‍💼 Salesman Performance"],["items","📦 Top Items"],["aging","⏳ Outstanding Aging"],["dispatch","🚚 Dispatch Performance"]]; // v40
const brLabel = isAdmin() ? (a.br==="all"?"All branches":a.br==="__none"?"HO":a.br) : (USER.Branch||"All");
let body="";
try{
body = a.type==="sales"?anSales(r) : a.type==="expense"?anExpense(r) : a.type==="collection"?anCollection(r) : a.type==="salesmen"?anSalesmen(r) : a.type==="items"?anItems(r) : a.type==="dispatch"?anDispatch(r) : anAging(r); // v40
}catch(err){ body=`<div class="card" style="border-left:4px solid var(--bad)">⚠ ${esc(err.message)}</div>`; }
return `
<div class="toolbar" style="gap:.5rem">
<select style="max-width:240px" onchange="anSet('type',this.value)">${TYPES.map(t=>`<option value="${t[0]}" ${a.type===t[0]?'selected':''}>${t[1]}</option>`).join("")}</select>
${a.type!=="aging"?`<select style="max-width:150px" onchange="anSet('mode',this.value)"><option value="month" ${a.mode==='month'?'selected':''}>Monthly</option><option value="range" ${a.mode==='range'?'selected':''}>From – To</option></select>
${a.mode==="month"?`<input type="month" value="${a.ym}" style="max-width:170px" onchange="anSet('ym',this.value)">`
:`<input type="date" value="${a.from}" style="max-width:160px" onchange="anSet('from',this.value)"><span class="muted">to</span><input type="date" value="${a.to}" style="max-width:160px" onchange="anSet('to',this.value)">`}`:`<span class="pill p-gray">As of today</span>`}
${isAdmin()?`<select style="max-width:200px" onchange="anSet('br',this.value)"><option value="all" ${a.br==='all'?'selected':''}>🏢 All branches</option>${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${a.br===b.Name?'selected':''}>📍 ${esc(b.Name)}</option>`).join("")}<option value="__none" ${a.br==='__none'?'selected':''}>🏠 HO / no branch</option></select>`:`<span class="pill p-blue">📍 ${esc(brLabel)}</span>`}
${(a.type==="sales"||a.type==="salesmen"||a.type==="collection")?`<label style="margin:0;display:flex;align-items:center;gap:.35rem;text-transform:none;font-weight:600;font-size:.8rem;cursor:pointer"><input type="checkbox" ${a.cu?'checked':''} onchange="anSet('cu',this.checked)" style="width:auto"> With cartage + unloading</label>`:""}
${isAdmin()?`<button class="btn ghost small" onclick="anPrint()">🖨 Export PDF</button>`:""}
</div>
<div id="an-body" data-title="${esc(TYPES.find(t=>t[0]===a.type)[1])}" data-period="${a.type==='aging'?'As of '+todayStr():r.from+' → '+r.to}" data-branch="${esc(brLabel)}">${body}</div>`;
}
/* ---------------- v40: DISPATCH PERFORMANCE (promised time vs actual) ---------------- */
function anDispatch(r){
const E=anEst(r).filter(e=>e.Type!=="Return");
const disp=E.filter(e=>e.DispatchedAt);
const on=disp.filter(e=>e.OnTime==="On time"), late=disp.filter(e=>e.OnTime==="Late"), nop=disp.filter(e=>!e.PromisedAt);
const second=E.filter(e=>e.PromisedAt2);
const pendLate=E.filter(e=>promIsLate(e));
const delays=late.map(e=>promMs(e.DispatchedAt)-promMs(e.PromisedAt)).filter(x=>x>0);
const avgDelay=delays.length? delays.reduce((a,b)=>a+b,0)/delays.length : 0;
const withProm=on.length+late.length, pct=withProm? Math.round(on.length*100/withProm) : 0;
const byWho={}; late.forEach(e=>{ const k=e.PromisedBy||"—"; byWho[k]=(byWho[k]||0)+1; });
const byWhoAll={}; disp.filter(e=>e.PromisedAt).forEach(e=>{ const k=e.PromisedBy||"—"; byWhoAll[k]=(byWhoAll[k]||0)+1; });
return `
<div class="grid g4">
${anCard(disp.length,"Dispatched (is period mein bane)")}
${anCard(on.length+" <span class='muted' style='font-size:.8rem'>("+pct+"%)</span>","✅ On time (1st promise se)","ok")}
${anCard(late.length,"🔴 Late",late.length?"bad":"")}
${anCard(nop.length,"Bina promised time ke dispatch",nop.length?"warn":"")}
</div>
<div class="grid g3" style="margin-top:.6rem">
${anCard(second.length,"2nd promised time lena pada",second.length?"warn":"")}
${anCard(avgDelay?promDur(avgDelay):"—","Average delay (late walon ka)")}
${anCard(pendLate.length,"Abhi late chal rahe (pending)",pendLate.length?"bad":"")}
</div>
${Object.keys(byWhoAll).length? anBox(`<h3 style="margin:.2rem 0 .5rem">Promise kisne kiya — late %</h3>${anHBars(Object.keys(byWhoAll).map(k=>({label:k+" ("+(byWho[k]||0)+"/"+byWhoAll[k]+")", value:Math.round((byWho[k]||0)*100/byWhoAll[k])})), {fmt:v=>v+"%"})}`):""}
<div class="section-h"><h3>🔴 Late dispatches (${late.length})</h3><div class="ln"></div></div>
${late.length? `<div class="tbl-wrap"><table><tr><th>Estimate</th><th>Customer</th><th>Salesman</th><th>1st promise</th><th>2nd promise</th><th>Dispatched</th><th>Late by</th><th>Reason (2nd)</th><th>Promise by</th></tr>
${[...late].sort((a,b)=>a.DispatchedAt<b.DispatchedAt?1:-1).map(e=>`<tr class="click" onclick="openEstimate('${e.EstimateID}')"><td><b>${esc(e.EstimateID)}</b></td><td>${esc(e.CustomerName)}</td><td>${esc(e.Salesman)}</td><td>${promFmt(e.PromisedAt)}</td><td>${e.PromisedAt2?promFmt(e.PromisedAt2):"—"}</td><td>${esc(String(e.DispatchedAt).slice(0,16))}</td><td style="color:var(--bad);font-weight:700">${promDur(promMs(e.DispatchedAt)-promMs(e.PromisedAt))}</td><td>${esc(e.Promise2Reason||"—")}</td><td>${esc(e.PromisedBy||"—")}</td></tr>`).join("")}
</table></div>` : `<div class="card empty">Koi late dispatch nahi. 🎉</div>`}
${pendLate.length? `<div class="section-h"><h3>Abhi late chal rahe (${pendLate.length})</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Estimate</th><th>Customer</th><th>Promise</th><th>Late by</th><th>Status</th></tr>
${pendLate.map(e=>`<tr class="click" onclick="openEstimate('${e.EstimateID}')"><td><b>${esc(e.EstimateID)}</b></td><td>${esc(e.CustomerName)}</td><td>${promFmt(promActive(e))}</td><td>${promCountdown(e)}</td><td>${esc(e.DispatchStatus||"PENDING FOR DISPATCH")}</td></tr>`).join("")}</table></div>`:""}`;
}
/* ---------------- A) SALES ---------------- */
function anSales(r){
const E=anEst(r), S=E.filter(e=>e.Type!=="Return"), R=E.filter(e=>e.Type==="Return");
const gross=S.reduce((s,e)=>s+anVal(e),0), retV=R.reduce((s,e)=>s+anVal(e),0), net=gross-retV;
const cart=S.reduce((s,e)=>s+num(e.Cartage),0), unl=S.reduce((s,e)=>s+num(e.Unloading),0), disc=S.reduce((s,e)=>s+num(e.Discount),0);
const pr=anPrev(r); const PE=anEst(pr); const pnet=PE.reduce((s,e)=>s+(e.Type==="Return"?-anVal(e):anVal(e)),0);
const bySm=anGroup(E, e=>e.Salesman, e=>e.Type==="Return"?-anVal(e):anVal(e));
const smDet={}; E.forEach(e=>{ const k=e.Salesman||"—"; if(!smDet[k]) smDet[k]={sale:0,ret:0,n:0}; if(e.Type==="Return") smDet[k].ret+=anVal(e); else { smDet[k].sale+=anVal(e); smDet[k].n++; } });
const tr=anTrend(r, E, e=>e.Date, e=>e.Type==="Return"?0:anVal(e), e=>e.Type==="Return"?anVal(e):0);
const best=[...tr.pts].sort((a,b)=>b.y-a.y)[0];
const terms=anGroup(S, e=>e.PaymentTerms||"Not set", e=>anVal(e));
const cust=anGroup(S, e=>e.CustomerName, e=>anVal(e)).slice(0,10);
const newC=new Set(S.map(e=>e.CustomerID)).size;
const top=bySm[0];
return `<div class="grid g4">
${anCard(money(gross),"Gross sale ("+S.length+" estimates)","ok")}${anCard(money(retV),"Sale returns ("+R.length+")","bad")}${anCard(money(net),"Net sale "+anPct(net,pnet))}${anCard(money(S.length?gross/S.length:0),"Avg ticket size","warn")}
</div>
<div class="muted" style="font-size:.75rem;margin:.3rem 0 0">${anState().cu?"Sale = GrandTotal (cartage + unloading included, discount minus)":"Sale = Items − Discount (cartage/unloading EXCLUDED)"} · Cartage ${money(cart)} · Unloading ${money(unl)} · Discount ${money(disc)} · Customers billed: ${newC} · Previous period (${pr.from} → ${pr.to}) net: ${money(pnet)}</div>
${anSec("Sale trend — "+(tr.daily?"day-wise":"month-wise"))}
${anBox(anVBars(tr.pts,{two:true,l1:"Sale",l2:"Return",c1:"#2563EB",c2:"#DC2626"}))}
${anSec("Salesman-wise")}
<div class="grid g2">
${anBox("<b style='font-size:.8rem'>Net sale per salesman</b><div style='margin-top:.5rem'>"+anHBars(bySm)+"</div>")}
${anBox("<b style='font-size:.8rem'>Share of net sale</b><div style='margin-top:.5rem'>"+anPie(bySm.filter(x=>x.value>0),{center:"Net"})+"</div>")}
</div>
<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>Salesman</th><th style="text-align:right">Estimates</th><th style="text-align:right">Sale</th><th style="text-align:right">Returns</th><th style="text-align:right">Net</th><th style="text-align:right">Avg ticket</th><th style="text-align:right">Share</th></tr>
${Object.entries(smDet).sort((a,b)=>(b[1].sale-b[1].ret)-(a[1].sale-a[1].ret)).map(([k,v])=>`<tr><td><b>${esc(k)}</b></td><td style="text-align:right">${v.n}</td><td style="text-align:right">${money(v.sale)}</td><td style="text-align:right;color:var(--bad)">${v.ret?money(v.ret):"—"}</td><td style="text-align:right"><b>${money(v.sale-v.ret)}</b></td><td style="text-align:right">${money(v.n?v.sale/v.n:0)}</td><td style="text-align:right">${net?Math.round((v.sale-v.ret)/net*100):0}%</td></tr>`).join("")||"<tr><td colspan=7 class='empty'>Koi estimate nahi.</td></tr>"}
${E.length?`<tr style="background:var(--navy);color:#fff"><td><b>TOTAL</b></td><td style="text-align:right">${S.length}</td><td style="text-align:right">${money(gross)}</td><td style="text-align:right">${money(retV)}</td><td style="text-align:right"><b>${money(net)}</b></td><td style="text-align:right">${money(S.length?gross/S.length:0)}</td><td style="text-align:right">100%</td></tr>`:""}
</table></div>
<div class="grid g2" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Payment terms (sale value)</b><div style='margin-top:.5rem'>"+anPie(terms,{center:"Sale"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Top 10 customers (sale)</b><div style='margin-top:.5rem'>"+anHBars(cust)+"</div>")}
</div>
${anInsight([
top?`<b>${esc(top.label)}</b> sabse aage — net sale ka ${net?Math.round(top.value/net*100):0}%${bySm.length>1?"; sabse peeche <b>"+esc(bySm[bySm.length-1].label)+"</b> ("+money(bySm[bySm.length-1].value)+")":""}.`:"",
gross?`Returns = gross ka <b>${Math.round(retV/gross*100)}%</b>${retV/gross>0.05?" — 5% se zyada hai, return reasons check karo.":" — theek hai."}`:"",
best&&best.y?`Sabse zyada sale <b>${esc(best.x)}</b> ko (${money(best.y)}).`:"",
pnet?`Pichhle period se net sale <b>${net>=pnet?"badhi":"ghati"}</b> (${money(pnet)} → ${money(net)}).`:"",
terms.find(t=>/credit/i.test(t.label))?`Credit par sale: <b>${money(terms.find(t=>/credit/i.test(t.label)).value)}</b> (${gross?Math.round(terms.find(t=>/credit/i.test(t.label)).value/gross*100):0}%) — collection followup zaroori.`:""
])}`;
}
/* ---------------- B) EXPENSE ---------------- */
function anExpense(r){
const X=anExp(r); const tot=X.reduce((s,x)=>s+num(x.Amount),0);
const pend=X.filter(x=>x.CashStatus==="Pending"); const pendAmt=pend.reduce((s,x)=>s+num(x.Amount),0);
const pr=anPrev(r); const ptot=anExp(pr).reduce((s,x)=>s+num(x.Amount),0);
const byCat=anGroup(X, x=>x.Category, x=>num(x.Amount));
const byDet=anGroup(X, x=>(x.Category||"—")+(x.CategoryDetail?" · "+x.CategoryDetail:""), x=>num(x.Amount)).slice(0,15).map(d=>({...d, key:d.label.replace(" · ","\u0001")}));
const bySrc=anGroup(X, x=>x.Source||"—", x=>num(x.Amount));
const byWho=anGroup(X, x=>x.EnteredBy, x=>num(x.Amount)).slice(0,8);
const tr=anTrend(r, X, x=>x.Date, x=>num(x.Amount));
const days=anDays(r.from,r.to);
const S=anEst(r).filter(e=>e.Type!=="Return"); const sale=S.reduce((s,e)=>s+num(e.GrandTotal),0);
const topC=byCat[0];
return `<div class="grid g4">
${anCard(money(tot),"Total expenses ("+X.length+" entries) "+anPct(tot,ptot),"bad")}${anCard(money(days?tot/days:0),"Per day average")}${anCard(byCat.length,"Categories used")}${anCard(sale?Math.round(tot/sale*100)+"%":"—","Expense ÷ gross sale","warn")}
</div>
${pend.length?`<div class="muted" style="font-size:.75rem;margin-top:.3rem">⚠ ${pend.length} cash expense (${money(pendAmt)}) abhi Accept pending hain — total mein included.</div>`:""}
${anSec("Kis cheez par kitna kharcha — category-wise")}
<div class="grid g2">
${anBox("<b style='font-size:.8rem'>Category share</b><div style='margin-top:.5rem'>"+anPie(byCat,{center:"Expense"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Category-wise amount</b> <span class='muted' style='font-size:.7rem'>(tap → detail)</span><div style='margin-top:.5rem'>"+anHBars(byCat,{onclick:"anExpDrill"})+"</div>")}
</div>
<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>Category <span class="muted" style="font-weight:400">(tap → date-wise detail)</span></th><th style="text-align:right">Entries</th><th style="text-align:right">Amount</th><th style="text-align:right">Avg / entry</th><th style="text-align:right">Share</th></tr>
${byCat.map(c=>`<tr style="cursor:pointer" onclick="anExpDrill('${esc(c.label).replace(/'/g,"\\'")}')"><td><b>${esc(c.label)}</b> <span class="muted">›</span></td><td style="text-align:right">${c.count}</td><td style="text-align:right"><b>${money(c.value)}</b></td><td style="text-align:right">${money(c.value/c.count)}</td><td style="text-align:right">${tot?Math.round(c.value/tot*100):0}%</td></tr>`).join("")||"<tr><td colspan=5 class='empty'>Koi expense nahi.</td></tr>"}
</table></div>
${anSec("Expense trend — "+(tr.daily?"day-wise":"month-wise"))}
${anBox(anVBars(tr.pts,{c1:"#DC2626"}))}
<div class="grid g2" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Top 15 — category · detail (kisko / kis par)</b> <span class='muted' style='font-size:.7rem'>(tap → detail)</span><div style='margin-top:.5rem'>"+anHBars(byDet,{onclick:"anExpDrill"})+"</div>")}
<div>${anBox("<b style='font-size:.8rem'>Cash vs Bank / GPay</b><div style='margin-top:.5rem'>"+anPie(bySrc,{center:"Source"})+"</div>")}
<div style="margin-top:.6rem">${anBox("<b style='font-size:.8rem'>Entered by</b><div style='margin-top:.5rem'>"+anHBars(byWho)+"</div>")}</div></div>
</div>
${anInsight([
topC?`Sabse bada kharcha <b>${esc(topC.label)}</b> — total ka ${tot?Math.round(topC.value/tot*100):0}%.`:"",
ptot?`Pichhle period se kharcha <b>${tot>ptot?"badha ▲":"ghata ▼"}</b> (${money(ptot)} → ${money(tot)})${tot>ptot*1.2?" — 20%+ ka uchhaal, categories check karo.":""}.`:"",
sale?`Har ₹100 ki sale par <b>₹${(tot/sale*100).toFixed(1)}</b> kharcha.`:"",
byDet[0]?`Single sabse bada head: <b>${esc(byDet[0].label)}</b> (${money(byDet[0].value)}, ${byDet[0].count} entries).`:""
])}`;
}
/* v29: Expense head drill-down — category (ya category\u0001detail) → date-wise saari entries */
function anExpDrill(key){
key=String(key||""); const parts=key.split("\u0001"); const cat=parts[0], det=parts[1];
const r=anRange(); const X=anExp(r).filter(x=>(x.Category||"—")===cat && (det===undefined || String(x.CategoryDetail||"")===det)).sort((a,b)=>String(a.Date)<String(b.Date)?1:String(a.Date)>String(b.Date)?-1:String(a.Timestamp)<String(b.Timestamp)?1:-1);
const tot=X.reduce((s,x)=>s+num(x.Amount),0);
const byDet=det===undefined? anGroup(X, x=>x.CategoryDetail||"(no detail)", x=>num(x.Amount)) : [];
const bySrc=anGroup(X, x=>x.Source||"—", x=>num(x.Amount));
const days={}; X.forEach(x=>{ const d=String(x.Date).slice(0,10); days[d]=(days[d]||0)+num(x.Amount); });
const dayRows=Object.keys(days).sort().map(d=>({label:fmtDate(d),value:days[d]}));
openModal("💸 "+cat+(det!==undefined?" · "+det:"")+" — "+r.from+" → "+r.to, `
<div class="grid g3">${anCard(money(tot),"Total","bad")}${anCard(X.length,"Entries")}${anCard(money(X.length?tot/X.length:0),"Avg / entry")}</div>
${byDet.length>1?`<div class="card" style="margin-top:.6rem;padding:.8rem 1rem"><b style="font-size:.8rem">Detail-wise (kisko / kis par)</b><div style="margin-top:.5rem">${anHBars(byDet.slice(0,15))}</div></div>`:""}
${dayRows.length>1?`<div class="card" style="margin-top:.6rem;padding:.8rem 1rem"><b style="font-size:.8rem">Date-wise total</b><div style="margin-top:.5rem">${anHBars(dayRows.slice(-31))}</div></div>`:""}
<div class="muted" style="font-size:.72rem;margin:.6rem 0 .3rem">Source: ${bySrc.map(x=>esc(x.label)+" "+money(x.value)).join(" · ")||"—"}</div>
<div class="tbl-wrap"><table><tr><th>Date</th><th>Detail</th><th style="text-align:right">Amount</th><th>Source</th><th>By</th><th>Comments</th><th>Status</th></tr>
${X.map(x=>`<tr><td style="white-space:nowrap">${fmtDate(x.Date)}</td><td>${esc(x.CategoryDetail||"—")}</td><td style="text-align:right"><b>${money(x.Amount)}</b></td><td>${esc(x.Source||"")}</td><td>${esc(x.EnteredBy||"")}</td><td style="white-space:normal;max-width:260px;font-size:.75rem">${esc(x.Comments||"")}</td><td>${x.CashStatus?`<span class="pill ${x.CashStatus==='Pending'?'p-warn':'p-ok'}">${esc(x.CashStatus)}</span>`:""}</td></tr>`).join("")||"<tr><td colspan=7 class='empty'>Koi entry nahi.</td></tr>"}
${X.length?`<tr style="background:var(--navy);color:#fff"><td colspan=2><b>TOTAL (${X.length})</b></td><td style="text-align:right"><b>${money(tot)}</b></td><td colspan=4></td></tr>`:""}
</table></div>`);
}
/* ---------------- C) COLLECTION ---------------- */
function anCollection(r){
const P=anPay(r); const tot=P.reduce((s,p)=>s+num(p.Amount),0);
const reb=P.filter(p=>p.Source==="Rebate"); const rebAmt=reb.reduce((s,p)=>s+num(p.Amount),0);
const cashPend=P.filter(p=>p.Source==="Cash" && p.CashStatus==="Pending");
const pr=anPrev(r); const ptot=anPay(pr).reduce((s,p)=>s+num(p.Amount),0);
const bySrc=anGroup(P, p=>p.Source==="GPay Others"?"GPay":p.Source, p=>num(p.Amount));
const bySm=anGroup(P, p=>paySalesman(p), p=>num(p.Amount));
const byWho=anGroup(P, p=>p.ReceivedBy, p=>num(p.Amount)).slice(0,8);
const E=anEst(r); const net=E.reduce((s,e)=>s+(e.Type==="Return"?-anVal(e):anVal(e)),0);
const smSale={}; E.forEach(e=>{ const k=e.Salesman||"—"; smSale[k]=(smSale[k]||0)+(e.Type==="Return"?-anVal(e):anVal(e)); });
const cmp=[...new Set([...Object.keys(smSale),...bySm.map(x=>x.label)])].map(k=>({x:k,y:smSale[k]||0,y2:(bySm.find(x=>x.label===k)||{}).value||0})).sort((a,b)=>b.y-a.y).slice(0,12);
const tr=anTrend(r, P, p=>p.Date, p=>num(p.Amount));
const gp=anGroup(P.filter(p=>p.Source==="GPay Others"), p=>p.SourceDetail||"—", p=>num(p.Amount));
const unchk=P.filter(p=>["NEFT BSC","Card Swipe","Cheque"].includes(p.Source) && p.AcctCheckStatus!=="Checked").length;
return `<div class="grid g4">
${anCard(money(tot),"Total collected ("+P.length+" payments) "+anPct(tot,ptot),"ok")}${anCard(money(net),"Net sale (same period)")}${anCard(net?Math.round(tot/net*100)+"%":"—","Collection ÷ net sale","warn")}${anCard(money(rebAmt),"Rebates approved ("+reb.length+")","bad")}
</div>
<div class="muted" style="font-size:.75rem;margin:.3rem 0 0">${cashPend.length?"⚠ "+cashPend.length+" cash payment abhi Accept pending. ":""}${unchk?"🏦 "+unchk+" bank/cheque entries accountant se unchecked. ":""}Previous period: ${money(ptot)}</div>
${anSec("Kaise aaya paisa — source-wise")}
<div class="grid g2">
${anBox("<b style='font-size:.8rem'>Source share</b><div style='margin-top:.5rem'>"+anPie(bySrc,{center:"Collected"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Source-wise amount</b><div style='margin-top:.5rem'>"+anHBars(bySrc)+(gp.length?"<div class='muted' style='font-size:.72rem;margin-top:.4rem'>GPay heads: "+gp.map(g=>esc(g.label)+" "+money(g.value)).join(" · ")+"</div>":"")+"</div>")}
</div>
${anSec("Collection trend — "+(tr.daily?"day-wise":"month-wise"))}
${anBox(anLine(tr.pts,{c:"#16A34A"}))}
${anSec("Salesman-wise: sale vs collection")}
${anBox(anVBars(cmp,{two:true,l1:"Net sale",l2:"Collected",c1:"#2563EB",c2:"#16A34A"}))}
<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>Salesman</th><th style="text-align:right">Net sale</th><th style="text-align:right">Collected</th><th style="text-align:right">Coll. %</th><th style="text-align:right">Gap</th></tr>
${cmp.map(c=>`<tr><td><b>${esc(c.x)}</b></td><td style="text-align:right">${money(c.y)}</td><td style="text-align:right">${money(c.y2)}</td><td style="text-align:right">${c.y?Math.round(c.y2/c.y*100)+"%":"—"}</td><td style="text-align:right;color:${c.y-c.y2>0?'var(--bad)':'var(--ok)'}">${money(c.y-c.y2)}</td></tr>`).join("")||"<tr><td colspan=5 class='empty'>Koi data nahi.</td></tr>"}
</table></div>
<div style="margin-top:.6rem">${anBox("<b style='font-size:.8rem'>Received by (kisne collect kiya)</b><div style='margin-top:.5rem'>"+anHBars(byWho)+"</div>")}</div>
${anInsight([
net?`Is period ki sale ka <b>${Math.round(tot/net*100)}%</b> collect hua${tot/net<0.7?" — 70% se kam, payment followups tez karo.":"."}`:"",
bySrc[0]?`Sabse zyada paisa <b>${esc(bySrc[0].label)}</b> se (${tot?Math.round(bySrc[0].value/tot*100):0}%).`:"",
cmp.filter(c=>c.y>0&&c.y2/c.y<0.5).length?`Collection 50% se kam: <b>${cmp.filter(c=>c.y>0&&c.y2/c.y<0.5).map(c=>esc(c.x)).join(", ")}</b>.`:"",
rebAmt?`Rebate/discount diya: <b>${money(rebAmt)}</b> (${net?Math.round(rebAmt/net*100):0}% of net sale).`:""
])}`;
}
/* ---------------- D) SALESMAN PERFORMANCE ---------------- */
function anSalesmen(r){
const E=anEst(r); const P=anPay(r);
const names=[...new Set([...(DB.Users||[]).filter(u=>["Salesman","Manager"].includes(u.Role) && u.Status!=="Inactive" && anIn(u.Name)).map(u=>u.Name), ...E.map(e=>e.Salesman).filter(Boolean)])];
const rows=names.map(n=>{
const leads=(DB.Leads||[]).filter(l=>l.Salesman===n && inRange(l.Date,r.from,r.to));
const fups=(DB.Followups||[]).filter(f=>f.DoneBy===n && inRange(f.Date,r.from,r.to));
const won=fups.filter(f=>f.Outcome==="Deal Won").length, lost=fups.filter(f=>f.Outcome==="Deal Lost").length;
const es=E.filter(e=>e.Salesman===n); const S=es.filter(e=>e.Type!=="Return"), R=es.filter(e=>e.Type==="Return");
const sale=S.reduce((s,e)=>s+anVal(e),0), ret=R.reduce((s,e)=>s+anVal(e),0);
const coll=P.filter(p=>paySalesman(p)===n).reduce((s,p)=>s+num(p.Amount),0);
const outs=(DB.Customers||[]).filter(c=>c.Salesman===n).reduce((s,c)=>s+Math.max(0,customerOutstanding(c.CustomerID)),0);
const custs=new Set(S.map(e=>e.CustomerID)).size;
return {n, leads:leads.length, fups:fups.length, won, lost, conv:fups.length?Math.round(won/fups.length*100):0, ests:S.length, custs, sale, ret, net:sale-ret, avg:S.length?sale/S.length:0, coll, outs};
}).filter(x=>x.leads||x.fups||x.ests||x.coll).sort((a,b)=>b.net-a.net);
const tNet=rows.reduce((s,x)=>s+x.net,0);
const best=rows[0]; const bestConv=[...rows].filter(x=>x.fups>=3).sort((a,b)=>b.conv-a.conv)[0];
const lowAct=rows.filter(x=>x.leads===0 && x.fups===0);
return `<div class="grid g4">
${anCard(rows.length,"Active salesmen")}${anCard(rows.reduce((s,x)=>s+x.leads,0),"Leads attended")}${anCard(rows.reduce((s,x)=>s+x.won,0),"Deals won","ok")}${anCard(money(tNet),"Team net sale","ok")}
</div>
${anSec("Comparison")}
<div class="grid g2">
${anBox("<b style='font-size:.8rem'>Net sale</b><div style='margin-top:.5rem'>"+anHBars(rows.map(x=>({label:x.n,value:x.net,sub:x.ests+" est"})))+"</div>")}
${anBox("<b style='font-size:.8rem'>Leads attended → won</b><div style='margin-top:.5rem'>"+anVBars(rows.slice(0,12).map(x=>({x:x.n.split(" ")[0],y:x.leads,y2:x.won})),{two:true,l1:"Leads",l2:"Won",c1:"#F59E0B",c2:"#16A34A",fmt:v=>String(v)})+"</div>")}
</div>
<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>Salesman</th><th style="text-align:right">Leads</th><th style="text-align:right">Followups</th><th style="text-align:right">Won</th><th style="text-align:right">Lost</th><th style="text-align:right">Conv %</th><th style="text-align:right">Estimates</th><th style="text-align:right">Customers</th><th style="text-align:right">Net sale</th><th style="text-align:right">Avg ticket</th><th style="text-align:right">Collected</th><th style="text-align:right">Outstanding (aaj)</th></tr>
${rows.map(x=>`<tr><td><b>${esc(x.n)}</b></td><td style="text-align:right">${x.leads}</td><td style="text-align:right">${x.fups}</td><td style="text-align:right;color:var(--ok)">${x.won}</td><td style="text-align:right;color:var(--bad)">${x.lost}</td><td style="text-align:right">${x.fups?x.conv+"%":"—"}</td><td style="text-align:right">${x.ests}</td><td style="text-align:right">${x.custs}</td><td style="text-align:right"><b>${money(x.net)}</b>${x.ret?`<div class="muted" style="font-size:.68rem">ret ${money(x.ret)}</div>`:""}</td><td style="text-align:right">${money(x.avg)}</td><td style="text-align:right">${money(x.coll)}</td><td style="text-align:right;color:${x.outs>0?'var(--bad)':'inherit'}">${money(x.outs)}</td></tr>`).join("")||"<tr><td colspan=12 class='empty'>Koi activity nahi.</td></tr>"}
</table></div>
<div class="grid g2" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Share of team net sale</b><div style='margin-top:.5rem'>"+anPie(rows.map(x=>({label:x.n,value:x.net})),{center:"Net"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Outstanding by salesman (aaj tak)</b><div style='margin-top:.5rem'>"+anHBars(rows.filter(x=>x.outs>0).sort((a,b)=>b.outs-a.outs).map(x=>({label:x.n,value:x.outs,color:"#DC2626"})))+"</div>")}
</div>
${anInsight([
best?`Top performer: <b>${esc(best.n)}</b> — ${money(best.net)} (${tNet?Math.round(best.net/tNet*100):0}% of team).`:"",
bestConv?`Best conversion: <b>${esc(bestConv.n)}</b> ${bestConv.conv}% (${bestConv.won}/${bestConv.fups} followups).`:"",
lowAct.length?`Is period mein koi lead/followup nahi: <b>${lowAct.map(x=>esc(x.n)).join(", ")}</b>.`:"",
rows.filter(x=>x.fups>=5&&x.conv<20).length?`Conversion 20% se kam (5+ followups): <b>${rows.filter(x=>x.fups>=5&&x.conv<20).map(x=>esc(x.n)).join(", ")}</b> — training/lead quality dekho.`:""
])}`;
}
/* ---------------- E) TOP ITEMS ---------------- */
function anItems(r){
const E=anEst(r); const S=new Map(E.filter(e=>e.Type!=="Return").map(e=>[e.EstimateID,e])), R=new Set(E.filter(e=>e.Type==="Return").map(e=>e.EstimateID));
const m={}, rm={};
(DB.EstimateItems||[]).forEach(it=>{
const k=String(it.ItemName||"").trim().toUpperCase().replace(/\s+/g," "); if(!k) return;
if(S.has(it.EstimateID)){ if(!m[k]) m[k]={label:String(it.ItemName).trim(),qty:0,amt:0,ests:new Set()}; m[k].qty+=num(it.Qty); m[k].amt+=num(it.Amount)||num(it.Qty)*num(it.Price); m[k].ests.add(it.EstimateID); }
else if(R.has(it.EstimateID)){ if(!rm[k]) rm[k]={label:String(it.ItemName).trim(),qty:0,amt:0}; rm[k].qty+=num(it.Qty); rm[k].amt+=num(it.Amount)||num(it.Qty)*num(it.Price); }
});
const list=Object.values(m).sort((a,b)=>b.amt-a.amt); const tot=list.reduce((s,x)=>s+x.amt,0);
const byQty=[...list].sort((a,b)=>b.qty-a.qty).slice(0,10);
const rets=Object.values(rm).sort((a,b)=>b.qty-a.qty).slice(0,8);
const top5=list.slice(0,5).reduce((s,x)=>s+x.amt,0);
return `<div class="grid g4">
${anCard(list.length,"Distinct items sold")}${anCard(list.reduce((s,x)=>s+x.qty,0).toLocaleString("en-IN"),"Total qty (boxes/pcs)")}${anCard(money(tot),"Items value (sale)","ok")}${anCard(tot?Math.round(top5/tot*100)+"%":"—","Top 5 items ka share","warn")}
</div>
${anSec("Top 15 by value")}
${anBox(anHBars(list.slice(0,15).map(x=>({label:x.label,value:x.amt,sub:x.qty+" qty"}))))}
<div class="grid g2" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Top 10 by quantity</b><div style='margin-top:.5rem'>"+anHBars(byQty.map(x=>({label:x.label,value:x.qty,color:"#0891B2"})),{fmt:v=>v.toLocaleString("en-IN")})+"</div>")}
${anBox("<b style='font-size:.8rem'>Sabse zyada wapas aane wale items (returns)</b><div style='margin-top:.5rem'>"+anHBars(rets.map(x=>({label:x.label,value:x.qty,color:"#DC2626",sub:money(x.amt)})),{fmt:v=>v+" qty"})+"</div>")}
</div>
<div class="tbl-wrap" style="margin-top:.6rem"><table><tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Value</th><th style="text-align:right">Avg rate</th><th style="text-align:right">Estimates</th><th style="text-align:right">Share</th></tr>
${list.slice(0,40).map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.label)}</b></td><td style="text-align:right">${x.qty.toLocaleString("en-IN")}</td><td style="text-align:right"><b>${money(x.amt)}</b></td><td style="text-align:right">${money(x.qty?x.amt/x.qty:0)}</td><td style="text-align:right">${x.ests.size}</td><td style="text-align:right">${tot?Math.round(x.amt/tot*100):0}%</td></tr>`).join("")||"<tr><td colspan=7 class='empty'>Koi item nahi.</td></tr>"}
</table></div>
${anInsight([
list[0]?`Sabse zyada bikne wala: <b>${esc(list[0].label)}</b> — ${money(list[0].amt)} (${list[0].qty} qty, ${list[0].ests.size} estimates).`:"",
tot&&top5/tot>0.5?`Top 5 items hi <b>${Math.round(top5/tot*100)}%</b> sale dete hain — inka stock kabhi khatam na ho.`:"",
rets[0]?`Sabse zyada return: <b>${esc(rets[0].label)}</b> (${rets[0].qty} qty) — quality/size issue check karo.`:""
])}`;
}
/* ---------------- F) OUTSTANDING AGING (as of today) ---------------- */
function anAging(){
/* v36: FIFO bill-wise aging (custAging) — bucket = har open bill ki apni umar (ek customer ka paisa kai buckets mein ho sakta hai) */
const t=todayStr();
const rows=(DB.Customers||[]).filter(c=>anIn(c.Salesman)).map(c=>({c,a:custAging(c.CustomerID)})).filter(x=>x.a.total>0.5).sort((a,b)=>b.a.oldestDays-a.a.oldestDays||b.a.total-a.a.total);
const tot=rows.reduce((s,x)=>s+x.a.total,0);
const B=[["0–15 din","b0"],["16–30 din","b16"],["31–60 din","b31"],["61–90 din","b61"],["90+ din","b90"]];
const bk=B.map(b=>({label:b[0],value:rows.reduce((s,x)=>s+x.a.buckets[b[1]],0),count:rows.filter(x=>x.a.buckets[b[1]]>0.009).length}));
const bySm=anGroup(rows, x=>x.c.Salesman||"—", x=>x.a.total);
const oldAmt=rows.reduce((s,x)=>s+x.a.buckets.b61+x.a.buckets.b90,0); const oldCust=rows.filter(x=>x.a.oldestDays>60).length;
const pf=(DB.PayFollowups||[]); const lastPF=cid=>{ const f=pf.filter(x=>x.CustomerID===cid).sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1)[0]; return f?String(f.Date).slice(0,10):""; };
return `<div class="grid g4">
${anCard(money(tot),"Total outstanding ("+rows.length+" customers)","bad")}${anCard(money(oldAmt),"60+ din purana paisa ("+oldCust+" cust)","warn")}${anCard(tot?Math.round(oldAmt/tot*100)+"%":"—","Purana ÷ total")}${anCard(money(rows.length?tot/rows.length:0),"Avg per customer")}
</div>
<div class="muted" style="font-size:.75rem;margin:.3rem 0 0">Bill-wise FIFO: har payment/return sabse purane bill par lagta hai; jo bill (poora/aadha) bacha uski umar = aaj − bill date. Opening balance = customer create date.</div>
${anSec("Kitna paisa kitna purana")}
<div class="grid g2">
${anBox("<b style='font-size:.8rem'>Aging buckets</b><div style='margin-top:.5rem'>"+anPie(bk,{center:"Due"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Bucket-wise</b><div style='margin-top:.5rem'>"+anHBars(bk.map((b,i)=>({label:b.label,value:b.value,sub:b.count+" cust",color:["#16A34A","#65A30D","#F59E0B","#EA580C","#DC2626"][i]})))+"</div>")}
</div>
${anSec("Salesman-wise outstanding")}
${anBox(anHBars(bySm.map(x=>({label:x.label,value:x.value,sub:x.count+" cust",color:"#DC2626"}))))}
${anSec("Top 25 customers — sabse purana pehle")}
<div class="tbl-wrap"><table><tr><th>Customer</th><th>Salesman</th><th style="text-align:right">Outstanding</th><th>Sabse purana bill</th><th style="text-align:right">Din</th><th style="text-align:right">60+ din ka</th><th>Last followup</th><th></th></tr>
${rows.slice(0,25).map(x=>`<tr class="${x.a.oldestDays>60?'row-red':x.a.oldestDays>30?'row-yellow':''}"><td><b>${esc(x.c.Name)}</b><div class="muted" style="font-size:.7rem">${esc(x.c.Phone||"")}</div></td><td>${esc(x.c.Salesman||"—")}</td><td style="text-align:right"><b>${money(x.a.total)}</b></td><td>${esc(x.a.oldest.ref)} · ${fmtDate(x.a.oldest.date)}<div class="muted" style="font-size:.7rem">baki ${money(x.a.oldest.amt)}</div></td><td style="text-align:right;color:${ageColor(x.a.oldestDays)};font-weight:700">${x.a.oldestDays}</td><td style="text-align:right">${money(x.a.buckets.b61+x.a.buckets.b90)}</td><td>${lastPF(x.c.CustomerID)||"<span class='muted'>—</span>"}</td><td><button class="btn small ghost" onclick="openLedger('${esc(x.c.CustomerID)}')">Ledger</button></td></tr>`).join("")||"<tr><td colspan=8 class='empty'>Koi outstanding nahi. 🎉</td></tr>"}
</table></div>
${anInsight([
tot?`<b>${Math.round(oldAmt/tot*100)}%</b> paisa 60 din se purana hai${oldAmt/tot>0.3?" — 30% se zyada, in customers par personally follow-up karo.":"."}`:"",
bySm[0]?`Sabse zyada outstanding <b>${esc(bySm[0].label)}</b> ke customers par (${money(bySm[0].value)}).`:"",
rows.filter(x=>x.a.oldestDays>30&&!lastPF(x.c.CustomerID)).length?`<b>${rows.filter(x=>x.a.oldestDays>30&&!lastPF(x.c.CustomerID)).length}</b> customers ka paisa 30+ din purana par koi payment followup record nahi.`:"",
rows[0]?`Sabse purana: <b>${esc(rows[0].c.Name)}</b> — ${esc(rows[0].a.oldest.ref)} (${rows[0].a.oldestDays} din, ${money(rows[0].a.oldest.amt)} baki).`:""
])}`;
}
function anPrint(){
if(!isAdmin()) return toast("Analysis export sirf Admin."); // v26 export lock
const b=$("an-body"); if(!b) return;
alog("print_analysis", b.dataset.title+" · "+b.dataset.period+" · "+b.dataset.branch);
const html=b.innerHTML.replace(/<button[^>]*>.*?<\/button>/g,"");
printHTML(`<!DOCTYPE html><html><head><title>${esc(b.dataset.title)}</title><style>
@page{size:8.27in 11.69in;margin:10mm} body{font-family:Arial;font-size:11px;color:#111}
h1{font-size:15px;margin:0} h3{font-size:12px;margin:8px 0 4px} .section-h{display:flex;align-items:center;gap:.5rem;margin-top:10px} .ln{flex:1;border-top:1px solid #ccc}
.grid{display:grid;gap:8px;margin-top:6px} .g4{grid-template-columns:repeat(4,1fr)} .g2{grid-template-columns:1fr 1fr} .g3{grid-template-columns:repeat(3,1fr)}
.card{border:1px solid #ccc;border-radius:8px;padding:8px;break-inside:avoid} .stat .v{font-size:14px;font-weight:700} .stat .l{font-size:9px;color:#666}
table{width:100%;border-collapse:collapse;margin-top:4px} th,td{border:1px solid #999;padding:3px 5px;font-size:9px} th{background:#0B1D33;color:#fff;text-align:left}
.pill{font-size:8px;border:1px solid #999;border-radius:6px;padding:0 3px} .muted{color:#666} .empty{color:#777;text-align:center} .row-red td{background:#FDE8E8} .row-yellow td{background:#FFF7DB}
svg{max-width:100%} ul{margin:4px 0 0 16px;padding:0}
</style></head><body><h1>BSC TILES — ${esc(b.dataset.title)}</h1><div>Period: <b>${esc(b.dataset.period)}</b> · Branch: <b>${esc(b.dataset.branch)}</b> · Generated ${nowStr()} by ${esc(USER.Name)}</div>${html}</body></html>`);
}
window.vAnalysis=vAnalysis;


/* ===== v26: ACCESS LOG (Admin) — audit trail + alerts ===== */
function secAlertCard(){
if(!isAdmin()) return "";
if(window._alData===undefined){ window._alData=null; gsRun("readAccessLog",[{alertsOnly:true}]).then(d=>{ window._alData=d; if(ROUTE==="adminhome"||ROUTE==="dashboard"||ROUTE==="home") render(); }).catch(()=>{}); return ""; }
const d=window._alData; if(!d||!d.alerts||!d.alerts.length) return "";
return `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--bad);background:#FFF5F5"><b>🔴 Security alerts (aaj)</b>
<ul style="margin:.4rem 0 .5rem 1.1rem;padding:0;font-size:.82rem">${d.alerts.map(a=>`<li>${esc(a.msg)}</li>`).join("")}</ul>
<button class="btn small dark" onclick="ROUTE='accesslog';render()">🔍 Access Log kholo</button></div>`;
}
function vAccessLog(){
if(!isAdmin()) return `<div class="card empty">Access Log sirf Admin ke liye hai.</div>`;
if(!window._alFull){ window._alFull="loading"; gsRun("readAccessLog",[{}]).then(d=>{ window._alFull=d; window._alData=d; render(); }).catch(e=>{ window._alFull={rows:[],today:[],alerts:[],err:e.message}; render(); }); }
const d=window._alFull; if(!d||d==="loading") return `<div class="card empty">⏳ Access log load ho raha hai…</div>`;
const fu=window._alU||"all", fa=window._alA||"all", fd=window._alD||"";
const users=[...new Set(d.rows.map(r=>r.n))].sort();
const acts=[...new Set(d.rows.map(r=>r.a))].sort();
let rows=d.rows;
if(fu!=="all") rows=rows.filter(r=>r.n===fu);
if(fa!=="all") rows=rows.filter(r=>r.a===fa);
if(fd) rows=rows.filter(r=>r.t.slice(0,10)===fd);
rows=rows.slice(0,400);
const AL={login:"p-ok",logout:"p-gray",login_fail:"p-bad",hours_block:"p-bad",ledger_open:"p-blue",ledger_pdf:"p-warn",wa_ledger:"p-warn",print_customers:"p-bad",alert_fail:"p-bad"};
const alabel=a=>({impersonate:"🧪 Admin login-as",login:"Login",logout:"Logout",login_fail:"Login FAIL",hours_block:"Hours block",ledger_open:"Ledger open",ledger_pdf:"Ledger PDF (WA)",wa_ledger:"WhatsApp ledger",print_estimate:"Estimate PDF",print_customers:"Customers list PDF",print_daybook:"Cash book PDF",print_stock:"Stock PDF",print_sampling:"Sampling PDF",print_analysis:"Analysis PDF",print_ledger:"Ledger PDF",alert_fail:"Alert send fail"}[a]||a);
const R=d.rules||{}, H=d.hours||{};
return `${d.err?`<div class="card" style="border-left:4px solid var(--bad)">⚠ ${esc(d.err)}</div>`:""}
${d.alerts&&d.alerts.length?`<div class="card" style="border-left:4px solid var(--bad);background:#FFF5F5;margin-bottom:1rem"><b>🔴 Alerts (aaj)</b><ul style="margin:.4rem 0 0 1.1rem;padding:0;font-size:.82rem">${d.alerts.map(a=>`<li>${esc(a.msg)}</li>`).join("")}</ul></div>`:""}
<div class="muted" style="font-size:.75rem;margin-bottom:.6rem">Office hours: Mon–Sat ${esc((H.wk||[])[0])}–${esc((H.wk||[])[1])} · Sun ${esc((H.sun||[])[0])}–${esc((H.sun||[])[1])} (Admin exempt) · Alert rules: ${R.ledger_open||20}+ ledgers/din, ${R.login_fail||3}+ galat password, hours ke bahar koshish → Admin home card + WhatsApp (ALERT_PHONE property ya Admin ka phone) · Log total ${d.total} rows (max 10,000)</div>
<div class="section-h"><h3>Aaj — user-wise</h3><div class="ln"></div><button class="btn ghost small" onclick="window._alFull=null;window._alData=undefined;render()">⟳ Refresh</button></div>
<div class="tbl-wrap"><table><tr><th>User</th><th>Role</th><th style="text-align:right">Logins</th><th style="text-align:right">Fail</th><th style="text-align:right">Hours block</th><th style="text-align:right">Ledgers</th><th style="text-align:right">Prints/PDF</th><th>Last activity</th></tr>
${(d.today||[]).sort((a,b)=>b.ledger_open-a.ledger_open).map(x=>`<tr class="${x.ledger_open>=(R.ledger_open||20)||x.login_fail>=(R.login_fail||3)||x.hours_block?'row-red':''}"><td><b>${esc(x.n)}</b></td><td>${esc(x.r)}</td><td style="text-align:right">${x.login}</td><td style="text-align:right;color:${x.login_fail?'var(--bad)':'inherit'}">${x.login_fail}</td><td style="text-align:right;color:${x.hours_block?'var(--bad)':'inherit'}">${x.hours_block}</td><td style="text-align:right"><b>${x.ledger_open}</b></td><td style="text-align:right">${x.prints}</td><td>${esc(x.last.slice(11,16))}</td></tr>`).join("")||"<tr><td colspan=8 class='empty'>Aaj koi activity nahi.</td></tr>"}
</table></div>
<div class="section-h" style="margin-top:1rem"><h3>Log</h3><div class="ln"></div></div>
<div class="toolbar">
<select style="max-width:200px" onchange="window._alU=this.value;render()"><option value="all">Sab users</option>${users.map(u=>`<option ${fu===u?'selected':''}>${esc(u)}</option>`).join("")}</select>
<select style="max-width:200px" onchange="window._alA=this.value;render()"><option value="all">Sab actions</option>${acts.map(a=>`<option value="${esc(a)}" ${fa===a?'selected':''}>${esc(alabel(a))}</option>`).join("")}</select>
<input type="date" style="max-width:170px" value="${fd}" onchange="window._alD=this.value;render()">
<span class="muted" style="font-size:.75rem">${rows.length} of ${d.rows.length} (last 3000)</span>
</div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr>
${rows.map(r=>`<tr><td style="white-space:nowrap">${esc(r.t.slice(0,16))}</td><td><b>${esc(r.n)}</b><div class="muted" style="font-size:.68rem">${esc(r.r)}</div></td><td><span class="pill ${AL[r.a]||'p-gray'}">${esc(alabel(r.a))}</span></td><td style="max-width:360px;white-space:normal">${esc(r.d||"—")}${r.c>1?` <span class="muted">×${r.c}</span>`:""}</td></tr>`).join("")||"<tr><td colspan=4 class='empty'>Koi entry nahi.</td></tr>"}
</table></div>`;
}
window.vAccessLog=vAccessLog; window.secAlertCard=secAlertCard;
/* v27: phase-2 guards — ye functions deferred tabs (EstimateItems/Expenses/Attendance/Stock/Items) par depend karte hain */
(function(){ try{ (window.P2_FNS||[]).forEach(function(n){ var f=window[n]; if(typeof f!=="function") return; window[n]=function(){ if(!p2Guard()) return; return f.apply(this,arguments); }; }); }catch(e){} })();


/* ===== v28 KILL SWITCH screen (Role "Switch" user) ===== */
function vSwitch(){
if(!isSwitchUser()) return `<div class="card empty">Not allowed.</div>`;
if(window._sw===undefined){ window._sw=null; gsRun("decoyStatus").then(d=>{ window._sw=d; render(); }).catch(e=>{ window._sw={err:e.message}; render(); }); }
const d=window._sw;
if(!d) return `<div class="card empty">⏳ Status aa raha hai…</div>`;
if(d.err) return `<div class="card" style="border-left:4px solid var(--bad)">⚠ ${esc(d.err)}</div>`;
const on=!!d.on;
return `<div style="max-width:520px;margin:2rem auto;text-align:center">
<div class="card" style="padding:2rem 1rem">
<div class="muted" style="font-size:.8rem;margin-bottom:1rem">${on?"🌙 Sab users ko abhi DUMMY data dikh raha hai":"☀️ Sab users ko asli data dikh raha hai"}</div>
<button class="btn" style="width:220px;height:220px;border-radius:50%;font-size:2.2rem;font-weight:900;box-shadow:0 8px 30px rgba(0,0,0,.25);background:${on?'#0B1D33':'#16A34A'}" onclick="swToggle(${on?0:1})">${on?"ON":"OFF"}<div style="font-size:.85rem;font-weight:600;margin-top:.4rem;opacity:.85">${on?"tap → asli data wapas":"tap → dummy data"}</div></button>
<div class="muted" style="font-size:.72rem;margin-top:1rem">${esc(d.last||"Abhi tak kabhi ON nahi hua")}</div>
</div>
${on||d.writesCount?`<div class="card" style="text-align:left;margin-top:1rem"><div style="display:flex;justify-content:space-between;align-items:center"><b>ON ke dauran entries: ${d.writesCount}</b>${d.writesCount?`<button class="btn small ghost" onclick="swClear()">🗑 Clear</button>`:""}</div>
<p class="muted" style="font-size:.72rem;margin:.3rem 0 .5rem">Ye entries asli sheet mein NAHI gayi (Decoy sheets mein hain) — OFF ke baad khud dekh ke asli mein daalo.</p>
${d.writes.length?`<div class="tbl-wrap"><table><tr><th>Time</th><th>User</th><th>Tab</th><th>Detail</th></tr>${d.writes.slice(0,100).map(w=>`<tr><td style="white-space:nowrap">${esc(String(w[0]).slice(5,16))}</td><td>${esc(w[1])}</td><td>${esc(w[2])}</td><td style="white-space:normal;font-size:.72rem">${esc(w[3])}</td></tr>`).join("")}</table></div>`:""}</div>`:""}
<div style="margin-top:1rem"><button class="btn ghost small" onclick="swRegen()">♻️ Dummy data dobara banao</button></div>
<p class="muted" style="font-size:.7rem;margin-top:1rem">WhatsApp par Ziva ko <b>kill</b> likho = ON · <b>live</b> = OFF</p>
</div>`;
}
async function swToggle(on){
if(!confirm(on?"Sab users ko DUMMY data dikhega (Admin ko bhi). Chal rahi sessions dobara login mangengi. ON karein?":"Asli data wapas sab ko dikhega. OFF karein?")) return;
busy(true, on?"Kill mode ON ho raha hai…":"Asli data wapas…");
try{ window._sw=await gsRun("decoySet",[!!on]); busy(false); toast(on?"🌙 Kill mode ON":"☀️ Live — asli data"); render(); }catch(e){ busy(false); toast("Fail: "+e.message); }
}
async function swRegen(){ if(!confirm("Dummy data naya banega (purani Decoy sheets overwrite). Theek?")) return; busy(true,"Dummy data ban raha hai…"); try{ window._sw=await gsRun("decoyRegen"); busy(false); toast("Dummy data ready"); render(); }catch(e){ busy(false); toast("Fail: "+e.message); } }
async function swClear(){ try{ window._sw=await gsRun("decoyClearWrites"); render(); }catch(e){ toast("Fail: "+e.message); } }
window.vSwitch=vSwitch;


/* ===== v31: FEEDBACK CALLS (CRM + Admin) =====
 *  Feedbacks tab: FBID(FB####) Date CustomerID CustomerName Phone Salesman Branch Stars(1-5) Feedback Outcome NextCallDate CalledBy Timestamp
 *  CRM: sab customers (branch filter) → customer par tap → ledger + call + feedback form (stars tap). Admin: aaj ki calls summary + list. */
function canFeedback(){ return isAdmin() || roleHas(/^CRM$/i) || hasMod("feedback"); }
function fbLast(cid){ const L=(DB.Feedbacks||[]).filter(f=>f.CustomerID===cid).sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1); return L[0]||null; }
function fbStars(n,size){ n=num(n); return `<span style="color:#F59E0B;font-size:${size||".9rem"};letter-spacing:1px">${"★".repeat(n)}<span style="color:#D1D5DB">${"★".repeat(Math.max(0,5-n))}</span></span>`; }
function vFeedback(){
if(!canFeedback()) return `<div class="card empty">This module is for CRM / Admin.</div>`;
const tab=window._fbTab||(isAdmin()?"report":"calls");
return `<div class="toolbar"><div class="tabs"><button class="tab ${tab==='calls'?'on':''}" onclick="window._fbTab='calls';render()">📞 Call list</button><button class="tab ${tab==='report'?'on':''}" onclick="window._fbTab='report';render()">📊 Feedback report</button></div></div>
${tab==="calls"?fbCallList():fbReport()}`;
}
function fbCallList(){
const br=window._fbBr||"all", q=(window._fbQ||"").toLowerCase(), f=window._fbF||"due";
const lastEst={}; (DB.Estimates||[]).forEach(e=>{ if(e.Status==="Cancelled") return; const d=String(e.Date).slice(0,10); if(!lastEst[e.CustomerID]||d>lastEst[e.CustomerID]) lastEst[e.CustomerID]=d; });
const t=todayStr();
let list=crmHide(DB.Customers||[]).map(c=>{ const lf=fbLast(c.CustomerID); const brn=userBranch(c.Salesman||"")||""; return {c, brn, le:lastEst[c.CustomerID]||"", lf, due: lf&&lf.NextCallDate&&String(lf.NextCallDate).slice(0,10)<=t}; });
if(br!=="all") list=list.filter(x=>br==="__none"? !x.brn : x.brn===br);
if(q) list=list.filter(x=>(x.c.Name+" "+x.c.Phone+" "+x.c.Salesman).toLowerCase().includes(q));
if(f==="due") list=list.filter(x=>!x.lf || x.due);            // kabhi call nahi hui YA next call due
else if(f==="done") list=list.filter(x=>x.lf);
// priority: due next-call → recent purchase bina feedback → baaki
list.sort((a,b)=>{ const pa=a.due?0:(!a.lf?1:2), pb=b.due?0:(!b.lf?1:2); if(pa!==pb) return pa-pb; return (b.le||"")<(a.le||"")?-1:1; });
const shown=list.slice(0,300);
return `<div class="toolbar">
<input id="q-fb" placeholder="Search name / phone / salesman" value="${esc(window._fbQ||"")}" oninput="window._fbQ=this.value;window._refocusId=this.id;render()" style="max-width:260px">
<select style="max-width:180px" onchange="window._fbBr=this.value;render()"><option value="all" ${br==='all'?'selected':''}>🏢 All branches</option>${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${br===b.Name?'selected':''}>📍 ${esc(b.Name)}</option>`).join("")}<option value="__none" ${br==='__none'?'selected':''}>HO / no branch</option></select>
<select style="max-width:190px" onchange="window._fbF=this.value;render()"><option value="due" ${f==='due'?'selected':''}>📞 Call karni hai (due)</option><option value="done" ${f==='done'?'selected':''}>✅ Feedback liya hua</option><option value="all" ${f==='all'?'selected':''}>Sab customers</option></select>
<span class="muted" style="font-size:.75rem">${list.length} customers</span>
</div>
<div class="tbl-wrap"><table><tr><th>Customer</th><th>Salesman · Branch</th><th>Last purchase</th><th>Last feedback</th><th></th></tr>
${shown.map(x=>`<tr class="${x.due?'row-yellow':''}" style="cursor:pointer" onclick="openFeedback('${esc(x.c.CustomerID)}')"><td><b>${esc(x.c.Name)}</b><div class="muted" style="font-size:.7rem">${esc(x.c.Phone||"")}</div></td><td>${esc(x.c.Salesman||"—")}<div class="muted" style="font-size:.7rem">${esc(x.brn||"—")}</div></td><td>${x.le?fmtDate(x.le):"—"}</td><td>${x.lf?fbStars(x.lf.Stars)+`<div class="muted" style="font-size:.7rem">${fmtDate(String(x.lf.Date).slice(0,10))} · ${esc(x.lf.Outcome||"")}${x.due?' · <b style="color:var(--bad)">call due</b>':''}</div>`:'<span class="pill p-gray">kabhi nahi</span>'}</td><td><button class="btn small" onclick="event.stopPropagation();openFeedback('${esc(x.c.CustomerID)}')">📞 Call</button></td></tr>`).join("")||"<tr><td colspan=5 class='empty'>Koi customer nahi.</td></tr>"}
</table></div>${list.length>300?`<p class="muted" style="font-size:.75rem">Pehle 300 dikh rahe hain — search karo.</p>`:""}`;
}
function openFeedback(cid){
const c=(DB.Customers||[]).find(x=>x.CustomerID===cid); if(!c) return;
const hist=(DB.Feedbacks||[]).filter(f=>f.CustomerID===cid).sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1);
const ph=String(c.Phone||"").replace(/\D/g,""); const bal=customerOutstanding(cid);
window._fbStars=0;
openModal("⭐ Feedback call — "+c.Name, `
<div class="rowline"><span>Phone</span><b>${esc(c.Phone||"—")}</b></div>
<div class="rowline"><span>Salesman</span><b>${esc(c.Salesman||"—")}${userBranch(c.Salesman||"")?" · "+esc(userBranch(c.Salesman)):""}</b></div>
<div class="rowline"><span>Outstanding</span><b style="color:${bal>0?'var(--bad)':'var(--ok)'}">${money(bal)}</b></div>
<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.6rem 0">
${ph?`<a class="btn small" href="tel:${ph}">📞 Call</a><a class="btn small" style="background:#25D366" href="https://wa.me/${ph.length===10?'91'+ph:ph}" target="_blank" rel="noopener">💬 WhatsApp</a>`:""}
<button class="btn small ghost" onclick="openLedger('${esc(cid)}')">📒 Ledger</button>
</div>
<label>Kitne star (5 mein se) <span class="req">*</span></label>
<div id="fb-stars" style="font-size:2rem;letter-spacing:.2rem;cursor:pointer;user-select:none">${[1,2,3,4,5].map(n=>`<span data-n="${n}" onclick="fbPick(${n})" style="color:#D1D5DB">★</span>`).join("")}</div>
<div class="form-grid" style="margin-top:.5rem">
<div><label>Outcome <span class="req">*</span></label><select id="fb-out"><option>Satisfied</option><option>Complaint</option><option>Suggestion</option><option>No answer</option><option>Call later</option><option>Wrong number</option></select></div>
<div><label>Next call date (optional)</label><input type="date" id="fb-next" min="${todayStr()}"></div>
</div>
<label>Customer ne kya kaha</label><textarea id="fb-text" rows="3" placeholder="e.g. tiles ki quality achhi, delivery late hui thi…"></textarea>
<div style="margin-top:1rem"><button class="btn" onclick="saveFeedback('${esc(cid)}')">Save feedback</button></div>
${hist.length?`<div class="section-h" style="margin-top:1rem"><h3>Pichhle feedback (${hist.length})</h3><div class="ln"></div></div>
${hist.slice(0,6).map(f=>`<div class="card" style="padding:.5rem .8rem;margin-bottom:.4rem">${fbStars(f.Stars)} <span class="pill p-gray">${esc(f.Outcome||"")}</span> <span class="muted" style="font-size:.72rem">${fmtDate(String(f.Date).slice(0,10))} · ${esc(f.CalledBy||"")}</span><div style="font-size:.82rem;margin-top:.2rem">${esc(f.Feedback||"")}</div></div>`).join("")}`:""}`);
}
function fbPick(n){ window._fbStars=n; document.querySelectorAll("#fb-stars span").forEach(sp=>{ sp.style.color = Number(sp.dataset.n)<=n ? "#F59E0B" : "#D1D5DB"; }); }
async function saveFeedback(cid){
const c=(DB.Customers||[]).find(x=>x.CustomerID===cid); if(!c) return;
const st=window._fbStars||0, out=$("fb-out").value, txt=$("fb-text").value.trim(), nx=$("fb-next").value;
if(!["No answer","Wrong number","Call later"].includes(out) && !st) return toast("Star chuno (1-5)."); // v33.2: Call later par star optional
if(out==="Call later" && !nx) return toast("Call later ke liye next call date chuno.");
if(!saveOnce("fb:"+cid)) return; // v33.2: double-tap guard
const rec={FBID:nextId("Feedbacks","FBID","FB"),Date:todayStr(),CustomerID:cid,CustomerName:c.Name,Phone:c.Phone||"",Salesman:c.Salesman||"",Branch:userBranch(c.Salesman||"")||"",Stars:st,Feedback:txt,Outcome:out,NextCallDate:nx,CalledBy:USER.Name,Timestamp:nowStr()};
busy(true,"Saving feedback…");
try{ await appendRow("Feedbacks",rec); DB.Feedbacks=DB.Feedbacks||[]; DB.Feedbacks.push(rec); busy(false); closeModal(); toast("⭐ Feedback saved — "+c.Name); render(); }
catch(e){ busy(false); toast("Failed: "+e.message); }
finally{ saveDone("fb:"+cid); }
}
function fbReport(){
const d=window._fbD||todayStr(), mode=window._fbMode||"day";
const from = mode==="day"? d : mode==="week"? (()=>{const x=new Date(d+"T00:00:00"); x.setDate(x.getDate()-6); return x.toISOString().slice(0,10);})() : d.slice(0,8)+"01";
let L=(DB.Feedbacks||[]).filter(f=>{ const fd=String(f.Date).slice(0,10); return fd>=from && fd<=d; });
if(!isAdmin()) L=L.filter(f=>f.CalledBy===USER.Name);
const br=window._fbRBr||"all"; if(br!=="all") L=L.filter(f=>br==="__none"? !f.Branch : f.Branch===br);
L=[...L].sort((a,b)=>String(a.Timestamp)<String(b.Timestamp)?1:-1);
const rated=L.filter(f=>num(f.Stars)>0); const avg=rated.length? rated.reduce((s,f)=>s+num(f.Stars),0)/rated.length : 0;
const byCaller=anGroup(L, f=>f.CalledBy, ()=>1); const byOut=anGroup(L, f=>f.Outcome||"—", ()=>1);
const dist=[5,4,3,2,1].map(n=>({label:n+" ★",value:rated.filter(f=>num(f.Stars)===n).length,color:["#16A34A","#65A30D","#F59E0B","#EA580C","#DC2626"][5-n]}));
const bySm=anGroup(rated, f=>f.Salesman||"—", f=>num(f.Stars)); // sum → avg neeche
return `<div class="toolbar">
<select style="max-width:150px" onchange="window._fbMode=this.value;render()"><option value="day" ${mode==='day'?'selected':''}>Aaj / ek din</option><option value="week" ${mode==='week'?'selected':''}>7 din</option><option value="month" ${mode==='month'?'selected':''}>Mahina</option></select>
<input type="date" value="${d}" max="${todayStr()}" style="max-width:160px" onchange="window._fbD=this.value;render()">
${isAdmin()?`<select style="max-width:170px" onchange="window._fbRBr=this.value;render()"><option value="all" ${br==='all'?'selected':''}>🏢 All branches</option>${(DB.Branches||[]).map(b=>`<option value="${esc(b.Name)}" ${br===b.Name?'selected':''}>📍 ${esc(b.Name)}</option>`).join("")}<option value="__none" ${br==='__none'?'selected':''}>HO</option></select>`:""}
</div>
<div class="grid g4">
<div class="card stat"><div class="v">${L.length}</div><div class="l">Calls (${from===d?fmtDate(d):fmtDate(from)+" → "+fmtDate(d)})</div></div>
<div class="card stat ${avg>=4?'ok':avg>=3?'warn':'bad'}"><div class="v">${rated.length?avg.toFixed(1)+" ★":"—"}</div><div class="l">Average rating (${rated.length} rated)</div></div>
<div class="card stat bad"><div class="v">${L.filter(f=>f.Outcome==="Complaint").length}</div><div class="l">Complaints</div></div>
<div class="card stat"><div class="v">${L.filter(f=>f.Outcome==="No answer").length}</div><div class="l">No answer</div></div>
</div>
<div class="grid g3" style="margin-top:.6rem">
${anBox("<b style='font-size:.8rem'>Star distribution</b><div style='margin-top:.5rem'>"+anHBars(dist,{fmt:v=>v+" calls"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Calls by CRM</b><div style='margin-top:.5rem'>"+anHBars(byCaller,{fmt:v=>v+" calls"})+"</div>")}
${anBox("<b style='font-size:.8rem'>Avg rating by salesman</b><div style='margin-top:.5rem'>"+anHBars(bySm.map(x=>({label:x.label,value:Math.round(x.value/x.count*10)/10,sub:x.count+" calls"})).sort((a,b)=>b.value-a.value),{fmt:v=>v+" ★"})+"</div>")}
</div>
<div class="muted" style="font-size:.72rem;margin:.5rem 0">Outcome: ${byOut.map(o=>esc(o.label)+" "+o.count).join(" · ")||"—"}</div>
<div class="tbl-wrap"><table><tr><th>Time</th><th>Customer</th><th>Salesman · Branch</th><th>Stars</th><th>Outcome</th><th>Feedback</th><th>By</th></tr>
${L.map(f=>`<tr class="${f.Outcome==='Complaint'?'row-red':num(f.Stars)>0&&num(f.Stars)<=2?'row-yellow':''}"><td style="white-space:nowrap">${esc(String(f.Timestamp||"").slice(0,16))}</td><td><b>${esc(f.CustomerName)}</b><div class="muted" style="font-size:.7rem">${esc(f.Phone||"")}</div></td><td>${esc(f.Salesman||"—")}<div class="muted" style="font-size:.7rem">${esc(f.Branch||"—")}</div></td><td>${num(f.Stars)?fbStars(f.Stars):"—"}</td><td><span class="pill ${f.Outcome==='Satisfied'?'p-ok':f.Outcome==='Complaint'?'p-bad':'p-gray'}">${esc(f.Outcome||"")}</span>${f.NextCallDate?`<div class="muted" style="font-size:.7rem">next ${fmtDate(String(f.NextCallDate).slice(0,10))}</div>`:""}</td><td style="white-space:normal;max-width:320px;font-size:.8rem">${esc(f.Feedback||"")}</td><td>${esc(f.CalledBy||"")}</td></tr>`).join("")||"<tr><td colspan=7 class='empty'>Is period mein koi feedback call nahi.</td></tr>"}
</table></div>`;
}
window.vFeedback=vFeedback;


/* ===== v34: SUBSTITUTE / COVER (Admin) ===== */
function openSubstitute(absU){
if(!isAdmin()) return;
const a=(DB.Users||[]).find(x=>String(x.Username).toLowerCase()===String(absU).toLowerCase()); if(!a) return;
const t=todayStr();
const rows=(DB.Substitutes||[]).filter(r=>String(r.AbsentUser).toLowerCase()===String(absU).toLowerCase()).sort((x,y)=>String(x.From)<String(y.From)?1:-1);
const cands=(DB.Users||[]).filter(u=>u.Status!=="Inactive" && String(u.Username).toLowerCase()!==String(absU).toLowerCase() && !/admin|switch/i.test(String(u.Role||""))).sort((x,y)=>String(x.Name).localeCompare(String(y.Name)));
const hint=/manager/i.test(a.Role)&&!/dispatch/i.test(a.Role)? "Manager cover → substitute ko us din: Estimates, Return goods, Customers & Ledgers (payment receive), Expenses, Daily Cash Book (sirf aaj) + cash accept." : /crm/i.test(a.Role)? "CRM cover → substitute ko is role ke saare modules." : "Is role ke modules substitute ko mil jayenge.";
openModal("🔁 Substitute — "+a.Name+" ("+a.Role+(a.Branch?" · "+a.Branch:"")+")", `
<p class="muted" style="font-size:.78rem">${esc(hint)}</p>
<div class="form-grid">
<div><label>Substitute <span class="req">*</span></label><select id="sb-u">${cands.map(u=>`<option value="${esc(u.Username)}">${esc(u.Name)} — ${esc(u.Role)}${u.Branch?" ("+esc(u.Branch)+")":""}</option>`).join("")}</select></div>
<div><label>Note</label><input id="sb-note" placeholder="e.g. chhutti / shaadi"></div>
<div><label>From <span class="req">*</span></label><input type="date" id="sb-from" value="${t}"></div>
<div><label>To <span class="req">*</span></label><input type="date" id="sb-to" value="${t}"></div>
</div>
<div style="margin-top:.8rem"><button class="btn" onclick="saveSubstitute('${esc(absU)}')">Assign</button></div>
${rows.length?`<div class="section-h" style="margin-top:1rem"><h3>Assignments</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Substitute</th><th>From</th><th>To</th><th>Note</th><th>Status</th><th></th></tr>
${rows.map(r=>{ const act=r.Status!=="Cancelled" && String(r.From).slice(0,10)<=t && String(r.To).slice(0,10)>=t; const past=String(r.To).slice(0,10)<t; return `<tr class="${act?'row-green':''}"><td><b>${esc(r.SubstituteName)}</b></td><td>${fmtDate(String(r.From).slice(0,10))}</td><td>${fmtDate(String(r.To).slice(0,10))}</td><td>${esc(r.Note||"")}</td><td>${r.Status==="Cancelled"?'<span class="pill p-gray">Cancelled</span>':act?'<span class="pill p-ok">Active aaj</span>':past?'<span class="pill p-gray">Done</span>':'<span class="pill p-warn">Upcoming</span>'}</td><td>${r.Status!=="Cancelled"&&!past?`<button class="btn small ghost" onclick="cancelSubstitute('${esc(r.SubID)}')">✕ Cancel</button>`:""}</td></tr>`; }).join("")}
</table></div>`:""}`);
}
async function saveSubstitute(absU){
const a=(DB.Users||[]).find(x=>String(x.Username).toLowerCase()===String(absU).toLowerCase()); const su=$("sb-u").value; const b=(DB.Users||[]).find(x=>x.Username===su);
const from=$("sb-from").value, to=$("sb-to").value; if(!a||!b) return; if(!from||!to||from>to) return toast("Dates sahi chuno.");
const clash=(DB.Substitutes||[]).find(r=>String(r.AbsentUser).toLowerCase()===String(absU).toLowerCase() && r.Status!=="Cancelled" && !(String(r.To).slice(0,10)<from || String(r.From).slice(0,10)>to));
if(clash) return toast(a.Name+" ke liye "+fmtDate(String(clash.From).slice(0,10))+"–"+fmtDate(String(clash.To).slice(0,10))+" pehle se "+clash.SubstituteName+" assigned hai — pehle cancel karo.");
if(!saveOnce("sub:"+absU)) return;
busy(true,"Assigning…");
try{
const rec={SubID:nextId("Substitutes","SubID","SB"),AbsentUser:a.Username,AbsentName:a.Name,SubstituteUser:b.Username,SubstituteName:b.Name,From:from,To:to,Note:$("sb-note").value.trim(),CreatedBy:USER.Name,CreatedAt:nowStr(),Status:"Active"};
await appendRow("Substitutes",rec); DB.Substitutes=DB.Substitutes||[]; DB.Substitutes.push(rec);
busy(false); toast("🔁 "+b.Name+" → "+a.Name+" ka substitute ("+fmtDate(from)+"–"+fmtDate(to)+")"); openSubstitute(absU);
}catch(e){ busy(false); toast("Failed: "+e.message); } finally{ saveDone("sub:"+absU); }
}
async function cancelSubstitute(id){
const r=(DB.Substitutes||[]).find(x=>x.SubID===id); if(!r) return; if(!confirm("Ye assignment cancel karein?")) return;
busy(true,"Cancelling…"); try{ await updateFields("Substitutes", r, {Status:"Cancelled"}); busy(false); toast("Cancelled"); openSubstitute(r.AbsentUser); }catch(e){ busy(false); toast("Failed: "+e.message); }
}
function coverTodayStrip(){ // Users screen top (Admin)
const t=todayStr(); const act=(DB.Substitutes||[]).filter(r=>r.Status!=="Cancelled" && String(r.From).slice(0,10)<=t && String(r.To).slice(0,10)>=t);
if(!act.length) return "";
return `<div class="card" style="margin-bottom:.8rem;padding:.6rem 1rem;border-left:4px solid var(--blue)"><b>🔁 Aaj ke covers:</b> ${act.map(r=>esc(r.SubstituteName)+" → "+esc(r.AbsentName)+" (tak "+fmtDate(String(r.To).slice(0,10))+")").join(" · ")}</div>`;
}
window.openSubstitute=openSubstitute;


/* ===== v35: QUOTATION MODULE (Salesman = apni, Manager = branch, Admin = sab) =====
 *  Tab Quotations: QuotID QT####, Date, ValidTill, CustomerName, Phone, Address, Salesman, Branch, ItemsJSON [{n,q,r,a}],
 *  SubTotal, Freight, Unloading, GrandTotal, Terms, Notes, Status (Draft/Sent), CreatedBy, CreatedAt, LastEditedBy, LastEditedAt.
 *  PDF = reference layout (logo, QUOTATION, items table, payment details, T&C) → print / WhatsApp share (pdfShare). */
const QT_TERMS_DEFAULT="1. PRICE IS INCLUSIVE OF GST.\n2. FREIGHT AND UNLOADING WILL BE EXTRA.\n3. PAYMENT : 100% ADVANCE\n4. DELIVERY WITHIN 15 DAYS AFTER WE RECEIVE PAYMENT.";
const QT_BANK={name:"BANSAL SALES CORPORATION",acc:"00342560000177",ifsc:"HDFC0000034",bank:"HDFC BANK"};
const QT_CO={name:"Bansal Sales Corporation",addr:"Sardar Bachhan Singh Marg, Hambran Road, Ludhiana",phone:"+91 8146270114",email:"pulkit.bansal@bscinterio.com",tag:"Bansal Studio – Your Tiling Partner"};
function canQuot(){ return isAdmin()||isMgr()||isSales()||hasMod("quotation"); }
function qtItems(q){ try{ const a=JSON.parse(q.ItemsJSON||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function qtCanEdit(q){ return isAdmin() || (isMgr() && inMyBranch(q.Salesman)) || (isSales() && q.Salesman===USER.Name); }
function qtList(){
let L=(DB.Quotations||[]);
if(isSales()) L=L.filter(q=>q.Salesman===USER.Name);
else if(isMgr()) L=L.filter(q=>inMyBranch(q.Salesman));
else if(isAdmin() && admScoped()) L=L.filter(q=>inMyBranch(q.Salesman));
return L;
}
function vQuotation(){
if(!canQuot()) return `<div class="card empty">Not allowed.</div>`;
const q=(window._qtQ||"").toLowerCase(), sm=window._qtSm||"all";
let L=qtList();
if(sm!=="all") L=L.filter(x=>x.Salesman===sm);
if(q) L=L.filter(x=>(x.QuotID+" "+x.CustomerName+" "+x.Phone+" "+x.Salesman).toLowerCase().includes(q));
L=[...L].sort((a,b)=>String(a.CreatedAt)<String(b.CreatedAt)?1:-1).slice(0,300);
const t=todayStr();
return `<div class="toolbar">
<button class="btn" onclick="openQuotForm()">＋ New quotation</button>
<input id="q-qt" placeholder="Search quote no. / customer / phone" value="${esc(window._qtQ||"")}" oninput="window._qtQ=this.value;window._refocusId=this.id;render()" style="max-width:260px">
${!isSales()? `<select style="max-width:200px" onchange="window._qtSm=this.value;render()"><option value="all">All salesmen</option>${salesmen().map(s=>`<option ${sm===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}</select>`:""}
<span class="muted" style="font-size:.75rem">${L.length} quotations</span>
</div>
<div class="tbl-wrap"><table><tr><th>Quote</th><th>Date</th><th>Customer</th><th>Salesman</th><th style="text-align:right">Items</th><th style="text-align:right">Total</th><th>Valid till</th><th></th></tr>
${L.map(x=>{ const items=qtItems(x); const exp=x.ValidTill && String(x.ValidTill).slice(0,10)<t; return `<tr class="${exp?'row-yellow':''}"><td><b>${esc(x.QuotID)}</b>${x.Status==="Sent"?' <span class="pill p-ok">sent</span>':''}</td><td style="white-space:nowrap">${fmtDate(String(x.Date).slice(0,10))}</td><td><b>${esc(x.CustomerName)}</b><div class="muted" style="font-size:.7rem">${esc(x.Phone||"")}</div></td><td>${esc(x.Salesman)}</td><td style="text-align:right">${items.length}</td><td style="text-align:right"><b>${money(x.GrandTotal)}</b></td><td>${x.ValidTill?fmtDate(String(x.ValidTill).slice(0,10))+(exp?' <span class="pill p-warn">expired</span>':''):"—"}</td>
<td style="white-space:nowrap"><button class="btn small ghost" onclick="printQuot('${esc(x.QuotID)}')">🖨 PDF</button> <button class="btn small" style="background:#25D366" onclick="waQuot('${esc(x.QuotID)}')">📲 Send</button> ${qtCanEdit(x)?`<button class="btn small ghost" onclick="openQuotForm('${esc(x.QuotID)}')">✏️ Edit</button>`:""}</td></tr>`; }).join("")||"<tr><td colspan=8 class='empty'>Koi quotation nahi — ＋ New quotation se banao.</td></tr>"}
</table></div>`;
}
function openQuotForm(id){
const q=id?(DB.Quotations||[]).find(x=>x.QuotID===id):null;
if(id && !q) return; if(q && !qtCanEdit(q)) return toast("Ye quotation edit karne ka right nahi.");
const items=q?qtItems(q):[];
const t=todayStr(); const vd=new Date(); vd.setDate(vd.getDate()+7); const valid=q&&q.ValidTill?String(q.ValidTill).slice(0,10):vd.toISOString().slice(0,10);
window._qtRows=items.length?items.map(i=>({n:i.n,q:num(i.q),r:num(i.r)})):[{n:"",q:"",r:""}];
openModal(q?"✏️ Edit quotation — "+q.QuotID:"📄 New quotation", `
<datalist id="qt-custs">${myCustomers().slice(0,500).map(c=>`<option value="${esc(c.Name)}">${esc(c.Phone||"")}</option>`).join("")}</datalist>
<datalist id="qt-items">${(DB.Items||[]).map(i=>`<option value="${esc(i.Name)}">${num(i.Price)?"₹"+num(i.Price):""}</option>`).join("")}</datalist>
<div class="form-grid">
<div><label>Customer name <span class="req">*</span></label><input id="qt-cust" list="qt-custs" value="${esc(q?q.CustomerName:"")}" onchange="qtCustPick(this.value)" autocomplete="off"></div>
<div><label>Phone</label><input id="qt-phone" inputmode="numeric" value="${esc(q?q.Phone:"")}"></div>
<div class="full"><label>Address</label><input id="qt-addr" value="${esc(q?q.Address:"")}"></div>
<div><label>Date</label><input type="date" id="qt-date" value="${q?String(q.Date).slice(0,10):t}"></div>
<div><label>Valid till</label><input type="date" id="qt-valid" value="${valid}"></div>
${!isSales()? `<div><label>Salesman</label><select id="qt-sm">${salesmen().map(s=>`<option ${(q?q.Salesman:USER.Name)===s.Name?'selected':''}>${esc(s.Name)}</option>`).join("")}</select></div>`:""}
</div>
<label style="margin-top:.6rem">Items <span class="req">*</span></label>
<div id="qt-rows"></div>
<button class="btn ghost small" onclick="qtAddRow()">＋ Add item</button>
<div class="form-grid" style="margin-top:.6rem">
<div><label>Freight charges (optional)</label><input type="number" id="qt-fr" min="0" inputmode="numeric" value="${q&&num(q.Freight)?num(q.Freight):""}" oninput="qtCalc()"></div>
<div><label>Unloading charges (optional)</label><input type="number" id="qt-un" min="0" inputmode="numeric" value="${q&&num(q.Unloading)?num(q.Unloading):""}" oninput="qtCalc()"></div>
</div>
<div class="card" style="padding:.6rem 1rem;margin-top:.6rem"><div class="rowline"><span>Sub-total</span><b id="qt-sub">₹0</b></div><div class="rowline"><span>Freight + Unloading</span><b id="qt-extra">₹0</b></div><div class="rowline" style="font-size:1.05rem"><span><b>Total</b></span><b id="qt-tot">₹0</b></div></div>
<label>Terms & conditions <span class="muted">(badal sakte ho)</span></label><textarea id="qt-terms" rows="5">${esc(q&&q.Terms?q.Terms:QT_TERMS_DEFAULT)}</textarea>
<label>Notes (internal, PDF par nahi)</label><input id="qt-notes" value="${esc(q?q.Notes||"":"")}">
<div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn" onclick="saveQuot('${q?esc(q.QuotID):""}')">💾 Save</button>${q?`<button class="btn ghost" onclick="closeModal();printQuot('${esc(q.QuotID)}')">🖨 PDF</button>`:""}</div>`);
qtRenderRows();
}
function qtCustPick(name){ const c=(DB.Customers||[]).find(x=>x.Name===name); if(c){ if(!$("qt-phone").value) $("qt-phone").value=c.Phone||""; if(!$("qt-addr").value) $("qt-addr").value=c.Address||""; } }
function qtRenderRows(){
const box=$("qt-rows"); if(!box) return;
box.innerHTML=window._qtRows.map((r,i)=>`<div style="display:grid;grid-template-columns:1fr 70px 90px 90px 28px;gap:.3rem;margin-bottom:.3rem;align-items:center">
<input list="qt-items" placeholder="Item name" value="${esc(r.n)}" oninput="qtRow(${i},'n',this.value)" onchange="qtRateFill(${i},this.value)" autocomplete="off">
<input type="number" placeholder="Qty" min="0" step="0.01" inputmode="decimal" value="${r.q===""?"":r.q}" oninput="qtRow(${i},'q',this.value)">
<input type="number" placeholder="Rate" min="0" step="0.01" inputmode="decimal" value="${r.r===""?"":r.r}" oninput="qtRow(${i},'r',this.value)">
<div style="text-align:right;font-weight:700;font-size:.85rem" id="qt-amt-${i}">${money(num(r.q)*num(r.r))}</div>
<button class="btn small ghost" style="padding:.1rem .3rem" onclick="qtDelRow(${i})">✕</button></div>`).join("");
qtCalc();
}
function qtRow(i,k,v){ window._qtRows[i][k]=(k==="n")?v:(v===""?"":num(v)); const a=$("qt-amt-"+i); if(a) a.textContent=money(num(window._qtRows[i].q)*num(window._qtRows[i].r)); qtCalc(); }
function qtRateFill(i,name){ const it=(DB.Items||[]).find(x=>x.Name===name); if(it && num(it.Price) && !num(window._qtRows[i].r)){ window._qtRows[i].r=num(it.Price); qtRenderRows(); } }
function qtAddRow(){ window._qtRows.push({n:"",q:"",r:""}); qtRenderRows(); }
function qtDelRow(i){ window._qtRows.splice(i,1); if(!window._qtRows.length) window._qtRows.push({n:"",q:"",r:""}); qtRenderRows(); }
function qtCalc(){
const sub=window._qtRows.reduce((s,r)=>s+num(r.q)*num(r.r),0); const ex=num($("qt-fr")&&$("qt-fr").value)+num($("qt-un")&&$("qt-un").value);
if($("qt-sub")) $("qt-sub").textContent=money(sub); if($("qt-extra")) $("qt-extra").textContent=money(ex); if($("qt-tot")) $("qt-tot").textContent=money(sub+ex);
}
async function saveQuot(id){
const cust=$("qt-cust").value.trim(); if(!cust) return toast("Customer name likho.");
const rows=window._qtRows.filter(r=>String(r.n||"").trim() && num(r.q)>0);
if(!rows.length) return toast("Kam se kam ek item (naam + qty) daalo.");
if(rows.some(r=>!(num(r.r)>0))) return toast("Har item ka rate daalo.");
const items=rows.map(r=>({n:String(r.n).trim(),q:num(r.q),r:num(r.r),a:Math.round(num(r.q)*num(r.r)*100)/100}));
const sub=items.reduce((s,i)=>s+i.a,0), fr=num($("qt-fr").value), un=num($("qt-un").value);
const sm=isSales()?USER.Name:($("qt-sm")?$("qt-sm").value:USER.Name);
const rec={Date:$("qt-date").value||todayStr(),ValidTill:$("qt-valid").value||"",CustomerName:cust,Phone:$("qt-phone").value.trim(),Address:$("qt-addr").value.trim(),Salesman:sm,Branch:userBranch(sm)||"",ItemsJSON:JSON.stringify(items),SubTotal:sub,Freight:fr||"",Unloading:un||"",GrandTotal:sub+fr+un,Terms:$("qt-terms").value.trim(),Notes:$("qt-notes").value.trim()};
if(!saveOnce("qt:"+(id||cust))) return;
busy(true,"Saving quotation…");
try{
if(id){ const q=(DB.Quotations||[]).find(x=>x.QuotID===id); await updateFields("Quotations", q, {...rec, LastEditedBy:USER.Name, LastEditedAt:nowStr()}); busy(false); closeModal(); toast("✏️ "+id+" updated"); }
else { const full={QuotID:nextId("Quotations","QuotID","QT"),...rec,Status:"Draft",CreatedBy:USER.Name,CreatedAt:nowStr(),LastEditedBy:"",LastEditedAt:""}; await appendRow("Quotations",full); DB.Quotations=DB.Quotations||[]; DB.Quotations.push(full); busy(false); closeModal(); toast("📄 "+full.QuotID+" saved"); }
render();
}catch(e){ busy(false); toast("Failed: "+e.message); } finally{ saveDone("qt:"+(id||cust)); }
}
function quotHTML(q){
const items=qtItems(q); const blank=Math.max(0, 8-items.length);
const fr=num(q.Freight), un=num(q.Unloading);
const termsHtml=String(q.Terms||QT_TERMS_DEFAULT).split("\n").map(l=>`<div>${esc(l)}</div>`).join("");
return `<!DOCTYPE html><html><head><title>${esc(q.QuotID)} ${esc(q.CustomerName)}</title><style>
@page{size:A4;margin:12mm} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12px}
.top{display:flex;justify-content:space-between;align-items:flex-start} .logo{width:150px;height:150px;object-fit:cover} .co{text-align:right;font-size:11.5px;line-height:1.5} .co b{font-size:14px}
h1{font-size:34px;letter-spacing:1px;margin:26px 0 14px;color:#222}
.meta{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:12px} .meta .nm{font-size:16px;font-weight:700;color:#1F5FA8}
table{width:100%;border-collapse:collapse} th{color:#1F5FA8;border:1px solid #cfd8e3;border-bottom:2px solid #1F5FA8;padding:9px 8px;font-size:12px;background:#fff} td{border:1px solid #e3e8ef;padding:9px 8px;height:14px}
.r{text-align:right} .c{text-align:center} .tot{color:#1F5FA8;font-weight:700}
.bot{display:flex;justify-content:space-between;margin-top:18px;gap:20px} .pay{font-size:11.5px;line-height:1.6} .pay h3,.tc h3{margin:0 0 4px;font-size:13px}
.sum{min-width:300px;border:1px solid #e3e8ef} .sum div{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #e3e8ef} .sum .g{font-size:15px;font-weight:700;border-bottom:none}
.tc{margin-top:14px;font-size:11.5px;line-height:1.6} .ftr{border-top:1px solid #ccc;margin-top:28px;padding-top:8px;text-align:center;font-weight:700;font-size:12px}
</style></head><body>
<div class="top"><img class="logo" src="${BSC_LOGO}"><div class="co"><b>${esc(QT_CO.name)}</b><br>${esc(QT_CO.addr)}<br>${esc(QT_CO.phone)}<br>${esc(QT_CO.email)}</div></div>
<h1>QUOTATION</h1>
<div class="meta"><div>Quotation to:<br><span class="nm">${esc(q.CustomerName)}</span>${q.Phone?`<br>${esc(q.Phone)}`:""}${q.Address?`<br>${esc(q.Address)}`:""}</div>
<div style="text-align:right">Date: ${fmtDate(String(q.Date).slice(0,10))}<br>Valid till: ${q.ValidTill?fmtDate(String(q.ValidTill).slice(0,10)):"—"}<br><br>Quote N.${esc(String(q.QuotID).replace(/^QT0*/,""))}<br><span style="font-size:10px;color:#666">Salesman: ${esc(q.Salesman)}</span></div></div>
<table><tr><th style="text-align:left">ITEM</th><th class="c" style="width:90px">QTY</th><th class="c" style="width:110px">PRICE</th><th class="r" style="width:130px">TOTAL</th></tr>
${items.map(i=>`<tr><td>${esc(i.n)}</td><td class="c">${i.q}</td><td class="c">${num(i.r)%1?num(i.r).toFixed(2):num(i.r)}</td><td class="r tot">${money(i.a)}</td></tr>`).join("")}
${"<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>".repeat(blank)}
</table>
<div class="bot"><div class="pay"><h3>Payment Details</h3>A/C Name: ${esc(QT_BANK.name)}<br>A/C No. : ${esc(QT_BANK.acc)}<br>IFSC Code : ${esc(QT_BANK.ifsc)}<br>Bank Name : ${esc(QT_BANK.bank)}
<div class="tc"><h3>Terms & Conditions</h3>${termsHtml}</div></div>
<div class="sum"><div><span>Sub-total :</span><span>${money(q.SubTotal)}</span></div>${fr?`<div><span>Freight :</span><span>${money(fr)}</span></div>`:""}${un?`<div><span>Unloading :</span><span>${money(un)}</span></div>`:""}<div class="g"><span>Total :</span><span>${money(q.GrandTotal)}</span></div></div></div>
<div class="ftr">${esc(QT_CO.tag)}</div>
</body></html>`;
}
function printQuot(id){ const q=(DB.Quotations||[]).find(x=>x.QuotID===id); if(!q) return; alog("print_quotation", id+" "+q.CustomerName); printHTML(quotHTML(q), true); } // v35.2: customer-facing — watermark nahi
async function waQuot(id){
const q=(DB.Quotations||[]).find(x=>x.QuotID===id); if(!q) return;
alog("wa_quotation", id+" "+q.CustomerName);
const msg="Namaste "+q.CustomerName+" ji 🙏\nBansal Sales Corporation (Bansal Tiles) ki taraf se aapka quotation "+q.QuotID+" attached hai.\nTotal: "+money(q.GrandTotal)+(q.ValidTill?" · Valid till "+fmtDate(String(q.ValidTill).slice(0,10)):"")+"\n\nKoi sawal ho to call karein: "+QT_CO.phone+"\nDhanyawad — "+q.Salesman;
await pdfShare({fileName:"Quotation "+q.QuotID+" "+q.CustomerName, html:quotHTML(q), phone:q.Phone, msg, title:"Quotation "+q.QuotID, noWM:true});
if(q.Status!=="Sent"){ try{ await updateFields("Quotations", q, {Status:"Sent"}); }catch(e){} }
}
window.vQuotation=vQuotation;

window._BUILD = "BUILD v43 — WS: sidebar dashboard, Pending Dispatches card, date-range bill list (Sale/Return), searchable dealer+item, bigger fields";
(function(){
try{
var bv=document.getElementById("build-v"); if(bv) bv.textContent=window._BUILD;
var need=["vMisc","vSampling","vMarketing","vAttendance","vTasks","vDashboard","vAdminHome","vEstimates","vCustomers","vDaybook","vUsers","render","doLogin","markAtt","vPayFollow","openSampSheet","printSampSheet","ssAddCustom","openAllDealers","openDealerLog","openStockUpload","saveStockUpload","waLedger","openUserTiming","saveUserTiming","openAddDealer","openPlanChoice","openAIWeekPlan","submitAIWeekPlan","vMarketingWeek","vFillIMS","imsFileChosen","saveIMSEntries","vIMSDash","vAnalysis","anPrint","vAccessLog","secAlertCard","ssLineUpd","sampSheetExcel","vQuotation","openQuotForm","saveQuot","printQuot","waQuot","qtRow","openSubstitute","saveSubstitute","cancelSubstitute","vPayCalls","escList","escDone","pfOutChg","vFeedback","openFeedback","saveFeedback","fbPick","openAttSend","sendAttReports","attRangeData","anExpDrill","openStockAdjust","saveStockAdjust","vSwitch","swToggle","loginAs","loginAsEnd","alog","wmWrap","scrWM","openAttManual","saveAttManual","attLateCalc","waLedgerShare","chequeFieldsHtml","imsCreateIndentUI","imsIndentAction","imsCreatePOUI","imsADC","imsSelTgl","imsPOView","imsPOWa","vZivaInbox","zivaReply","bankBookHTML","esAskCrmShow","pcCanDone","openAdmBranchPick","openItemLedger","myGodowns","smOpenCat"];
var miss=need.filter(function(n){ return typeof window[n]!=="function"; });
if(miss.length){
var el=document.getElementById("li-diag");
if(el){ el.style.display="block"; el.textContent="⚠ App files incomplete — missing: "+miss.join(", ")+" — paste AppJS again."; }
}
}catch(e){}
})();
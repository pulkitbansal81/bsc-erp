/* ============================================================================
 * js5 — CHEQUE REGISTER (retail + wholesale) · Wholesale payment approval (Admin checker)
 * Flow: Pending → Sent to bank (CRM/Admin) → Cleared | Bounced (Accountant/Admin) → Re-present (CRM/Admin) → Sent…
 * ========================================================================== */
function chqIsCRM(){ const r=String(USER.Role||""); return isAdmin() || (/wholesale/i.test(r) && /crm/i.test(r)); } // Wholesale CRM only
function chqIsAcct(){ return isAdmin() || /account/i.test(String(USER.Role||"")); }
window._chqRows=null; window._chqTab=window._chqTab||"pending";

async function chqLoad(force){
if(window._chqRows && !force) return;
busy(true,"Cheque register load…");
try{ window._chqRows=await gsRun("chqRegister",[null,null]); busy(false); render(); }
catch(e){ busy(false); window._chqRows=[]; toast("Cheque register: "+e.message); render(); }
}
function chqPill(st){ return st==="Cleared"?'<span class="pill p-ok">✓ Cleared</span>':st==="Bounced"?'<span class="pill p-bad">✖ Bounced</span>':st==="Sent"?'<span class="pill p-blue">🏦 Sent to bank</span>':'<span class="pill p-warn">⏳ Pending</span>'; }
function vCheques(){
if(!window._chqRows){ chqLoad(); return `<div class="card empty">Cheque register load ho raha hai…</div>`; }
const today=todayStr(), t=window._chqTab;
const D=(window._chqD===undefined)? (window._chqD=todayStr()) : window._chqD; // ek cheque-date filter (khaali = sab dates)
const all=window._chqRows;
const cnt={today:0,overdue:0,pending:0,sent:0,cleared:0,bounced:0,all:all.length};
all.forEach(r=>{ const d=String(r.cheque_date||"").slice(0,10); if(d===today) cnt.today++; if(d<today && (r.status==="Pending"||r.status==="Bounced")) cnt.overdue++; cnt[r.status.toLowerCase()]=(cnt[r.status.toLowerCase()]||0)+1; });
let list=all.filter(r=>{
const d=String(r.cheque_date||"").slice(0,10);
if(t==="overdue") return d<today && (r.status==="Pending"||r.status==="Bounced"); // date filter ignore
if(D && d!==D) return false;
if(t==="all") return true;
return r.status.toLowerCase()===t;
});
const q=(window._chqQ||"").toLowerCase(); if(q) list=list.filter(r=>(r.party+" "+r.cheque_no+" "+r.ref).toLowerCase().includes(q));
list=list.sort((a,b)=>String(a.cheque_date)<String(b.cheque_date)?-1:1);
const tot=list.reduce((a,r)=>a+num(r.amount),0);
const inD=st=>all.filter(r=>(!D||String(r.cheque_date||"").slice(0,10)===D)&&(st==="all"||r.status.toLowerCase()===st)).length;
const TABS=[["pending","⏳ Pending ("+inD("pending")+")"],["sent","🏦 Sent ("+inD("sent")+")"],["cleared","✓ Cleared ("+inD("cleared")+")"],["bounced","✖ Bounced ("+inD("bounced")+")"],["all","All ("+inD("all")+")"],["overdue","⚠ Purane pending ("+cnt.overdue+")"]];
const _unused=[];
return `<div class="toolbar" style="flex-wrap:wrap">
${TABS.map(x=>`<button class="btn small ${t===x[0]?'':'ghost'}" onclick="window._chqTab='${x[0]}';render()">${x[1]}</button>`).join("")}
<button class="btn small ghost" onclick="chqLoad(true)">🔄</button></div>
<div class="toolbar" style="flex-wrap:wrap">
<input id="chq-q" autocomplete="off" placeholder="🔍 party / cheque no…" value="${esc(window._chqQ||'')}" oninput="window._chqQ=this.value;window._refocusId=this.id;render()" style="max-width:220px">
<label style="margin:0">Cheque date</label><input type="date" value="${D||''}" onchange="window._chqD=this.value;render()">
<button class="btn small ghost" onclick="window._chqD=todayStr();render()">Aaj</button>
<button class="btn small ${D?'ghost':''}" onclick="window._chqD='';render()">Sab dates</button>
<span class="muted" style="align-self:center;margin-left:auto">Showing ${list.length} · <b>${money(tot)}</b></span></div>
<div class="muted" style="font-size:.78rem;margin-bottom:.4rem">Flow: Pending → <b>Send to bank</b> (CRM) → <b>Clear / Bounce</b> (Accountant) → Bounced ho to <b>Re-present</b> (CRM) → dobara Send.</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>Cheque date</th><th>Party</th><th>Cheque no</th><th class="r">Amount</th><th>Source</th><th>Entry</th><th>Status</th><th></th></tr>
${list.map(r=>{
const d=String(r.cheque_date||"").slice(0,10); const old=d<today && (r.status==="Pending"||r.status==="Bounced");
const key=`'${r.origin}','${r.ref}'`;
const acts=[];
if(chqIsCRM() && (r.status==="Pending")) acts.push(`<button class="btn small" onclick="chqAct(${key},'send')">🏦 Send to bank</button>`);
if(chqIsCRM() && r.status==="Bounced") acts.push(`<button class="btn small" onclick="chqAct(${key},'represent')">↻ Re-present</button>`);
if(chqIsAcct() && r.status==="Sent"){ acts.push(`<button class="btn small" style="background:var(--ok)" onclick="chqAct(${key},'clear')">✓ Clear</button>`); acts.push(`<button class="btn small danger" onclick="chqAct(${key},'bounce')">✖ Bounce</button>`); }
const hist=(r.history||[]).map(h=>`${esc(h.a)} → ${esc(h.to)} · ${esc(h.by)} · ${esc(String(h.at).slice(0,16).replace("T"," "))}${h.note?" · "+esc(h.note):""}`).join("<br>");
return `<tr style="${old?'background:#FFF3BF':''}"><td>${fmtDate(d)}${old?' <span class="pill p-bad" style="font-size:.6rem">OLD</span>':''}</td><td><b>${esc(r.party)}</b></td><td>${esc(r.cheque_no||"—")}</td><td class="r"><b>${money(r.amount)}</b></td>
<td>${r.origin==="retail"?'<span class="pill p-gray">Retail</span>':'<span class="pill p-blue">Wholesale</span>'}${r.origin==="wholesale"&&r.cash_status==="Pending Approval"?'<div class="muted" style="font-size:.68rem">approval pending</div>':''}</td>
<td class="muted" style="font-size:.75rem">${esc(r.ref)}<br>${esc(r.received_by||"")}</td>
<td>${chqPill(r.status)}${r.represent_count?`<div class="muted" style="font-size:.68rem">re-presented ×${r.represent_count}</div>`:""}${hist?`<details style="font-size:.68rem"><summary class="muted">history</summary>${hist}</details>`:""}</td>
<td style="white-space:nowrap">${acts.join(" ")}</td></tr>`;}).join("")}
</table></div>` : `<div class="card empty">Is filter mein koi cheque nahi.</div>`}`;
}
async function chqAct(origin, ref, action){
let note="";
if(action==="bounce"){ note=prompt("Bounce ka reason (optional):")||""; }
else if(action==="represent"){ if(!confirm("Ye cheque dobara bank mein lagana hai? (Pending ho jayega — phir Send to bank karo)")) return; note=prompt("Note (optional):")||""; }
else if(action==="clear"){ if(!confirm("Cheque bank mein CLEAR ho gaya — confirm?")) return; }
busy(true,"Updating…");
try{ await gsRun("chqSet",[origin, ref, action, note]); busy(false); toast("Updated ✓"); await chqLoad(true); }
catch(e){ busy(false); toast(e.message); }
}

/* ---------- Admin Payments Checker → Wholesale tab ---------- */
function wsPayCheckSection(){
if(!window.WS){ wsLoad(); return `<div class="card empty">Wholesale data load…</div>`; }
const tab=window._wpcTab||"pending";
const all=(WS.payments||[]).filter(p=>p.status==="Active" && !(p.source==="Cash" && p.direction!=="REBATE"));
const pend=all.filter(p=>p.check_status!=="Approved"), done=all.filter(p=>p.check_status==="Approved");
const list= tab==="pending"? pend : done;
return `<div class="toolbar"><button class="btn ${tab==='pending'?'':'ghost'}" onclick="window._wpcTab='pending';render()">Approval Pending (${pend.length})</button>
<button class="btn ${tab==='approved'?'':'ghost'}" onclick="window._wpcTab='approved';render()">Approved (${done.length})</button>
<button class="btn small ghost" onclick="wsLoadForce()">🔄</button></div>
<div class="muted" style="font-size:.78rem">Wholesale ki GPay Others / NEFT / Cheque / Card / Rebate entries — Approve ke baad hi dealer ke ledger/balance mein ginti hoti hai.</div>
${list.length? `<div class="tbl-wrap"><table><tr><th>No</th><th>Date</th><th>Party</th><th class="r">Amount</th><th>Type</th><th>Source</th><th>Notes</th><th>By</th><th></th></tr>
${list.map(p=>`<tr><td>${esc(p.pno)}</td><td>${fmtDate(p.pdate)}</td><td><b>${esc(p.party_name)}</b></td><td class="r"><b>${money(p.amount)}</b></td><td>${p.direction==="IN"?"Receipt":p.direction==="REBATE"?'<span class="pill p-warn">Rebate</span>':"Payment"}</td><td>${esc(p.source)}${p.source_detail?"<div class='muted' style='font-size:.72rem'>"+esc(p.source_detail)+"</div>":""}</td><td class="muted">${esc(p.notes||"")}</td><td class="muted">${esc(p.created_by||"")}</td>
<td>${p.check_status!=="Approved"?`<button class="btn small" style="background:var(--ok)" onclick="wsApprovePay('${p.pno}')">✓ Approve</button>`:`<span class="muted" style="font-size:.72rem">${esc(p.checked_by||"")}<br>${esc(String(p.checked_at||"").slice(0,16).replace("T"," "))}</span>`}</td></tr>`).join("")}
</table></div>`:`<div class="card empty">${tab==="pending"?"Sab approved. 🎉":"Koi approved entry nahi."}</div>`}`;
}
async function wsApprovePay(pno){
if(!confirm(pno+" approve karna hai? Iske baad ledger mein ginti hogi.")) return;
busy(true,"Approving…");
try{ await gsRun("wsPayApprove",[pno]); busy(false); toast("Approved ✓"); try{ alog("ws_pay_approve", pno); }catch(_e){} window.WS=null; await wsLoad(true); }
catch(e){ busy(false); toast(e.message); }
}
window.vCheques=vCheques; window.wsPayCheckSection=wsPayCheckSection;

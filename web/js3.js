/** ============================================================
 *  MY SCHEDULER — CEO Execution OS  (BUILD v17)
 *  Owner/Admin ONLY. Data: "OwnerTasks" tab (main ERP sheet),
 *  readAll ke bahar — baaki users ke payload mein kabhi nahi aata.
 *  Server-side lock: Code.gs requireOwner_ har call par.
 *  ============================================================ */

const SCHED_COLS=["TaskID","Title","Desc","Category","Priority","EstMin","Notes","StartDate","DueDate","StartTime","EndTime","Freq","FreqRule","PowerDose","Status","WaitingOn","WaitingSince","ExpectedDate","WaitingReason","RemindDays","LastRemind","Moves","CompletedAt","CompletedBy","ParentID","CreatedBy","CreatedAt"];
const SCHED_CATS=["Business Growth","Strategy","Finance","Sales","Marketing","HR / Hiring","Operations","Vendor Follow-up","Customer Meeting","Review","Personal","Health","Reading","Others"];
const SCHED_PRI={"Critical":"#C0392B","High":"#E67E22","Medium":"#1D5FBF","Low":"#7A879B"};
const SCHED_WAIT_ON=["Vendor","Customer","Architect","Bank","Government Office","Legal / CA","Supplier","Staff","Other"];
const SCH_WD=["SUN","MON","TUE","WED","THU","FRI","SAT"];
const SCH_WD_FULL=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SCH_GOLD="#C9A227";

/* ---------- premium CSS (ek hi baar inject) ---------- */
(function(){
if(document.getElementById("sch-css")) return;
const st=document.createElement("style"); st.id="sch-css";
st.textContent=`
.sch-hero{position:relative;overflow:hidden;border-radius:18px;padding:1.25rem 1.2rem 1.1rem;color:#fff;background:linear-gradient(135deg,#0B1D33 0%,#123765 55%,#1D5FBF 120%);box-shadow:0 14px 34px rgba(11,29,51,.35);margin-bottom:.9rem}
.sch-hero:before{content:"";position:absolute;top:-70px;right:-60px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(201,162,39,.35),transparent 68%)}
.sch-hero h2{font-family:'Archivo';font-size:1.45rem;font-weight:800;letter-spacing:-.02em;margin:0}
.sch-hero .sub{opacity:.78;font-size:.83rem;margin-top:.15rem}
.sch-chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.9rem}
.sch-chip{background:rgba(255,255,255,.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:.5rem .8rem;min-width:86px}
.sch-chip .v{font-family:'Archivo';font-weight:800;font-size:1.15rem;line-height:1.1}
.sch-chip .l{font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;opacity:.75;margin-top:.1rem}
.sch-chip.gold{background:linear-gradient(135deg,rgba(201,162,39,.32),rgba(201,162,39,.12));border-color:rgba(233,199,90,.55)}
.sch-ring-wrap{position:absolute;top:1.05rem;right:1.05rem;text-align:center}
.sch-ring-wrap .pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Archivo';font-weight:800;font-size:1rem}
.sch-tabs{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.3rem;margin-bottom:.9rem;-webkit-overflow-scrolling:touch}
.sch-tab{flex:none;border-radius:99px;padding:.45rem .95rem;font-weight:700;font-size:.84rem;border:1.5px solid var(--line);background:#fff;color:var(--mut);cursor:pointer;transition:all .15s}
.sch-tab.on{background:var(--navy);color:#fff;border-color:var(--navy);box-shadow:0 4px 12px rgba(11,29,51,.25)}
.sch-tab.gold.on{background:linear-gradient(135deg,#B08D1E,#D9B54A);border-color:#C9A227}
.sch-card{position:relative;background:#fff;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:14px;padding:.75rem .85rem;margin-bottom:.55rem;box-shadow:0 2px 10px rgba(11,29,51,.06);transition:transform .15s,box-shadow .15s;animation:schIn .25s ease both}
.sch-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(11,29,51,.13)}
.sch-card .t{font-weight:700;font-size:.95rem}
.sch-card .meta{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.3rem;font-size:.72rem;color:var(--mut)}
.sch-card .acts{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem}
.sch-card.done{opacity:.62}
.sch-card.done .t{text-decoration:line-through}
.pd-card{background:linear-gradient(135deg,#FFFDF4,#FBF2D5);border:1.5px solid #E5C963;border-left:5px solid ${SCH_GOLD};box-shadow:0 5px 20px rgba(201,162,39,.22)}
.pd-card:hover{box-shadow:0 10px 26px rgba(201,162,39,.32)}
.pd-tag{display:inline-flex;align-items:center;gap:.2rem;background:linear-gradient(135deg,#B08D1E,#D9B54A);color:#fff;border-radius:99px;padding:.14rem .55rem;font-size:.66rem;font-weight:800;letter-spacing:.03em}
.sch-sec{display:flex;align-items:center;gap:.55rem;margin:1.1rem 0 .55rem}
.sch-sec h3{font-size:.95rem;font-weight:800;font-family:'Archivo'}
.sch-sec .ln{flex:1;height:1px;background:var(--line)}
.sch-btn{border:none;border-radius:8px;padding:.4rem .7rem;font-weight:700;font-size:.76rem;cursor:pointer;background:var(--sky);color:var(--blue-d);transition:all .13s}
.sch-btn:hover{filter:brightness(.95)}
.sch-btn.ok{background:#E3F5EC;color:var(--ok)} .sch-btn.bad{background:#FDECEA;color:var(--bad)}
.sch-btn.gold{background:linear-gradient(135deg,#B08D1E,#D9B54A);color:#fff}
.sch-btn.dark{background:var(--navy);color:#fff}
.sch-fab{position:fixed;right:1.1rem;bottom:1.2rem;z-index:70;border:none;border-radius:99px;padding:.9rem 1.3rem;font-weight:800;font-size:.95rem;color:#fff;background:linear-gradient(135deg,#1D5FBF,#0B1D33);box-shadow:0 10px 28px rgba(11,29,51,.45);cursor:pointer;transition:transform .15s}
.sch-fab:hover{transform:scale(1.05)}
.sch-mgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.sch-mhead{text-align:center;font-size:.66rem;font-weight:800;color:var(--mut);text-transform:uppercase;padding:.2rem 0}
.sch-mcell{background:#fff;border:1px solid var(--line);border-radius:10px;min-height:62px;padding:.28rem .32rem;cursor:pointer;font-size:.72rem;transition:all .12s}
.sch-mcell:hover{border-color:var(--blue);box-shadow:0 3px 10px rgba(29,95,191,.18)}
.sch-mcell.dim{opacity:.38} .sch-mcell.today{border:2px solid var(--blue);background:var(--sky)}
.sch-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin:1px 1px 0 0}
.sch-bar{height:9px;border-radius:99px;background:#EDF1F7;overflow:hidden;flex:1}
.sch-bar i{display:block;height:100%;border-radius:99px;background:var(--blue);transition:width .5s ease}
.sch-insight{display:flex;gap:.6rem;align-items:flex-start;padding:.55rem .2rem;border-bottom:1px dashed var(--line);font-size:.87rem}
.sch-wait-badge{background:#F3E8FF;color:#7C3AED;border-radius:99px;padding:.16rem .55rem;font-size:.68rem;font-weight:800}
.sch-streak{display:inline-flex;align-items:center;gap:.25rem;font-weight:800}
.sch-conf{position:fixed;top:-16px;width:9px;height:13px;z-index:999;pointer-events:none;border-radius:2px;animation:schFall 1.2s ease-in forwards}
@keyframes schFall{to{transform:translateY(108vh) rotate(560deg);opacity:.15}}
@keyframes schIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes schPulse{0%,100%{opacity:1}50%{opacity:.55}}
.sch-live{animation:schPulse 2s infinite}
.sch-wkday{background:#fff;border:1.5px solid var(--line);border-radius:8px;padding:.32rem .5rem;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--mut)}
.sch-wkday.on{background:var(--navy);color:#fff;border-color:var(--navy)}
@media(max-width:719px){ .sch-ring-wrap{position:static;margin-top:.7rem} .sch-hero{padding-bottom:.9rem} }
`;
document.head.appendChild(st);
})();

/* ---------- data layer ---------- */
window._SCH=null;
function schObjs(){
const v=window._SCH||[]; const out=[];
for(let i=1;i<v.length;i++){
const r=v[i]; if(!r || !String(r[0]||"").trim()) continue;
const o={_row:i+1}; SCHED_COLS.forEach((c,j)=>o[c]=r[j]!==undefined?r[j]:"");
out.push(o);
}
return out;
}
async function loadSched(force){
if(window._SCH && !force) return;
window._SCH=await gsRun("readSched",[]);
}
function schNextId(){
let mx=0;
schObjs().forEach(t=>{ const m=String(t.TaskID).match(/^OT(\d+)$/); if(m) mx=Math.max(mx,+m[1]); });
return "OT"+String(mx+1).padStart(4,"0");
}
async function schAppend(obj){
const row=SCHED_COLS.map(c=>obj[c]!==undefined&&obj[c]!==null?obj[c]:"");
const res=await gsRun("appendSched",[row]);
if(res&&res.id) row[0]=res.id;
window._SCH.push(row);
return row[0];
}
async function schUpdate(t, changes){
const idx={}; Object.keys(changes).forEach(k=>{ const j=SCHED_COLS.indexOf(k); if(j>-1) idx[j]=changes[k]; });
await gsRun("updateSched",[t.TaskID, idx]);
const m=window._SCH;
for(let i=1;i<m.length;i++){ if(String(m[i][0])===String(t.TaskID)){ while(m[i].length<SCHED_COLS.length) m[i].push(""); Object.keys(idx).forEach(j=>m[i][j]=idx[j]); break; } }
}
function schById(id){ return schObjs().find(t=>String(t.TaskID)===String(id)); }

/* ---------- date/recurrence engine ---------- */
function schFmt(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function schAddD(ds,n){ const d=new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return schFmt(d); }
function schDow(ds){ return new Date(ds+"T00:00:00").getDay(); }
function schNthWeekday(y,m,n,wd){
const first=new Date(y,m,1).getDay();
let date=1+((wd-first+7)%7)+(n-1)*7;
const dim=new Date(y,m+1,0).getDate();
while(date>dim) date-=7;
return new Date(y,m,date);
}
function schLastWeekday(y,m,wd){
const dim=new Date(y,m+1,0).getDate();
let d=new Date(y,m,dim);
while(d.getDay()!==wd) d.setDate(d.getDate()-1);
return d;
}
/** Recurring task complete hone par agli due date */
function schNextDate(t, from){
const f=String(t.Freq||"Once"), rule=String(t.FreqRule||"");
if(f==="Once"||!from) return "";
if(f==="Daily") return schAddD(from,1);
if(f==="Weekdays"){ let d=schAddD(from,1); while(schDow(d)===0) d=schAddD(d,1); return d; }
if(f==="Weekly"){
const wds=rule? rule.split(",").map(x=>SCH_WD.indexOf(x)).filter(x=>x>-1) : [schDow(from)];
let d=schAddD(from,1);
for(let i=0;i<15;i++){ if(wds.includes(schDow(d))) return d; d=schAddD(d,1); }
return schAddD(from,7);
}
const step = f==="Monthly"?1 : f==="Quarterly"?3 : f==="HalfYearly"?6 : f==="Yearly"?12 : 0;
if(step){
const d0=new Date(from+"T00:00:00");
const ty=new Date(d0.getFullYear(), d0.getMonth()+step, 1);
const y=ty.getFullYear(), m=ty.getMonth();
const dim=new Date(y,m+1,0).getDate();
let mm=rule.match(/^D(\d+)$/);
if(mm) return schFmt(new Date(y,m,Math.min(+mm[1],dim)));
mm=rule.match(/^([1-4])([A-Z]{3})$/);
if(mm) return schFmt(schNthWeekday(y,m,+mm[1],SCH_WD.indexOf(mm[2])));
mm=rule.match(/^L([A-Z]{3})$/);
if(mm) return schFmt(schLastWeekday(y,m,SCH_WD.indexOf(mm[1])));
return schFmt(new Date(y,m,Math.min(d0.getDate(),dim)));
}
if(f==="Custom"){ const m2=rule.match(/^E(\d+)D$/); return schAddD(from, m2? Math.max(1,+m2[1]) : 1); }
return "";
}
/** v17.1: FUTURE OCCURRENCE PREVIEW — recurring task ki aane wali dates
 *  calendar mein "ghost" ke roop mein dikhti hain (sheet mein row nahi banti;
 *  asli row tab banti hai jab current occurrence complete hoti hai). */
function schVirtual(from, to){
const rows=schObjs(); const out=[];
const latest={}; // root → sabse aage wala OPEN occurrence
rows.forEach(x=>{
if(!schOpen(x) || !x.Freq || x.Freq==="Once") return;
const root=x.ParentID||x.TaskID;
if(!latest[root] || schDue(x)>schDue(latest[root])) latest[root]=x;
});
Object.keys(latest).forEach(root=>{
const t=latest[root];
const chainDates=new Set(rows.filter(x=>(x.ParentID||x.TaskID)===root).map(x=>schDue(x)));
let d=schDue(t)||todayStr(), guard=0;
while(guard++<62){
d=schNextDate(t,d);
if(!d || d>to) break;
if(d>=from && !chainDates.has(d)) out.push({virtual:true, date:d, t:t});
}
});
return out.sort((a,b)=>a.date<b.date?-1:1);
}
function schGhostCard(v){
const t=v.t;
return `<div class="sch-card" style="opacity:.6;border-style:dashed;border-left-style:solid;border-left-color:${schIsPD(t)?SCH_GOLD:'var(--blue)'}">
<div class="t" style="color:var(--mut)">${schIsPD(t)?'⭐ ':''}🔮 ${esc(t.Title)}</div>
<div class="meta"><span class="pill p-gray">Upcoming — auto</span><span>${schFreqLabel(t)}</span></div>
<div class="muted" style="font-size:.74rem;margin-top:.2rem">Yeh occurrence khud ban jayegi jab ${fmtDate(schDue(t))} wali complete hogi.</div>
</div>`;
}
function schFreqLabel(t){
const f=String(t.Freq||"Once"), r=String(t.FreqRule||"");
if(f==="Once") return "";
if(f==="Weekly"&&r) return "🔁 Every "+r.split(",").map(x=>x.slice(0,1)+x.slice(1,3).toLowerCase()).join(", ");
if(/^D\d+$/.test(r)) return "🔁 "+f+" — date "+r.slice(1);
let m=r.match(/^([1-4])([A-Z]{3})$/); if(m) return "🔁 "+["1st","2nd","3rd","4th"][+m[1]-1]+" "+m[2].slice(0,1)+m[2].slice(1).toLowerCase()+" / month";
m=r.match(/^L([A-Z]{3})$/); if(m) return "🔁 Last "+m[1].slice(0,1)+m[1].slice(1).toLowerCase()+" / month";
if(f==="Custom"&&/^E\d+D$/.test(r)) return "🔁 Every "+r.slice(1,-1)+" days";
return "🔁 "+f;
}

/* ---------- classification helpers ---------- */
function schOpen(t){ return t.Status!=="Completed" && t.Status!=="Cancelled"; }
function schDue(t){ return String(t.DueDate||"").slice(0,10); }
function schIsPD(t){ return String(t.PowerDose)==="Yes"; }
function schOverdue(t){ return schOpen(t) && t.Status!=="Waiting" && schDue(t) && schDue(t)<todayStr(); }
function schToday_(t){ return schOpen(t) && schDue(t)===todayStr(); }
function schAccent(t){
if(schIsPD(t)) return SCH_GOLD;
if(t.Status==="Completed") return "var(--ok)";
if(t.Status==="Waiting") return "#7C3AED";
if(schOverdue(t)) return "var(--bad)";
return SCHED_PRI[t.Priority]||"var(--blue)";
}
function schStatusPill(t){
if(t.Status==="Completed") return `<span class="pill p-ok">✓ Done</span>`;
if(t.Status==="Cancelled") return `<span class="pill p-gray">Cancelled</span>`;
if(t.Status==="Waiting") return `<span class="sch-wait-badge">⏳ Waiting — ${esc(t.WaitingOn||"?")}</span>`;
if(t.Status==="In Progress") return `<span class="pill p-blue sch-live">▶ In Progress</span>`;
if(schOverdue(t)) return `<span class="pill p-bad">${daysSince(schDue(t))}d overdue</span>`;
if(schDue(t)===todayStr()) return `<span class="pill p-warn">Today</span>`;
return `<span class="pill p-blue">${fmtDate(schDue(t))}</span>`;
}

/* ---------- scores / streaks / insights ---------- */
function schWeight(t){ return schIsPD(t)?2:1; }
function schTodayScore(){
const t=todayStr();
const due=schObjs().filter(x=>x.Status!=="Cancelled" && schDue(x)===t);
if(!due.length) return null;
const tot=due.reduce((s,x)=>s+schWeight(x),0);
const done=due.filter(x=>x.Status==="Completed").reduce((s,x)=>s+schWeight(x),0);
return Math.round(done/tot*100);
}
function schPDStreak(){
const rows=schObjs();
let streak=0, d=todayStr();
for(let i=0;i<365;i++){
const pdDue=rows.filter(x=>schIsPD(x) && x.Status!=="Cancelled" && schDue(x)===d);
const pdDone=pdDue.filter(x=>x.Status==="Completed");
if(pdDue.length && pdDone.length) streak++;
else if(pdDue.length && !pdDone.length){ if(d!==todayStr()) break; } // aaj ka din abhi chalu hai — streak todo mat
else if(!pdDue.length && i>0){ /* PD tha hi nahi us din — streak preserved */ }
d=schAddD(d,-1);
}
return streak;
}
function schRange(t, from, to){ const c=String(t.CompletedAt||"").slice(0,10); return c>=from && c<=to; }
function schCompletionPct(from,to){
const rows=schObjs().filter(x=>x.Status!=="Cancelled" && schDue(x)>=from && schDue(x)<=to);
if(!rows.length) return null;
return Math.round(rows.filter(x=>x.Status==="Completed").length/rows.length*100);
}
function schInsights(){
const rows=schObjs(), out=[], t=todayStr();
const wk0=schAddD(t,-6), wkP0=schAddD(t,-13), wkP1=schAddD(t,-7);
const cur=schCompletionPct(wk0,t), prev=schCompletionPct(wkP0,wkP1);
if(cur!==null) out.push(["📈", `You completed <b>${cur}%</b> of scheduled work this week${prev!==null? (cur>=prev? ` — up from ${prev}% last week. Keep going.` : ` — down from ${prev}% last week.`):"."}`]);
const pdDue=rows.filter(x=>schIsPD(x)&&x.Status!=="Cancelled"&&schDue(x)>=wk0&&schDue(x)<=t);
if(pdDue.length){ const p=Math.round(pdDue.filter(x=>x.Status==="Completed").length/pdDue.length*100); out.push(["⭐", `Power Dose completion this week: <b>${p}%</b>${p>=80?" — your growth engine is running strong.":p>=50?" — push the remaining growth work to the top of your day.":" — <b>your company's growth work is waiting.</b>"}`]); }
const odCat={};
rows.filter(schOverdue).forEach(x=>{ const c=x.Category||"Others"; odCat[c]=(odCat[c]||0)+1; });
const odTop=Object.entries(odCat).sort((a,b)=>b[1]-a[1])[0];
if(odTop) out.push(["🔥", `Most overdue category: <b>${esc(odTop[0])}</b> (${odTop[1]} tasks). Consider a dedicated block for it.`]);
const mvCat={};
rows.filter(x=>num(x.Moves)>0).forEach(x=>{ const c=x.Category||"Others"; mvCat[c]=(mvCat[c]||0)+num(x.Moves); });
const mvTop=Object.entries(mvCat).sort((a,b)=>b[1]-a[1])[0];
if(mvTop && mvTop[1]>=3) out.push(["↪️", `You are postponing <b>${esc(mvTop[0])}</b> work repeatedly (${mvTop[1]} times). Is something blocking it?`]);
const dow=[0,0,0,0,0,0,0];
rows.filter(x=>x.Status==="Completed"&&x.CompletedAt).forEach(x=>{ const d=String(x.CompletedAt).slice(0,10); if(d>=schAddD(t,-29)) dow[schDow(d)]++; });
const bd=dow.indexOf(Math.max.apply(null,dow));
if(Math.max.apply(null,dow)>2) out.push(["📅", `Your most productive day (30d): <b>${SCH_WD_FULL[bd]}</b>. Schedule Power Dose work there.`]);
const lateDone=rows.filter(x=>x.Status==="Completed"&&x.CompletedAt&&schDue(x)&&String(x.CompletedAt).slice(0,10)>schDue(x)&&String(x.CompletedAt).slice(0,10)>=schAddD(t,-29));
if(lateDone.length){ const avg=Math.round(lateDone.reduce((s,x)=>s+(new Date(String(x.CompletedAt).slice(0,10))-new Date(schDue(x)))/86400000,0)/lateDone.length); if(avg>=1) out.push(["⏱", `Average delay on late completions (30d): <b>${avg} day${avg>1?"s":""}</b>.`]); }
const wait=rows.filter(x=>x.Status==="Waiting");
if(wait.length) out.push(["⏳", `<b>${wait.length}</b> task${wait.length>1?"s are":" is"} waiting on others — your side is clear. Follow up on time.`]);
if(!out.length) out.push(["🚀", "Add your first tasks and mark the growth work as ⭐ Power Dose — insights will appear as you execute."]);
return out;
}

/* ---------- confetti + clock ---------- */
function schConfetti(){
const colors=["#C9A227","#E9C75A","#1D5FBF","#0E8A4D","#E67E22","#7C3AED"];
for(let i=0;i<26;i++){
const s=document.createElement("i"); s.className="sch-conf";
s.style.left=(4+Math.random()*92)+"vw";
s.style.background=colors[i%colors.length];
s.style.animationDelay=(Math.random()*0.25)+"s";
s.style.transform="rotate("+Math.random()*360+"deg)";
document.body.appendChild(s);
setTimeout(()=>s.remove(),1600);
}
}
function schClock(){
const e=document.getElementById("sch-clock");
if(e){ const d=new Date(); e.textContent=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
}
if(!window._schClk) window._schClk=setInterval(schClock, 20000);

/* ---------- MAIN VIEW ---------- */
function vScheduler(){
if(!isAdmin()) return `<div class="card empty">🔒 My Scheduler is for the Owner only.</div>`;
if(!window._SCH){
loadSched().then(()=>{ if(ROUTE==="myscheduler") render(); }).catch(e=>toast("Scheduler load failed: "+e.message));
return `<div class="card empty">Loading your command center…</div>`;
}
const view=window._schView||"today";
const rows=schObjs();
const t=todayStr();
const todayList=rows.filter(schToday_);
const overdue=rows.filter(schOverdue);
const waiting=rows.filter(x=>x.Status==="Waiting");
const pdToday=rows.filter(x=>schIsPD(x)&&schOpen(x)&&x.Status!=="Waiting"&&x.Status!=="Someday"&&schDue(x)<=t);
const score=schTodayScore(), streak=schPDStreak();
const h=new Date().getHours();
const greet=h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening";
const fname=String(USER.Name||"").split(" ")[0];
const doneToday=rows.filter(x=>String(x.CompletedAt||"").slice(0,10)===t).length;
const ring = score===null? "—" : score+"%";
const circ=2*Math.PI*30, dash=score===null?0:circ*score/100;
const someday=rows.filter(x=>x.Status==="Someday");
const TABS3=[["today","⚡ Today"],["day","Day"],["week","Week"],["month","Month"],["agenda","Agenda"],["someday","💭 Someday"+(someday.length?` (${someday.length})`:"")],["waiting","⏳ Waiting"+(waiting.length?` (${waiting.length})`:"")],["stats","📊 Analytics"]];
let body="";
if(view==="today") body=schVToday(rows,todayList,overdue,waiting,pdToday);
else if(view==="day") body=schVDay(rows);
else if(view==="week") body=schVWeek(rows);
else if(view==="month") body=schVMonth(rows);
else if(view==="agenda") body=schVAgenda(rows);
else if(view==="someday") body=schVSomeday(rows);
else if(view==="waiting") body=schVWaiting(waiting);
else body=schVStats(rows);
setTimeout(schClock,30);
return `
<div class="sch-hero">
<h2>${greet}, ${esc(fname)} 👋</h2>
<div class="sub">${SCH_WD_FULL[schDow(t)]}, ${fmtDate(t)} · <span id="sch-clock"></span>${h<12?` · Today's focus: ${todayList.length} task${todayList.length!==1?"s":""}${pdToday.length?` · ${pdToday.length} ⭐ Power Dose`:""}`:""}</div>
<div class="sch-ring-wrap">
<svg width="76" height="76"><circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7"/>
<circle cx="38" cy="38" r="30" fill="none" stroke="${score!==null&&score>=70?"#7BE3A7":score!==null&&score>=40?"#F1D27A":"#F5A3A3"}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 38 38)"/></svg>
<div class="pct">${ring}</div>
<div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;opacity:.75;margin-top:.1rem">Today's Score</div>
</div>
<div class="sch-chips">
<div class="sch-chip"><div class="v">${todayList.length}</div><div class="l">Today</div></div>
<div class="sch-chip"><div class="v" style="color:${overdue.length?'#F5A3A3':'#7BE3A7'}">${overdue.length}</div><div class="l">Overdue</div></div>
<div class="sch-chip gold"><div class="v">⭐ ${pdToday.length}</div><div class="l">Power Dose due</div></div>
<div class="sch-chip gold"><div class="v">🔥 ${streak}</div><div class="l">PD Streak</div></div>
<div class="sch-chip"><div class="v">${doneToday}</div><div class="l">Done today</div></div>
<div class="sch-chip"><div class="v">${waiting.length}</div><div class="l">Waiting</div></div>
</div>
</div>
<div class="sch-tabs">${TABS3.map(x=>`<button class="sch-tab ${view===x[0]?'on':''} ${x[0]==='today'?'gold':''}" onclick="window._schView='${x[0]}';render()">${x[1]}</button>`).join("")}</div>
${body}
<button class="sch-fab" onclick="schOpenForm()">＋ Add Work</button>`;
}

/* ---------- task card ---------- */
function schCard(t, opts){
opts=opts||{};
const pd=schIsPD(t);
const acc=schAccent(t);
const est=num(t.EstMin)? (num(t.EstMin)>=60? (Math.round(num(t.EstMin)/6)/10)+"h" : num(t.EstMin)+"m") : "";
const time=(t.StartTime? String(t.StartTime).slice(0,5) : "")+(t.EndTime? "–"+String(t.EndTime).slice(0,5):"");
const done=t.Status==="Completed";
return `<div class="sch-card ${pd?'pd-card':''} ${done?'done':''}" style="border-left-color:${acc}">
<div style="display:flex;gap:.5rem;align-items:flex-start">
<div style="flex:1;min-width:0">
<div class="t">${pd?'<span class="pd-tag">⭐ POWER DOSE</span> ':''}${esc(t.Title)}</div>
<div class="meta">
${schStatusPill(t)}
<span class="pill p-gray">${esc(t.Category||"Others")}</span>
<span style="color:${SCHED_PRI[t.Priority]||'var(--mut)'};font-weight:800">${esc(t.Priority||"Medium")}</span>
${time?`<span>🕐 ${time}</span>`:""}${est?`<span>⏱ ${est}</span>`:""}
${schFreqLabel(t)?`<span>${schFreqLabel(t)}</span>`:""}
${num(t.Moves)>1?`<span title="postponed">↪ ${t.Moves}×</span>`:""}
</div>
${t.Desc&&!opts.compact?`<div class="muted" style="font-size:.8rem;margin-top:.25rem">${esc(String(t.Desc).slice(0,140))}</div>`:""}
${t.Status==="Waiting"?`<div class="muted" style="font-size:.78rem;margin-top:.25rem">⏳ Since ${fmtDate(t.WaitingSince)} · expected ${fmtDate(t.ExpectedDate)}${t.WaitingReason?` · ${esc(t.WaitingReason)}`:""}</div>`:""}
</div>
</div>
${!done && t.Status!=="Cancelled"? `<div class="acts">
<button class="sch-btn ok" onclick="schComplete('${t.TaskID}')">✓ Complete</button>
${t.Status!=="In Progress"&&t.Status!=="Waiting"?`<button class="sch-btn" onclick="schSetStatus('${t.TaskID}','In Progress')">▶ Start</button>`:""}
${t.Status==="Waiting"?`<button class="sch-btn" onclick="schFollowedUp('${t.TaskID}')">📞 Followed up</button><button class="sch-btn ok" onclick="schResume('${t.TaskID}')">✅ Response mila</button>`:`<button class="sch-btn" style="background:#F3E8FF;color:#7C3AED" onclick="schOpenWaiting('${t.TaskID}')">⏳ Waiting</button>`}
<button class="sch-btn" onclick="schMove('${t.TaskID}',1)">→ Tomorrow</button>
<button class="sch-btn dark" onclick="schOpenActions('${t.TaskID}')">⋯</button>
</div>`:""}
</div>`;
}

/* ---------- TODAY view ---------- */
function schVToday(rows,todayList,overdue,waiting,pdToday){
const t=todayStr();
const h=new Date().getHours();
const pdOpen=pdToday;
const pdMissed=pdOpen.filter(x=>schDue(x)<t);
const timed=todayList.filter(x=>x.StartTime).sort((a,b)=>String(a.StartTime)<String(b.StartTime)?-1:1);
const untimed=todayList.filter(x=>!x.StartTime && !schIsPD(x));
const doneToday=rows.filter(x=>x.Status==="Completed"&&String(x.CompletedAt||"").slice(0,10)===t);
const waitDueFollow=waiting.filter(x=>{
const last=String(x.LastRemind||x.WaitingSince||"").slice(0,10);
return last && daysSince(last)>=Math.max(1,num(x.RemindDays)||3);
});
let out="";
if(pdMissed.length) out+=`<div class="card" style="border-left:5px solid ${SCH_GOLD};background:linear-gradient(135deg,#FFF9E8,#FDEFC8);margin-bottom:.8rem">
<b style="color:#8A6D1A">⭐ Your company's growth work is waiting.</b>
<div class="muted" style="margin-top:.2rem;font-size:.84rem">${pdMissed.length} Power Dose task${pdMissed.length>1?"s":""} from earlier days ${pdMissed.length>1?"are":"is"} still open — these grow the business. Do them first.</div></div>`;
if(pdOpen.length){
out+=`<div class="sch-sec"><h3 style="color:#8A6D1A">⭐ Power Dose — highest impact first</h3><div class="ln"></div></div>`;
out+=pdOpen.sort((a,b)=>schDue(a)<schDue(b)?-1:1).map(x=>schCard(x)).join("");
}
if(overdue.filter(x=>!schIsPD(x)).length){
out+=`<div class="sch-sec"><h3 style="color:var(--bad)">🔴 Overdue</h3><div class="ln"></div><button class="sch-btn" onclick="window._schView='agenda';window._schSt='Overdue';render()">View all</button></div>`;
out+=overdue.filter(x=>!schIsPD(x)).sort((a,b)=>schDue(a)<schDue(b)?-1:1).slice(0,5).map(x=>schCard(x,{compact:1})).join("");
}
if(waitDueFollow.length){
out+=`<div class="sch-sec"><h3 style="color:#7C3AED">⏳ Follow-ups due</h3><div class="ln"></div></div>`;
out+=waitDueFollow.map(x=>schCard(x,{compact:1})).join("");
}
out+=`<div class="sch-sec"><h3>📋 Today's plan</h3><div class="ln"></div></div>`;
const plan=[...timed,...untimed].filter(x=>!schIsPD(x));
out+= plan.length? plan.map(x=>schCard(x)).join("") : (todayList.length? "" : `<div class="card empty">Nothing scheduled today. Tap <b>＋ Add Work</b> — or enjoy the calm. ☕</div>`);
if(doneToday.length){
out+=`<div class="sch-sec"><h3 style="color:var(--ok)">✅ Completed today (${doneToday.length})</h3><div class="ln"></div></div>`;
out+=doneToday.map(x=>schCard(x,{compact:1})).join("");
}
if(h>=18 && todayList.filter(x=>x.Status!=="Waiting").length){
out+=`<div class="card" style="margin-top:1rem;border-left:4px solid var(--navy)">
<b>🌆 End of Day Review</b>
<div class="muted" style="font-size:.84rem;margin:.2rem 0 .5rem">${todayList.length} task${todayList.length>1?"s":""} still open. Close the day consciously — complete, move or let it show as overdue tomorrow.</div>
<button class="btn small" onclick="schEOD()">Review & plan tomorrow</button></div>`;
}
return out;
}

/* ---------- DAY view ---------- */
function schVDay(rows){
const d=window._schD||todayStr();
const list=rows.filter(x=>x.Status!=="Cancelled" && schDue(x)===d).sort((a,b)=>{
if(schIsPD(a)!==schIsPD(b)) return schIsPD(a)?-1:1;
return String(a.StartTime||"99")<String(b.StartTime||"99")?-1:1;
});
return `<div class="toolbar">
<button class="sch-btn" onclick="window._schD='${schAddD(d,-1)}';render()">←</button>
<input type="date" value="${d}" onchange="window._schD=this.value;render()" style="max-width:170px;flex:0 1 auto">
<button class="sch-btn" onclick="window._schD='${schAddD(d,1)}';render()">→</button>
<span class="pill p-blue">${SCH_WD_FULL[schDow(d)]}</span>
${d!==todayStr()?`<button class="sch-btn dark" onclick="window._schD='${todayStr()}';render()">Today</button>`:""}
</div>
${list.length? list.map(x=>schCard(x)).join("") : ""}
${schVirtual(d,d).map(v=>schGhostCard(v)).join("")}
${!list.length && !schVirtual(d,d).length? `<div class="card empty">${fmtDate(d)} — nothing scheduled.</div>`:""}`;
}

/* ---------- WEEK view ---------- */
function schVWeek(rows){
const off=num(window._schWk||0);
const t=todayStr();
const mon=schAddD(t, -( (schDow(t)+6)%7 ) + off*7);
let out=`<div class="toolbar">
<button class="sch-btn" onclick="window._schWk=${off-1};render()">← Prev</button>
<span class="pill p-blue">Week: ${fmtDate(mon)} → ${fmtDate(schAddD(mon,6))}</span>
<button class="sch-btn" onclick="window._schWk=${off+1};render()">Next →</button>
${off?`<button class="sch-btn dark" onclick="window._schWk=0;render()">This week</button>`:""}
</div>`;
const ghosts=schVirtual(mon, schAddD(mon,6));
for(let i=0;i<7;i++){
const d=schAddD(mon,i);
const list=rows.filter(x=>x.Status!=="Cancelled"&&schDue(x)===d).sort((a,b)=>schIsPD(b)-schIsPD(a));
const gh=ghosts.filter(v=>v.date===d);
out+=`<div class="sch-sec"><h3 style="${d===t?'color:var(--blue)':''}">${SCH_WD_FULL[schDow(d)]} · ${fmtDate(d)} ${d===t?"· TODAY":""}</h3><div class="ln"></div><span class="muted" style="font-size:.75rem">${(list.length+gh.length)||"—"}</span></div>`;
out+= list.map(x=>schCard(x,{compact:1})).join("") + gh.map(v=>schGhostCard(v)).join("");
}
return out;
}

/* ---------- MONTH view ---------- */
function schVMonth(rows){
const ym=window._schMo||todayStr().slice(0,7);
const y=+ym.slice(0,4), m=+ym.slice(5,7)-1;
const first=new Date(y,m,1), dim=new Date(y,m+1,0).getDate();
const startPad=(first.getDay()+6)%7; // Monday start
const prevYm=schFmt(new Date(y,m-1,1)).slice(0,7), nextYm=schFmt(new Date(y,m+1,1)).slice(0,7);
const monthGhosts=schVirtual(ym+"-01", ym+"-"+String(dim).padStart(2,"0"));
let cells="";
for(let i=0;i<startPad;i++) cells+=`<div class="sch-mcell dim"></div>`;
for(let d=1;d<=dim;d++){
const ds=ym+"-"+String(d).padStart(2,"0");
const list=rows.filter(x=>x.Status!=="Cancelled"&&schDue(x)===ds);
const gh=monthGhosts.filter(v=>v.date===ds);
const dots=list.slice(0,4).map(x=>`<span class="sch-dot" style="background:${schAccent(x)}"></span>`).join("")
+ gh.slice(0,Math.max(0,4-list.length)).map(v=>`<span class="sch-dot" style="background:#fff;border:1.5px solid ${schIsPD(v.t)?SCH_GOLD:'var(--blue)'}"></span>`).join("");
cells+=`<div class="sch-mcell ${ds===todayStr()?'today':''}" onclick="window._schD='${ds}';window._schView='day';render()">
<b>${d}</b>${(list.length+gh.length)?`<span class="muted" style="float:right;font-size:.62rem">${list.length+gh.length}</span>`:""}<div>${dots}</div></div>`;
}
return `<div class="toolbar">
<button class="sch-btn" onclick="window._schMo='${prevYm}';render()">←</button>
<input type="month" value="${ym}" onchange="window._schMo=this.value;render()" style="max-width:180px;flex:0 1 auto">
<button class="sch-btn" onclick="window._schMo='${nextYm}';render()">→</button>
</div>
<div class="sch-mgrid">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div class="sch-mhead">${x}</div>`).join("")}${cells}</div>
<div class="muted" style="margin-top:.5rem;font-size:.75rem">● gold = Power Dose · red = overdue · purple = waiting · green = done · ○ hollow = upcoming recurring (auto) · tap a day to open it</div>`;
}

/* ---------- AGENDA view (list + search/filters) ---------- */
function schVAgenda(rows){
const q=(window._schQ||"").toLowerCase(), cat=window._schCat||"all", pri=window._schPri||"all", st=window._schSt||"Open", pd=window._schPD||"all";
let list=rows.filter(x=>x.Status!=="Cancelled");
if(st==="Open") list=list.filter(schOpen);
else if(st==="Overdue") list=list.filter(schOverdue);
else if(st!=="all") list=list.filter(x=>x.Status===st);
if(cat!=="all") list=list.filter(x=>(x.Category||"Others")===cat);
if(pri!=="all") list=list.filter(x=>x.Priority===pri);
if(pd==="yes") list=list.filter(schIsPD);
if(q) list=list.filter(x=>(x.Title+" "+x.Desc+" "+x.Notes+" "+x.WaitingOn).toLowerCase().indexOf(q)>-1);
list.sort((a,b)=> (schDue(a)||"9999")<(schDue(b)||"9999")?-1:1);
const cats=[...new Set([...SCHED_CATS, ...rows.map(x=>x.Category).filter(Boolean)])];
let out=`<div class="toolbar">
<input placeholder="🔍 Search tasks…" value="${esc(window._schQ||"")}" oninput="window._schQ=this.value;window._refocusId=this.id;render()" id="sch-q">
<select onchange="window._schSt=this.value;render()" style="max-width:150px">
${["Open","Overdue","Completed","Waiting","In Progress","Someday","all"].map(s=>`<option value="${s}" ${st===s?'selected':''}>${s==="all"?"All statuses":s}</option>`).join("")}</select>
<select onchange="window._schCat=this.value;render()" style="max-width:160px"><option value="all">All categories</option>${cats.map(c=>`<option ${cat===c?'selected':''}>${esc(c)}</option>`).join("")}</select>
<select onchange="window._schPri=this.value;render()" style="max-width:130px"><option value="all">All priority</option>${Object.keys(SCHED_PRI).map(p=>`<option ${pri===p?'selected':''}>${p}</option>`).join("")}</select>
<button class="sch-btn ${pd==='yes'?'gold':''}" onclick="window._schPD=window._schPD==='yes'?'all':'yes';render()">⭐ Power Dose</button>
</div>`;
if(st==="Overdue"){
const b={t:[],d1:[],d3:[],d7:[],d30:[]};
list.forEach(x=>{ const n=daysSince(schDue(x)); if(n>=30)b.d30.push(x); else if(n>=7)b.d7.push(x); else if(n>=3)b.d3.push(x); else if(n>=1)b.d1.push(x); else b.t.push(x); });
[["d30","🚨 30+ days overdue"],["d7","7+ days overdue"],["d3","3+ days overdue"],["d1","1+ day overdue"],["t","Due today"]].forEach(g=>{
if(b[g[0]].length){ out+=`<div class="sch-sec"><h3 style="color:var(--bad)">${g[1]} (${b[g[0]].length})</h3><div class="ln"></div></div>`+b[g[0]].map(x=>schCard(x,{compact:1})).join(""); }
});
return out + (list.length? "" : `<div class="card empty">Nothing overdue. Clean slate. 🌿</div>`);
}
let lastD="";
list.slice(0,120).forEach(x=>{
const d=schDue(x)||"No date";
if(d!==lastD){ lastD=d; out+=`<div class="sch-sec"><h3>${d==="No date"?d:(SCH_WD_FULL[schDow(d)]||"")+" · "+fmtDate(d)+(d===todayStr()?" · TODAY":"")}</h3><div class="ln"></div></div>`; }
out+=schCard(x,{compact:1});
});
return out + (list.length? "" : `<div class="card empty">No tasks match. Change filters or add work.</div>`);
}

/* ---------- WAITING dashboard ---------- */
function schVWaiting(waiting){
if(!waiting.length) return `<div class="card empty">⏳ Nothing is waiting on others right now.<br><span class="muted" style="font-size:.8rem">When a vendor / bank / architect owes you a response, set the task to Waiting — it stops counting as YOUR pending work.</span></div>`;
const rows=[...waiting].sort((a,b)=>String(a.ExpectedDate||"9999")<String(b.ExpectedDate||"9999")?-1:1);
return `<div class="card" style="border-left:4px solid #7C3AED;margin-bottom:.8rem">
<b>Your work is not pending — someone else's action is pending.</b>
<div class="muted" style="font-size:.8rem">Follow up on time and these unblock themselves.</div></div>
<div class="tbl-wrap"><table><tr><th>Task</th><th>Waiting for</th><th>Pending since</th><th>Expected</th><th>Follow-up</th><th></th></tr>
${rows.map(x=>{
const since=daysSince(String(x.WaitingSince||"").slice(0,10));
const last=String(x.LastRemind||x.WaitingSince||"").slice(0,10);
const gap=Math.max(1,num(x.RemindDays)||3);
const dueIn=gap - daysSince(last);
return `<tr>
<td><b>${esc(x.Title)}</b>${schIsPD(x)?' <span class="pd-tag">⭐</span>':''}${x.WaitingReason?`<div class="muted" style="font-size:.75rem">${esc(x.WaitingReason)}</div>`:""}</td>
<td><span class="sch-wait-badge">${esc(x.WaitingOn||"—")}</span></td>
<td>${since} day${since!==1?"s":""}</td>
<td>${fmtDate(x.ExpectedDate)||"—"}</td>
<td>${dueIn<=0?`<span class="pill p-bad">Due now</span>`:`<span class="pill p-warn">in ${dueIn}d</span>`}</td>
<td style="white-space:nowrap">
<button class="sch-btn" onclick="schFollowedUp('${x.TaskID}')">📞 Followed up</button>
<button class="sch-btn ok" onclick="schResume('${x.TaskID}')">✅ Response mila</button>
</td></tr>`;
}).join("")}
</table></div>`;
}

/* ---------- ANALYTICS view ---------- */
function schVStats(rows){
const t=todayStr();
const wk=schCompletionPct(schAddD(t,-6),t);
const mo=schCompletionPct(schAddD(t,-29),t);
const pdWk=rows.filter(x=>schIsPD(x)&&x.Status!=="Cancelled"&&schDue(x)>=schAddD(t,-6)&&schDue(x)<=t);
const pdPct=pdWk.length? Math.round(pdWk.filter(x=>x.Status==="Completed").length/pdWk.length*100) : null;
const doneT=rows.filter(x=>String(x.CompletedAt||"").slice(0,10)===t).length;
const missedT=rows.filter(x=>schOverdue(x)&&schDue(x)===schAddD(t,-1)).length;
const catAgg={};
rows.filter(x=>x.Status!=="Cancelled"&&schDue(x)>=schAddD(t,-29)).forEach(x=>{
const c=x.Category||"Others"; catAgg[c]=catAgg[c]||{d:0,o:0};
if(x.Status==="Completed") catAgg[c].d++; else catAgg[c].o++;
});
const cats=Object.entries(catAgg).sort((a,b)=>(b[1].d+b[1].o)-(a[1].d+a[1].o)).slice(0,8);
const days=[];
for(let i=6;i>=0;i--){ const d=schAddD(t,-i); days.push({d, n:rows.filter(x=>String(x.CompletedAt||"").slice(0,10)===d).length}); }
const mx=Math.max(1,...days.map(x=>x.n));
return `
<div class="grid g4" style="margin-bottom:1rem">
<div class="card stat ok"><div class="v">${doneT}</div><div class="l">Completed today</div></div>
<div class="card stat ${wk!==null&&wk>=70?'ok':'warn'}"><div class="v">${wk===null?"—":wk+"%"}</div><div class="l">Weekly completion</div></div>
<div class="card stat" style="border-color:${SCH_GOLD}"><div class="v" style="color:#8A6D1A">${pdPct===null?"—":pdPct+"%"}</div><div class="l">Power Dose (week)</div></div>
<div class="card stat ${mo!==null&&mo>=70?'ok':'warn'}"><div class="v">${mo===null?"—":mo+"%"}</div><div class="l">Monthly growth score</div></div>
</div>
<div class="grid g2">
<div class="card">
<b>📊 Last 7 days — completions</b>
<div style="display:flex;align-items:flex-end;gap:6px;height:90px;margin-top:.8rem">
${days.map(x=>`<div style="flex:1;text-align:center">
<div style="background:${x.d===t?'linear-gradient(180deg,#D9B54A,#B08D1E)':'var(--blue)'};border-radius:6px 6px 0 0;height:${Math.round(x.n/mx*70)+4}px" title="${x.n}"></div>
<div class="muted" style="font-size:.6rem;margin-top:.2rem">${SCH_WD[schDow(x.d)].slice(0,2)}</div></div>`).join("")}
</div>
<div class="muted" style="font-size:.72rem;margin-top:.3rem">🔥 Power Dose streak: <b>${schPDStreak()} days</b> · Missed yesterday: ${missedT}</div>
</div>
<div class="card">
<b>🗂 Category-wise (30 days)</b>
<div style="margin-top:.7rem">
${cats.length? cats.map(c=>{
const tot=c[1].d+c[1].o, pct=Math.round(c[1].d/tot*100);
return `<div style="margin-bottom:.55rem">
<div style="display:flex;justify-content:space-between;font-size:.78rem"><span>${esc(c[0])}</span><b>${c[1].d}/${tot}</b></div>
<div class="sch-bar"><i style="width:${pct}%;background:${pct>=70?'var(--ok)':pct>=40?'var(--blue)':'var(--bad)'}"></i></div></div>`;
}).join("") : `<div class="muted">No data yet.</div>`}
</div>
</div>
</div>
<div class="card" style="margin-top:1rem">
<b>🧠 CEO Insights</b>
<div style="margin-top:.4rem">${schInsights().map(x=>`<div class="sch-insight"><span>${x[0]}</span><span>${x[1]}</span></div>`).join("")}</div>
</div>`;
}

/* ---------- ADD / EDIT form ---------- */
function schOpenForm(id){
const t=id? schById(id) : null;
const cats=[...new Set([...SCHED_CATS, ...schObjs().map(x=>x.Category).filter(Boolean)])];
openModal(t? "✏️ Edit Work" : "＋ Add Work", `
<label>Task name <span class="req">*</span></label><input id="sc-title" value="${esc(t?t.Title:"")}" placeholder="e.g. Meet Architect Sharma — new project">
<label>Description</label><textarea id="sc-desc" rows="2">${esc(t?t.Desc:"")}</textarea>
<div class="form-grid">
<div><label>Category</label><input id="sc-cat" list="sc-cats" value="${esc(t?t.Category:"Business Growth")}"><datalist id="sc-cats">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
<div><label>Priority</label><select id="sc-pri">${Object.keys(SCHED_PRI).map(p=>`<option ${t&&t.Priority===p?'selected':(!t&&p==="Medium"?'selected':'')}>${p}</option>`).join("")}</select></div>
<div><label>Start date</label><input type="date" id="sc-sd" value="${esc(t?String(t.StartDate).slice(0,10):(window._schD||todayStr()))}"></div>
<div><label>Due date <span class="req">*</span></label><input type="date" id="sc-dd" value="${esc(t?String(t.DueDate).slice(0,10):(window._schD||todayStr()))}"></div>
<div><label>Start time</label><input type="time" id="sc-st" value="${esc(t?String(t.StartTime).slice(0,5):"")}"></div>
<div><label>End time</label><input type="time" id="sc-et" value="${esc(t?String(t.EndTime).slice(0,5):"")}"></div>
<div><label>Estimated time (minutes)</label><input type="number" id="sc-est" min="5" step="5" value="${esc(t?t.EstMin:"")}" placeholder="30"></div>
<div><label>Frequency</label><select id="sc-freq" onchange="schFreqZone()">
${["Once","Daily","Weekdays","Weekly","Monthly","Quarterly","HalfYearly","Yearly","Custom"].map(f=>`<option value="${f}" ${t&&t.Freq===f?'selected':''}>${f==="Weekdays"?"Daily (Mon–Sat)":f==="HalfYearly"?"Half Yearly":f}</option>`).join("")}</select></div>
</div>
<div id="sc-freq-zone"></div>
<label style="display:flex;align-items:center;gap:.6rem;margin-top:.9rem;background:linear-gradient(135deg,#FFFBEB,#FBF2D5);border:1.5px solid #E5C963;border-radius:12px;padding:.7rem .8rem;cursor:pointer;text-transform:none">
<input type="checkbox" id="sc-pd" style="width:auto;transform:scale(1.3)" ${t&&schIsPD(t)?"checked":""}>
<span><b style="color:#8A6D1A">⭐ Mark as Power Dose</b><br><span class="muted" style="font-size:.74rem;font-weight:500">This work directly grows the company — it stays on top, tracks your streak, and never disappears until done.</span></span></label>
<label>Owner notes</label><textarea id="sc-notes" rows="2" placeholder="context, phone number, link…">${esc(t?t.Notes:"")}</textarea>
<div style="margin-top:1rem;display:flex;gap:.5rem">
<button class="btn" onclick="schSave('${id||""}')">${t?"Save changes":"Add to my plan"}</button>
${t&&t.Status!=="Cancelled"?`<button class="btn danger" onclick="schCancel('${id}')">🗑 Cancel task</button>`:""}
</div>`);
window._schEditRule = t? String(t.FreqRule||"") : "";
schFreqZone();
}
function schFreqZone(){
const f=$("sc-freq").value, z=$("sc-freq-zone");
const rule=window._schEditRule||"";
if(f==="Weekly"){
const sel=rule? rule.split(",") : [SCH_WD[schDow($("sc-dd").value||todayStr())]];
z.innerHTML=`<label>Which days?</label><div style="display:flex;gap:.3rem;flex-wrap:wrap">${SCH_WD.slice(1).concat(["SUN"]).map(w=>`<button type="button" class="sch-wkday ${sel.includes(w)?'on':''}" data-wd="${w}" onclick="this.classList.toggle('on')">${w.slice(0,1)+w.slice(1).toLowerCase()}</button>`).join("")}</div>`;
} else if(["Monthly","Quarterly","HalfYearly","Yearly"].includes(f)){
let mode="same", dnum="15", nth="1", wd="MON";
let m=rule.match(/^D(\d+)$/); if(m){ mode="date"; dnum=m[1]; }
m=rule.match(/^([1-4])([A-Z]{3})$/); if(m){ mode="nth"; nth=m[1]; wd=m[2]; }
m=rule.match(/^L([A-Z]{3})$/); if(m){ mode="last"; wd=m[1]; }
z.innerHTML=`<label>Repeat on</label>
<select id="sc-mmode" onchange="$('sc-mm-date').style.display=this.value==='date'?'block':'none';$('sc-mm-nth').style.display=this.value==='nth'?'flex':'none';$('sc-mm-last').style.display=this.value==='last'?'block':'none'">
<option value="same" ${mode==='same'?'selected':''}>Same date as due date</option>
<option value="date" ${mode==='date'?'selected':''}>Fixed date (e.g. every 15th)</option>
<option value="nth" ${mode==='nth'?'selected':''}>Nth weekday (e.g. 2nd Saturday)</option>
<option value="last" ${mode==='last'?'selected':''}>Last weekday (e.g. Last Friday)</option></select>
<div id="sc-mm-date" style="display:${mode==='date'?'block':'none'};margin-top:.4rem"><input type="number" id="sc-mm-d" min="1" max="31" value="${dnum}" placeholder="Date 1-31"><span class="muted" style="font-size:.72rem">31 choose karo to chhote month mein last date lagegi (quarter-end ke liye best)</span></div>
<div id="sc-mm-nth" style="display:${mode==='nth'?'flex':'none'};gap:.4rem;margin-top:.4rem">
<select id="sc-mm-n" style="max-width:100px">${["1","2","3","4"].map(n=>`<option value="${n}" ${nth===n?'selected':''}>${["1st","2nd","3rd","4th"][+n-1]}</option>`).join("")}</select>
<select id="sc-mm-w1" style="max-width:140px">${SCH_WD.map(w=>`<option value="${w}" ${wd===w?'selected':''}>${w.slice(0,1)+w.slice(1).toLowerCase()}</option>`).join("")}</select></div>
<div id="sc-mm-last" style="display:${mode==='last'?'block':'none'};margin-top:.4rem"><select id="sc-mm-w2" style="max-width:140px">${SCH_WD.map(w=>`<option value="${w}" ${wd===w?'selected':''}>${w.slice(0,1)+w.slice(1).toLowerCase()}</option>`).join("")}</select></div>`;
} else if(f==="Custom"){
const m=rule.match(/^E(\d+)D$/);
z.innerHTML=`<label>Repeat every</label><div style="display:flex;gap:.4rem;align-items:center"><input type="number" id="sc-ndays" min="1" value="${m?m[1]:"3"}" style="max-width:90px"> <span class="muted">days</span></div>`;
} else z.innerHTML="";
}
function schBuildRule(){
const f=$("sc-freq").value;
if(f==="Weekly"){ const sel=[...document.querySelectorAll(".sch-wkday.on")].map(b=>b.dataset.wd); return sel.join(","); }
if(["Monthly","Quarterly","HalfYearly","Yearly"].includes(f)){
const mode=$("sc-mmode")?$("sc-mmode").value:"same";
if(mode==="date") return "D"+Math.min(31,Math.max(1,num($("sc-mm-d").value)||15));
if(mode==="nth") return $("sc-mm-n").value+$("sc-mm-w1").value;
if(mode==="last") return "L"+$("sc-mm-w2").value;
return "";
}
if(f==="Custom") return "E"+Math.max(1,num($("sc-ndays").value)||3)+"D";
return "";
}
async function schSave(id){
const title=$("sc-title").value.trim(); if(!title) return toast("Task name is required.");
const dd=$("sc-dd").value; if(!dd) return toast("Due date is required.");
const obj={Title:title,Desc:$("sc-desc").value.trim(),Category:$("sc-cat").value.trim()||"Others",Priority:$("sc-pri").value,
EstMin:num($("sc-est").value)||"",Notes:$("sc-notes").value.trim(),StartDate:$("sc-sd").value||dd,DueDate:dd,
StartTime:$("sc-st").value,EndTime:$("sc-et").value,Freq:$("sc-freq").value,FreqRule:schBuildRule(),
PowerDose:$("sc-pd").checked?"Yes":"No"};
busy(true, id?"Saving…":"Adding to your plan…");
try{
if(id){
const cur=schById(id);
if(cur && cur.Status==="Someday") obj.Status="Not Started"; // v22.1: someday task ko full form se date dei to schedule ho jaye
await schUpdate(cur, obj);
}
else{
obj.TaskID=schNextId(); obj.Status="Not Started"; obj.Moves=0; obj.ParentID=""; obj.CreatedBy=USER.Name; obj.CreatedAt=nowStr();
await schAppend(obj);
}
busy(false); closeModal();
toast(id? "Updated ✓" : (obj.PowerDose==="Yes"? "⭐ Power Dose added — this is how the company grows." : "Added to your plan ✓"));
render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}

/* ---------- SOMEDAY LIST (v22.1) ----------
 *  Bina date ke kaam yahan padte hain. "Add to Schedule" par date poochta hai
 *  aur kaam Someday se hatkar schedule (Not Started + due date) mein aa jaata hai. */
function schVSomeday(rows){
const list=rows.filter(x=>x.Status==="Someday").sort((a,b)=>String(a.CreatedAt)<String(b.CreatedAt)?1:-1);
let out=`<div class="card" style="margin-bottom:.8rem;border-left:4px solid #7A879B">
<b>💭 Someday List — bina date ke kaam</b>
<p class="muted" style="margin:.2rem 0 .55rem;font-size:.82rem">Jo kaam yaad aaye par abhi koi fix date nahi — bas yahan daal do. Jab karna ho, <b>📅 Add to Schedule</b> dabao — date poochega aur kaam schedule mein chala jayega.</p>
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
<input id="sd-title" placeholder="Kaam likho… (e.g. showroom ki lighting theek karwani hai)" style="flex:2;min-width:220px">
<select id="sd-cat" style="flex:0 1 180px">${SCHED_CATS.map(c=>`<option ${c==="Others"?'selected':''}>${c}</option>`).join("")}</select>
<button class="btn" onclick="sdAdd()">＋ Add</button>
</div></div>`;
out+= list.length? list.map(t=>`
<div class="sch-card" style="border-left-color:#7A879B">
<div class="t">💭 ${esc(t.Title)}</div>
<div class="meta"><span class="pill p-gray">${esc(t.Category||"Others")}</span><span class="muted">added ${fmtDate(String(t.CreatedAt).slice(0,10))}</span>${t.Notes?`<span class="muted">· ${esc(String(t.Notes).slice(0,60))}</span>`:""}</div>
<div class="acts">
<button class="sch-btn ok" onclick="sdSchedule('${t.TaskID}')">📅 Add to Schedule</button>
<button class="sch-btn" onclick="schOpenForm('${t.TaskID}')">✏️ Edit</button>
<button class="sch-btn bad" onclick="sdDrop('${t.TaskID}')">🗑 Remove</button>
</div></div>`).join("") : `<div class="card empty">Someday list khaali hai — jo bhi kaam dimaag mein aaye, bina date ke yahan daal do. 💭</div>`;
return out;
}
async function sdAdd(){
const ti=$("sd-title").value.trim(); if(!ti) return toast("Kaam ka naam likho.");
busy(true,"Someday list mein daal raha hoon…");
try{
await schAppend({TaskID:schNextId(),Title:ti,Desc:"",Category:$("sd-cat").value,Priority:"Medium",EstMin:"",Notes:"",StartDate:"",DueDate:"",StartTime:"",EndTime:"",Freq:"Once",FreqRule:"",PowerDose:"",Status:"Someday",WaitingOn:"",WaitingSince:"",ExpectedDate:"",WaitingReason:"",RemindDays:"",LastRemind:"",Moves:0,CompletedAt:"",CompletedBy:"",ParentID:"",CreatedBy:USER.Name,CreatedAt:nowStr()});
busy(false); toast("💭 Someday list mein add ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
function sdSchedule(id){
const t=schById(id); if(!t) return;
openModal("📅 Add to Schedule", `
<div class="rowline"><span>Kaam</span><b>${esc(t.Title)}</b></div>
<label>Kab karna hai? <span class="req">*</span></label><input type="date" id="sd-date" value="${tomorrowStr()}">
<label>Priority</label><select id="sd-pri">${Object.keys(SCHED_PRI).map(p=>`<option ${p===(t.Priority||"Medium")?'selected':''}>${p}</option>`).join("")}</select>
<label class="rad" style="margin-top:.7rem"><input type="checkbox" id="sd-pd" style="width:auto"> <span>⭐ Power Dose (company growth work)</span></label>
<div style="margin-top:1rem"><button class="btn" onclick="sdScheduleSave('${id}')">📅 Schedule karo</button></div>`);
}
async function sdScheduleSave(id){
const t=schById(id); if(!t) return;
const d=$("sd-date").value; if(!d) return toast("Date choose karo.");
busy(true,"Scheduling…");
try{
await schUpdate(t,{StartDate:d,DueDate:d,Status:"Not Started",Priority:$("sd-pri").value,PowerDose:$("sd-pd").checked?"Yes":"No"});
busy(false); closeModal(); toast("✓ Scheduled — "+fmtDate(d)+" ko plan mein dikhega"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function sdDrop(id){
const t=schById(id); if(!t) return;
if(!confirm('"'+t.Title+'" ko someday list se hatana hai?')) return;
busy(true,"Removing…");
try{ await schUpdate(t,{Status:"Cancelled"}); busy(false); toast("Removed"); render(); }
catch(e){ busy(false); toast("Failed: "+e.message); }
}

/* ---------- actions ---------- */
async function schComplete(id){
const t=schById(id); if(!t) return;
busy(true,"Completing…");
try{
await schUpdate(t,{Status:"Completed",CompletedAt:nowStr(),CompletedBy:USER.Name});
let nextMsg="";
if(t.Freq && t.Freq!=="Once"){
const nd=schNextDate(t, schDue(t)||todayStr());
const root=t.ParentID||t.TaskID;
if(nd && !schObjs().some(x=>String(x.ParentID)===String(root)&&schOpen(x)&&schDue(x)===nd)){
const c={}; SCHED_COLS.forEach(k=>c[k]=t[k]);
c.TaskID=schNextId(); c.StartDate=nd; c.DueDate=nd; c.Status="Not Started";
c.WaitingOn="";c.WaitingSince="";c.ExpectedDate="";c.WaitingReason="";c.RemindDays="";c.LastRemind="";
c.Moves=0; c.CompletedAt=""; c.CompletedBy=""; c.ParentID=root; c.CreatedBy=USER.Name; c.CreatedAt=nowStr();
await schAppend(c);
nextMsg=" · next on "+fmtDate(nd);
}
}
busy(false);
schConfetti();
toast(schIsPD(t)? "⭐ POWER DOSE DONE! Growth work completed — streak "+schPDStreak()+" 🔥"+nextMsg : "Completed ✓"+nextMsg);
render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function schSetStatus(id, st){
const t=schById(id); if(!t) return;
try{ await schUpdate(t,{Status:st}); render(); }catch(e){ toast("Failed: "+e.message); }
}
async function schMove(id, days, silent){
const t=schById(id); if(!t) return;
const base=schDue(t)&&schDue(t)>todayStr()? schDue(t) : todayStr();
const nd=schAddD(base, days);
if(schIsPD(t) && !silent){
if(!confirm("⭐ This is POWER DOSE work — your company's growth depends on it.\n\nStill move it to "+fmtDate(nd)+"?")) return;
}
try{
await schUpdate(t,{DueDate:nd,StartDate:nd,Moves:num(t.Moves)+1,Status:t.Status==="In Progress"?"In Progress":"Not Started"});
toast("Moved → "+fmtDate(nd)); render();
}catch(e){ toast("Failed: "+e.message); }
}
function schOpenActions(id){
const t=schById(id); if(!t) return;
openModal("⚡ "+t.Title, `
<div style="display:grid;gap:.45rem">
<button class="btn" style="background:var(--ok)" onclick="closeModal();schComplete('${id}')">✓ Complete</button>
<button class="btn ghost" onclick="closeModal();schOpenForm('${id}')">✏️ Edit / Convert to recurring</button>
<button class="btn ghost" onclick="closeModal();schMove('${id}',1)">📅 Move to tomorrow</button>
<button class="btn ghost" onclick="closeModal();schMove('${id}',7)">📅 Move to next week</button>
<button class="btn ghost" onclick="schPickDate('${id}')">🗓 Pick a date…</button>
<button class="btn ghost" onclick="closeModal();schDuplicate('${id}')">⧉ Duplicate</button>
<button class="btn ghost" style="color:#7C3AED;border-color:#7C3AED" onclick="closeModal();schOpenWaiting('${id}')">⏳ Waiting for someone</button>
<button class="btn danger" onclick="closeModal();schCancel('${id}')">🗑 Cancel task</button>
</div>`);
}
function schPickDate(id){
openModal("🗓 Reschedule", `<label>New date</label><input type="date" id="sc-nd" value="${todayStr()}">
<div style="margin-top:1rem"><button class="btn" onclick="schPickDate2('${id}')">Move</button></div>`);
}
async function schPickDate2(id){
const t=schById(id), nd=$("sc-nd").value; if(!t||!nd) return;
try{ await schUpdate(t,{DueDate:nd,StartDate:nd,Moves:num(t.Moves)+1}); closeModal(); toast("Moved → "+fmtDate(nd)); render(); }catch(e){ toast("Failed: "+e.message); }
}
async function schDuplicate(id){
const t=schById(id); if(!t) return;
busy(true,"Duplicating…");
try{
const c={}; SCHED_COLS.forEach(k=>c[k]=t[k]);
c.TaskID=schNextId(); c.Title=t.Title+" (copy)"; c.Status="Not Started"; c.Moves=0;
c.CompletedAt="";c.CompletedBy="";c.ParentID="";c.CreatedBy=USER.Name;c.CreatedAt=nowStr();
c.WaitingOn="";c.WaitingSince="";c.ExpectedDate="";c.WaitingReason="";c.RemindDays="";c.LastRemind="";
await schAppend(c);
busy(false); toast("Duplicated ✓"); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function schCancel(id){
const t=schById(id); if(!t) return;
if(schIsPD(t)){
if(!confirm("⭐ Your company's growth work is waiting.\n\nCancelling a Power Dose task should be rare. Really cancel \""+t.Title+"\"?")) return;
} else if(!confirm("Cancel \""+t.Title+"\"?")) return;
try{ await schUpdate(t,{Status:"Cancelled"}); closeModal(); toast("Cancelled"); render(); }catch(e){ toast("Failed: "+e.message); }
}
/* waiting flow */
function schOpenWaiting(id){
const t=schById(id); if(!t) return;
openModal("⏳ Waiting for external dependency", `
<div class="muted" style="font-size:.82rem;margin-bottom:.4rem">"${esc(t.Title)}" — yeh aapki pending nahi, saamne wale ki pending banegi. Overdue count nahi hogi.</div>
<label>Waiting on <span class="req">*</span></label>
<select id="sc-won">${SCHED_WAIT_ON.map(w=>`<option ${t.WaitingOn===w?'selected':''}>${w}</option>`).join("")}</select>
<label>Name / detail</label><input id="sc-wdet" placeholder="e.g. Sharma Traders — rate confirmation" value="${esc(t.WaitingReason||"")}">
<label>Expected response date</label><input type="date" id="sc-wexp" value="${esc(String(t.ExpectedDate||schAddD(todayStr(),3)).slice(0,10))}">
<label>Remind me to follow up every</label>
<select id="sc-wrem">${[["1","1 day"],["2","2 days"],["3","3 days"],["7","7 days"]].map(x=>`<option value="${x[0]}" ${String(t.RemindDays||"3")===x[0]?'selected':''}>${x[1]}</option>`).join("")}</select>
<div style="margin-top:1rem"><button class="btn" style="background:#7C3AED" onclick="schSaveWaiting('${id}')">Set Waiting</button></div>`);
}
async function schSaveWaiting(id){
const t=schById(id); if(!t) return;
busy(true,"Saving…");
try{
await schUpdate(t,{Status:"Waiting",WaitingOn:$("sc-won").value,WaitingReason:$("sc-wdet").value.trim(),
WaitingSince:todayStr(),ExpectedDate:$("sc-wexp").value,RemindDays:$("sc-wrem").value,LastRemind:todayStr()});
busy(false); closeModal(); toast("⏳ Waiting set — ab yeh saamne wale ki pending hai, aapki nahi."); render();
}catch(e){ busy(false); toast("Failed: "+e.message); }
}
async function schFollowedUp(id){
const t=schById(id); if(!t) return;
try{ await schUpdate(t,{LastRemind:todayStr()}); toast("📞 Follow-up logged — next reminder in "+(num(t.RemindDays)||3)+" days"); render(); }catch(e){ toast("Failed: "+e.message); }
}
async function schResume(id){
const t=schById(id); if(!t) return;
try{
await schUpdate(t,{Status:"Not Started",DueDate:todayStr()>schDue(t)?todayStr():schDue(t)});
toast("✅ Back in your plan — response received"); render();
}catch(e){ toast("Failed: "+e.message); }
}
/* End of Day review */
function schEOD(){
const t=todayStr();
const open=schObjs().filter(x=>schOpen(x)&&x.Status!=="Waiting"&&schDue(x)===t);
const done=schObjs().filter(x=>String(x.CompletedAt||"").slice(0,10)===t);
openModal("🌆 End of Day Review", `
<div class="rowline"><span>Completed today</span><b style="color:var(--ok)">${done.length}</b></div>
<div class="rowline"><span>Still open</span><b style="color:${open.length?'var(--bad)':'var(--ok)'}">${open.length}</b></div>
${open.length?`<div style="margin-top:.7rem">${open.map(x=>`
<div style="display:flex;gap:.4rem;align-items:center;padding:.4rem 0;border-bottom:1px dashed var(--line)">
<span style="flex:1;font-size:.88rem">${schIsPD(x)?"⭐ ":""}<b>${esc(x.Title)}</b></span>
<button class="sch-btn ok" onclick="schComplete('${x.TaskID}');closeModal()">✓</button>
<button class="sch-btn" onclick="schMove('${x.TaskID}',1,${schIsPD(x)?"false":"true"});closeModal();schEOD()">→ Tmrw</button>
</div>`).join("")}</div>
<p class="muted" style="font-size:.78rem;margin-top:.6rem">Jo yahin chhod doge wo kal Overdue mein dikhega — conscious choice karo.</p>`
:`<p style="margin-top:.8rem">🏆 <b>Clean sweep.</b> Every planned task is closed. This is how companies get built.</p>`}
<div style="margin-top:1rem"><button class="btn dark" onclick="closeModal();window._schD='${schAddD(t,1)}';window._schView='day';render()">🗓 See tomorrow's plan</button></div>`);
}

window._SCH_OK=true;
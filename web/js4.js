/* ============================================================================
 * WHOLESALE ACCOUNTS MODULE (js4) — Supabase native, Admin-only v1
 * Masters (Category/Item/Party/Warehouse) · Purchase/Sale/Return/Hold vouchers
 * · Batchwise stock (derived) · Payments · Expense · Party ledger · A5 print
 * Data: window.WS — wsLoad() se aata hai (gsRun "wsBootstrap")
 * ========================================================================== */

window.WS = null;
window._wsTab = window._wsTab || "sale";

async function wsLoad(force){
if(window.WS && !force) return;
busy(true,"Wholesale data load ho raha hai…");
try{
window.WS = await gsRun("wsBootstrap",[]);
busy(false); render();
}catch(e){ busy(false); toast("Wholesale load fail: "+e.message); }
}
function wsReload(){ window.WS=null; wsLoad(); }

/* ---------- lookups ---------- */
function wsCats(){ return (WS&&WS.cats)||[]; }
function wsItems(){ return ((WS&&WS.items)||[]).filter(i=>i.status!=="Inactive"); }
function wsParties(t){ return ((WS&&WS.parties)||[]).filter(p=>p.status!=="Inactive" && (!t || p.ptype===t)); }
function wsWhs(){ return (WS&&WS.whs)||[]; }
function wsVouchers(t){ return ((WS&&WS.vouchers)||[]).filter(v=>!t || v.vtype===t); }
function wsItemByCode(c){ return ((WS&&WS.items)||[]).find(i=>i.code===c); }
function wsPartyByCode(c){ return ((WS&&WS.parties)||[]).find(p=>p.code===c); }
function wsWhName(c){ const w=wsWhs().find(x=>x.code===c); return w?w.name:c; }
function wsCatName(c){ const x=wsCats().find(y=>y.code===c); return x?x.name:c; }
function wsBal(code){ const b=((WS&&WS.balances)||[]).find(x=>x.code===code); return b?num(b.balance):0; }
function wsStockOf(item, wh, batch){
return ((WS&&WS.stock)||[]).filter(s=>s.item_code===item && (wh===undefined||s.warehouse_code===wh) && (batch===undefined||s.batch===batch)).reduce((a,s)=>a+num(s.qty),0);
}
function wsBatches(item, wh){
return ((WS&&WS.stock)||[]).filter(s=>s.item_code===item && (!wh || s.warehouse_code===wh) && num(s.qty)!==0);
}
function wsPriceFor(party, item){
const it=wsItemByCode(item); if(!it) return 0;
const pl=(wsPartyByCode(party)||{}).price_list||"P1";
const v= pl==="P2" ? it.sp2 : it.sp1;
return v==null? (pl==="P2"? (it.sp1!=null?num(it.sp1):0) : 0) : num(v);
}

/* ---------- main screen ---------- */
function vWSAcct(){
if(!WS){ wsLoad(); return `<div class="card empty">Wholesale data load ho raha hai…</div>`; }
const t=window._wsTab;
const TABS=[["sale","🧾 Sale"],["purchase","📥 Purchase"],["sreturn","↩ Return"],["hold","⏸ Hold ("+wsVouchers("HOLD").filter(v=>v.status==="Open").length+")"],["stock","🗃 Stock"],["payments","💰 Payments"],["expense","💸 Expense"],["ledger","📒 Ledger"],["masters","⚙️ Masters"]];
return `<div class="toolbar" style="flex-wrap:wrap">
${TABS.map(x=>`<button class="btn small ${t===x[0]?'':'ghost'}" onclick="window._wsTab='${x[0]}';render()">${x[1]}</button>`).join("")}
<button class="btn small ghost" onclick="wsReload()" title="Fresh data">🔄</button>
</div>
${t==="masters"?wsMasters() : t==="purchase"?wsVoucherSection("PURCHASE") : t==="sale"?wsVoucherSection("SALE") : t==="sreturn"?wsVoucherSection("SRETURN") : t==="hold"?wsHolds() : t==="stock"?wsStockView() : t==="payments"?wsPayments() : t==="expense"?wsExpense() : wsLedger()}`;
}

/* ============================ MASTERS ============================ */
function wsMasters(){
return `<div class="grid g2">
<div class="card"><div class="section-h"><h3>📁 Categories (${wsCats().length})</h3><div class="ln"></div><button class="btn small" onclick="wsEditCat()">＋ Add</button></div>
${wsCats().map(c=>`<div class="rowline"><span>${esc(c.code)}</span><b>${esc(c.name)} <a href="javascript:void 0" onclick="wsEditCat('${c.code}')">✎</a></b></div>`).join("")||'<div class="muted">Pehli category banao — har item kisi category ke under hi aayega.</div>'}</div>
<div class="card"><div class="section-h"><h3>🏬 Warehouses (${wsWhs().length})</h3><div class="ln"></div><button class="btn small" onclick="wsEditWh()">＋ Add</button></div>
${wsWhs().map(w=>`<div class="rowline"><span>${esc(w.code)}</span><b>${esc(w.name)} <a href="javascript:void 0" onclick="wsEditWh('${w.code}')">✎</a></b></div>`).join("")||'<div class="muted">Kam se kam ek warehouse banao.</div>'}</div>
</div>
<div class="card" style="margin-top:.8rem"><div class="section-h"><h3>📦 Item Master (${wsItems().length})</h3><div class="ln"></div><button class="btn small" onclick="wsEditItem()">＋ Add Item</button></div>
<input placeholder="Search item…" value="${esc(window._wsItQ||'')}" oninput="window._wsItQ=this.value;window._refocusId=this.id" id="ws-itq" onchange="render()" style="max-width:300px">
<div class="tbl-wrap"><table><tr><th>Code</th><th>Item</th><th>Category</th><th class="r">SP1</th><th class="r">SP2</th><th class="r">Purchase ₹</th><th></th></tr>
${wsItems().filter(i=>!window._wsItQ || (i.name+i.code).toLowerCase().includes(window._wsItQ.toLowerCase())).slice(0,100).map(i=>`<tr><td>${esc(i.code)}</td><td><b>${esc(i.name)}</b></td><td>${esc(wsCatName(i.category_code))}</td><td class="r">${i.sp1==null?"—":money(i.sp1)}</td><td class="r">${i.sp2==null?"—":money(i.sp2)}</td><td class="r">${i.purchase_price==null?"—":money(i.purchase_price)}</td><td><button class="btn small ghost" onclick="wsEditItem('${i.code}')">✎</button></td></tr>`).join("")}
</table></div></div>
<div class="card" style="margin-top:.8rem"><div class="section-h"><h3>👥 Party Master (${wsParties().length})</h3><div class="ln"></div><button class="btn small" onclick="wsEditParty()">＋ Add Party</button></div>
<div class="tbl-wrap"><table><tr><th>Code</th><th>Party</th><th>Type</th><th>Phone</th><th>Credit</th><th>Price list</th><th class="r">Balance</th><th></th></tr>
${wsParties().map(p=>`<tr><td>${esc(p.code)}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.ptype)}</td><td>${esc(p.phone)}</td><td>${p.credit==="Yes"?esc(p.credit_days+" din · "+money(p.credit_limit)):"No"}</td><td>${esc(p.price_list)}</td><td class="r"><b>${money(wsBal(p.code))}</b></td><td><button class="btn small ghost" onclick="wsEditParty('${p.code}')">✎</button></td></tr>`).join("")}
</table></div></div>`;
}
function wsEditCat(code){
const c=code? wsCats().find(x=>x.code===code):{};
openModal(code?"Edit Category":"Nayi Category", `
<div><label>Category name <span class="req">*</span></label><input id="wsm-name" value="${esc(c.name||'')}"></div>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveMaster('cat','${code||''}',{name:$('wsm-name').value})">Save</button></div>`);
}
function wsEditWh(code){
const c=code? wsWhs().find(x=>x.code===code):{};
openModal(code?"Edit Warehouse":"Naya Warehouse", `
<div><label>Warehouse name <span class="req">*</span></label><input id="wsm-name" value="${esc(c.name||'')}"></div>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveMaster('wh','${code||''}',{name:$('wsm-name').value})">Save</button></div>`);
}
function wsEditItem(code){
const c=code? wsItemByCode(code):{};
openModal(code?("Edit Item — "+code):"Naya Item", `
<div class="form-grid">
<div class="full"><label>Item name <span class="req">*</span></label><input id="wsm-name" value="${esc(c.name||'')}"></div>
<div><label>Category <span class="req">*</span></label><select id="wsm-cat">${wsCats().map(x=>`<option value="${x.code}" ${c.category_code===x.code?'selected':''}>${esc(x.name)}</option>`).join("")}</select></div>
<div><label>Status</label><select id="wsm-st"><option ${c.status!=="Inactive"?'selected':''}>Active</option><option ${c.status==="Inactive"?'selected':''}>Inactive</option></select></div>
<div><label>SP1 (price list 1)</label><input type="number" id="wsm-sp1" value="${c.sp1==null?'':c.sp1}"></div>
<div><label>SP2 (price list 2)</label><input type="number" id="wsm-sp2" value="${c.sp2==null?'':c.sp2}"></div>
<div><label>Purchase price</label><input type="number" id="wsm-pp" value="${c.purchase_price==null?'':c.purchase_price}"></div>
</div>
${wsCats().length?'':'<div class="muted" style="color:var(--bad)">Pehle Masters mein category banao.</div>'}
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveMaster('item','${code||''}',{name:$('wsm-name').value, category_code:$('wsm-cat').value, status:$('wsm-st').value, sp1:$('wsm-sp1').value===''?null:num($('wsm-sp1').value), sp2:$('wsm-sp2').value===''?null:num($('wsm-sp2').value), purchase_price:$('wsm-pp').value===''?null:num($('wsm-pp').value)})">Save</button></div>`);
}
function wsEditParty(code){
const c=code? wsPartyByCode(code):{};
openModal(code?("Edit Party — "+code):"Nayi Party", `
<div class="form-grid">
<div class="full"><label>Party name <span class="req">*</span></label><input id="wsm-name" value="${esc(c.name||'')}"></div>
<div><label>Phone <span class="req">*</span></label><input id="wsm-ph" value="${esc(c.phone||'')}"></div>
<div><label>Type</label><select id="wsm-ty"><option ${c.ptype!=="SUPPLIER"?'selected':''}>CUSTOMER</option><option ${c.ptype==="SUPPLIER"?'selected':''}>SUPPLIER</option></select></div>
<div><label>Credit</label><select id="wsm-cr" onchange="$('wsm-crrow').style.display=this.value==='Yes'?'':'none'"><option ${c.credit!=="Yes"?'selected':''}>No</option><option ${c.credit==="Yes"?'selected':''}>Yes</option></select></div>
<div><label>Price list</label><select id="wsm-pl"><option ${c.price_list!=="P2"?'selected':''}>P1</option><option ${c.price_list==="P2"?'selected':''}>P2</option></select></div>
<div class="full" id="wsm-crrow" style="display:${c.credit==="Yes"?'':'none'}"><div class="form-grid" style="margin:0">
<div><label>Credit days <span class="req">*</span></label><input type="number" id="wsm-crd" value="${c.credit_days==null?'':c.credit_days}"></div>
<div><label>Credit limit ₹ <span class="req">*</span></label><input type="number" id="wsm-crl" value="${c.credit_limit==null?'':c.credit_limit}"></div>
</div></div>
<div><label>Opening balance ₹ (lena + / dena −)</label><input type="number" id="wsm-ob" value="${c.opening_balance==null?0:c.opening_balance}"></div>
<div><label>Status</label><select id="wsm-pst"><option ${c.status!=="Inactive"?'selected':''}>Active</option><option ${c.status==="Inactive"?'selected':''}>Inactive</option></select></div>
</div>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveMaster('party','${code||''}',{name:$('wsm-name').value, phone:$('wsm-ph').value, ptype:$('wsm-ty').value, credit:$('wsm-cr').value, credit_days:$('wsm-crd')?num($('wsm-crd').value)||null:null, credit_limit:$('wsm-crl')?num($('wsm-crl').value)||null:null, price_list:$('wsm-pl').value, opening_balance:num($('wsm-ob').value)||0, status:$('wsm-pst').value})">Save</button></div>`);
}
async function wsSaveMaster(kind, code, obj){
if(!saveOnce("wsm")) return;
if(code) obj.code=code;
busy(true,"Saving…");
try{ await gsRun("wsMasterSave",[kind,obj]); busy(false); closeModal(); toast("Saved ✓"); wsReload(); }
catch(e){ busy(false); toast(e.message); }
saveDone("wsm");
}

/* ============================ VOUCHERS ============================ */
window._wsRows=[];
function wsVoucherSection(T){
const label=T==="PURCHASE"?"Purchase Voucher":T==="SALE"?"Sale Voucher":"Sale Return";
const list=wsVouchers(T).slice(0,60);
return `<div class="card"><div class="section-h"><h3>＋ ${label}</h3><div class="ln"></div><button class="btn" onclick="wsOpenVoucher('${T}')">＋ New ${label}</button></div>
${T==="SALE"?'<div class="muted">Price party ke price-list (P1/P2) se apne aap aayega — badla bhi ja sakta hai.</div>':T==="PURCHASE"?'<div class="muted">Purchase mein price nahi poochha jaata — sirf qty, warehouse aur batch. Opening stock ke liye bhi yahi use karo (party: koi bhi supplier, notes mein "Opening" likho) ya Stock tab se Opening entry.</div>':''}
</div>
<div class="section-h"><h3>Recent (${list.length})</h3><div class="ln"></div></div>
${list.length? `<div class="tbl-wrap"><table><tr><th>V.No</th><th>Date</th><th>Party</th><th>Items</th><th class="r">Total</th><th>Status</th><th></th></tr>
${list.map(v=>`<tr class="${v.status==='Cancelled'?'muted':''}"><td><b>${esc(v.vno)}</b></td><td>${fmtDate(v.vdate)}</td><td>${esc(v.party_name)}</td>
<td class="muted" style="max-width:260px;font-size:.75rem">${(v.items||[]).map(i=>esc(i.item_name)+" ×"+i.qty).join(", ")}</td>
<td class="r"><b>${T==="PURCHASE"?"—":money(v.grand_total)}</b></td><td>${esc(v.status)}</td>
<td style="white-space:nowrap"><button class="btn small ghost" onclick="wsViewVoucher('${v.vno}')">View</button>
${T!=="PURCHASE"?`<button class="btn small ghost" onclick="wsPrintVoucher('${v.vno}')">🖨</button>`:""}
${v.status==='Active'?`<button class="btn small danger" onclick="wsCancelV('${v.vno}')">✖</button>`:""}</td></tr>`).join("")}
</table></div>`:`<div class="card empty">Abhi koi ${label} nahi.</div>`}`;
}
function wsOpenVoucher(T, hold){
const isP=(T==="PURCHASE"), isS=T==="SALE"||T==="SRETURN";
const pt=isP?"SUPPLIER":"CUSTOMER";
window._wsRows = hold? (hold.items||[]).map(i=>({item_code:i.item_code, warehouse_code:i.warehouse_code, batch:i.batch, qty:num(i.qty), price:num(i.price)})) : [{item_code:"",warehouse_code:(wsWhs()[0]||{}).code||"",batch:"",qty:"",price:0}];
window._wsVT=T; window._wsHold=hold? hold.vno:"";
const party=hold? hold.party_code : "";
openModal((hold?"Hold → ":"")+(T==="PURCHASE"?"Purchase Voucher":T==="SALE"?"Sale Voucher":T==="HOLD"?"Hold Order":"Sale Return"), `
<div class="form-grid">
<div><label>${isP?"Supplier":"Dealer"} <span class="req">*</span></label><select id="wsv-party" onchange="wsPartyPick()">${'<option value="">— select —</option>'+wsParties(pt).map(p=>`<option value="${p.code}" ${party===p.code?'selected':''}>${esc(p.name)}</option>`).join("")}</select></div>
<div><label>Date</label><input type="date" id="wsv-date" value="${todayStr()}"></div>
</div>
<div id="wsv-crinfo" class="muted" style="margin:.3rem 0"></div>
<div id="wsv-rows"></div>
<button class="btn small ghost" onclick="window._wsRows.push({item_code:'',warehouse_code:(wsWhs()[0]||{}).code||'',batch:'',qty:'',price:0});wsRenderRows()">＋ Item</button>
${isS||T==="HOLD"? `<div class="form-grid" style="margin-top:.6rem">
<div><label>Cartage ₹</label><input type="number" id="wsv-cart" value="${hold?num(hold.cartage):0}" oninput="wsCalc()"></div>
<div><label>Unloading ₹</label><input type="number" id="wsv-unl" value="${hold?num(hold.unloading):0}" oninput="wsCalc()"></div>
<div class="full"><label>Delivery address</label><input id="wsv-addr" value="${esc(hold?hold.delivery_address:'')}" placeholder="khaali = pickup/counter"></div>
<div><label>Delivery phone</label><input id="wsv-dph" value="${esc(hold?hold.delivery_phone:'')}" placeholder="default: dealer ka number"></div>
<div><label>Notes</label><input id="wsv-notes" value="${esc(hold?hold.notes:'')}"></div>
</div>
<div class="rowline" style="margin-top:.5rem"><span>GRAND TOTAL</span><b id="wsv-gt">₹0</b></div>`
: `<div class="form-grid" style="margin-top:.6rem"><div class="full"><label>Notes</label><input id="wsv-notes"></div></div>`}
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveVoucher()">Save ${hold?"as Sale":""}</button>
${T==="SALE"&&!hold? `<button class="btn ghost" onclick="window._wsVT='HOLD';wsSaveVoucher()">⏸ Save as Hold</button>`:""}</div>`);
wsRenderRows(); wsPartyPick();
}
function wsPartyPick(){
const p=wsPartyByCode($("wsv-party").value);
const el=$("wsv-crinfo"); if(!el) return;
if(!p){ el.innerHTML=""; return; }
const bal=wsBal(p.code);
el.innerHTML = `Balance: <b style="color:${bal>0?'var(--bad)':'var(--ok)'}">${money(Math.abs(bal))} ${bal>0?'lena':bal<0?'dena':''}</b>`
+ (p.credit==="Yes"? ` · Credit: ${p.credit_days} din · Limit ${money(p.credit_limit)}${bal>num(p.credit_limit)?' <b style="color:var(--bad)">⚠ LIMIT CROSS</b>':''}` : ` · <b>No credit</b>`)
+ ` · Price list: <b>${p.price_list}</b>`;
if($("wsv-dph") && !$("wsv-dph").value) $("wsv-dph").value=p.phone||"";
if(window._wsVT!=="PURCHASE"){ window._wsRows.forEach(r=>{ if(r.item_code && !r._manual) r.price=wsPriceFor(p.code,r.item_code); }); wsRenderRows(); }
}
function wsRenderRows(){
const T=window._wsVT, isP=(T==="PURCHASE"||T==="OPENING");
const el=$("wsv-rows"); if(!el) return;
el.innerHTML = window._wsRows.map((r,i)=>{
const stock = r.item_code? wsStockOf(r.item_code, r.warehouse_code||undefined) : null;
const bl = r.item_code? wsBatches(r.item_code, r.warehouse_code) : [];
return `<div class="item-row" style="grid-template-columns:1fr 95px ${isP?'110px':'95px'} 70px ${isP?'':'85px 90px'} 30px;margin-top:.35rem">
<select onchange="window._wsRows[${i}].item_code=this.value;window._wsRows[${i}]._manual=false;wsRowPrice(${i});wsRenderRows()">
<option value="">— item —</option>${wsItems().map(x=>`<option value="${x.code}" ${r.item_code===x.code?'selected':''}>${esc(x.name)}</option>`).join("")}</select>
<select title="Warehouse" onchange="window._wsRows[${i}].warehouse_code=this.value;wsRenderRows()">${wsWhs().map(w=>`<option value="${w.code}" ${r.warehouse_code===w.code?'selected':''}>${esc(w.name)}</option>`).join("")}</select>
${isP? `<input placeholder="Batch no." value="${esc(r.batch)}" oninput="window._wsRows[${i}].batch=this.value">`
: `<select title="Batch${stock!=null?' · total '+stock:''}" onchange="window._wsRows[${i}].batch=this.value;wsCalc()">
<option value="">— batch —</option>${bl.map(b=>`<option value="${esc(b.batch)}" ${r.batch===b.batch?'selected':''}>${esc(b.batch||"(no batch)")} · ${num(b.qty)}</option>`).join("")}${T==="SRETURN"?`<option value="__new" ${r.batch==="__new"?'selected':''}>+ naya batch</option>`:""}</select>`}
<input type="number" placeholder="Qty" value="${r.qty}" oninput="window._wsRows[${i}].qty=this.value;wsCalc()">
${isP?'':`<input type="number" placeholder="Price" value="${r.price}" oninput="window._wsRows[${i}].price=this.value;window._wsRows[${i}]._manual=true;wsCalc()">
<div class="r" style="align-self:center;font-weight:700" id="wsv-amt${i}">${money(num(r.qty)*num(r.price))}</div>`}
<button class="btn small ghost" onclick="window._wsRows.splice(${i},1);wsRenderRows()">✖</button>
</div>${(!isP && r.item_code && r.batch && r.batch!=="__new")? `<div class="muted" style="font-size:.72rem;margin-left:.2rem">${esc((wsItemByCode(r.item_code)||{}).name||"")} — is batch mein ${wsStockOf(r.item_code,r.warehouse_code,r.batch)} available${T!=="SRETURN"&&num(r.qty)>wsStockOf(r.item_code,r.warehouse_code,r.batch)?' <b style="color:var(--bad)">⚠ kam hai</b>':''}</div>`:""}`;
}).join("");
wsCalc();
}
function wsRowPrice(i){
const r=window._wsRows[i];
if(window._wsVT!=="PURCHASE" && r.item_code) r.price=wsPriceFor($("wsv-party")?$("wsv-party").value:"", r.item_code);
}
function wsCalc(){
let t=0; window._wsRows.forEach((r,i)=>{ const a=num(r.qty)*num(r.price); t+=a; const el=$("wsv-amt"+i); if(el) el.textContent=money(a); });
const gt=$("wsv-gt"); if(gt) gt.textContent=money(t + num($("wsv-cart")&&$("wsv-cart").value) + num($("wsv-unl")&&$("wsv-unl").value));
}
async function wsSaveVoucher(){
if(!saveOnce("wsv")) return;
const T=window._wsVT;
const party=$("wsv-party").value;
if(T!=="OPENING" && !party){ saveDone("wsv"); return toast((T==="PURCHASE"?"Supplier":"Dealer")+" chuno."); }
const items=window._wsRows.filter(r=>r.item_code && num(r.qty)>0).map(r=>({item_code:r.item_code, warehouse_code:r.warehouse_code, batch:r.batch==="__new"? (prompt("Naya batch number likho:")||"") : r.batch, qty:num(r.qty), price:(T==="PURCHASE"||T==="OPENING")?0:num(r.price)}));
if(!items.length){ saveDone("wsv"); return toast("Kam se kam ek item + qty bharo."); }
if(T==="SALE"||T==="HOLD"){ const miss=items.find(x=>!x.batch); if(miss){ saveDone("wsv"); return toast("Har item ka batch chuno (stock usi se kat'ta hai)."); } }
const v={vtype:T, vdate:$("wsv-date").value, party_code:party,
cartage:num($("wsv-cart")&&$("wsv-cart").value), unloading:num($("wsv-unl")&&$("wsv-unl").value),
delivery_address:($("wsv-addr")&&$("wsv-addr").value)||"", delivery_phone:($("wsv-dph")&&$("wsv-dph").value)||"", notes:($("wsv-notes")&&$("wsv-notes").value)||""};
busy(true,"Saving voucher…");
try{
const res = window._wsHold? await gsRun("wsHoldConvert",[window._wsHold, v, items]) : await gsRun("wsVoucher",[v, items]);
busy(false); closeModal(); toast(res.vno+" saved ✓");
window._wsHold="";
try{ alog("ws_voucher", res.vno); }catch(_e){}
wsReload();
if(T==="SALE"||T==="SRETURN") setTimeout(()=>{ if(confirm("Print karna hai "+res.vno+"?")) wsPrintVoucherData(res.vno); }, 600);
}catch(e){ busy(false); toast(e.message); }
saveDone("wsv");
}
async function wsCancelV(vno){
if(!confirm(vno+" cancel karna hai? Stock/ledger wapas adjust ho jayega.")) return;
busy(true,"Cancelling…");
try{ await gsRun("wsCancel",[vno]); busy(false); toast("Cancelled"); wsReload(); }
catch(e){ busy(false); toast(e.message); }
}
function wsViewVoucher(vno){
const v=((WS&&WS.vouchers)||[]).find(x=>x.vno===vno); if(!v) return;
openModal(v.vno+" — "+v.vtype, `
<div class="rowline"><span>Party</span><b>${esc(v.party_name)}</b></div>
<div class="rowline"><span>Date</span><b>${fmtDate(v.vdate)}</b></div>
<div class="rowline"><span>Status</span><b>${esc(v.status)}${v.converted_to?' → '+esc(v.converted_to):''}</b></div>
${v.delivery_address?`<div class="rowline"><span>Delivery</span><b>${esc(v.delivery_address)} · ${esc(v.delivery_phone)}</b></div>`:''}
<table style="width:100%;margin-top:.5rem"><tr><th>Item</th><th>WH</th><th>Batch</th><th class="r">Qty</th>${v.vtype==="PURCHASE"?"":'<th class="r">Price</th><th class="r">Amount</th>'}</tr>
${(v.items||[]).map(i=>`<tr><td>${esc(i.item_name)}</td><td>${esc(wsWhName(i.warehouse_code))}</td><td>${esc(i.batch||"—")}</td><td class="r">${i.qty}</td>${v.vtype==="PURCHASE"?"":`<td class="r">${money(i.price)}</td><td class="r">${money(i.amount)}</td>`}</tr>`).join("")}
${v.vtype==="PURCHASE"?"":`<tr><td colspan="4" class="r">Items</td><td class="r" colspan="2"><b>${money(v.items_total)}</b></td></tr>
<tr><td colspan="4" class="r">Cartage + Unloading</td><td class="r" colspan="2">${money(num(v.cartage)+num(v.unloading))}</td></tr>
<tr><td colspan="4" class="r"><b>GRAND TOTAL</b></td><td class="r" colspan="2"><b>${money(v.grand_total)}</b></td></tr>`}</table>
${v.notes?`<div class="muted" style="margin-top:.4rem">Notes: ${esc(v.notes)}</div>`:''}
<div class="muted" style="margin-top:.4rem">By ${esc(v.created_by)} · ${esc(String(v.created_at).slice(0,16).replace("T"," "))}</div>
<div style="margin-top:.8rem">${v.vtype!=="PURCHASE"?`<button class="btn" onclick="wsPrintVoucher('${v.vno}')">🖨 Print</button>`:""}
${v.vtype==="HOLD"&&v.status==="Open"?`<button class="btn" onclick="closeModal();wsHoldToSale('${v.vno}')">→ Sale banao</button>`:""}
${v.status==="Active"||v.status==="Open"?`<button class="btn danger ghost" onclick="closeModal();wsCancelV('${v.vno}')">✖ Cancel</button>`:""}</div>`);
}

/* ============================ HOLD ============================ */
function wsHolds(){
const open=wsVouchers("HOLD").filter(v=>v.status==="Open");
const byP={}; open.forEach(v=>{ (byP[v.party_name]=byP[v.party_name]||[]).push(v); });
return `<div class="card"><div class="section-h"><h3>⏸ Hold Orders (${open.length})</h3><div class="ln"></div><button class="btn" onclick="wsOpenVoucher('HOLD')">＋ New Hold</button></div>
<div class="muted">Hold = maal roka hua — stock view mein minus, par dealer ke ledger mein NAHI. Sale banate hi ledger mein aayega.</div></div>
${Object.keys(byP).length? Object.keys(byP).map(pn=>`<div class="section-h"><h3>${esc(pn)} (${byP[pn].length})</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>V.No</th><th>Date</th><th>Items</th><th class="r">Value</th><th></th></tr>
${byP[pn].map(v=>`<tr><td><b>${esc(v.vno)}</b></td><td>${fmtDate(v.vdate)}</td><td class="muted" style="font-size:.75rem">${(v.items||[]).map(i=>esc(i.item_name)+" ×"+i.qty).join(", ")}</td><td class="r">${money(v.grand_total)}</td>
<td style="white-space:nowrap"><button class="btn small" onclick="wsHoldToSale('${v.vno}')">→ Sale</button>
<button class="btn small ghost" onclick="wsViewVoucher('${v.vno}')">View</button>
<button class="btn small danger ghost" onclick="wsCancelV('${v.vno}')">✖</button></td></tr>`).join("")}</table></div>`).join("")
: `<div class="card empty">Koi open hold nahi.</div>`}`;
}
function wsHoldToSale(vno){
const v=((WS&&WS.vouchers)||[]).find(x=>x.vno===vno); if(!v) return;
wsOpenVoucher("SALE", v);
}

/* ============================ STOCK ============================ */
function wsStockView(){
const cat=window._wsCat||"", item=window._wsStItem||"";
const stock=(WS&&WS.stock)||[];
if(item){
const it=wsItemByCode(item)||{};
const rows=stock.filter(s=>s.item_code===item);
return `<button class="btn small ghost" onclick="window._wsStItem='';render()">← Items</button>
<div class="card"><div class="section-h"><h3>📦 ${esc(it.name||item)} — total <b>${wsStockOf(item)}</b></h3><div class="ln"></div>
<button class="btn small" onclick="wsShowItemLedger('${item}')">📒 Item ledger</button></div>
<div class="tbl-wrap"><table><tr><th>Warehouse</th><th>Batch</th><th class="r">Qty</th></tr>
${rows.map(s=>`<tr><td>${esc(wsWhName(s.warehouse_code))}</td><td>${esc(s.batch||"(no batch)")}</td><td class="r" style="${num(s.qty)<0?'color:var(--bad);font-weight:700':''}"><b>${num(s.qty)}</b></td></tr>`).join("")||'<tr><td colspan="3" class="muted">Stock 0.</td></tr>'}
</table></div></div>`;
}
if(cat){
const items=wsItems().filter(i=>i.category_code===cat);
return `<button class="btn small ghost" onclick="window._wsCat='';render()">← Categories</button>
<div class="section-h"><h3>${esc(wsCatName(cat))}</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Item</th><th class="r">Closing</th><th></th></tr>
${items.map(i=>{const q=wsStockOf(i.code); return `<tr class="click" onclick="window._wsStItem='${i.code}';render()"><td><b>${esc(i.name)}</b></td><td class="r" style="${q<0?'color:var(--bad)':''}"><b>${q}</b></td><td class="muted">batch/ledger →</td></tr>`;}).join("")}
</table></div>`;
}
return `<div class="card"><div class="section-h"><h3>🗃 Stock — category chuno</h3><div class="ln"></div>
<button class="btn small ghost" onclick="wsOpenOpening()">＋ Opening stock</button></div></div>
<div class="grid g3">
${wsCats().map(c=>{ const q=wsItems().filter(i=>i.category_code===c.code).reduce((a,i)=>a+wsStockOf(i.code),0);
return `<div class="card click-tile" onclick="window._wsCat='${c.code}';render()"><div class="ic">📁</div><h3>${esc(c.name)}</h3><p class="muted">Total qty: <b>${q}</b></p></div>`; }).join("")||'<div class="card empty">Pehle Masters mein categories banao.</div>'}
</div>`;
}
function wsOpenOpening(){
window._wsRows=[{item_code:"",warehouse_code:(wsWhs()[0]||{}).code||"",batch:"",qty:"",price:0}];
window._wsVT="OPENING"; window._wsHold="";
openModal("Opening Stock Entry", `
<div class="muted">Shuruaati stock — warehouse + batch + qty. Ledger/party par asar nahi, sirf stock +.</div>
<input type="hidden" id="wsv-party" value=""><input type="hidden" id="wsv-date" value="${todayStr()}">
<div id="wsv-rows"></div>
<button class="btn small ghost" onclick="window._wsRows.push({item_code:'',warehouse_code:(wsWhs()[0]||{}).code||'',batch:'',qty:'',price:0});wsRenderRows()">＋ Item</button>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveVoucher()">Save Opening</button></div>`);
wsRenderRows();
}
async function wsShowItemLedger(code){
busy(true,"Ledger…");
try{
const rows=await gsRun("wsItemLedger",[code]); busy(false);
const it=wsItemByCode(code)||{};
let run=0;
openModal("📒 "+( it.name||code), `<div class="tbl-wrap"><table><tr><th>Date</th><th>V.No</th><th>Type</th><th>Party</th><th>WH · Batch</th><th class="r">In/Out</th><th class="r">Balance</th></tr>
${rows.map(r=>{ run+=num(r.delta); return `<tr><td>${fmtDate(r.vdate)}</td><td>${esc(r.vno)}</td><td>${esc(r.vtype)}</td><td>${esc(r.party_name)}</td><td class="muted">${esc(wsWhName(r.warehouse_code))} · ${esc(r.batch||"—")}</td><td class="r" style="color:${num(r.delta)<0?'var(--bad)':'var(--ok)'}"><b>${num(r.delta)>0?'+':''}${num(r.delta)}</b></td><td class="r"><b>${run}</b></td></tr>`;}).join("")||'<tr><td colspan="7" class="muted">Koi movement nahi.</td></tr>'}
</table></div>`);
}catch(e){ busy(false); toast(e.message); }
}

/* ============================ PAYMENTS / EXPENSE ============================ */
function wsPayments(){
const list=((WS&&WS.payments)||[]);
return `<div class="card"><div class="section-h"><h3>＋ Payment Entry</h3><div class="ln"></div></div>
<div class="form-grid">
<div><label>Party <span class="req">*</span></label><select id="wsp-party">${'<option value="">— select —</option>'+wsParties().map(p=>`<option value="${p.code}">${esc(p.name)} (${esc(p.ptype.slice(0,4))})</option>`).join("")}</select></div>
<div><label>Direction</label><select id="wsp-dir"><option value="IN">IN — party se aaya (receipt)</option><option value="OUT">OUT — party ko diya</option></select></div>
<div><label>Amount ₹ <span class="req">*</span></label><input type="number" id="wsp-amt"></div>
<div><label>Date</label><input type="date" id="wsp-date" value="${todayStr()}"></div>
<div><label>Source</label><select id="wsp-src"><option>Cash</option><option>NEFT BSC</option><option>GPay</option><option>Cheque</option><option>Card Swipe</option></select></div>
<div><label>Notes</label><input id="wsp-notes"></div>
</div>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSavePay()">Save Payment</button></div></div>
<div class="section-h"><h3>Recent (${list.length})</h3><div class="ln"></div></div>
${list.length? `<div class="tbl-wrap"><table><tr><th>No</th><th>Date</th><th>Party</th><th class="r">Amount</th><th>Dir</th><th>Source</th><th></th></tr>
${list.slice(0,60).map(p=>`<tr class="${p.status==='Cancelled'?'muted':''}"><td>${esc(p.pno)}</td><td>${fmtDate(p.pdate)}</td><td>${esc(p.party_name)}</td><td class="r"><b>${money(p.amount)}</b></td><td>${p.direction==="IN"?'<span class="pill p-ok">IN</span>':'<span class="pill p-bad">OUT</span>'}</td><td>${esc(p.source)}</td>
<td>${p.status==='Active'?`<button class="btn small danger ghost" onclick="wsCancelPay('${p.pno}')">✖</button>`:'Cancelled'}</td></tr>`).join("")}</table></div>`:`<div class="card empty">Koi payment nahi.</div>`}`;
}
async function wsSavePay(){
if(!saveOnce("wsp")) return;
busy(true,"Saving…");
try{ const r=await gsRun("wsPay",[{party_code:$("wsp-party").value, direction:$("wsp-dir").value, amount:num($("wsp-amt").value), pdate:$("wsp-date").value, source:$("wsp-src").value, notes:$("wsp-notes").value}]); busy(false); toast(r.pno+" ✓"); wsReload(); }
catch(e){ busy(false); toast(e.message); }
saveDone("wsp");
}
async function wsCancelPay(pno){ if(!confirm(pno+" cancel?")) return; busy(true,"…"); try{ await gsRun("wsPayCancel",[pno]); busy(false); wsReload(); }catch(e){ busy(false); toast(e.message); } }
function wsExpense(){
const list=((WS&&WS.expenses)||[]);
return `<div class="card"><div class="section-h"><h3>＋ Wholesale Expense</h3><div class="ln"></div></div>
<div class="form-grid">
<div><label>Amount ₹ <span class="req">*</span></label><input type="number" id="wse-amt"></div>
<div><label>Category/Head <span class="req">*</span></label><input id="wse-cat" placeholder="jaise Cartage, Salary, Tea"></div>
<div><label>Detail</label><input id="wse-det"></div>
<div><label>Date</label><input type="date" id="wse-date" value="${todayStr()}"></div>
<div><label>Source</label><select id="wse-src"><option>Cash</option><option>NEFT BSC</option><option>GPay</option></select></div>
</div>
<div style="margin-top:.8rem"><button class="btn" onclick="wsSaveExp()">Save Expense</button></div></div>
<div class="section-h"><h3>Recent (${list.length})</h3><div class="ln"></div></div>
${list.length? `<div class="tbl-wrap"><table><tr><th>No</th><th>Date</th><th>Category</th><th>Detail</th><th class="r">Amount</th><th>Source</th><th></th></tr>
${list.slice(0,60).map(e=>`<tr class="${e.status==='Cancelled'?'muted':''}"><td>${esc(e.eno)}</td><td>${fmtDate(e.edate)}</td><td>${esc(e.category)}</td><td>${esc(e.detail)}</td><td class="r"><b>${money(e.amount)}</b></td><td>${esc(e.source)}</td>
<td>${e.status==='Active'?`<button class="btn small danger ghost" onclick="wsCancelExp('${e.eno}')">✖</button>`:'Cancelled'}</td></tr>`).join("")}</table></div>`:`<div class="card empty">Koi expense nahi.</div>`}`;
}
async function wsSaveExp(){
if(!saveOnce("wse")) return;
busy(true,"Saving…");
try{ const r=await gsRun("wsExp",[{amount:num($("wse-amt").value), category:$("wse-cat").value, detail:$("wse-det").value, edate:$("wse-date").value, source:$("wse-src").value}]); busy(false); toast(r.eno+" ✓"); wsReload(); }
catch(e){ busy(false); toast(e.message); }
saveDone("wse");
}
async function wsCancelExp(eno){ if(!confirm(eno+" cancel?")) return; busy(true,"…"); try{ await gsRun("wsExpCancel",[eno]); busy(false); wsReload(); }catch(e){ busy(false); toast(e.message); } }

/* ============================ LEDGER ============================ */
function wsLedger(){
return `<div class="card"><div class="section-h"><h3>📒 Party Ledger</h3><div class="ln"></div></div>
<div class="form-grid"><div class="full"><label>Party</label><select id="wsl-party" onchange="wsShowLedger(this.value)">${'<option value="">— select —</option>'+wsParties().map(p=>`<option value="${p.code}">${esc(p.name)} — ${money(wsBal(p.code))}</option>`).join("")}</select></div></div>
<div id="wsl-out"></div></div>
<div class="section-h"><h3>Sab parties — balance</h3><div class="ln"></div></div>
<div class="tbl-wrap"><table><tr><th>Party</th><th>Type</th><th class="r">Balance</th></tr>
${wsParties().map(p=>{const b=wsBal(p.code); return `<tr class="click" onclick="$('wsl-party').value='${p.code}';wsShowLedger('${p.code}')"><td><b>${esc(p.name)}</b></td><td>${esc(p.ptype)}</td><td class="r" style="color:${b>0?'var(--bad)':b<0?'var(--ok)':''}"><b>${money(Math.abs(b))} ${b>0?'lena':b<0?'dena':''}</b></td></tr>`;}).join("")}
</table></div>`;
}
async function wsShowLedger(code){
if(!code) return;
busy(true,"Ledger…");
try{
const rows=await gsRun("wsPartyLedger",[code]); busy(false);
const p=wsPartyByCode(code)||{};
let run=num(p.opening_balance);
const body=`<div class="rowline" style="margin-top:.6rem"><span>Opening balance</span><b>${money(run)}</b></div>
<div class="tbl-wrap"><table><tr><th>Date</th><th>Ref</th><th>Type</th><th class="r">Amount</th><th class="r">Balance</th></tr>
${rows.map(r=>{ run+=num(r.delta); return `<tr><td>${fmtDate(r.d)}</td><td>${esc(r.ref)}</td><td>${esc(r.kind)}${r.source?' · '+esc(r.source):''}</td><td class="r" style="color:${num(r.delta)<0?'var(--ok)':'var(--bad)'}">${money(Math.abs(r.delta))} ${num(r.delta)<0?'−':'+'}</td><td class="r"><b>${money(run)}</b></td></tr>`;}).join("")||'<tr><td colspan="5" class="muted">Koi entry nahi.</td></tr>'}
<tr><td colspan="4" class="r"><b>CLOSING</b></td><td class="r"><b>${money(run)}</b></td></tr></table></div>`;
const el=$("wsl-out"); if(el) el.innerHTML=body; else openModal("Ledger — "+(p.name||code), body);
}catch(e){ busy(false); toast(e.message); }
}

/* ============================ PRINT (A5 landscape, Original | Duplicate) ============================ */
function wsPrintVoucher(vno){ wsPrintVoucherData(vno); }
function wsPrintVoucherData(vno){
const v=((WS&&WS.vouchers)||[]).find(x=>x.vno===vno);
if(!v){ toast("Dobara load karke try karo."); return; }
const title=v.vtype==="SALE"?"SALE VOUCHER":v.vtype==="SRETURN"?"SALE RETURN":v.vtype==="HOLD"?"HOLD ORDER":v.vtype;
const itemRows=(v.items||[]).map(i=>`<tr><td>${esc(i.item_name)}<span class="muted" style="font-size:7.5px"> · ${esc(i.batch||"")}</span></td><td class="r">${i.qty}</td><td class="r">${money(i.price)}</td><td class="r">${money(i.amount)}</td></tr>`).join("");
const totals=`<tr><td colspan="3" class="r">Items total</td><td class="r">${money(v.items_total)}</td></tr>
${num(v.cartage)?`<tr><td colspan="3" class="r">Cartage</td><td class="r">${money(v.cartage)}</td></tr>`:""}
${num(v.unloading)?`<tr><td colspan="3" class="r">Unloading</td><td class="r">${money(v.unloading)}</td></tr>`:""}
<tr class="tot"><td colspan="3" class="r">GRAND TOTAL</td><td class="r">${money(v.grand_total)}</td></tr>`;
const p=wsPartyByCode(v.party_code)||{};
const half=(label)=>`<div class="half"><div class="copy">${label}</div>
<div class="hd"><div><h1>${title}</h1><div class="eid">${esc(v.vno)}</div></div>
<div style="text-align:right">Date: ${fmtDate(v.vdate)}<br>By: ${esc(v.created_by)}</div></div>
<div><b>${esc(v.party_name)}</b> · ${esc(p.phone||"")}${v.delivery_address?`<br><b>Deliver to:</b> ${esc(v.delivery_address)}${v.delivery_phone?" · Ph: "+esc(v.delivery_phone):""}`:""}</div>
<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>${itemRows}${totals}</table>
<div class="ft">${v.vtype==="HOLD"?"<b>HOLD — maal roka gaya hai, bill nahi bana.</b><br>":""}Created: ${esc(String(v.created_at).slice(0,16).replace("T"," "))} ${v.status==="Cancelled"?"<b style='color:#C0392B'> · CANCELLED</b>":""}</div></div>`;
printHTML(`<!DOCTYPE html><html><head><title>${esc(v.vno)}</title><style>
@page{size:A5 landscape;margin:5mm}
html,body{margin:0;padding:0} body{font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#111}
.sheet{display:flex;width:100%;box-sizing:border-box;min-height:136mm}
.half{width:50%;box-sizing:border-box;padding:2mm 3mm;position:relative}
.half:first-child{border-right:1.5px solid #0B1D33}
.copy{text-align:center;font-size:8.5px;letter-spacing:2px;font-weight:bold;color:#0B1D33;margin-bottom:2px}
h1{font-size:13px;margin:0;letter-spacing:1.5px} .eid{font-size:14px;font-weight:bold;margin-top:1px}
.hd{display:flex;justify-content:space-between;border-bottom:2px solid #0B1D33;padding-bottom:4px;margin-bottom:5px}
table{width:100%;border-collapse:collapse;margin:4px 0} th,td{border:1px solid #999;padding:2.5px 4px;text-align:left;font-size:8.5px}
th{background:#0B1D33;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact} .r{text-align:right;white-space:nowrap} .tot td{font-weight:bold}
.ft{margin-top:5px;font-size:8px} .muted{color:#666}
@media screen{body{background:#eee;padding:10px} .sheet{background:#fff;width:210mm;margin:auto;box-shadow:0 2px 8px #0003}}
</style></head><body><div class="sheet">${half("ORIGINAL")}${half("DUPLICATE")}</div></body></html>`, true);
}

window._WS_BUILD="WS v1";
window.vWSAcct=vWSAcct; window.wsLoad=wsLoad; window.wsReload=wsReload;

(()=>{'use strict';
const KEY='montx-expenses-v1',SITE_KEY='montx-sites-v1';
const EXPENSE_CATEGORIES=['Materials','Transport','Equipment / Rent','Fuel','Food / Accommodation','Repairs / Maintenance','Utilities','Office / Admin','Safety / PPE','Other'];
const INCOME_CATEGORIES=['Client Payment','Project Advance','Milestone Payment','Reimbursement','Material Sale','Other Income'];
const ALL_CATEGORIES=[...EXPENSE_CATEGORIES,...INCOME_CATEGORIES];
const $=id=>document.getElementById(id),read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}},write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const typeOf=e=>e.type==='income'?'income':'expense';
let entries=[],sites=[],modal,toast;
function notify(message){$('toastMessage').textContent=message;toast.show()}
function load(){entries=read(KEY);sites=read(SITE_KEY)}
function fillOptions(){
 const currentSite=$('siteFilter').value||'all',currentCategory=$('categoryFilter').value||'all',formSite=$('entrySite').value||'';
 $('siteFilter').innerHTML='<option value="all">All sites</option><option value="__general">General / Office</option>'+sites.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
 $('entrySite').innerHTML='<option value="">General / Office</option>'+sites.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
 $('categoryFilter').innerHTML='<option value="all">All categories</option>'+ALL_CATEGORIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 $('siteFilter').value=[...$('siteFilter').options].some(o=>o.value===currentSite)?currentSite:'all';
 $('categoryFilter').value=ALL_CATEGORIES.includes(currentCategory)?currentCategory:'all';
 $('entrySite').value=[...$('entrySite').options].some(o=>o.value===formSite)?formSite:'';
 syncEntryType();
}
function syncEntryType(){
 const type=$('entryType').value==='income'?'income':'expense',isIncome=type==='income',category=$('entryCategory').value;
 const categories=isIncome?INCOME_CATEGORIES:EXPENSE_CATEGORIES;
 $('entryCategory').innerHTML=categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 $('entryCategory').value=categories.includes(category)?category:categories[0];
 $('entryModalTitle').textContent=$('entryId').value?(isIncome?'Edit income':'Edit expense'):(isIncome?'Add income':'Add expense');
 $('entryDescription').placeholder=isIncome?'e.g. Client payment for slab completion':'e.g. Diesel for site generator';
 $('entryPayeeLabel').textContent=isIncome?'Received from / Client':'Payee / Supplier';
 $('entryPayee').placeholder=isIncome?'Client or payer':'Supplier or person paid';
 $('entryModeLabel').textContent=isIncome?'Receipt mode':'Payment mode';
 $('entryHint').textContent=isIncome?'Record money received from a client, project advance, reimbursement or other source.':'Record project spending. Labour attendance earnings are calculated separately; do not enter salary withdrawals or salary payments here.';
 $('saveEntry').textContent=isIncome?($('entryId').value?'Update income':'Save income'):($('entryId').value?'Update expense':'Save expense');
}
function currentRows(){
 const from=$('dateFrom').value,to=$('dateTo').value,site=$('siteFilter').value,category=$('categoryFilter').value,q=$('searchEntry').value.trim().toLowerCase();
 return entries.filter(e=>(!from||String(e.date||'')>=from)&&(!to||String(e.date||'')<=to)&&(site==='all'||(site==='__general'?!e.siteId:e.siteId===site))&&(category==='all'||e.category===category)&&(!q||`${e.description||''} ${e.payee||''} ${e.reference||''} ${e.notes||''} ${e.siteName||''} ${e.category||''}`.toLowerCase().includes(q))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function render(){
 load();fillOptions();const rows=currentRows();
 const incomeRows=rows.filter(e=>typeOf(e)==='income'),expenseRows=rows.filter(e=>typeOf(e)==='expense');
 const income=incomeRows.reduce((n,e)=>n+(Number(e.amount)||0),0),expense=expenseRows.reduce((n,e)=>n+(Number(e.amount)||0),0),balance=income-expense;
 const groups=new Map();expenseRows.forEach(e=>groups.set(e.category||'Other',(groups.get(e.category||'Other')||0)+(Number(e.amount)||0)));
 const top=[...groups.entries()].sort((a,b)=>b[1]-a[1])[0];
 $('totalIncome').textContent=money(income);$('totalExpense').textContent=money(expense);$('netBalance').textContent=money(balance);$('netBalance').classList.toggle('negative-balance',balance<0);$('entryCount').textContent=String(rows.length);
 $('resultSummary').textContent=`Showing ${rows.length} entries: ${incomeRows.length} income and ${expenseRows.length} expenses`;
 $('entryRows').innerHTML=rows.map(e=>{const incomeType=typeOf(e)==='income';return `<tr><td>${esc(e.date)}</td><td><span class="entry-type ${incomeType?'income':'expense'}">${incomeType?'Income':'Expense'}</span></td><td>${esc(e.siteName||'General / Office')}</td><td><span class="expense-category">${esc(e.category||'Other')}</span></td><td><b>${esc(e.description)}</b>${e.reference?`<small>Ref: ${esc(e.reference)}</small>`:''}${e.notes?`<small>${esc(e.notes)}</small>`:''}</td><td>${esc(e.payee||'—')}</td><td>${esc(e.mode||'—')}</td><td class="${incomeType?'income-amount':'expense-amount'}"><b>${incomeType?'+':'−'}${money(e.amount)}</b></td><td><div class="d-flex gap-1"><button type="button" class="action-btn" data-edit="${esc(e.id)}" title="Edit entry"><i class="bi bi-pencil"></i></button><button type="button" class="action-btn danger" data-delete="${esc(e.id)}" title="Delete entry"><i class="bi bi-trash"></i></button></div></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-state"><i class="bi bi-wallet2"></i>No entries found. Add income or an expense, or adjust your filters.</td></tr>';
}
function resetForm(){ $('entryForm').reset();$('entryId').value='';$('entryDate').value=today();$('entryType').value='expense';syncEntryType();$('entryCategory').value=EXPENSE_CATEGORIES[0] }
function openEdit(id){const e=entries.find(x=>x.id===id);if(!e)return;fillOptions();$('entryId').value=e.id;$('entryDate').value=e.date||today();$('entryType').value=typeOf(e);$('entrySite').value=e.siteId||'';$('entryDescription').value=e.description||'';$('entryAmount').value=e.amount??'';$('entryPayee').value=e.payee||'';$('entryMode').value=e.mode||'Cash';$('entryReference').value=e.reference||'';$('entryNotes').value=e.notes||'';syncEntryType();$('entryCategory').value=e.category||((typeOf(e)==='income')?INCOME_CATEGORIES[0]:EXPENSE_CATEGORIES[0]);modal.show()}
function exportPdf(){
 const rows=currentRows(),incomeRows=rows.filter(e=>typeOf(e)==='income'),expenseRows=rows.filter(e=>typeOf(e)==='expense');
 const income=incomeRows.reduce((n,e)=>n+(Number(e.amount)||0),0),expense=expenseRows.reduce((n,e)=>n+(Number(e.amount)||0),0),balance=income-expense;
 const from=$('dateFrom').value||'Earliest',to=$('dateTo').value||'Latest',siteValue=$('siteFilter').value,categoryValue=$('categoryFilter').value;
 const siteLabel=siteValue==='all'?'All sites':siteValue==='__general'?'General / Office':sites.find(x=>x.id===siteValue)?.name||'Selected site';
 const subtitle=`Period: ${from} to ${to} · Site: ${siteLabel} · Category: ${categoryValue==='all'?'All categories':categoryValue} · ${rows.length} entries`;
 const th='padding:8px 7px;text-align:left;background:#eef2f7;color:#334155;font-size:9px;border-bottom:1px solid #dce3ec;';
 const td='padding:8px 7px;border-bottom:1px solid #e5eaf0;font-size:9px;vertical-align:top;';
 const summary=`<div style="display:flex;gap:10px;margin-bottom:16px"><div style="flex:1;padding:12px;border-radius:9px;background:#f7f9fc"><div style="font-size:10px;color:#64748b">Total income</div><b style="display:block;font-size:19px;color:#13805d;margin-top:5px">${money(income)}</b></div><div style="flex:1;padding:12px;border-radius:9px;background:#f7f9fc"><div style="font-size:10px;color:#64748b">Total expenses</div><b style="display:block;font-size:19px;color:#be3455;margin-top:5px">${money(expense)}</b></div><div style="flex:1;padding:12px;border-radius:9px;background:#f7f9fc"><div style="font-size:10px;color:#64748b">Net balance (Income − Expenses)</div><b style="display:block;font-size:19px;color:${balance<0?'#be3455':'#13805d'};margin-top:5px">${money(balance)}</b></div></div>`;
 const table=`<table class="expense-register-table" style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse"><thead><tr>${['Date','Type','Site','Category','Description / Reference','Received from / Payee','Mode','Amount'].map(x=>`<th style="${th}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(e=>{const isIncome=typeOf(e)==='income';return `<tr><td style="${td}">${esc(e.date)}</td><td style="${td};font-weight:700;color:${isIncome?'#13805d':'#be3455'}">${isIncome?'Income':'Expense'}</td><td style="${td}">${esc(e.siteName||'General / Office')}</td><td style="${td}">${esc(e.category||'Other')}</td><td style="${td}">${esc(e.description)}${e.reference?`<br><span style="color:#64748b">Ref: ${esc(e.reference)}</span>`:''}${e.notes?`<br><span style="color:#64748b">${esc(e.notes)}</span>`:''}</td><td style="${td}">${esc(e.payee||'-')}</td><td style="${td}">${esc(e.mode||'-')}</td><td style="${td};font-weight:700;white-space:nowrap;color:${isIncome?'#13805d':'#be3455'}">${isIncome?'+':'−'}${money(e.amount)}</td></tr>`}).join('')||`<tr><td colspan="8" style="${td};text-align:center;color:#64748b">No entries in this selection.</td></tr>`}</tbody></table>`;
 const filename=`MontX_Financial_Register_${from}_to_${to}.pdf`.replace(/[^a-z0-9_.-]/gi,'_');
 window.MontXPdf.download({filename,title:'Income & Expense Register',subtitle,content:summary+table});
}
$('addEntry').addEventListener('click',()=>{load();fillOptions();resetForm()});
$('entryType').addEventListener('change',syncEntryType);
$('entryForm').addEventListener('submit',e=>{e.preventDefault();load();const id=$('entryId').value,date=$('entryDate').value,type=$('entryType').value==='income'?'income':'expense',site=sites.find(s=>s.id===$('entrySite').value),category=$('entryCategory').value,description=$('entryDescription').value.trim(),amount=Number($('entryAmount').value);const validCategories=type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES;if(!date||!validCategories.includes(category)||!description||!Number.isFinite(amount)||amount<=0){notify('Enter a valid date, category, description and positive amount.');return}const record={date,type,siteId:site?.id||'',siteName:site?.name||'General / Office',category,description,amount:Math.round(amount*100)/100,payee:$('entryPayee').value.trim(),mode:$('entryMode').value,reference:$('entryReference').value.trim(),notes:$('entryNotes').value.trim(),updatedAt:new Date().toISOString()};if(id){const old=entries.find(x=>x.id===id);if(old)Object.assign(old,record);notify(`${type==='income'?'Income':'Expense'} updated.`)}else{entries.unshift({id:crypto.randomUUID?.()||String(Date.now()),...record,createdAt:new Date().toISOString()});notify(`${type==='income'?'Income':'Expense'} saved.`)}write(KEY,entries);modal.hide();render()});
$('entryRows').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit){openEdit(edit.dataset.edit);return}if(del){const item=entries.find(x=>x.id===del.dataset.delete);if(!item)return;if(!confirm(`Delete ${typeOf(item)} "${item.description}"?`))return;entries=entries.filter(x=>x.id!==item.id);write(KEY,entries);render();notify('Entry deleted.')}});
['dateFrom','dateTo','siteFilter','categoryFilter'].forEach(id=>$(id).addEventListener('change',()=>{const from=$('dateFrom').value,to=$('dateTo').value;if(from&&to&&from>to){notify('From date cannot be later than To date.');if(id==='dateFrom')$('dateFrom').value='';else $('dateTo').value=''}render()}));
$('searchEntry').addEventListener('input',render);$('clearFilters').addEventListener('click',()=>{$('searchEntry').value='';$('dateFrom').value='';$('dateTo').value='';$('siteFilter').value='all';$('categoryFilter').value='all';render()});$('exportEntryPdf').addEventListener('click',exportPdf);
modal=bootstrap.Modal.getOrCreateInstance($('entryModal'));toast=bootstrap.Toast.getOrCreateInstance($('noticeToast'),{delay:2400});$('entryDate').value=today();window.addEventListener('storage',e=>{if(!e.key||e.key===KEY||e.key===SITE_KEY)render()});render();
})();

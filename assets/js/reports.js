(()=>{'use strict';
const EXPENSE_KEY='montx-expenses-v1',ATT_KEY='montx-attendance-v1',SITE_KEY='montx-sites-v1';
const $=id=>document.getElementById(id),read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthStart=()=>today().slice(0,7)+'-01';
const typeOf=e=>e.type==='income'?'income':'expense';
let sites=[],attendance=[],entries=[],detail=[],pdfSiteRows=[],pdfExpenseCategories=[],pdfIncomeCategories=[],pdfTotals={labour:0,expenses:0,income:0,cost:0,balance:0};
function load(){sites=read(SITE_KEY);attendance=read(ATT_KEY);entries=read(EXPENSE_KEY)}
function fillSites(){const current=$('siteFilter').value||'all';$('siteFilter').innerHTML='<option value="all">All sites</option><option value="__general">General / Office</option>'+sites.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('siteFilter').value=[...$('siteFilter').options].some(o=>o.value===current)?current:'all'}
function locationKey(record){return record.siteId||'__general'}
function locationName(record){if(record.siteName)return record.siteName;return sites.find(s=>s.id===record.siteId)?.name||(record.siteId?'Removed site':'General / Office')}
function update(){
 load();fillSites();const from=$('dateFrom').value,to=$('dateTo').value,site=$('siteFilter').value;
 const inRange=x=>(!from||String(x.date||'')>=from)&&(!to||String(x.date||'')<=to)&&(site==='all'||locationKey(x)===site);
 const labour=attendance.filter(inRange),nonLabour=entries.filter(inRange),expenseEntries=nonLabour.filter(x=>typeOf(x)==='expense'),incomeEntries=nonLabour.filter(x=>typeOf(x)==='income');
 const siteMap=new Map(),getSite=(key,name)=>{if(!siteMap.has(key))siteMap.set(key,{key,name,labour:0,expenses:0,income:0,total:0,balance:0});return siteMap.get(key)};
 labour.forEach(a=>{const k=locationKey(a),r=getSite(k,locationName(a));r.labour+=Number(a.amount)||0});
 expenseEntries.forEach(x=>{const k=locationKey(x),r=getSite(k,locationName(x));r.expenses+=Number(x.amount)||0});
 incomeEntries.forEach(x=>{const k=locationKey(x),r=getSite(k,locationName(x));r.income+=Number(x.amount)||0});
 const siteRows=[...siteMap.values()].map(x=>({...x,total:x.labour+x.expenses,balance:x.income-x.labour-x.expenses})).sort((a,b)=>b.total-a.total);
 const labourTotal=labour.reduce((n,x)=>n+(Number(x.amount)||0),0),expenseTotal=expenseEntries.reduce((n,x)=>n+(Number(x.amount)||0),0),incomeTotal=incomeEntries.reduce((n,x)=>n+(Number(x.amount)||0),0),total=labourTotal+expenseTotal,balance=incomeTotal-total;
 pdfSiteRows=siteRows;pdfTotals={labour:labourTotal,expenses:expenseTotal,income:incomeTotal,cost:total,balance};
 $('totalCost').textContent=money(total);$('totalIncome').textContent=money(incomeTotal);$('netBalance').textContent=money(balance);$('netBalance').classList.toggle('negative-balance',balance<0);$('labourCost').textContent=money(labourTotal);$('otherCost').textContent=money(expenseTotal);
 $('rangeLabel').textContent=`${from||'All dates'} to ${to||'Today'} · ${labour.length} attendance · ${expenseEntries.length} expenses · ${incomeEntries.length} income entries`;
 $('siteCostRows').innerHTML=siteRows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${money(x.labour)}</td><td>${money(x.expenses)}</td><td>${money(x.income)}</td><td class="money ${x.balance<0?'negative-balance':''}">${money(x.balance)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-state">No financial records for this period.</td></tr>';
 const byExpenseCategory=new Map();expenseEntries.forEach(x=>byExpenseCategory.set(x.category||'Other',(byExpenseCategory.get(x.category||'Other')||0)+(Number(x.amount)||0)));
 const byIncomeCategory=new Map();incomeEntries.forEach(x=>byIncomeCategory.set(x.category||'Other Income',(byIncomeCategory.get(x.category||'Other Income')||0)+(Number(x.amount)||0)));
 pdfExpenseCategories=[...byExpenseCategory.entries()].sort((a,b)=>b[1]-a[1]);pdfIncomeCategories=[...byIncomeCategory.entries()].sort((a,b)=>b[1]-a[1]);
 $('categoryBreakdown').innerHTML=pdfExpenseCategories.map(([name,amount])=>`<div class="category-row"><span>${esc(name)}</span><b>${money(amount)}</b></div>`).join('')||'<div class="empty-state">No expenses for this period.</div>';
 $('incomeBreakdown').innerHTML=pdfIncomeCategories.map(([name,amount])=>`<div class="category-row"><span>${esc(name)}</span><b>${money(amount)}</b></div>`).join('')||'<div class="empty-state">No income for this period.</div>';
 detail=[
  ...labour.map(a=>({date:a.date,type:'Labour cost',site:locationName(a),category:a.vendorName||'Vendor',description:`Karigar ${a.karigarCount??0} · Majur ${a.majurCount??0}${(Number(a.karigarHours)||0)+(Number(a.majurHours)||0)>0?` · Extra hours ${(Number(a.karigarHours)||0)+(Number(a.majurHours)||0)}h`:''}`,amount:Number(a.amount)||0})),
  ...expenseEntries.map(x=>({date:x.date,type:'Expense',site:locationName(x),category:x.category||'Other',description:`${x.description||''}${x.payee?` · ${x.payee}`:''}`,amount:Number(x.amount)||0})),
  ...incomeEntries.map(x=>({date:x.date,type:'Income',site:locationName(x),category:x.category||'Other Income',description:`${x.description||''}${x.payee?` · ${x.payee}`:''}`,amount:Number(x.amount)||0}))
 ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 $('detailRows').innerHTML=detail.slice(0,500).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.type)}</td><td>${esc(x.site)}</td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td class="money ${x.type==='Income'?'income-amount':''}">${x.type==='Income'?'+':''}${money(x.amount)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty-state">No detail records to display.</td></tr>';
}
function exportPdf(){
 const from=$('dateFrom').value||'All dates',to=$('dateTo').value||'Today',siteId=$('siteFilter').value;
 const siteLabel=siteId==='all'?'All sites':siteId==='__general'?'General / Office':sites.find(x=>x.id===siteId)?.name||'Selected site';
 const subtitle=`Period: ${from} to ${to} · Site: ${siteLabel} · ${detail.length} detail records`;
 const th='padding:8px 7px;text-align:left;background:#eef2f7;color:#334155;font-size:9px;border-bottom:1px solid #dce3ec;';
 const td='padding:8px 7px;border-bottom:1px solid #e5eaf0;font-size:9px;vertical-align:top;';
 const card=(label,value,color='#172033')=>`<div style="flex:1;min-width:0;padding:12px;border-radius:9px;background:#f7f9fc"><div style="font-size:10px;color:#64748b">${label}</div><b style="display:block;font-size:17px;color:${color};margin-top:5px">${money(value)}</b></div>`;
 const summary=`<div style="display:flex;gap:9px;margin-bottom:16px">${card('Total project cost',pdfTotals.cost)}${card('Total income',pdfTotals.income,'#13805d')}${card('Net balance',pdfTotals.balance,pdfTotals.balance<0?'#be3455':'#13805d')}</div><div style="font-size:10px;color:#64748b;margin-bottom:14px">Labour cost: <b>${money(pdfTotals.labour)}</b> &nbsp; | &nbsp; Other expenses: <b>${money(pdfTotals.expenses)}</b></div>`;
 const siteTable=`<h3 style="font-size:13px;color:#253449;margin:17px 0 8px">Financial Summary by Site</h3><table class="project-site-table" style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:12px"><thead><tr>${['Site / Project','Labour','Expenses','Income','Net balance'].map(x=>`<th style="${th}">${x}</th>`).join('')}</tr></thead><tbody>${pdfSiteRows.map(x=>`<tr><td style="${td}">${esc(x.name)}</td><td style="${td}">${money(x.labour)}</td><td style="${td}">${money(x.expenses)}</td><td style="${td}">${money(x.income)}</td><td style="${td};font-weight:700;color:${x.balance<0?'#be3455':'#13805d'}">${money(x.balance)}</td></tr>`).join('')||`<tr><td colspan="5" style="${td}">No site records for this period.</td></tr>`}</tbody></table>`;
 const categoryTable=(heading,rows,empty)=>`<h3 style="font-size:13px;color:#253449;margin:17px 0 8px">${heading}</h3><table style="width:100%;border-collapse:collapse;margin-bottom:12px"><thead><tr><th style="${th}">Category</th><th style="${th}">Amount</th></tr></thead><tbody>${rows.map(([name,amount])=>`<tr><td style="${td}">${esc(name)}</td><td style="${td};font-weight:700">${money(amount)}</td></tr>`).join('')||`<tr><td colspan="2" style="${td}">${empty}</td></tr>`}</tbody></table>`;
 const detailTable=`<h3 style="font-size:13px;color:#253449;margin:17px 0 8px">Financial Detail</h3><table class="project-detail-table" style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse"><thead><tr>${['Date','Type','Site','Category / Vendor','Description','Amount'].map(x=>`<th style="${th}">${x}</th>`).join('')}</tr></thead><tbody>${detail.map(x=>`<tr><td style="${td}">${esc(x.date)}</td><td style="${td}">${esc(x.type)}</td><td style="${td}">${esc(x.site)}</td><td style="${td}">${esc(x.category)}</td><td style="${td}">${esc(x.description)}</td><td style="${td};font-weight:700;white-space:nowrap;color:${x.type==='Income'?'#13805d':'#172033'}">${x.type==='Income'?'+':''}${money(x.amount)}</td></tr>`).join('')||`<tr><td colspan="6" style="${td}">No records for this period.</td></tr>`}</tbody></table>`;
 const content=summary+siteTable+categoryTable('Expense Categories',pdfExpenseCategories,'No expenses.')+categoryTable('Income Sources',pdfIncomeCategories,'No income.')+detailTable+`<p style="font-size:9px;color:#64748b;line-height:1.5;margin-top:14px">Project cost = labour attendance earnings + other expenses. Net balance = income received − project cost. Salary withdrawals and payments are excluded to avoid counting labour twice. Inventory quantities are excluded because purchase-price valuation is not currently stored.</p>`;
 const filename=`MontX_Project_Financial_Report_${from}_to_${to}.pdf`.replace(/[^a-z0-9_.-]/gi,'_');
 window.MontXPdf.download({filename,title:'Project Financial Report',subtitle,content});
}
['dateFrom','dateTo','siteFilter'].forEach(id=>$(id).addEventListener('change',()=>{const from=$('dateFrom').value,to=$('dateTo').value;if(from&&to&&from>to){alert('From date cannot be later than To date.');if(id==='dateFrom')$('dateFrom').value='';else $('dateTo').value=''}update()}));
$('clearReport').addEventListener('click',()=>{$('dateFrom').value=monthStart();$('dateTo').value=today();$('siteFilter').value='all';update()});
$('exportReport').addEventListener('click',exportPdf);
$('dateFrom').value=monthStart();$('dateTo').value=today();window.addEventListener('storage',e=>{if(!e.key||[EXPENSE_KEY,ATT_KEY,SITE_KEY].includes(e.key))update()});update();
})();

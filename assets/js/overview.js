(()=>{'use strict';
const KEYS={sites:'montx-sites-v1',vendors:'montx-vendors-v1',attendance:'montx-attendance-v1',transactions:'montx-salary-transactions-v1',expenses:'montx-expenses-v1',materials:'montx-inventory-items-v1',moves:'montx-inventory-movements-v1',activity:'montx-activity-v1'};
const $=id=>document.getElementById(id),read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}},num=v=>Number(v)||0;
const money=v=>'₹'+new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(num(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?'':`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=dateKey(new Date()),month=today.slice(0,7),year=today.slice(0,4);
function relative(iso){if(!iso)return 'Date not recorded';const t=new Date(iso).getTime();if(!Number.isFinite(t))return 'Date not recorded';const mins=Math.max(0,Math.floor((Date.now()-t)/60000));if(mins<1)return 'Just now';if(mins<60)return `${mins} min ago`;if(mins<1440)return `${Math.floor(mins/60)} hr ago`;if(mins<2880)return 'Yesterday';return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
function load(){return Object.fromEntries(Object.entries(KEYS).map(([k,v])=>[k,read(v)]))}
function set(id,value){const el=$(id);if(el)el.textContent=value}
function activityRows(d){
 const source=d.activity.map(a=>({at:a.at||a.createdAt,action:a.action||'Record updated',module:a.module||'Workspace',detail:a.detail||''}));
 if(!source.length){
  d.attendance.forEach(x=>source.push({at:x.createdAt||`${x.date||today}T12:00:00`,action:'Attendance recorded',module:'Attendance',detail:`${x.siteName||'Site'} · ${num(x.karigarCount)+num(x.majurCount)} workers · ${x.vendorName||'Vendor'}`}));
  d.expenses.forEach(x=>source.push({at:x.updatedAt||x.createdAt||`${x.date||today}T12:00:00`,action:x.type==='income'?'Income received':'Expense recorded',module:'Income & Expenses',detail:`${x.siteName||'General / Office'} · ${x.description||x.category||''} · ${money(x.amount)}`}));
  d.moves.forEach(x=>source.push({at:x.createdAt||`${x.date||today}T12:00:00`,action:x.type==='receipt'?'Material received':x.type==='transfer'?'Material transferred':x.type==='issue'?'Material issued':'Stock adjusted',module:'Inventory',detail:`${x.notes||'Stock movement'} · ${x.qty||0} units`}));
  d.transactions.forEach(x=>source.push({at:x.createdAt||`${x.date||today}T12:00:00`,action:x.type==='withdrawal'?'Vendor withdrawal':'Vendor payment',module:'Salary & Payments',detail:`${x.vendorName||'Vendor'} · ${money(x.amount)}`}));
 }
 const icons={'Attendance':'bi-person-check','Income & Expenses':'bi-receipt','Inventory':'bi-box-seam','Salary & Payments':'bi-credit-card','Sites':'bi-building','Vendors':'bi-people'};
 const list=source.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0)).slice(0,5);
 $('recentActivityList').innerHTML=list.length?list.map(a=>`<div class="event"><span class="event-icon"><i class="bi ${icons[a.module]||'bi-activity'}"></i></span><div><b>${esc(a.action)}</b><small>${esc(a.detail||a.module)}</small><time>${esc(relative(a.at))}</time></div></div>`).join(''):'<div class="empty-state">No activity yet. Add attendance, a stock movement or an income/expense entry to see it here.</div>';
}
function render(){
 const d=load(),sites=d.sites,vendors=d.vendors,attendance=d.attendance,tx=d.transactions,expenses=d.expenses;
 const activeSites=sites.filter(s=>(s.status||'Active')==='Active');
 const todayRows=attendance.filter(a=>a.date===today),todayWorkers=todayRows.reduce((n,a)=>n+num(a.karigarCount)+num(a.majurCount),0);
 const monthAttendance=attendance.filter(a=>String(a.date||'').slice(0,7)===month),labourCost=monthAttendance.reduce((n,a)=>n+num(a.amount),0);
 const monthOther=expenses.filter(e=>String(e.date||'').slice(0,7)===month&&e.type!=='income').reduce((n,e)=>n+num(e.amount),0);
 const monthIncome=expenses.filter(e=>String(e.date||'').slice(0,7)===month&&e.type==='income').reduce((n,e)=>n+num(e.amount),0);
 const byVendor=new Map();monthAttendance.forEach(a=>byVendor.set(a.vendorId,(byVendor.get(a.vendorId)||0)+num(a.amount)));
 tx.filter(t=>String(t.date||'').slice(0,7)===month).forEach(t=>byVendor.set(t.vendorId,(byVendor.get(t.vendorId)||0)-(num(t.amount))));
 const pending=[...byVendor.values()].reduce((n,v)=>n+Math.max(0,v),0),pendingVendors=[...byVendor.values()].filter(v=>v>0).length;
 set('overviewDate',new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
 const hour=new Date().getHours();set('overviewGreeting',hour<12?'Good morning.':hour<17?'Good afternoon.':'Good evening.');
 set('metricProjects',String(sites.length).padStart(2,'0'));set('metricProjectsMeta',`${activeSites.length} active`);
 set('metricWorkforce',String(todayWorkers));set('metricWorkforceMeta','Today · Karigar + Majur');
 set('metricMonthlyCost',money(labourCost+monthOther));set('metricMonthlyCostMeta',`Labour ${money(labourCost)} + expenses ${money(monthOther)}`);
 set('metricPending',money(pending));set('metricPendingMeta',`${pendingVendors} vendor${pendingVendors===1?'':'s'} outstanding`);
 set('cashflowPeriod',`Jan–${new Date().toLocaleDateString('en-IN',{month:'short'})} ${year}`);
 const chart=window.MontXCashflowChart;if(chart){const labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],income=Array(12).fill(0),cost=Array(12).fill(0);expenses.filter(e=>String(e.date||'').startsWith(year)).forEach(e=>{const i=Number(String(e.date).slice(5,7))-1;if(i>=0&&i<12){if(e.type==='income')income[i]+=num(e.amount);else cost[i]+=num(e.amount)}});attendance.filter(a=>String(a.date||'').startsWith(year)).forEach(a=>{const i=Number(String(a.date).slice(5,7))-1;if(i>=0&&i<12)cost[i]+=num(a.amount)});chart.data.labels=labels;chart.data.datasets[0].data=income.map(v=>v/1000);chart.data.datasets[1].data=cost.map(v=>v/1000);chart.update('none')}
 const siteRows=activeSites.map(s=>{const ar=monthAttendance.filter(a=>a.siteId===s.id),workers=ar.reduce((n,a)=>n+num(a.karigarCount)+num(a.majurCount),0),cost=ar.reduce((n,a)=>n+num(a.amount),0)+expenses.filter(e=>e.siteId===s.id&&String(e.date||'').slice(0,7)===month&&e.type!=='income').reduce((n,e)=>n+num(e.amount),0);return {s,workers,cost,records:ar.length}}).sort((a,b)=>b.cost-a.cost).slice(0,6);
 $('overviewSiteRows').innerHTML=siteRows.length?siteRows.map(x=>`<tr><td><b>${esc(x.s.name)}</b><small>${esc(x.s.location||'Location not set')}</small></td><td>${x.workers.toLocaleString('en-IN')} <span class="overview-site-meta">workers this month</span></td><td>${money(x.cost)} <span class="overview-site-meta">this month</span></td><td><span class="overview-site-status">${esc(x.s.status||'Active')}</span></td></tr>`).join(''):'<tr><td colspan="4" class="text-center py-4">No sites yet. <a href="sites.html">Add your first site</a>.</td></tr>';
 activityRows(d);
}
render();window.addEventListener('storage',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});setInterval(()=>{if(!document.hidden)render()},5000);
})();

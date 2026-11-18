(()=>{
'use strict';
const KEYS={
 'montx-sites-v1':'Sites',
 'montx-vendors-v1':'Vendors',
 'montx-attendance-v1':'Attendance records',
 'montx-salary-transactions-v1':'Salary transactions',
 'montx-inventory-items-v1':'Inventory materials',
 'montx-inventory-movements-v1':'Inventory movements',
 'montx-expenses-v1':'Income & expenses'
};
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('en-IN').format(n);
const read=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}};
const count=(v)=>Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);
const safeName=s=>String(s).replace(/[^a-z0-9_-]+/gi,'_');
function snapshot(){const data={};Object.keys(KEYS).forEach(k=>data[k]=read(k));return {app:'MontX Construction Management',format:'montx-backup',version:1,exportedAt:new Date().toISOString(),data};}
function download(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function updateStats(){let used=0,total=0;Object.keys(KEYS).forEach(k=>{const raw=localStorage.getItem(k)||'';used+=new Blob([raw]).size;total+=count(read(k));});const activity=read('montx-activity-v1');used+=new Blob([localStorage.getItem('montx-activity-v1')||'']).size;$('storageUsed').textContent=used<1024?`${used} B`:`${(used/1024).toFixed(1)} KB`;$('recordCount').textContent=fmt(total);$('activityCount').textContent=fmt(activity.length);$('storageBar').style.width=Math.min(100,used/ (5*1024*1024)*100)+'%';}
function renderActivity(){const rows=read('montx-activity-v1').slice().reverse().slice(0,100);$('activityBody').innerHTML=rows.length?rows.map(x=>`<tr><td>${new Date(x.at).toLocaleString('en-IN')}</td><td><b>${escapeHtml(x.action||'Updated')}</b></td><td>${escapeHtml(x.module||'Workspace')}</td><td>${escapeHtml(x.detail||'Data changed')}</td></tr>`).join(''):'<tr><td colspan="4" class="text-center py-4">No activity recorded yet. New changes will appear here.</td></tr>';}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showPreview(obj){const data=obj.data,lines=Object.keys(KEYS).map(k=>`<div class="preview-row"><span>${KEYS[k]}</span><b>${fmt(count(data[k]??[]))} records</b></div>`).join('');$('backupPreview').innerHTML=`<div class="preview-meta">Backup created: ${escapeHtml(new Date(obj.exportedAt||Date.now()).toLocaleString('en-IN'))}</div>${lines}`;$('restoreBtn').disabled=false;$('backupPreview').dataset.ready='yes';window.pendingMontXBackup=obj;}
$('backupBtn').addEventListener('click',()=>{const b=snapshot();download(b,`MontX_Backup_${new Date().toISOString().slice(0,10)}.json`);log('Backup created','Data & Backup','Full workspace backup downloaded');renderActivity();updateStats();});
$('backupFile').addEventListener('change',async e=>{const f=e.target.files?.[0];$('restoreBtn').disabled=true;$('backupPreview').dataset.ready='no';window.pendingMontXBackup=null;if(!f)return;try{const obj=JSON.parse(await f.text());if(obj.format!=='montx-backup'||obj.version!==1||!obj.data||typeof obj.data!=='object')throw new Error('This is not a supported MontX backup file.');for(const k of Object.keys(KEYS)){if(k in obj.data&&!Array.isArray(obj.data[k]))throw new Error(`Invalid data format for ${KEYS[k]}.`);}showPreview(obj);}catch(err){$('backupPreview').innerHTML=`<p class="text-danger mb-0">${escapeHtml(err.message)}</p>`;}});
$('restoreBtn').addEventListener('click',()=>{const obj=window.pendingMontXBackup;if(!obj||$('backupPreview').dataset.ready!=='yes')return;if(!confirm('Restore this backup? Current MontX records will be replaced by the records in this backup. Download a backup of your current data first if you may need it.'))return;try{window.MONTX_RESTORING=true;Object.keys(KEYS).forEach(k=>{if(Array.isArray(obj.data[k]))localStorage.setItem(k,JSON.stringify(obj.data[k]));else localStorage.removeItem(k);});window.MONTX_RESTORING=false;log('Backup restored','Data & Backup',`Restored backup from ${obj.exportedAt||'unknown date'}`);alert('Backup restored. The page will now reload.');location.reload();}catch(err){window.MONTX_RESTORING=false;alert('Restore failed. Your browser may not have enough storage space. '+err.message);}});
$('refreshActivity').addEventListener('click',()=>{renderActivity();updateStats();});
$('clearActivity').addEventListener('click',()=>{if(!confirm('Clear activity history? This does not delete your sites, vendors, attendance, salary, inventory or income/expense records.'))return;localStorage.removeItem('montx-activity-v1');renderActivity();updateStats();});
function log(action,module,detail){let a=read('montx-activity-v1');a.push({id:`act-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),action,module,detail});if(a.length>300)a=a.slice(-300);localStorage.setItem('montx-activity-v1',JSON.stringify(a));}
renderActivity();updateStats();
})();

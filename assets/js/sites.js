(() => {
const KEY='montx-sites-v1';
const $=id=>document.getElementById(id);
const modal=bootstrap.Modal.getOrCreateInstance($('siteModal'));
const toast=bootstrap.Toast.getOrCreateInstance($('noticeToast'),{delay:2400});
const safeRead=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
let sites=safeRead();
const save=()=>localStorage.setItem(KEY,JSON.stringify(sites));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(msg){$('toastMessage').textContent=msg;toast.show()}
function render(){
 const q=$('siteSearch').value.trim().toLowerCase(),filter=$('statusFilter').value;
 const filtered=sites.filter(s=>(filter==='all'||s.status===filter)&&(`${s.name} ${s.location}`.toLowerCase().includes(q)));
 $('totalSites').textContent=sites.length;$('activeSites').textContent=sites.filter(s=>s.status==='Active').length;$('pausedSites').textContent=sites.filter(s=>s.status==='Paused').length;
 const cutoff=Date.now()-30*86400000;$('recentSites').textContent=sites.filter(s=>new Date(s.createdAt).getTime()>=cutoff).length;
 $('siteCount').textContent=`${filtered.length} of ${sites.length} sites`;
 $('siteGrid').innerHTML=filtered.length?filtered.map(s=>`<article class="site-card glass"><div class="site-card-top"><span class="site-symbol"><i class="bi bi-building"></i></span><div class="d-flex gap-1"><button type="button" class="site-menu" data-edit="${esc(s.id)}" title="Edit site"><i class="bi bi-pencil"></i></button><button type="button" class="site-menu text-danger" data-delete="${esc(s.id)}" title="Delete site"><i class="bi bi-trash"></i></button></div></div><h3>${esc(s.name)}</h3><div class="site-location"><i class="bi bi-geo-alt me-1"></i>${esc(s.location)}</div><div class="site-meta"><span>Added ${new Date(s.createdAt).toLocaleDateString()}</span><span class="site-status ${s.status==='Paused'?'paused':''}">${s.status}</span></div></article>`).join(''):`<div class="empty-state glass"><i class="bi bi-building-add"></i><b>${sites.length?'No matching sites':'Your site list is ready'}</b><div style="font-size:10px;margin-top:5px">${sites.length?'Try another search or status filter.':'Add your first project site to start organising your work.'}</div></div>`;
}
function reset(){ $('siteForm').reset();$('siteId').value='';$('modalTitle').textContent='Add new site';$('saveSiteBtn').textContent='Save site';$('siteStatus').value='Active'}
$('addSiteBtn').addEventListener('click',reset);
$('siteForm').addEventListener('submit',e=>{e.preventDefault();const id=$('siteId').value,name=$('siteName').value.trim(),location=$('siteLocation').value.trim(),status=$('siteStatus').value;if(!name||!location)return;
 if(id){const item=sites.find(s=>s.id===id);if(item)Object.assign(item,{name,location,status,updatedAt:new Date().toISOString()});notify('Site details updated.')}
 else{sites.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,location,status,createdAt:new Date().toISOString()});notify('New site added.')}
 save();render();modal.hide();});
// Keep the open card above neighbouring cards so the menu is never obscured.
$('siteGrid').addEventListener('show.bs.dropdown',e=>{const card=e.target.closest('.site-card');if(card)card.classList.add('menu-open')});
$('siteGrid').addEventListener('hidden.bs.dropdown',e=>{const card=e.target.closest('.site-card');if(card)card.classList.remove('menu-open')});
$('siteGrid').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit){const s=sites.find(x=>x.id===edit.dataset.edit);if(!s)return;$('siteId').value=s.id;$('siteName').value=s.name;$('siteLocation').value=s.location;$('siteStatus').value=s.status;$('modalTitle').textContent='Edit site';$('saveSiteBtn').textContent='Update site';modal.show()}if(del){const s=sites.find(x=>x.id===del.dataset.delete);if(!s)return;if(confirm(`Delete "${s.name}" from this browser? This cannot be undone.`)){sites=sites.filter(x=>x.id!==s.id);save();render();notify('Site deleted.')}}});
$('siteSearch').addEventListener('input',render);$('statusFilter').addEventListener('change',render);render();
})();
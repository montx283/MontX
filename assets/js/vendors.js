(() => {
'use strict';
const VENDOR_KEY='montx-vendors-v1',SITE_KEY='montx-sites-v1';
const $=id=>document.getElementById(id);
const modal=bootstrap.Modal.getOrCreateInstance($('vendorModal'));
const toast=bootstrap.Toast.getOrCreateInstance($('noticeToast'),{delay:2400});
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
let vendors=read(VENDOR_KEY),sites=read(SITE_KEY);
const save=()=>localStorage.setItem(VENDOR_KEY,JSON.stringify(vendors));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(Number(n)||0);
function notify(msg){$('toastMessage').textContent=msg;toast.show()}
function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function refreshSites(selected=[]){
 sites=read(SITE_KEY);
 $('siteChecks').innerHTML=sites.length?sites.map(s=>`<label class="site-check"><input type="checkbox" value="${esc(s.id)}" ${selected.includes(s.id)?'checked':''}>${esc(s.name)} <span style="color:var(--muted)">· ${esc(s.location)}</span></label>`).join(''):'<div class="form-text">No sites found. Add a site first.</div>';
}
function render(){
 const q=$('vendorSearch').value.trim().toLowerCase(),filter=$('vendorStatus').value;
 const filtered=vendors.filter(v=>(filter==='all'||v.status===filter)&&(`${v.name} ${v.description||''}`.toLowerCase().includes(q)));
 $('totalVendors').textContent=vendors.length;$('activeVendors').textContent=vendors.filter(v=>v.status==='Active').length;
 $('assignments').textContent=vendors.reduce((n,v)=>n+(v.siteIds||[]).length,0);
 const active=vendors.filter(v=>v.status==='Active');$('avgRate').textContent='₹'+money(active.length?active.reduce((n,v)=>n+Number(v.karigarRate),0)/active.length:0);
 $('vendorCount').textContent=`${filtered.length} of ${vendors.length} vendors`;
 $('vendorGrid').innerHTML=filtered.length?filtered.map(v=>{const names=(v.siteIds||[]).map(id=>sites.find(s=>s.id===id)?.name).filter(Boolean);return `<article class="vendor-card glass"><div class="vendor-top"><span class="vendor-avatar">${esc(initials(v.name))}</span><div class="d-flex gap-1"><button type="button" class="site-menu" data-edit="${esc(v.id)}" title="Edit vendor"><i class="bi bi-pencil"></i></button><button type="button" class="site-menu text-danger" data-delete="${esc(v.id)}" title="Delete vendor"><i class="bi bi-trash"></i></button></div></div><h3>${esc(v.name)}</h3><div class="vendor-desc">${esc(v.description||'No additional notes')}</div><div class="rate-row"><div class="rate"><small>Karigar / day</small><b>₹${money(v.karigarRate)} <span>INR</span></b></div><div class="rate"><small>Majur / day</small><b>₹${money(v.majurRate)} <span>INR</span></b></div></div><div class="vendor-bottom"><span class="assigned-sites" title="${esc(names.join(', '))}"><i class="bi bi-geo-alt me-1"></i>${names.length?esc(names.join(', ')):'No site assigned'}</span><span class="vendor-status ${v.status==='Inactive'?'inactive':''}">${esc(v.status)}</span></div></article>`}).join(''):`<div class="empty-state glass"><i class="bi bi-people"></i><b>${vendors.length?'No matching vendors':'Your vendor directory is ready'}</b><div style="font-size:10px;margin-top:5px">${vendors.length?'Try another search or status filter.':'Register a vendor and set their Karigar and Majur rates.'}</div></div>`;
}
function reset(){ $('vendorForm').reset();$('vendorId').value='';$('modalTitle').textContent='Register vendor';$('saveVendorBtn').textContent='Save vendor';$('vendorStatusInput').value='Active';refreshSites()}
$('addVendorBtn').addEventListener('click',reset);
$('vendorForm').addEventListener('submit',e=>{
 e.preventDefault();
 const id=$('vendorId').value,name=$('vendorName').value.trim(),karigarRate=Number($('karigarRate').value),majurRate=Number($('majurRate').value);
 if(!name||!Number.isFinite(karigarRate)||!Number.isFinite(majurRate)||karigarRate<0||majurRate<0){notify('Please enter valid vendor details and rates.');return}
 const siteIds=[...$('siteChecks').querySelectorAll('input:checked')].map(x=>x.value);
 const mobile=$('vendorMobile').value.trim();
 const data={name,mobile,karigarRate,majurRate,status:$('vendorStatusInput').value,siteIds,description:$('vendorDescription').value.trim()};
 if(id){const old=vendors.find(v=>v.id===id);if(old)Object.assign(old,data,{updatedAt:new Date().toISOString()});notify('Vendor details updated.')}
 else{vendors.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),...data,createdAt:new Date().toISOString()});notify('Vendor registered successfully.')}
 save();render();modal.hide();
});
$('vendorGrid').addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
 if(edit){const v=vendors.find(x=>x.id===edit.dataset.edit);if(!v)return;refreshSites(v.siteIds||[]);$('vendorId').value=v.id;$('vendorName').value=v.name;$('vendorMobile').value=v.mobile||'';$('karigarRate').value=v.karigarRate;$('majurRate').value=v.majurRate;$('vendorStatusInput').value=v.status;$('vendorDescription').value=v.description||'';$('modalTitle').textContent='Edit vendor';$('saveVendorBtn').textContent='Update vendor';modal.show()}
 if(del){const v=vendors.find(x=>x.id===del.dataset.delete);if(!v)return;if(confirm(`Delete vendor "${v.name}"? This removes the vendor from this browser's vendor list. Historical salary records are not connected yet.`)){vendors=vendors.filter(x=>x.id!==v.id);save();render();notify('Vendor deleted.')}}
});
$('vendorSearch').addEventListener('input',render);$('vendorStatus').addEventListener('change',render);
window.addEventListener('storage',e=>{if(e.key===SITE_KEY){sites=read(SITE_KEY);render()}});
render();
})();
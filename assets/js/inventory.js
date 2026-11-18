(()=>{
  'use strict';
  const IK='montx-inventory-items-v1',MK='montx-inventory-movements-v1',SK='montx-sites-v1';
  const $=id=>document.getElementById(id);
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  let items=[],moves=[],sites=[],editingItemId=null,itemModal,moveModal,adjustModal;
  const locName=id=>id==='godown'?'Main Godown':sites.find(s=>s.id===id)?.name||'Unknown site';
  const num=n=>Number.isFinite(Number(n))?Number(n):0;
  const fmt=n=>num(n).toLocaleString('en-IN',{maximumFractionDigits:2});
  function load(){items=read(IK);moves=read(MK);sites=read(SK)}
  function locations(){return '<option value="godown">Main Godown</option>'+sites.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}
  function stock(item,loc){return moves.reduce((n,m)=>n+(m.toId===loc&&m.itemId===item.id?num(m.qty):0)-(m.fromId===loc&&m.itemId===item.id?num(m.qty):0),0)}
  function updateLocationFilter(){const select=$('siteFilter'),current=select.value;select.innerHTML='<option value="all">All locations</option>'+locations();select.value=[...select.options].some(o=>o.value===current)?current:'all'}
  function render(){
    load();updateLocationFilter();
    const query=$('search').value.trim().toLocaleLowerCase(),location=$('siteFilter').value;
    let total=0,godownTotal=0,low=0;
    const rows=items.filter(i=>String(i.name||'').toLocaleLowerCase().includes(query)).map(i=>{
      const g=stock(i,'godown');const siteStocks=sites.map(s=>({id:s.id,name:s.name,qty:stock(i,s.id)}));
      const t=g+siteStocks.reduce((n,x)=>n+x.qty,0);total+=t;godownTotal+=g;if(num(i.min)>0&&t<=num(i.min))low++;
      let detail=siteStocks.filter(x=>location==='all'||location===x.id).map(x=>`<span class="location-chip"><span>${esc(x.name)}: <b>${fmt(x.qty)}</b> ${esc(i.unit)}</span><button type="button" class="qty-edit" data-adjust="${esc(i.id)}" data-location="${esc(x.id)}" title="Edit ${esc(x.name)} stock" aria-label="Edit ${esc(x.name)} stock"><i class="bi bi-pencil-square"></i></button></span>`).join('');
      const showGodown=location==='all'||location==='godown';
      if(location!=='all'&&location!=='godown'&&!siteStocks.some(x=>x.id===location))return '';
      if(location==='godown'&&g===0)return '';
      return `<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.unit||'Nos')}</td><td>${showGodown?`<span class="location-chip"><b>${fmt(g)}</b> ${esc(i.unit)} <button type="button" class="qty-edit" data-adjust="${esc(i.id)}" data-location="godown" title="Edit Main Godown stock" aria-label="Edit Main Godown stock"><i class="bi bi-pencil-square"></i></button></span>`:'<span class="muted-note">Filtered</span>'}</td><td><div class="location-list">${detail||'<span class="muted-note">No site stock / no sites added</span>'}</div></td><td><b>${fmt(t)}</b></td><td>${num(i.min)>0&&t<=num(i.min)?'<span class="status review">Low stock</span>':'<span class="status">In range</span>'}</td><td><button type="button" class="qty-edit" data-edit-item="${esc(i.id)}" title="Edit material details"><i class="bi bi-pencil"></i></button><button type="button" class="qty-edit text-danger" data-del="${esc(i.id)}" title="Delete material"><i class="bi bi-trash"></i></button></td></tr>`;
    }).filter(Boolean);
    $('itemCount').textContent=items.length;$('stockCount').textContent=fmt(total);$('godownCount').textContent=fmt(godownTotal);$('lowCount').textContent=low;
    $('stockRows').innerHTML=rows.join('')||'<tr><td colspan="7" class="empty-state">No materials match this filter. Add a material or change your search/location.</td></tr>';
    $('moveItem').innerHTML=items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (${esc(i.unit)})</option>`).join('');
    $('moveFrom').innerHTML=locations();$('moveTo').innerHTML=locations();
    const from=$('dateFrom').value,to=$('dateTo').value;
    const filtered=moves.filter(m=>(!from||m.date>=from)&&(!to||m.date<=to)&&(!query||String(items.find(i=>i.id===m.itemId)?.name||'Deleted material').toLowerCase().includes(query))&&(location==='all'||m.fromId===location||m.toId===location));
    filtered.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    $('movementSummary').textContent=`Showing ${filtered.length} of ${moves.length} movements${from||to?` · ${from||'earliest'} to ${to||'latest'}`:''}.`;
    $('movementRows').innerHTML=filtered.slice(0,150).map(m=>`<tr><td>${esc(m.date||'')}</td><td>${esc(items.find(i=>i.id===m.itemId)?.name||'Deleted material')}</td><td>${esc(({receipt:'Purchase / Receive',issue:'Issue / Consume',transfer:'Transfer',adjustment:'Stock adjustment'})[m.type]||m.type||'Movement')}</td><td>${esc(m.fromId?locName(m.fromId):'—')}</td><td>${esc(m.toId?locName(m.toId):'—')}</td><td>${fmt(m.qty)}</td><td>${esc(m.notes||'')}</td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">No movements found for the selected filters.</td></tr>';
  }
  function openItem(item){editingItemId=item?.id||null;$('itemModalTitle').textContent=item?'Edit material':'Add material';$('itemName').value=item?.name||'';$('itemUnit').value=item?.unit||'Nos';$('itemMin').value=item?.min??0;itemModal.show()}
  $('addItem').addEventListener('click',()=>openItem(null));
  $('itemForm').addEventListener('submit',e=>{e.preventDefault();const name=$('itemName').value.trim();if(!name)return;if(items.some(i=>i.id!==editingItemId&&String(i.name).toLowerCase()===name.toLowerCase())){alert('This material already exists.');return}if(editingItemId){const item=items.find(i=>i.id===editingItemId);if(item)Object.assign(item,{name,unit:$('itemUnit').value,min:num($('itemMin').value)});}else{items.push({id:crypto.randomUUID?.()||String(Date.now()),name,unit:$('itemUnit').value,min:num($('itemMin').value),createdAt:new Date().toISOString()})}save(IK,items);itemModal.hide();$('itemForm').reset();editingItemId=null;render()});
  $('moveType').addEventListener('change',()=>{const type=$('moveType').value;$('moveFrom').disabled=type==='receipt';$('moveTo').disabled=type==='issue';if(type==='receipt')$('moveTo').value='godown';if(type==='issue')$('moveFrom').value='godown'});
  $('moveForm').addEventListener('submit',e=>{e.preventDefault();load();const item=items.find(i=>i.id===$('moveItem').value),type=$('moveType').value,qty=num($('moveQty').value),from=type==='receipt'?'':$('moveFrom').value,to=type==='issue'?'':$('moveTo').value;
    if(!$('moveDate').value||!item||!Number.isFinite(qty)||qty<=0||((type==='transfer')&&(!from||!to||from===to))){alert('Check the date, material, quantity and locations.');return}
    if(type!=='receipt'&&stock(item,from)<qty){alert(`Insufficient stock at ${locName(from)}. Available: ${fmt(stock(item,from))} ${item.unit}`);return}
    if(type==='receipt'&&!to){alert('Choose a destination.');return}if(type==='issue'&&!from){alert('Choose a source.');return}
    moves.push({id:crypto.randomUUID?.()||String(Date.now()),date:$('moveDate').value,type,itemId:item.id,fromId:from,toId:to,qty,notes:$('moveNotes').value.trim(),createdAt:new Date().toISOString()});save(MK,moves);moveModal.hide();$('moveForm').reset();$('moveDate').value=today();$('moveType').dispatchEvent(new Event('change'));render();
  });
  function openAdjustment(itemId,locationId){load();const item=items.find(i=>i.id===itemId);if(!item)return;const current=stock(item,locationId);$('adjustItemId').value=itemId;$('adjustLocationId').value=locationId;$('adjustMaterialName').textContent=`${item.name} (${item.unit})`;$('adjustLocationName').textContent=locName(locationId);$('adjustCurrent').value=fmt(current);$('adjustNew').value=current;$('adjustDate').value=today();$('adjustReason').value='';adjustModal.show()}
  $('adjustForm').addEventListener('submit',e=>{e.preventDefault();load();const item=items.find(i=>i.id===$('adjustItemId').value),loc=$('adjustLocationId').value,current=item?stock(item,loc):0,next=Number($('adjustNew').value),date=$('adjustDate').value,reason=$('adjustReason').value.trim();if(!item||!date||!Number.isFinite(next)||next<0||!reason){alert('Enter a valid quantity, date and reason.');return}const delta=Number((next-current).toFixed(4));if(Math.abs(delta)<0.000001){adjustModal.hide();return}moves.push({id:crypto.randomUUID?.()||String(Date.now()),date,type:'adjustment',itemId:item.id,fromId:delta<0?loc:'',toId:delta>0?loc:'',qty:Math.abs(delta),notes:`Stock correction: ${reason} (quantity ${fmt(current)} → ${fmt(next)})`,createdAt:new Date().toISOString()});save(MK,moves);adjustModal.hide();render()});
  $('stockRows').addEventListener('click',e=>{const edit=e.target.closest('[data-adjust]'),itemEdit=e.target.closest('[data-edit-item]'),del=e.target.closest('[data-del]');if(edit){openAdjustment(edit.dataset.adjust,edit.dataset.location);return}if(itemEdit){openItem(items.find(i=>i.id===itemEdit.dataset.editItem));return}if(del){const id=del.dataset.del;if(!confirm('Delete this material from the catalogue? Its movement history will be retained.'))return;items=items.filter(i=>i.id!==id);save(IK,items);render()}});
  $('search').addEventListener('input',render);$('siteFilter').addEventListener('change',render);$('dateFrom').addEventListener('change',()=>{if($('dateFrom').value&&$('dateTo').value&&$('dateFrom').value>$('dateTo').value){alert('From date cannot be later than To date.');$('dateFrom').value=''}render()});$('dateTo').addEventListener('change',()=>{if($('dateFrom').value&&$('dateTo').value&&$('dateTo').value<$('dateFrom').value){alert('To date cannot be earlier than From date.');$('dateTo').value=''}render()});
  $('clearFilters').addEventListener('click',()=>{$('search').value='';$('siteFilter').value='all';$('dateFrom').value='';$('dateTo').value='';render()});
  window.addEventListener('storage',render);itemModal=bootstrap.Modal.getOrCreateInstance($('itemModal'));moveModal=bootstrap.Modal.getOrCreateInstance($('moveModal'));adjustModal=bootstrap.Modal.getOrCreateInstance($('adjustModal'));$('moveDate').value=today();$('adjustDate').value=today();$('moveType').dispatchEvent(new Event('change'));render();
})();

// Example modification for your materials form submission
document.getElementById('material-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const date = document.getElementById('entry-date').value;
    const materialType = document.getElementById('material-type').value;
    const quantity = document.getElementById('quantity').value;
    const supplier = document.getElementById('supplier-name').value; // e.g., Narayan Transport Co.
    
    // Send to Google Sheets backend
    const success = await sendToGoogleSheet("Materials", [date, materialType, quantity, supplier]);
    
    if (success) {
        alert("Material logged!");
        this.reset();
    }
});
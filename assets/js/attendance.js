(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants and helpers
  // ---------------------------------------------------------------------------
  const ATT_KEY = 'montx-attendance-v1';
  const SITE_KEY = 'montx-sites-v1';
  const VENDOR_KEY = 'montx-vendors-v1';
  const MAX_COUNT = 100;          // highest value offered in the "No. of Karigar / Majur" dropdowns
  const NORMAL_DAY_HOURS = 9;     // hourly rate = daily rate / 9
  const PAGE_SIZE = 10;           // number of records shown per batch in the register table
  const BASE_COUNTS = [0, 0.5, 1, 1.5, 2, 2.5];

  const COUNT_IDS = ['karigarCount', 'majurCount'];
  const SHIFT_IDS = ['karigarShift', 'majurShift'];
  const HOUR_IDS = ['karigarHours', 'majurHours'];

  const $ = id => document.getElementById(id);

  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };

  const fmt = n => '₹' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n || 0);

  const fmtDays = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let rows = read(ATT_KEY);
  let sites = read(SITE_KEY);
  let vendors = read(VENDOR_KEY);
  let visibleLimit = PAGE_SIZE;

  const modalEl = $('attendanceModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const toast = bootstrap.Toast.getOrCreateInstance($('noticeToast'));

  function notify(message) {
    $('toastMessage').textContent = message;
    toast.show();
  }

  function load() {
    sites = read(SITE_KEY);
    vendors = read(VENDOR_KEY);
  }

  const saveRows = () => localStorage.setItem(ATT_KEY, JSON.stringify(rows));

  // ---------------------------------------------------------------------------
  // Dropdown helpers
  // ---------------------------------------------------------------------------
  function syncCustomSelect(selectEl) {
    if (!selectEl) return;
    if (typeof selectEl._customSelectRefresh === 'function') {
      selectEl._customSelectRefresh();
    }
    selectEl.dispatchEvent(new Event('custom-select:refresh', { bubbles: true }));
  }

  // "No. of Karigar" and "No. of Majur" include 0, 0.5, 1, 1.5, 2, 2.5 plus whole numbers up to MAX_COUNT.
  function fillCountOptions() {
    const values = Array.from(
      new Set([
        ...BASE_COUNTS,
        ...Array.from({ length: MAX_COUNT + 1 }, (_, i) => i)
      ])
    ).sort((a, b) => a - b);

    const optionsHtml = values
      .map(v => `<option value="${v}">${v}</option>`)
      .join('');

    COUNT_IDS.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = optionsHtml;
      el.value = '0';
      syncCustomSelect(el);
    });
  }

  function ensureOption(select, value, label, sorted = false) {
    const v = String(value);
    if ([...select.options].some(o => o.value === v)) return;
    const before = sorted ? [...select.options].find(o => Number(o.value) > Number(v)) : null;
    select.add(new Option(label, v), before || null);
    syncCustomSelect(select);
  }

  function setCount(id, value) {
    const n = Number(value);
    const v = Number.isFinite(n) && n >= 0 ? n : 0;
    const el = $(id);
    if (!el) return;
    ensureOption(el, v, String(v), true);
    el.value = String(v);
    syncCustomSelect(el);
  }

  function setShift(id, value) {
    const n = Number(value);
    const v = Number.isFinite(n) && n > 0 ? n : 1;       // records saved before shifts existed count as a full day
    const el = $(id);
    if (!el) return;
    ensureOption(el, v, `Custom (${v})`, true);
    el.value = String(v);
    syncCustomSelect(el);
  }

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------
  function getVendor() {
    return vendors.find(v => v.id === $('entryVendor').value);
  }

  function calc(vendor) {
    const k = +$('karigarCount').value || 0;
    const m = +$('majurCount').value || 0;
    const kh = +$('karigarHours').value || 0;
    const mh = +$('majurHours').value || 0;
    const ks = +$('karigarShift').value;
    const ms = +$('majurShift').value;
    const kr = +(vendor?.karigarRate || 0);
    const mr = +(vendor?.majurRate || 0);
    const ka = k * ks * kr + kh * kr / NORMAL_DAY_HOURS;
    const ma = m * ms * mr + mh * mr / NORMAL_DAY_HOURS;
    return { k, m, kh, mh, ks, ms, kr, mr, ka, ma, amount: ka + ma };
  }

  function preview() {
    const vendor = getVendor();
    const a = calc(vendor);
    $('liveAmount').textContent = fmt(vendor ? a.amount : 0);
    $('rateInfo').textContent = vendor
      ? `Karigar ₹${a.kr}/day (₹${(a.kr / NORMAL_DAY_HOURS).toFixed(2)}/hr) · Majur ₹${a.mr}/day (₹${(a.mr / NORMAL_DAY_HOURS).toFixed(2)}/hr)`
      : 'Select vendor';
    $('calcBreakdown').textContent = vendor ? `Karigar ${fmt(a.ka)} + Majur ${fmt(a.ma)}` : '';
  }

  // ---------------------------------------------------------------------------
  // Site / vendor lists
  // ---------------------------------------------------------------------------
  function refreshSelects() {
    load();
    const filterSite = $('filterSite').value || 'all';
    const filterVendor = $('filterVendor').value || 'all';
    const entrySite = $('entrySite').value || '';
    const editing = rows.find(r => r.id === $('entryId').value);

    $('filterSite').innerHTML = '<option value="all">All sites</option>' +
      sites.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    $('filterVendor').innerHTML = '<option value="all">All vendors</option>' +
      vendors.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
    $('filterSite').value = sites.some(s => s.id === filterSite) ? filterSite : 'all';
    $('filterVendor').value = vendors.some(v => v.id === filterVendor) ? filterVendor : 'all';

    // New entries: active sites only. An entry being edited keeps its own site even if that site is no longer active.
    $('entrySite').innerHTML = '<option value="">Select site</option>' +
      sites.filter(s => s.status === 'Active' || s.id === editing?.siteId)
        .map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    $('entrySite').value = sites.some(s => s.id === entrySite) ? entrySite : '';
  }

  function vendorOptions(selectedId = '') {
    const siteId = $('entrySite').value;
    const list = vendors.filter(v =>
      v.id === selectedId || (v.status === 'Active' && (v.siteIds || []).includes(siteId))
    );
    $('entryVendor').innerHTML = '<option value="">Select vendor</option>' +
      list.map(v => `<option value="${esc(v.id)}" ${v.id === selectedId ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
    preview();
  }

  // ---------------------------------------------------------------------------
  // Form open / reset
  // ---------------------------------------------------------------------------
  function reset() {
    $('attendanceForm').reset();
    $('entryId').value = '';
    $('entryDate').value = new Date().toISOString().slice(0, 10);
    fillCountOptions();
    HOUR_IDS.forEach(id => { $(id).value = 0; });
    SHIFT_IDS.forEach(id => { $(id).value = '1'; });
    $('modalTitle').textContent = 'Add attendance entry';
    $('saveEntryBtn').textContent = 'Save attendance';
    refreshSelects();
    $('entrySite').value = '';
    vendorOptions();
  }

  function openForEdit(record) {
    reset();
    $('entryId').value = record.id;
    refreshSelects();                                  // now includes this entry's site even if it is inactive
    $('entryDate').value = record.date;
    $('entrySite').value = record.siteId;
    vendorOptions(record.vendorId);
    COUNT_IDS.forEach(id => setCount(id, record[id]));
    SHIFT_IDS.forEach(id => setShift(id, record[id]));
    HOUR_IDS.forEach(id => { $(id).value = record[id] ?? 0; });
    $('entryNotes').value = record.notes || '';
    $('modalTitle').textContent = 'Edit attendance entry';
    $('saveEntryBtn').textContent = 'Update attendance';
    preview();
    modal.show();
  }

  // ---------------------------------------------------------------------------
  // Register table + summary cards + pagination
  // ---------------------------------------------------------------------------
  function ensurePaginationBar() {
    let paginationBar = $('tablePagination');
    if (paginationBar) return paginationBar;

    const panel = document.querySelector('.glass.panel');
    if (!panel) return null;

    paginationBar = document.createElement('div');
    paginationBar.id = 'tablePagination';
    paginationBar.className = 'd-flex justify-content-between align-items-center mt-3 pt-2';
    paginationBar.style.cssText = 'border-top:1px solid var(--border);display:none!important';
    paginationBar.innerHTML = `
      <span class="muted" id="visibleCountInfo" style="font-size:11px">Showing 0 of 0 entries</span>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-soft btn-sm" id="loadMoreRowsBtn" style="font-size:11px">Show 10 more <i class="bi bi-chevron-down ms-1"></i></button>
        <button type="button" class="btn btn-outline-soft btn-sm" id="showAllRowsBtn" style="font-size:11px">Show all</button>
      </div>
    `;
    panel.appendChild(paginationBar);

    $('loadMoreRowsBtn').onclick = () => {
      visibleLimit += PAGE_SIZE;
      render();
    };
    $('showAllRowsBtn').onclick = () => {
      visibleLimit = Infinity;
      render();
    };

    return paginationBar;
  }

  function updatePaginationBar(totalCount) {
    const paginationBar = ensurePaginationBar();
    const infoText = $('visibleCountInfo');
    const loadMoreBtn = $('loadMoreRowsBtn');
    if (!paginationBar) return;

    if (totalCount <= PAGE_SIZE || visibleLimit >= totalCount) {
      paginationBar.style.setProperty('display', 'none', 'important');
      return;
    }

    const currentlyShown = Math.min(visibleLimit, totalCount);
    const remaining = totalCount - currentlyShown;
    if (infoText) infoText.textContent = `Showing ${currentlyShown} of ${totalCount} entries`;
    if (loadMoreBtn) {
      loadMoreBtn.innerHTML = `Show ${Math.min(PAGE_SIZE, remaining)} more <i class="bi bi-chevron-down ms-1"></i>`;
    }
    paginationBar.style.setProperty('display', 'flex', 'important');
  }

  function render() {
    refreshSelects();
    const date = $('filterDate').value;
    const siteId = $('filterSite').value;
    const vendorId = $('filterVendor').value;

    const list = rows
      .filter(e => (!date || e.date === date) &&
                   (siteId === 'all' || e.siteId === siteId) &&
                   (vendorId === 'all' || e.vendorId === vendorId))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const days = (key, shiftKey) => list.reduce((n, e) => n + (+e[key] || 0) * (+(e[shiftKey] ?? 1) || 0), 0);

    $('entryTotal').textContent = list.length;
    $('recordCount').textContent = list.length + ' records';
    $('karigarTotal').textContent = fmtDays(days('karigarCount', 'karigarShift'));
    $('majurTotal').textContent = fmtDays(days('majurCount', 'majurShift'));
    $('amountTotal').textContent = fmt(list.reduce((n, e) => n + (+e.amount || 0), 0));

    const visibleList = list.slice(0, visibleLimit);

    $('attendanceRows').innerHTML = visibleList.map(e => `<tr>
      <td>${esc(e.date)}</td>
      <td>${esc(e.siteName)}</td>
      <td>${esc(e.vendorName)}</td>
      <td>${e.karigarCount} × ${e.karigarShift ?? 1} + ${e.karigarHours || 0}h</td>
      <td>${e.majurCount} × ${e.majurShift ?? 1} + ${e.majurHours || 0}h</td>
      <td>₹${Number(e.karigarRate || 0).toFixed(2)} / ₹${Number(e.majurRate || 0).toFixed(2)}</td>
      <td class="amount">${fmt(e.amount)}</td>
      <td>
        <button class="btn btn-sm btn-outline-soft" data-edit="${esc(e.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-soft text-danger" data-del="${esc(e.id)}" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" class="empty">No attendance records.</td></tr>';

    updatePaginationBar(list.length);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  $('addEntryBtn').onclick = reset;
  modalEl?.addEventListener('shown.bs.modal', () => {
    COUNT_IDS.forEach(id => syncCustomSelect($(id)));
  });
  $('entrySite').onchange = () => vendorOptions();
  $('entryVendor').onchange = preview;

  // Dropdowns fire "change" and number inputs fire "input"; listen to both so the live amount always updates.
  [...COUNT_IDS, ...SHIFT_IDS, ...HOUR_IDS].forEach(id => {
    $(id).addEventListener('input', preview);
    $(id).addEventListener('change', preview);
  });

  $('attendanceForm').onsubmit = async e => {
    e.preventDefault();
    const id = $('entryId').value;
    const site = sites.find(s => s.id === $('entrySite').value);
    const vendor = getVendor();
    const a = calc(vendor);

    if (!site || !vendor || !$('entryDate').value || a.kh < 0 || a.mh < 0 || a.k < 0 || a.m < 0) {
      notify('Check attendance details.');
      return;
    }

    const recordId = id || (crypto.randomUUID?.() || String(Date.now()));
    const record = {
      date: $('entryDate').value,
      siteId: site.id,
      siteName: site.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      karigarCount: a.k,
      majurCount: a.m,
      karigarShift: a.ks,
      majurShift: a.ms,
      karigarHours: a.kh,
      majurHours: a.mh,
      karigarRate: a.kr,
      majurRate: a.mr,
      karigarAmount: a.ka,
      majurAmount: a.ma,
      amount: a.amount,
      notes: $('entryNotes').value.trim(),
      calculationVersion: 2
    };

    if (id) {
      const old = rows.find(x => x.id === id);
      if (old) Object.assign(old, record);
    } else {
      rows.push({ id: recordId, ...record });
    }

    saveRows();
    render();
    modal.hide();
    notify(id ? 'Attendance updated with rate snapshots.' : 'Attendance saved with rate snapshots.');

    // Sync with Google Sheets backend if sendToGoogleSheet is loaded
    if (typeof window.sendToGoogleSheet === 'function') {
      const sheetRow = [
        recordId,
        record.date,
        record.siteName,
        record.vendorName,
        record.karigarCount,
        record.karigarShift,
        record.karigarHours,
        record.majurCount,
        record.majurShift,
        record.majurHours,
        record.karigarRate,
        record.majurRate,
        record.amount,
        record.notes
      ];
      const synced = await window.sendToGoogleSheet('Attendance', sheetRow);
      if (!synced) {
        notify('Saved locally, but failed to sync with Google Sheets.');
      }
    }
  };

  $('attendanceRows').onclick = e => {
    const button = e.target.closest('[data-edit],[data-del]');
    if (!button) return;
    const record = rows.find(x => x.id === (button.dataset.edit || button.dataset.del));
    if (!record) return;

    if (button.dataset.del) {
      if (confirm('Delete attendance entry?')) {
        rows = rows.filter(x => x.id !== record.id);
        saveRows();
        render();
      }
      return;
    }
    openForEdit(record);
  };

  ['filterDate', 'filterSite', 'filterVendor'].forEach(id => {
    $(id).onchange = () => {
      visibleLimit = PAGE_SIZE;
      render();
    };
  });

  $('clearFilters').onclick = () => {
    $('filterDate').value = '';
    $('filterSite').value = $('filterVendor').value = 'all';
    visibleLimit = PAGE_SIZE;
    render();
  };

  if ($('loadMoreRowsBtn')) {
    $('loadMoreRowsBtn').onclick = () => {
      visibleLimit += PAGE_SIZE;
      render();
    };
  }

  if ($('showAllRowsBtn')) {
    $('showAllRowsBtn').onclick = () => {
      visibleLimit = Infinity;
      render();
    };
  }

  // Another tab changed the data: reload it first, otherwise this tab would later overwrite the other tab's records.
  window.addEventListener('storage', e => {
    if (e.key === null || e.key === ATT_KEY) rows = read(ATT_KEY);
    render();
  });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  fillCountOptions();
  reset();
  render();
})();

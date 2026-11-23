(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const read = k => { try { const x = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
  const fmt = n => '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const fmtShort = n => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n) || 0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qty = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const shift = n => Number(n ?? 1).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const sameId = (a, b) => String(a ?? '') === String(b ?? '');
  const monthName = value => { if (!value) return ''; const [y, m] = String(value).split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); };
  let output = [];

  function render() {
    const attendance = read('montx-attendance-v1'), sites = read('montx-sites-v1'), vendors = read('montx-vendors-v1'), transactions = read('montx-salary-transactions-v1');
    const month = $('month').value;
    let siteId = $('site').value || 'all', vendorId = $('vendor').value || 'all';

    $('site').innerHTML = '<option value="all">All sites</option>' + sites.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    if (!sites.some(x => sameId(x.id, siteId))) siteId = 'all';
    $('site').value = siteId;

    $('vendor').innerHTML = '<option value="all">All vendors</option>' + vendors.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    if (!vendors.some(x => sameId(x.id, vendorId))) vendorId = 'all';
    $('vendor').value = vendorId;

    $('txVendor').innerHTML = '<option value="">Select vendor</option>' + vendors.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    $('txSite').innerHTML = '<option value="">Not site-specific</option>' + sites.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');

    const map = new Map();
    function get(record) {
      const key = String(record.vendorId ?? '') + '|' + String(record.siteId ?? '');
      if (!map.has(key)) map.set(key, {
        vendorId: record.vendorId,
        siteId: record.siteId || '',
        vendor: record.vendorName || vendors.find(x => sameId(x.id, record.vendorId))?.name || 'Removed vendor',
        site: record.siteName || sites.find(x => sameId(x.id, record.siteId))?.name || 'General / Office',
        kd: 0, md: 0, h: 0, g: 0, w: 0, p: 0
      });
      return map.get(key);
    }

    const selectedAttendance = attendance.filter(x =>
      String(x.date ?? '').slice(0, 7) === month &&
      (siteId === 'all' || sameId(x.siteId, siteId)) &&
      (vendorId === 'all' || sameId(x.vendorId, vendorId))
    );
    for (const record of selectedAttendance) {
      const row = get(record);
      row.kd += (Number(record.karigarCount) || 0) * Number(record.karigarShift ?? 1);
      row.md += (Number(record.majurCount) || 0) * Number(record.majurShift ?? 1);
      row.h += (Number(record.karigarHours) || 0) + (Number(record.majurHours) || 0);
      row.g += Number(record.amount) || 0;
    }

    const selectedTransactions = transactions.filter(x =>
      String(x.date ?? '').slice(0, 7) === month &&
      (siteId === 'all' || sameId(x.siteId, siteId)) &&
      (vendorId === 'all' || sameId(x.vendorId, vendorId))
    );
    for (const record of selectedTransactions) {
      const row = get(record);
      if (record.type === 'withdrawal') row.w += Number(record.amount) || 0;
      else row.p += Number(record.amount) || 0;
    }

    output = [...map.values()].sort((a, b) => a.vendor.localeCompare(b.vendor) || a.site.localeCompare(b.site));
    const totals = output.reduce(
      (acc, row) => ({ kd: acc.kd + row.kd, md: acc.md + row.md, g: acc.g + row.g, w: acc.w + row.w, p: acc.p + row.p }),
      { kd: 0, md: 0, g: 0, w: 0, p: 0 }
    );
    if ($('totalKarigar')) $('totalKarigar').textContent = qty(totals.kd);
    if ($('totalMajur')) $('totalMajur').textContent = qty(totals.md);
    $('gross').textContent = fmt(totals.g);
    $('withdrawals').textContent = fmt(totals.w);
    $('payments').textContent = fmt(totals.p);
    $('balance').textContent = fmt(totals.g - totals.w - totals.p);

    output.forEach(row => row.b = row.g - row.w - row.p);
    $('salaryRows').innerHTML = output.map(x => `<tr><td><b>${esc(x.vendor)}</b></td><td>${esc(x.site)}</td><td>${qty(x.kd)}</td><td>${qty(x.md)}</td><td>${qty(x.h)}h</td><td class="money">${fmt(x.g)}</td><td>${fmt(x.w)}</td><td>${fmt(x.p)}</td><td class="money">${fmt(x.b)}</td></tr>`).join('') || '<tr><td colspan="9">No records for this month.</td></tr>';
    $('txRows').innerHTML = selectedTransactions.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(x => `<tr><td>${esc(x.date)}</td><td>${esc(x.vendorName)}</td><td>${esc(x.siteName || 'General / Office')}</td><td>${esc(x.type)}</td><td>${esc(x.mode)}</td><td>${fmt(x.amount)}</td><td>${esc(x.notes || '')}</td><td><button class="btn btn-sm btn-outline-soft text-danger" data-del="${esc(x.id)}" title="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('') || '<tr><td colspan="8">No transactions.</td></tr>';

    const canExport = siteId !== 'all' && vendorId !== 'all';
    $('exportStatementPdf').disabled = !canExport;
    $('pdfHint').textContent = canExport
      ? `PDF statement: ${vendors.find(x => sameId(x.id, vendorId))?.name || 'Vendor'} · ${sites.find(x => sameId(x.id, siteId))?.name || 'Site'} · ${monthName(month)}`
      : 'Select one vendor and one site to export.';
  }

  function statementMarkup() {
    const vendor = read('montx-vendors-v1').find(x => sameId(x.id, $('vendor').value));
    const site = read('montx-sites-v1').find(x => sameId(x.id, $('site').value));
    const month = $('month').value;
    if (!vendor || !site) { alert('Please select one vendor and one site before exporting.'); return null; }

    const attendance = read('montx-attendance-v1')
      .filter(x => String(x.date ?? '').slice(0, 7) === month && sameId(x.vendorId, vendor.id) && sameId(x.siteId, site.id))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const transactions = read('montx-salary-transactions-v1')
      .filter(x => String(x.date ?? '').slice(0, 7) === month && sameId(x.vendorId, vendor.id) && sameId(x.siteId, site.id))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (!attendance.length && !transactions.length) {
      alert('No attendance or withdrawal/payment records found for this vendor and site in the selected month.');
      return null;
    }

    const withdrawals = transactions.filter(x => x.type === 'withdrawal');
    const payments = transactions.filter(x => x.type !== 'withdrawal');

    const totalKarigarDays = attendance.reduce((n, x) => n + (Number(x.karigarCount) || 0) * Number(x.karigarShift ?? 1), 0);
    const totalMajurDays = attendance.reduce((n, x) => n + (Number(x.majurCount) || 0) * Number(x.majurShift ?? 1), 0);

    const earned = attendance.reduce((n, x) => n + (Number(x.amount) || 0), 0);
    const withdrawn = withdrawals.reduce((n, x) => n + (Number(x.amount) || 0), 0);
    const paid = payments.reduce((n, x) => n + (Number(x.amount) || 0), 0);
    const balance = earned - withdrawn - paid;

    const latest = [...attendance].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const karigarRate = latest?.karigarRate ?? vendor.karigarRate;
    const majurRate = latest?.majurRate ?? vendor.majurRate;
    const mobile = String(vendor.mobile ?? vendor.phone ?? '').trim() || 'Not provided';

    const tableStyle = 'width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;font-size:10px;color:#263244;';
    const thStyle = 'text-align:left;background:#eef2f7;color:#334155;padding:9px 10px;font-weight:700;border-bottom:1px solid #dce3ec;';
    const tdStyle = 'padding:9px 10px;border-bottom:1px solid #e5eaf0;vertical-align:top;';

    const attendanceRows = attendance.map(x => {
      const k = `${qty(x.karigarCount)} × ${shift(x.karigarShift)} (${fmtShort(x.karigarRate ?? karigarRate)})${Number(x.karigarHours) > 0 ? ` + ${qty(x.karigarHours)}h` : ''}`;
      const m = `${qty(x.majurCount)} × ${shift(x.majurShift)} (${fmtShort(x.majurRate ?? majurRate)})${Number(x.majurHours) > 0 ? ` + ${qty(x.majurHours)}h` : ''}`;
      return `<tr><td style="${tdStyle}">${esc(x.date)}</td><td style="${tdStyle}">${esc(k)}</td><td style="${tdStyle}">${esc(m)}</td><td style="${tdStyle};font-weight:700;white-space:normal">${fmtShort(x.amount)}</td><td style="${tdStyle}">${esc(x.notes || '-')}</td></tr>`;
    }).join('') || `<tr><td colspan="5" style="${tdStyle};color:#64748b;text-align:center">No attendance entries for this period.</td></tr>`;

    const txTable = (rows, amountLabel, typeName) => `<table class="withdrawal-table" style="${tableStyle}margin-top:8px"><colgroup><col style="width:16%"><col style="width:18%"><col style="width:42%"><col style="width:24%"></colgroup><thead><tr><th style="${thStyle}">Date</th><th style="${thStyle}">Mode</th><th style="${thStyle}">Remarks</th><th style="${thStyle};text-align:right">${amountLabel}</th></tr></thead><tbody>${rows.map(x => `<tr><td style="${tdStyle}">${esc(x.date)}</td><td style="${tdStyle}">${esc(x.mode || '-')}</td><td style="${tdStyle}">${esc(x.notes || '-')}</td><td style="${tdStyle};text-align:right;white-space:nowrap;font-weight:700;color:${typeName === 'Withdrawal' ? '#be3455' : '#2563a6'}">${fmtShort(x.amount)}</td></tr>`).join('') || `<tr><td colspan="4" style="${tdStyle};text-align:center;color:#64748b">No ${typeName.toLowerCase()} records.</td></tr>`}</tbody></table>`;

    const summaryCard = (label, value, color = '#172033') => `<div class="summary-card" style="flex:1;min-width:0;background:#f7f9fc;border:1px solid #edf1f6;border-radius:9px;padding:13px 10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:5px">${label}</div><div class="summary-card-amount" style="font-size:19px;font-weight:800;color:${color};white-space:normal">${value}</div></div>`;

    const cards = [
      summaryCard('Total Karigar', `${qty(totalKarigarDays)}`, '#172033'),
      summaryCard('Total Majur', `${qty(totalMajurDays)}`, '#172033'),
      summaryCard('Total Party Calculation', fmtShort(earned)),
      summaryCard('Total Party Withdrawal', fmtShort(withdrawn), '#be3455')
    ];
    if (paid > 0) cards.push(summaryCard('Salary Payments', fmtShort(paid), '#2563a6'));
    cards.push(summaryCard('Final Balance Payable', fmtShort(balance), balance < 0 ? '#be3455' : '#13805d'));

    const html = `
 <div class="statement-head" style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:15px;border-bottom:1px solid #e5eaf0;margin-bottom:15px">
  <div class="statement-meta" style="min-width:0"><div style="font-size:20px;font-weight:800;color:#172033">${esc(vendor.name)} - Hisab Statement</div><div style="font-size:11px;color:#64748b;line-height:1.65;margin-top:5px">Site: ${esc(site.name)} | Mobile: ${esc(mobile)}<br>Rates: Karigar ${fmtShort(karigarRate)}, Majur ${fmtShort(majurRate)}<br>Period: ${esc(monthName(month))}</div></div>
  <div class="statement-net" style="text-align:right;min-width:175px"><div style="font-size:10px;color:#64748b">Net Payable (Calculation - Withdrawal${paid > 0 ? ' - Payments' : ''})</div><div class="statement-net-amount" style="font-size:26px;font-weight:900;color:${balance < 0 ? '#be3455' : '#13805d'};margin-top:4px">${fmtShort(balance)}</div></div>
 </div>
 <div class="summary-cards" style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 20px">${cards.join('')}</div>
 <div style="font-size:14px;font-weight:800;color:#253449;margin:0 0 9px">Attendance Calculation Breakdown</div>
 <table class="attendance-table" style="${tableStyle}margin-bottom:20px"><colgroup><col style="width:15%"><col style="width:23%"><col style="width:23%"><col style="width:15%"><col style="width:24%"></colgroup><thead><tr><th style="${thStyle}">Date</th><th style="${thStyle}">Karigar</th><th style="${thStyle}">Majur</th><th style="${thStyle}">Earned</th><th style="${thStyle}">Note</th></tr></thead><tbody>${attendanceRows}</tbody></table>
 <div style="font-size:14px;font-weight:800;color:#253449;margin:0 0 4px">Withdrawals Breakdown</div>
 ${txTable(withdrawals, 'Withdrawal Amount', 'Withdrawal')}
 ${paid > 0 ? `<div style="font-size:14px;font-weight:800;color:#253449;margin:19px 0 4px">Salary Payments Breakdown</div>${txTable(payments, 'Payment Amount', 'Payment')}` : ''}
 <div style="font-size:9px;line-height:1.5;color:#64748b;margin-top:16px">Rates shown in the heading are the latest saved rates for this statement period. Each attendance row uses its own saved rate snapshot. Only transactions assigned to this selected site are included.</div>`;

    return { html, vendor, site, month };
  }

  $('month').value = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  ['month', 'site', 'vendor'].forEach(id => $(id).addEventListener('change', render));
  $('clear').onclick = () => { $('site').value = $('vendor').value = 'all'; render(); };
  $('addTx').onclick = () => { $('txForm').reset(); $('txDate').value = new Date().toISOString().slice(0, 10); };

  $('txForm').onsubmit = e => {
    e.preventDefault();
    const vendor = read('montx-vendors-v1').find(x => sameId(x.id, $('txVendor').value));
    const site = read('montx-sites-v1').find(x => sameId(x.id, $('txSite').value));
    const amount = Number($('txAmount').value);
    if (!vendor || !Number.isFinite(amount) || amount <= 0) return;
    const records = read('montx-salary-transactions-v1');
    records.push({
      id: crypto.randomUUID?.() || String(Date.now()),
      date: $('txDate').value,
      type: $('txType').value,
      vendorId: vendor.id,
      vendorName: vendor.name,
      siteId: site?.id || '',
      siteName: site?.name || '',
      amount: Math.round(amount * 100) / 100,
      mode: $('txMode').value,
      notes: $('txNotes').value
    });
    localStorage.setItem('montx-salary-transactions-v1', JSON.stringify(records));
    bootstrap.Modal.getInstance($('txModal')).hide();
    render();
  };

  $('txRows').onclick = e => {
    const button = e.target.closest('[data-del]');
    if (button && confirm('Delete this transaction?')) {
      localStorage.setItem('montx-salary-transactions-v1', JSON.stringify(read('montx-salary-transactions-v1').filter(x => !sameId(x.id, button.dataset.del))));
      render();
    }
  };

  $('exportStatementPdf').onclick = async () => {
    try {
      const statement = statementMarkup();
      if (!statement) return;
      const safe = [statement.vendor.name, statement.site.name, statement.month].join('_').replace(/[^a-z0-9_-]+/gi, '_');
      await window.MontXPdf.download({
        filename: `MontX_Hisab_${safe}.pdf`,
        title: 'Vendor Hisab Statement',
        subtitle: '',
        content: statement.html,
        showHeader: false
      });
    } catch (err) {
      console.error('Hisab PDF error:', err);
      alert('PDF Error: ' + (err?.message || err));
    }
  };

  window.MontXGetStatement = statementMarkup;
  window.addEventListener('storage', render);
  render();
})();

const html=document.documentElement,themeBtn=document.getElementById('themeToggle'),sidebar=document.getElementById('sidebar');
let cashflowChart=null;

function makeChartGradient(ctx){
  const g=ctx.createLinearGradient(0,0,0,220);
  g.addColorStop(0,'rgba(245, 158, 11, 0.28)');
  g.addColorStop(1,'rgba(245, 158, 11, 0.0)');
  return g;
}

function syncChartTheme(){
  if(!cashflowChart)return;
  const styles=getComputedStyle(html);
  const color=name=>styles.getPropertyValue(name).trim();
  const ctx=cashflowChart.ctx;
  cashflowChart.data.datasets[0].borderColor=color('--chart-primary')||'#F59E0B';
  cashflowChart.data.datasets[0].backgroundColor=makeChartGradient(ctx);
  cashflowChart.data.datasets[1].borderColor=color('--chart-secondary')||'#18181B';
  cashflowChart.options.scales.x.ticks.color=color('--chart-label')||'#6B7280';
  cashflowChart.options.scales.y.ticks.color=color('--chart-label')||'#6B7280';
  cashflowChart.options.scales.y.grid.color=color('--chart-grid')||'#F1F3F5';
  cashflowChart.update('none');
}

function applyTheme(t){
  html.dataset.theme=t;
  localStorage.setItem('montx-theme',t);
  if(themeBtn)themeBtn.innerHTML=t==='dark'?'<i class="bi bi-sun"></i>':'<i class="bi bi-moon-stars"></i>';
  syncChartTheme();
}
applyTheme(localStorage.getItem('montx-theme')||'light');
if(themeBtn)themeBtn.addEventListener('click',()=>applyTheme(html.dataset.theme==='dark'?'light':'dark'));

// Mobile sidebar drawer + backdrop
const menuToggle=document.getElementById('menuToggle');
let backdrop=null;
if(sidebar){
  backdrop=document.createElement('div');
  backdrop.className='sidebar-backdrop';
  document.body.appendChild(backdrop);
  const closeMenu=()=>{sidebar.classList.remove('open');backdrop.classList.remove('show');};
  const toggleMenu=()=>{const open=sidebar.classList.toggle('open');backdrop.classList.toggle('show',open);};
  if(menuToggle)menuToggle.addEventListener('click',toggleMenu);
  backdrop.addEventListener('click',closeMenu);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('open'))closeMenu();});
}

// Quantro-style Cashflow Chart
const canvas=document.getElementById('cashflowChart');
if(canvas&&window.Chart){
  cashflowChart=new Chart(canvas,{
    type:'line',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets:[
        {label:'Income',data:[32,42,38,55,48,66,61,73,68,82,77,94],fill:true,tension:.42,borderWidth:2.5,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:'#F59E0B',pointHoverBorderColor:'#FFFFFF',pointHoverBorderWidth:2},
        {label:'Total cost',data:[22,29,25,34,31,42,39,48,43,56,51,63],fill:false,tension:.42,borderWidth:2,borderDash:[5,4],pointRadius:0,pointHoverRadius:4}
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#141417',
          titleColor:'#A1A1AA',
          bodyColor:'#FFFFFF',
          borderColor:'#27272A',
          borderWidth:1,
          padding:10,
          cornerRadius:10,
          displayColors:true,
          callbacks:{label:c=>` ${c.dataset.label}: ₹${Number(c.parsed.y||0).toLocaleString('en-IN')}k`}
        }
      },
      scales:{
        x:{grid:{display:false},border:{display:false},ticks:{font:{size:11,family:'Inter'}}},
        y:{beginAtZero:true,border:{display:false},grid:{},ticks:{font:{size:11,family:'Inter'},callback:v=>'₹'+v+'k'}}
      }
    }
  });
  window.MontXCashflowChart=cashflowChart;
  syncChartTheme();
}

// =========================================================================
// Google Sheets Two-Way Auto-Sync + Activity Trail for ALL MontX Modules
// =========================================================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzdLmUMDUSalCOwGXm4voiM5pdLlG65TwkRpBDbUaw2HUebSu7gSxo5QLlCURS7W1Ql/exec";

const MONTX_SHEET_MODULES = {
  'montx-sites-v1': 'Sites',
  'montx-vendors-v1': 'Vendors',
  'montx-attendance-v1': 'Attendance',
  'montx-salary-transactions-v1': 'Salary & Payments',
  'montx-inventory-items-v1': 'Inventory materials',
  'montx-inventory-movements-v1': 'Inventory movements',
  'montx-expenses-v1': 'Income & Expenses'
};

const syncTimers = {};

function syncModuleToGoogleSheet(sheetName, rowsArray) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("PASTE_YOUR")) return;

  // Debounce rapid saves (400ms) so bulk actions send one clean request
  clearTimeout(syncTimers[sheetName]);
  syncTimers[sheetName] = setTimeout(async () => {
    const payload = new URLSearchParams();
    payload.append("sheetName", sheetName);
    payload.append("rows", JSON.stringify(rowsArray));

    try {
      const response = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        body: payload
      });
      const result = await response.text();
      if (result === "Success") {
        console.log(`[MontX Sync] Saved "${sheetName}" (${rowsArray.length} rows)`);
      } else {
        console.error(`[MontX Sync] Error saving "${sheetName}":`, result);
      }
    } catch (error) {
      console.error(`[MontX Sync] Network error saving "${sheetName}":`, error);
    }
  }, 400);
}

// Intercept all localStorage saves across every MontX page
(() => {
  const nativeSet = Storage.prototype.setItem;
  if (Storage.prototype.__montxAuditWrapped) return;

  Storage.prototype.setItem = function(key, value) {
    const old = this.getItem(key);
    const result = nativeSet.call(this, key, value);
    if (this !== localStorage || !MONTX_SHEET_MODULES[key] || window.MONTX_RESTORING) return result;

    try {
      const before = old ? JSON.parse(old) : [];
      const after = JSON.parse(value);
      if (!Array.isArray(before) || !Array.isArray(after) || old === value) return result;

      // 1. Auto-save updated module data to its Google Sheet tab
      syncModuleToGoogleSheet(MONTX_SHEET_MODULES[key], after);

      // 2. Keep original local activity trail
      const signature = x => x && typeof x === 'object' ? (x.id != null ? String(x.id) : JSON.stringify(x)) : String(x);
      const b = new Set(before.map(signature)), a = new Set(after.map(signature));
      const added = [...a].filter(x => !b.has(x)).length, removed = [...b].filter(x => !a.has(x)).length;
      const action = added && removed ? 'Records changed' : added ? 'Record added' : removed ? 'Record deleted' : 'Record updated';
      const detail = added || removed ? `${added} added, ${removed} deleted (${after.length} total)` : `${after.length} records in module`;
      const log = JSON.parse(localStorage.getItem('montx-activity-v1') || '[]');
      log.push({ id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), action, module: MONTX_SHEET_MODULES[key], detail });
      nativeSet.call(localStorage, 'montx-activity-v1', JSON.stringify(log.slice(-300)));
    } catch (e) {}

    return result;
  };
  Storage.prototype.__montxAuditWrapped = true;
})();

// Auto-load all previous data from Google Sheets when the website opens
async function loadAllFromGoogleSheets() {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("PASTE_YOUR")) return;

  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=loadAll`);
    const cloudData = await response.json();
    if (!cloudData || typeof cloudData !== 'object' || cloudData.error) return;

    let hasUpdates = false;
    window.MONTX_RESTORING = true;

    for (const [storageKey, sheetName] of Object.entries(MONTX_SHEET_MODULES)) {
      if (Array.isArray(cloudData[sheetName])) {
        const incomingJson = JSON.stringify(cloudData[sheetName]);
        const currentJson = localStorage.getItem(storageKey);
        if (incomingJson !== currentJson) {
          localStorage.setItem(storageKey, incomingJson);
          hasUpdates = true;
        }
      }
    }

    window.MONTX_RESTORING = false;

    // Reload once if fresh data arrived from Google Sheets so the current page renders it
    if (hasUpdates && !sessionStorage.getItem('montx-reloaded-after-sync')) {
      sessionStorage.setItem('montx-reloaded-after-sync', '1');
      location.reload();
    } else {
      sessionStorage.removeItem('montx-reloaded-after-sync');
    }
  } catch (error) {
    window.MONTX_RESTORING = false;
    console.warn('[MontX Sync] Offline or failed to load from Google Sheets:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadAllFromGoogleSheets);
// =========================================================================
// MontX Role-Based Access Control + 3-Dot User Menu (Manage Users, Password, Logout)
// =========================================================================
(() => {
  const AUTH_KEY = 'montx-auth-session-v1';
  const USERS_KEY = 'montx-users-v1';
  const PUBLIC_PAGES = ['login.html', 'signup.html'];
  const SITE_MANAGER_PAGES = ['attendance.html', 'inventory.html'];
  const VIEWER_BLOCKED_PAGES = ['data.html'];
  const ROLE_LABELS = { super_admin: 'Super Admin', viewer: 'Viewer', site_manager: 'Site Manager' };
  const DEFAULT_USERS = [
    { id: 'u-admin',   name: 'Super Admin',  username: 'admin',   pin: '1234', role: 'super_admin',  label: 'Super Admin' },
    { id: 'u-viewer',  name: 'Viewer',       username: 'viewer',  pin: '2222', role: 'viewer',       label: 'Viewer' },
    { id: 'u-manager', name: 'Site Manager', username: 'manager', pin: '3333', role: 'site_manager', label: 'Site Manager' }
  ];

  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (PUBLIC_PAGES.includes(page)) return;

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); }
    catch { return null; }
  }

  function readUsers() {
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const list = Array.isArray(saved) ? saved : [];
      DEFAULT_USERS.forEach(def => {
        if (!list.some(u => String(u.username || '').toLowerCase() === def.username)) list.push({ ...def });
      });
      return list;
    } catch {
      return DEFAULT_USERS.map(u => ({ ...u }));
    }
  }

  function saveUsers(users) {
    window.MONTX_ALLOW_USER_WRITE = true;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.MONTX_ALLOW_USER_WRITE = false;
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    location.replace('login.html');
  }

  // 1. Manage Users Modal (Super Admin)
  function openUserManagerModal() {
    document.getElementById('montxUserMgrOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'montxUserMgrOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif;';
    overlay.innerHTML = `
      <div style="width:100%;max-width:560px;max-height:85vh;overflow:auto;background:var(--bg-secondary,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:22px;color:var(--text-primary,#fff);box-shadow:0 20px 50px rgba(0,0,0,.4);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <h5 style="margin:0;font-weight:700;font-size:16px;">Manage User Roles</h5>
            <small style="color:var(--text-muted,#94a3b8);font-size:11px;">Assign roles to users (auto-syncs to Google Sheets)</small>
          </div>
          <button id="closeUserMgr" type="button" style="border:0;background:transparent;color:var(--text-muted,#94a3b8);font-size:20px;cursor:pointer;">&times;</button>
        </div>
        <div id="userMgrList" style="display:flex;flex-direction:column;gap:10px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('closeUserMgr').onclick = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    function renderUsers() {
      const users = readUsers();
      const listEl = document.getElementById('userMgrList');
      listEl.innerHTML = users.map((u, idx) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border,#334155);border-radius:11px;background:var(--bg-primary,#0f172a);flex-wrap:wrap;">
          <div style="min-width:140px;">
            <div style="font-size:13px;font-weight:600;">${u.name || u.username}</div>
            <div style="font-size:11px;color:var(--text-muted,#94a3b8);">@${u.username}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <select data-role-idx="${idx}" style="height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--border,#334155);background:var(--bg-secondary,#1e293b);color:var(--text-primary,#fff);font-size:12px;">
              <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
              <option value="site_manager" ${u.role === 'site_manager' ? 'selected' : ''}>Site Manager</option>
              <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
            </select>
            ${u.username !== 'admin' ? `<button data-del-idx="${idx}" title="Delete user" style="height:34px;width:34px;border:1px solid rgba(239,68,68,.35);border-radius:8px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('[data-role-idx]').forEach(sel => {
        sel.onchange = () => {
          const updated = readUsers();
          const i = Number(sel.dataset.roleIdx);
          if (!updated[i]) return;
          updated[i].role = sel.value;
          updated[i].label = ROLE_LABELS[sel.value] || sel.value;
          saveUsers(updated);
        };
      });

      listEl.querySelectorAll('[data-del-idx]').forEach(btn => {
        btn.onclick = () => {
          if (!confirm('Remove this user?')) return;
          const updated = readUsers();
          updated.splice(Number(btn.dataset.delIdx), 1);
          saveUsers(updated);
          renderUsers();
        };
      });
    }
    renderUsers();
  }

  // 2. Update Password Modal (All Users)
  function openUpdatePasswordModal(currentUser) {
    document.getElementById('montxPwdOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'montxPwdOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif;';
    overlay.innerHTML = `
      <div style="width:100%;max-width:390px;background:var(--bg-secondary,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:22px;color:var(--text-primary,#fff);box-shadow:0 20px 50px rgba(0,0,0,.4);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h5 style="margin:0;font-weight:700;font-size:16px;">Update Password</h5>
          <button id="closePwdModal" type="button" style="border:0;background:transparent;color:var(--text-muted,#94a3b8);font-size:20px;cursor:pointer;">&times;</button>
        </div>
        <div id="pwdMsg" style="display:none;font-size:12px;padding:8px 10px;border-radius:8px;margin-bottom:12px;"></div>
        <form id="updatePwdForm" style="display:flex;flex-direction:column;gap:11px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#cbd5e1);margin-bottom:4px;">Current Password / PIN</label>
            <input id="curPin" type="password" required style="width:100%;height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--border,#334155);background:var(--bg-primary,#0f172a);color:var(--text-primary,#fff);font-size:13px;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#cbd5e1);margin-bottom:4px;">New Password / PIN</label>
            <input id="newPin" type="password" required minlength="4" style="width:100%;height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--border,#334155);background:var(--bg-primary,#0f172a);color:var(--text-primary,#fff);font-size:13px;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#cbd5e1);margin-bottom:4px;">Confirm New Password / PIN</label>
            <input id="cnfPin" type="password" required minlength="4" style="width:100%;height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--border,#334155);background:var(--bg-primary,#0f172a);color:var(--text-primary,#fff);font-size:13px;box-sizing:border-box;">
          </div>
          <button type="submit" style="margin-top:4px;height:40px;border:0;border-radius:9px;background:var(--accent,#2563EB);color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Save New Password</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('closePwdModal').onclick = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    const msg = document.getElementById('pwdMsg');
    const show = (text, ok = false) => {
      msg.textContent = text;
      msg.style.display = 'block';
      msg.style.background = ok ? 'rgba(22,163,74,.14)' : 'rgba(239,68,68,.14)';
      msg.style.color = ok ? '#16a34a' : '#ef4444';
    };

    document.getElementById('updatePwdForm').onsubmit = e => {
      e.preventDefault();
      const cur = document.getElementById('curPin').value.trim();
      const nw = document.getElementById('newPin').value.trim();
      const cnf = document.getElementById('cnfPin').value.trim();

      if (nw !== cnf) return show('New passwords do not match.');
      const users = readUsers();
      const target = users.find(u => String(u.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase());
      if (!target || String(target.pin || '') !== cur) return show('Current password is incorrect.');

      target.pin = nw;
      saveUsers(users);
      show('Password updated successfully!', true);
      setTimeout(() => overlay.remove(), 1100);
    };
  }

  // 3. Build 3-Dot Menu beside Sidebar User
  function attachUserMenu(user) {
    const sidebarBottom = document.querySelector('.sidebar-bottom');
    const userBox = sidebarBottom?.querySelector('.user');
    if (!sidebarBottom || !userBox) return;

    sidebarBottom.style.position = 'relative';
    const b = userBox.querySelector('b');
    const small = userBox.querySelector('small');
    if (b) b.textContent = user.label;
    if (small) small.textContent = `@${user.username}`;

    const menu = document.createElement('div');
    menu.id = 'montxUserMenu';
    menu.style.cssText = 'display:none;position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);background:var(--bg-secondary,#1e293b);border:1px solid var(--border,#334155);border-radius:12px;padding:6px;box-shadow:0 12px 32px rgba(0,0,0,.28);z-index:9999;';

    const itemStyle = 'width:100%;display:flex;align-items:center;gap:9px;padding:9px 11px;border:0;border-radius:8px;background:transparent;color:var(--text-primary,#f8fafc);font-size:12px;font-weight:500;cursor:pointer;text-align:left;';
    menu.innerHTML = `
      ${user.role === 'super_admin' ? `<button type="button" id="mxMenuManageUsers" style="${itemStyle}"><i class="bi bi-people"></i><span>Manage Users</span></button>` : ''}
      <button type="button" id="mxMenuUpdatePwd" style="${itemStyle}"><i class="bi bi-key"></i><span>Update Password</span></button>
      <div style="height:1px;background:var(--border,#334155);margin:4px 0;"></div>
      <button type="button" id="mxMenuLogout" style="${itemStyle}color:#ef4444;"><i class="bi bi-box-arrow-right"></i><span>Logout</span></button>
    `;
    sidebarBottom.appendChild(menu);

    menu.querySelectorAll('button').forEach(btn => {
      btn.onmouseenter = () => { btn.style.background = 'var(--bg-tertiary,rgba(148,163,184,.12))'; };
      btn.onmouseleave = () => { btn.style.background = 'transparent'; };
    });

    const toggleMenu = e => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };

    userBox.style.cursor = 'pointer';
    userBox.onclick = toggleMenu;

    document.addEventListener('click', e => {
      if (!menu.contains(e.target) && !userBox.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    menu.querySelector('#mxMenuManageUsers')?.addEventListener('click', () => {
      menu.style.display = 'none';
      openUserManagerModal();
    });
    menu.querySelector('#mxMenuUpdatePwd')?.addEventListener('click', () => {
      menu.style.display = 'none';
      openUpdatePasswordModal(user);
    });
    menu.querySelector('#mxMenuLogout')?.addEventListener('click', () => {
      menu.style.display = 'none';
      if (confirm('Logout from MontX?')) logout();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const user = getSession();
    if (!user) {
      location.replace('login.html');
      return;
    }

    attachUserMenu(user);

    if (user.role === 'super_admin') return;

    if (user.role === 'site_manager') {
      if (!SITE_MANAGER_PAGES.includes(page)) {
        location.replace('attendance.html');
        return;
      }
      document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (!SITE_MANAGER_PAGES.includes(href)) link.style.display = 'none';
      });
      return;
    }

    if (user.role === 'viewer') {
      if (VIEWER_BLOCKED_PAGES.includes(page)) {
        location.replace('index.html');
        return;
      }
      document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (VIEWER_BLOCKED_PAGES.includes(href)) link.style.display = 'none';
      });

      const style = document.createElement('style');
      style.textContent = `[data-bs-toggle="modal"],[data-del],[data-edit],.btn-danger,#addTx,form button[type="submit"]{display:none!important}`;
      document.head.appendChild(style);

      const prevSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key.startsWith('montx-') && key !== 'montx-theme' && !window.MONTX_RESTORING && !window.MONTX_ALLOW_USER_WRITE) return;
        return prevSet.call(this, key, value);
      };
    }
  });
})();


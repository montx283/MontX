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

// Lightweight local activity trail for changes made by MontX modules.
(()=>{
  const tracked={
    'montx-sites-v1':'Sites','montx-vendors-v1':'Vendors','montx-attendance-v1':'Attendance',
    'montx-salary-transactions-v1':'Salary & Payments','montx-inventory-items-v1':'Inventory materials',
    'montx-inventory-movements-v1':'Inventory movements','montx-expenses-v1':'Income & Expenses'
  };
  const nativeSet=Storage.prototype.setItem;
  if(Storage.prototype.__montxAuditWrapped)return;
  Storage.prototype.setItem=function(key,value){
    const old=this.getItem(key),result=nativeSet.call(this,key,value);
    if(this!==localStorage||!tracked[key]||window.MONTX_RESTORING)return result;
    try{
      const before=old?JSON.parse(old):[],after=JSON.parse(value);
      if(!Array.isArray(before)||!Array.isArray(after)||old===value)return result;
      const signature=x=>x&&typeof x==='object'?(x.id!=null?String(x.id):JSON.stringify(x)):String(x);
      const b=new Set(before.map(signature)),a=new Set(after.map(signature));
      const added=[...a].filter(x=>!b.has(x)).length,removed=[...b].filter(x=>!a.has(x)).length;
      const action=added&&removed?'Records changed':added?'Record added':removed?'Record deleted':'Record updated';
      const detail=added||removed?`${added} added, ${removed} deleted (${after.length} total)`:`${after.length} records in module`;
      const log=JSON.parse(localStorage.getItem('montx-activity-v1')||'[]');
      log.push({id:`act-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),action,module:tracked[key],detail});
      nativeSet.call(localStorage,'montx-activity-v1',JSON.stringify(log.slice(-300)));
    }catch(e){}
    return result;
  };
  Storage.prototype.__montxAuditWrapped=true;
})();

// Add to MontX_Construction_Management/assets/js/app.js

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwc3D-caAWX98wX4GUKypNBzOUP_4lO3e8T_ZM782bU9J5Q1VLlrdyVcBZrga3SPOWenQ/exec";

/**
 * Sends an array of data to a specific Google Sheet tab.
 * @param {string} tabName - The name of the Google Sheet tab (e.g., "Attendance", "Materials")
 * @param {Array} rowValues - Array of data matching your columns (e.g., [date, name, status])
 */
async function sendToGoogleSheet(tabName, rowValues) {
  // Using URLSearchParams avoids complex CORS preflight issues on static hosts like GitHub Pages
  const payload = new URLSearchParams();
  payload.append("sheetName", tabName);
  payload.append("rowData", JSON.stringify(rowValues));

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: payload
    });
    
    const result = await response.text();
    if (result === "Success") {
      console.log(`Data saved to ${tabName} successfully.`);
      return true;
    } else {
      console.error("Apps Script Error:", result);
      return false;
    }
  } catch (error) {
    console.error("Network or Fetch Error:", error);
    return false;
  }
}

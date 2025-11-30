APP . JS 


/* app.js - Shared logic for admin.html and citizen.html
   Maps centered on Odisha (Bhubaneswar, 20.2961,85.8245)
   Updated: Criminal Records Module + persistence
*/
(function(){
  const CENTER = [20.2961, 85.8245];
  const STORAGE_KEY = 'safehands_v3_data';
  const LOG_KEY = 'safehands_v3_logs';
  const CRIM_KEY = 'safehands_v3_criminals';

  // small helper utils
  function uid(){ return 'id_' + Math.random().toString(36).slice(2,9) }
  function nowDate(){ return new Date().toISOString().slice(0,10) }
  function nowTime(){ return new Date().toTimeString().slice(0,5) }
  function saveData(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) }
  function loadData(){ try{ const s = localStorage.getItem(STORAGE_KEY); if(!s) return sampleData(); return JSON.parse(s) }catch(e){ return sampleData() } }
  function saveLog(entry){ const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); logs.unshift(entry); localStorage.setItem(LOG_KEY, JSON.stringify(logs)) }
  function getLogs(){ return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') }

  // criminals storage helpers
  function loadCriminals(){ try{ const s = localStorage.getItem(CRIM_KEY); if(!s) return sampleCriminals(); return JSON.parse(s) }catch(e){ return sampleCriminals() } }
  function saveCriminals(arr){ localStorage.setItem(CRIM_KEY, JSON.stringify(arr)) }

  function sampleData(){
    const now = nowDate();
    const d = [
      { id: uid(), lat:20.2961, lon:85.8245, type:'Theft', date: now, time: '10:30', status:'approved' },
      { id: uid(), lat:19.0760, lon:72.8777, type:'Assault', date: now, time: '14:00', status:'approved' },
      { id: uid(), lat:20.3194, lon:85.7977, type:'Burglary', date: now, time: '21:15', status:'new' },
      { id: uid(), lat:20.3422, lon:85.8116, type:'Robbery', date: now, time: '08:45', status:'approved' }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return d;
  }

  function sampleCriminals(){
    const d = [
      { id: uid(), name:'Arjun Kumar', age:32, height:174, crime:'Robbery', risk:'High Risk', status:'Active' },
      { id: uid(), name:'Ravi Das', age:27, height:168, crime:'Theft', risk:'Medium Risk', status:'Under Investigation' },
      { id: uid(), name:'Sunita S', age:29, height:160, crime:'Burglary', risk:'Low Risk', status:'Arrested' }
    ];
    localStorage.setItem(CRIM_KEY, JSON.stringify(d));
    return d;
  }

  // load dataset
  let DATA = loadData();
  let CRIMS = loadCriminals();

  // helper color functions
  function statusColor(s){
    if(s==='approved') return '#34d399';
    if(s==='rejected') return '#9ca3af';
    if(s==='new') return '#f59e0b';
    return '#60a5fa';
  }
  function typeColor(t){
    if(t==='Theft') return '#f97316';
    if(t==='Assault') return '#ef4444';
    if(t==='Burglary') return '#7c3aed';
    if(t==='Robbery') return '#059669';
    return '#60a5fa';
  }

  /* ---------- Criminal Records Module ---------- */
  function initCriminalsModule(){
    // elements
    const addBtn = document.getElementById('crimAddBtn');
    const modal = document.getElementById('crimModal');
    const cancelBtn = document.getElementById('crimCancel');
    const saveBtn = document.getElementById('crimSave');
    const searchInput = document.getElementById('crimSearch');
    const filterRisk = document.getElementById('crimFilterRisk');
    const tableBody = document.getElementById('crimTableBody');

    let editId = null; // track editing

    function openModal(edit=null){
      editId = edit;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.getElementById('crimModalTitle').textContent = edit ? 'Edit Criminal' : 'Add Criminal';
      if(edit){
        const r = CRIMS.find(x=>x.id===edit);
        if(r){
          document.getElementById('crimName').value = r.name;
          document.getElementById('crimAge').value = r.age;
          document.getElementById('crimHeight').value = r.height;
          document.getElementById('crimCrime').value = r.crime;
          document.getElementById('crimRisk').value = r.risk;
          document.getElementById('crimStatus').value = r.status;
        }
      } else {
        document.getElementById('crimName').value = '';
        document.getElementById('crimAge').value = '';
        document.getElementById('crimHeight').value = '';
        document.getElementById('crimCrime').value = '';
        document.getElementById('crimRisk').value = 'Medium Risk';
        document.getElementById('crimStatus').value = 'Active';
      }
    }
    function closeModal(){
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      editId = null;
    }

    addBtn?.addEventListener('click', ()=> openModal(null));
    cancelBtn?.addEventListener('click', ()=> closeModal());

    saveBtn?.addEventListener('click', ()=>{
      const name = document.getElementById('crimName').value.trim();
      const age = parseInt(document.getElementById('crimAge').value) || 0;
      const height = parseFloat(document.getElementById('crimHeight').value) || 0;
      const crime = document.getElementById('crimCrime').value.trim();
      const risk = document.getElementById('crimRisk').value;
      const status = document.getElementById('crimStatus').value;
      if(!name || !crime){ alert('Name and crime are required'); return; }

      if(editId){
        const idx = CRIMS.findIndex(x=>x.id===editId);
        if(idx >=0){
          CRIMS[idx] = { id: editId, name, age, height, crime, risk, status };
          saveCriminals(CRIMS);
          saveLog({ ts:new Date().toISOString(), action:'crim_edit', details:{id:editId} });
          renderCriminals();
          closeModal();
          alert('Criminal updated');
        }
      } else {
        const rec = { id: uid(), name, age, height, crime, risk, status };
        CRIMS.push(rec);
        saveCriminals(CRIMS);
        saveLog({ ts:new Date().toISOString(), action:'crim_add', details:{id:rec.id} });
        renderCriminals();
        closeModal();
        alert('Criminal added');
      }
    });

    // search & filter
    searchInput?.addEventListener('input', renderCriminals);
    filterRisk?.addEventListener('change', renderCriminals);

    // render
    function renderCriminals(){
      if(!tableBody) return;
      const q = (searchInput?.value || '').toLowerCase().trim();
      const risk = (filterRisk?.value || 'All');
      tableBody.innerHTML = '';
      const list = CRIMS.slice();
      // simple sorting by risk high->low then name
      list.sort((a,b)=> {
        const order = {'High Risk':0,'Medium Risk':1,'Low Risk':2};
        const oa = order[a.risk] ?? 3, ob = order[b.risk] ?? 3;
        if(oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });
      list.forEach(r => {
        if(risk !== 'All' && r.risk !== risk) return;
        if(q){
          const s = `${r.name} ${r.crime} ${r.risk} ${r.status}`.toLowerCase();
          if(!s.includes(q)) return;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(r.name)}</td>
          <td>${r.age || ''}</td>
          <td>${r.height || ''} cm</td>
          <td>${escapeHtml(r.crime)}</td>
          <td><span class="crim-badge ${r.risk === 'High Risk' ? 'badge-high' : (r.risk === 'Medium Risk' ? 'badge-medium' : 'badge-low')}">${r.risk}</span></td>
          <td>${escapeHtml(r.status)}</td>
          <td>
            <button class="small-btn" onclick="viewCrim('${r.id}')">View</button>
            <button class="small-btn" onclick="editCrim('${r.id}')">Edit</button>
            <button class="small-btn" onclick="deleteCrim('${r.id}')">Delete</button>
          </td>`;
        tableBody.appendChild(tr);
      });
    }

    // expose operations
    window.viewCrim = function(id){
      const r = CRIMS.find(x=>x.id===id); if(!r) return alert('Not found');
      alert(`Name: ${r.name}\nAge: ${r.age}\nHeight: ${r.height} cm\nCrime: ${r.crime}\nRisk: ${r.risk}\nStatus: ${r.status}`);
    };
    window.editCrim = function(id){ openModal(id); };
    window.deleteCrim = function(id){
      if(!confirm('Delete criminal record?')) return;
      CRIMS = CRIMS.filter(x=>x.id!==id); saveCriminals(CRIMS);
      saveLog({ ts:new Date().toISOString(), action:'crim_delete', details:{id} });
      renderCriminals();
    };

    // initial render
    renderCriminals();
  }

  /* ---------- Common utilities ---------- */
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ---------- Other existing app code (maps, admin etc) ---------- */

  // Note: Below I re-use and slightly simplify earlier code for admin and citizen maps, charts, reports, etc.
  let DATA = loadData(); // reload in updated scope
  let CRIMS_LOCAL = CRIMS = loadCriminals(); // ensure CRIMS var

  function updateKPIElements(){
    const total = DATA.length;
    const approved = DATA.filter(x=>x.status==='approved').length;
    const pending = DATA.filter(x=>x.status==='new').length;
    const a = document.getElementById('adminTotal'); if(a) a.textContent = total;
    const b = document.getElementById('adminApproved'); if(b) b.textContent = approved;
    const c = document.getElementById('adminPending'); if(c) c.textContent = pending;
  }

  /* Admin initialization */
  function initAdmin(){
    // nav
    const sideButtons = Array.from(document.querySelectorAll('.side-btn'));
    sideButtons.forEach(btn => btn.addEventListener('click', (e)=>{
      sideButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.target;
      showAdminSection(t);
    }));

    // dashboard map
    if(document.getElementById('mapPanel')){
      initDashMap();
      renderDash();
      document.getElementById('adminApply').addEventListener('click', renderDash);
    }

    // advanced map panel
    if(document.getElementById('mapView')){
      initAdvancedMap();
      document.getElementById('mapGo').addEventListener('click', ()=>{
        const txt = document.getElementById('mapSearch').value.trim();
        const parts = txt.split(',').map(s=>parseFloat(s.trim()));
        if(parts.length===2 && !isNaN(parts[0]) && !isNaN(parts[1])) advancedMap.setView([parts[0], parts[1]], 13);
      });
      document.getElementById('manualAdd2').addEventListener('click', ()=>{
        const type = document.getElementById('manualType').value || 'Other';
        const date = document.getElementById('manualDate2').value || nowDate();
        const time = document.getElementById('manualTime2').value || nowTime();
        const lat = parseFloat(document.getElementById('manualLat2').value);
        const lon = parseFloat(document.getElementById('manualLon2').value);
        if(isNaN(lat) || isNaN(lon)){ alert('Provide valid coords'); return; }
        const rec = { id: uid(), lat, lon, type, date, time, status:'approved' };
        DATA.push(rec); saveData(DATA); saveLog({ts:new Date().toISOString(), action:'manual_add', details:{id:rec.id}});
        renderAllAdmin(); alert('Added');
      });
    }

    // admin charts
    if(document.getElementById('adminChartType')) renderAdminCharts();

    // export/reset
    document.getElementById('exportBtn')?.addEventListener('click', ()=> {
      const blob = new Blob([JSON.stringify(DATA,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='safehands_data.json'; a.click();
    });
    document.getElementById('resetBtn')?.addEventListener('click', ()=>{
      if(!confirm('Reset dataset to sample?')) return;
      DATA = sampleData(); saveData(DATA); renderAllAdmin(); alert('Reset');
    });

    // data tools
    document.getElementById('exportData')?.addEventListener('click', ()=> {
      const blob = new Blob([JSON.stringify(DATA,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='safehands_export.json'; a.click();
    });
    document.getElementById('importData')?.addEventListener('click', ()=> { document.getElementById('importArea').style.display = 'block'; });
    document.getElementById('cancelImport')?.addEventListener('click', ()=> { document.getElementById('importArea').style.display = 'none'; });
    document.getElementById('doImport')?.addEventListener('click', ()=> {
      try{
        const txt = document.getElementById('importJson').value;
        const arr = JSON.parse(txt);
        if(!Array.isArray(arr)) throw 'Invalid';
        arr.forEach(r => { r.id = r.id || uid(); r.status = r.status || 'new'; DATA.push(r) });
        saveData(DATA); saveLog({ts:new Date().toISOString(), action:'import_data', details:{count:arr.length}});
        document.getElementById('importArea').style.display = 'none';
        renderAllAdmin();
        alert('Imported ' + arr.length);
      }catch(e){ alert('Import failed: ' + e) }
    });

    // CSV upload
    document.getElementById('uploadCSV')?.addEventListener('click', ()=> document.getElementById('csvInput').click());
    document.getElementById('csvInput')?.addEventListener('change', (ev)=>{
      const f = ev.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = function(e){
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
        const parsed = [];
        for(let i=1;i<lines.length;i++){
          const cols = lines[i].split(',').map(c=>c.trim());
          if(cols.length < 5) continue;
          const obj = {};
          header.forEach((h,idx)=> obj[h] = cols[idx] || '');
          parsed.push({ id: uid(), lat: parseFloat(obj.lat), lon: parseFloat(obj.lon), type: obj.type || 'Other', date: obj.date || nowDate(), time: obj.time || nowTime(), status: obj.status || 'new' });
        }
        DATA = DATA.concat(parsed); saveData(DATA); saveLog({ts:new Date().toISOString(), action:'csv_upload', details:{count:parsed.length}});
        renderAllAdmin(); alert('CSV imported: ' + parsed.length);
      };
      r.readAsText(f);
    });

    // clear all
    document.getElementById('clearAll')?.addEventListener('click', ()=>{
      if(!confirm('Clear all dataset?')) return;
      DATA = []; saveData(DATA); saveLog({ts:new Date().toISOString(), action:'clear_data'}); renderAllAdmin();
    });

    // logs view
    document.getElementById('openLogs')?.addEventListener('click', ()=> showAdminSection('logsView'));

    // security actions
    document.getElementById('secClassify')?.addEventListener('click', ()=>{
      const t = document.getElementById('secText').value || '';
      if(!t) return alert('Enter text');
      const res = classifyText(t);
      alert(`Detected: ${res.label} (severity ${res.severity})`);
      saveLog({ts:new Date().toISOString(), action:'classify', details:{text:t, res}});
    });
    document.getElementById('secSim')?.addEventListener('click', ()=>{
      const el = document.getElementById('secEvents');
      const ev = { id: uid(), ts: new Date().toISOString(), msg: 'Simulated threat: multiple rejected reports' };
      const node = document.createElement('div'); node.style.padding='8px'; node.style.borderBottom='1px solid rgba(255,255,255,0.02)';
      node.innerHTML = `<div style="font-weight:700;color:#ef4444">${ev.msg}</div><div class="small">${ev.ts}</div>`;
      el.prepend(node); saveLog({ts:new Date().toISOString(), action:'simulate_threat', details:ev});
    });

    // init criminals module
    if(document.getElementById('crimTableBody')) initCriminalsModule();
  }

  function showAdminSection(key){
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => s.style.display = s.id === key ? 'block' : 'none');
    // render relevant on show
    if(key === 'dashboard'){ renderDash(); renderAdminCharts(); }
    if(key === 'map'){ renderMapView(); }
    if(key === 'analytics'){ initAnalytics(); }
    if(key === 'reports'){ renderReports(); }
    if(key === 'security'){ /* update security if needed */ }
    if(key === 'criminals'){ renderCriminals(); } // from criminals module
    if(key === 'logsView'){ renderLogs(); }
  }

  /* ---------- Dashboard map (dashMap) ---------- */
  let dashMap, dashCluster, dashHeat;
  function initDashMap(){
    dashMap = L.map('mapPanel').setView(CENTER, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(dashMap);
    dashCluster = L.markerClusterGroup().addTo(dashMap);
  }
  function renderDash(){
    if(!dashMap) initDashMap();
    dashCluster.clearLayers();
    if(dashHeat){ try{ dashMap.removeLayer(dashHeat) }catch(e){} dashHeat = null; }
    const type = document.getElementById('adminTypeFilter')?.value || 'All';
    const date = document.getElementById('adminDate')?.value;
    const time = document.getElementById('adminTime')?.value;
    const pts = [];
    const recent = DATA.slice().reverse().slice(0,12);
    const tbody = document.getElementById('adminRecent'); if(tbody) tbody.innerHTML = '';
    recent.forEach(r => {
      const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.type}</td><td>${r.date}</td><td>${r.lat.toFixed(3)}, ${r.lon.toFixed(3)}</td><td style="color:${statusColor(r.status)}">${r.status}</td><td><button class="small-btn" onclick="zoomToAdmin('${r.id}')">Zoom</button></td>`;
      tbody.appendChild(tr);
    });

    DATA.forEach(item => {
      if((type === 'All' || item.type === type) && (!date || item.date === date) && (!time || item.time === time)){
        const marker = L.circleMarker([item.lat, item.lon], { radius:8, color: statusColor(item.status), fillOpacity:0.9 });
        marker.bindPopup(`<strong>${item.type}</strong><div class="small">${item.date} ${item.time}</div><div class="small">Status: ${item.status}</div>`);
        dashCluster.addLayer(marker);
        pts.push([item.lat, item.lon, 1]);
      }
    });
    if(pts.length) dashHeat = L.heatLayer(pts, {radius:22, blur:16}).addTo(dashMap);
    renderAdminQueue();
    updateKPIElements();
  }

  function renderAdminQueue(){
    const q = document.getElementById('adminQueue');
    if(!q) return;
    q.innerHTML = '';
    const pending = DATA.filter(x=>x.status === 'new');
    if(pending.length===0){ q.innerHTML = '<div class="small">No pending reports</div>'; return; }
    pending.forEach(it => {
      const div = document.createElement('div'); div.style.padding='8px'; div.style.borderBottom='1px solid rgba(255,255,255,0.02)';
      div.innerHTML = `<strong>${it.type}</strong><div class="small">${it.date} ${it.time} — ${it.lat.toFixed(3)}, ${it.lon.toFixed(3)}</div><div style="margin-top:6px"><button class="small-btn" onclick="approveAdmin('${it.id}')">Approve</button><button class="small-btn" onclick="rejectAdmin('${it.id}')">Reject</button></div>`;
      q.appendChild(div);
    });
  }

  /* ---------- Advanced Map view ---------- */
  let advancedMap, advancedCluster, advancedHeat, advClusterOn=true, advHeatOn=true;
  function initAdvancedMap(){
    advancedMap = L.map('mapView').setView(CENTER, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(advancedMap);
    advancedCluster = L.markerClusterGroup().addTo(advancedMap);
    renderMapView();
    document.getElementById('mapHeatToggle')?.addEventListener('click', ()=> { advHeatOn = !advHeatOn; renderMapView(); });
    document.getElementById('mapClusterToggle')?.addEventListener('click', ()=> { advClusterOn = !advClusterOn; renderMapView(); });
  }
  function renderMapView(){
    if(!advancedMap) return;
    advancedCluster.clearLayers();
    if(advancedHeat){ try{ advancedMap.removeLayer(advancedHeat) }catch(e){} advancedHeat=null;}
    const pts = [];
    DATA.forEach(item=>{
      const m = L.circleMarker([item.lat, item.lon], { radius:9, color:statusColor(item.status), fillOpacity:0.95 });
      m.bindPopup(`<strong>${item.type}</strong><div class="small">${item.date} ${item.time}</div><div style="margin-top:6px"><button class="small-btn" onclick="approveAdmin('${item.id}')">Approve</button><button class="small-btn" onclick="rejectAdmin('${item.id}')">Reject</button><button class="small-btn" onclick="deleteAdmin('${item.id}')">Delete</button></div>`);
      if(advClusterOn) advancedCluster.addLayer(m); else m.addTo(advancedMap);
      pts.push([item.lat, item.lon, 1]);
    });
    if(advHeatOn && pts.length) advancedHeat = L.heatLayer(pts, {radius:22, blur:14}).addTo(advancedMap);
  }

  /* ---------- Report actions from admin map ---------- */
  window.approveAdmin = function(id){ const r = DATA.find(x=>x.id===id); if(!r) return; r.status='approved'; saveData(DATA); saveLog({ts:new Date().toISOString(), action:'approve', details:{id}}); renderAllAdmin(); }
  window.rejectAdmin = function(id){ const r = DATA.find(x=>x.id===id); if(!r) return; r.status='rejected'; saveData(DATA); saveLog({ts:new Date().toISOString(), action:'reject', details:{id}}); renderAllAdmin(); }
  window.deleteAdmin = function(id){ if(!confirm('Delete report?')) return; DATA = DATA.filter(d=>d.id!==id); saveData(DATA); saveLog({ts:new Date().toISOString(), action:'delete', details:{id}}); renderAllAdmin(); }

  window.zoomToAdmin = function(id){ const rec = DATA.find(d=>d.id===id); if(!rec) return; if(dashMap) dashMap.setView([rec.lat, rec.lon],13); }

  /* ---------- Analytics ---------- */
  function renderAdminCharts(){
    const counts = DATA.reduce((acc,c)=>{ acc[c.type] = (acc[c.type]||0)+1; return acc }, {});
    const ctx = document.getElementById('adminChartType');
    if(!ctx) return;
    const ctx2d = ctx.getContext('2d');
    if(window.adminChart) window.adminChart.destroy();
    window.adminChart = new Chart(ctx2d, {
      type:'bar',
      data:{ labels: Object.keys(counts), datasets:[{ label:'Count', data:Object.values(counts), backgroundColor:Object.keys(counts).map(k=>typeColor(k)) }]},
      options:{responsive:true, plugins:{legend:{display:false}}}
    });
  }

  /* ---------- Analytics page map & charts ---------- */
  function initAnalytics(){
    renderAdminCharts();
    if(document.getElementById('chartType')) {
      const counts = DATA.reduce((acc,c)=>{ acc[c.type] = (acc[c.type]||0)+1; return acc }, {});
      const ctx1 = document.getElementById('chartType').getContext('2d');
      if(window.chartType) window.chartType.destroy();
      window.chartType = new Chart(ctx1, { type:'bar', data:{labels:Object.keys(counts), datasets:[{label:'Count', data:Object.values(counts), backgroundColor:Object.keys(counts).map(k=>typeColor(k))}]}, options:{responsive:true, plugins:{legend:{display:false}}} });

      const trend = {};
      DATA.forEach(d=> trend[d.date] = (trend[d.date]||0)+1);
      const ctx2 = document.getElementById('chartTrend').getContext('2d');
      if(window.chartTrend) window.chartTrend.destroy();
      window.chartTrend = new Chart(ctx2, { type:'line', data:{labels:Object.keys(trend), datasets:[{label:'Reports', data:Object.values(trend), borderColor:'rgba(96,165,250,0.9)', fill:false}]}, options:{responsive:true} });
    }

    if(document.getElementById('analyticsMap')) {
      const el = document.getElementById('analyticsMap');
      if(el._map){ try{ el._map.remove() }catch(e){} el._map = null; }
      const amap = L.map('analyticsMap').setView(CENTER,7);
      el._map = amap;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(amap);
      const hotspots = [
        {lat:20.2961, lon:85.8245, radius:20000, score:0.8},
        {lat:21.5, lon:85.8, radius:24000, score:0.6}
      ];
      hotspots.forEach(h=>{
        const c = L.circle([h.lat,h.lon], { radius:h.radius, color:'rgba(255,99,71,0.25)', fillColor:'rgba(255,99,71,0.06)', fillOpacity:0.7 }).addTo(amap);
        c.bindPopup(`Predicted hotspot (score: ${h.score})`);
      });
    }
  }

  /* ---------- Reports list view ---------- */
  function renderReports(){
    const pendingEl = document.getElementById('pendingList');
    const approvedEl = document.getElementById('approvedList');
    const rejectedEl = document.getElementById('rejectedList');
    if(!pendingEl) return;
    pendingEl.innerHTML = ''; approvedEl.innerHTML=''; rejectedEl.innerHTML='';
    DATA.forEach(it=>{
      const div = document.createElement('div'); div.style.padding='8px'; div.style.borderBottom='1px solid rgba(255,255,255,0.02)';
      div.innerHTML = `<strong>${it.type}</strong><div class="small">${it.date} ${it.time} — ${it.lat.toFixed(3)}, ${it.lon.toFixed(3)}</div><div style="margin-top:6px"><button class="small-btn" onclick="approveAdmin('${it.id}')">Approve</button><button class="small-btn" onclick="rejectAdmin('${it.id}')">Reject</button><button class="small-btn" onclick="deleteAdmin('${it.id}')">Delete</button></div>`;
      if(it.status === 'new') pendingEl.appendChild(div);
      if(it.status === 'approved') approvedEl.appendChild(div);
      if(it.status === 'rejected') rejectedEl.appendChild(div);
    });
    renderAdminQueue(); updateKPIElements();
  }

  /* ---------- Logs ---------- */
  function renderLogs(){
    const logsContainer = document.getElementById('logsList');
    if(!logsContainer) return;
    logsContainer.innerHTML = '';
    const logs = getLogs();
    if(!logs || logs.length===0){ logsContainer.innerHTML = '<div class="small">No logs</div>'; return; }
    logs.forEach(l=>{
      const d = document.createElement('div'); d.style.padding='8px'; d.style.borderBottom='1px solid rgba(255,255,255,0.02)';
      d.innerHTML = `<div style="font-size:0.9rem">${l.ts}</div><div class="small">${l.action} — ${JSON.stringify(l.details||{})}</div>`;
      logsContainer.appendChild(d);
    });
  }

  /* ---------- Admin render helper ---------- */
  function renderAllAdmin(){
    renderDash();
    renderMapView();
    renderAdminCharts();
    renderReports();
    renderLogs();
    // ensure criminals are up-to-date
    if(typeof renderCriminals === 'function') try{ window.renderCriminals(); }catch(e){}
  }

  /* ---------- Citizen page logic ---------- */
  function initCitizen(){
    document.getElementById('cDate').value = nowDate();
    document.getElementById('cTime').value = nowTime();
    initCitizenMap();
    document.getElementById('geoBtn')?.addEventListener('click', ()=> {
      if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
      navigator.geolocation.getCurrentPosition((pos)=> {
        document.getElementById('cLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('cLon').value = pos.coords.longitude.toFixed(6);
      }, (err)=> alert('Location error: ' + err.message));
    });
    document.getElementById('submitCitizen')?.addEventListener('click', ()=>{
      const type = document.getElementById('cType').value || 'Other';
      const date = document.getElementById('cDate').value || nowDate();
      const time = document.getElementById('cTime').value || nowTime();
      const lat = parseFloat(document.getElementById('cLat').value);
      const lon = parseFloat(document.getElementById('cLon').value);
      if(isNaN(lat) || isNaN(lon)){ alert('Provide valid coords'); return; }
      const rec = { id: uid(), lat, lon, type, date, time, status:'new' };
      DATA.push(rec); saveData(DATA); saveLog({ts:new Date().toISOString(), action:'citizen_submit', details:{id:rec.id}});
      renderCitizenRecent();
      alert('Submitted — admin will review');
    });
    document.getElementById('citApply')?.addEventListener('click', renderCitizenMap);
    renderCitizenRecent();
  }

  let citizenMap, citizenCluster, citizenHeat;
  function initCitizenMap(){
    if(!document.getElementById('mapPortalCitizen')) return;
    citizenMap = L.map('mapPortalCitizen').setView(CENTER,7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(citizenMap);
    citizenCluster = L.markerClusterGroup().addTo(citizenMap);
    renderCitizenMap();
  }
  function renderCitizenMap(){
    if(!citizenMap) return;
    citizenCluster.clearLayers();
    if(citizenHeat){ try{ citizenMap.removeLayer(citizenHeat) }catch(e){} citizenHeat=null; }
    const type = document.getElementById('citTypeFilter')?.value || 'All';
    const date = document.getElementById('citDate')?.value;
    const time = document.getElementById('citTime')?.value;
    const pts = [];
    DATA.filter(d => d.status === 'approved').forEach(item=>{
      if((type === 'All' || item.type === type) && (!date || item.date === date) && (!time || item.time === time)){
        const mk = L.marker([item.lat, item.lon]);
        mk.bindPopup(`<strong>${item.type}</strong><div class="small">${item.date} ${item.time}</div>`);
        citizenCluster.addLayer(mk);
        pts.push([item.lat, item.lon, 1]);
      }
    });
    if(pts.length) citizenHeat = L.heatLayer(pts, {radius:22, blur:14}).addTo(citizenMap);
  }
  function renderCitizenRecent(){
    const el = document.getElementById('citRecent');
    if(!el) return;
    el.innerHTML = '';
    DATA.filter(d=>d.status === 'approved').slice(-6).reverse().forEach(it=>{
      const li = document.createElement('li'); li.style.marginBottom='6px';
      li.textContent = `${it.type} — ${it.date} ${it.time} (${it.lat.toFixed(3)},${it.lon.toFixed(3)})`;
      el.appendChild(li);
    });
  }

  /* ---------- Classification helper ---------- */
  function classifyText(text){
    const t = text.toLowerCase();
    if(/robber|gun|knife|armed/.test(t)) return {label:'Robbery', severity:'high'};
    if(/steal|stolen|theft|pickpocket/.test(t)) return {label:'Theft', severity:'medium'};
    if(/assault|attack|beat/.test(t)) return {label:'Assault', severity:'high'};
    if(/burglary|break-in|breakin|forced entry/.test(t)) return {label:'Burglary', severity:'high'};
    return {label:'Other', severity:'low'};
  }

  /* ---------- Start-up ---------- */
  function renderAllOnLoad(){
    updateKPIElements();
    if(document.getElementById('adminChartType')) renderAdminCharts();
    if(document.getElementById('mapPanel')) renderDash();
    if(document.getElementById('mapView')) renderMapView();
    if(document.getElementById('analyticsMap')) initAnalytics();
    if(document.getElementById('mapPortalCitizen')) renderCitizenMap();
    renderReports();
    renderLogs();
    // criminals render (expose renderCriminals for modal)
    if(typeof window.renderCriminals === 'function') window.renderCriminals();
  }

  /* ---------- Utilities for page detection ---------- */
  function isAdminPage(){ return !!document.getElementById('adminMain') }
  function isCitizenPage(){ return !!document.getElementById('mapPortalCitizen') }

  /* ---------- periodic logs ---------- */
  setInterval(()=> {
    saveLog({ ts: new Date().toISOString(), action: 'heartbeat', details: {count: DATA.length} });
  }, 45000);

  /* ---------- init on DOM ready ---------- */
  document.addEventListener('DOMContentLoaded', ()=>{
    if(isAdminPage()){ initAdmin(); initCriminalsModule(); renderAllOnLoad(); }
    if(isCitizenPage()){ initCitizen(); }
  });

  // expose a couple functions used inline in HTML for criminals
  window.renderCriminals = function(){ // re-render criminals table if present
    const tableBody = document.getElementById('crimTableBody');
    if(!tableBody) return;
    const searchInput = document.getElementById('crimSearch');
    const filterRisk = document.getElementById('crimFilterRisk');
    const q = (searchInput?.value || '').toLowerCase().trim();
    const risk = (filterRisk?.value || 'All');
    tableBody.innerHTML = '';
    const list = CRIMS.slice();
    list.sort((a,b)=> {
      const order = {'High Risk':0,'Medium Risk':1,'Low Risk':2};
      const oa = order[a.risk] ?? 3, ob = order[b.risk] ?? 3;
      if(oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    });
    list.forEach(r => {
      if(risk !== 'All' && r.risk !== risk) return;
      if(q){
        const s = `${r.name} ${r.crime} ${r.risk} ${r.status}`.toLowerCase();
        if(!s.includes(q)) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.name)}</td>
        <td>${r.age || ''}</td>
        <td>${r.height || ''} cm</td>
        <td>${escapeHtml(r.crime)}</td>
        <td><span class="crim-badge ${r.risk === 'High Risk' ? 'badge-high' : (r.risk === 'Medium Risk' ? 'badge-medium' : 'badge-low')}">${r.risk}</span></td>
        <td>${escapeHtml(r.status)}</td>
        <td>
          <button class="small-btn" onclick="viewCrim('${r.id}')">View</button>
          <button class="small-btn" onclick="editCrim('${r.id}')">Edit</button>
          <button class="small-btn" onclick="deleteCrim('${r.id}')">Delete</button>
        </td>`;
      tableBody.appendChild(tr);
    });
  };

  // expose criminals window-level functions used by module
  window.deleteCrim = function(id){
    if(!confirm('Delete criminal record?')) return;
    CRIMS = CRIMS.filter(x=>x.id!==id);
    saveCriminals(CRIMS);
    saveLog({ ts:new Date().toISOString(), action:'crim_delete', details:{id} });
    window.renderCriminals();
  };
  window.editCrim = function(id){
    // open modal pre-filled
    const modal = document.getElementById('crimModal');
    document.getElementById('crimModalTitle').textContent = 'Edit Criminal';
    const r = CRIMS.find(x=>x.id===id);
    if(!r) return alert('Record not found');
    document.getElementById('crimName').value = r.name;
    document.getElementById('crimAge').value = r.age;
    document.getElementById('crimHeight').value = r.height;
    document.getElementById('crimCrime').value = r.crime;
    document.getElementById('crimRisk').value = r.risk;
    document.getElementById('crimStatus').value = r.status;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // change save behavior temporarily
    const saveBtn = document.getElementById('crimSave');
    const oldHandler = saveBtn.onclick;
    saveBtn.onclick = function(){
      const name = document.getElementById('crimName').value.trim();
      const age = parseInt(document.getElementById('crimAge').value) || 0;
      const height = parseFloat(document.getElementById('crimHeight').value) || 0;
      const crime = document.getElementById('crimCrime').value.trim();
      const risk = document.getElementById('crimRisk').value;
      const status = document.getElementById('crimStatus').value;
      if(!name || !crime){ alert('Name and crime required'); return; }
      r.name = name; r.age = age; r.height = height; r.crime = crime; r.risk = risk; r.status = status;
      saveCriminals(CRIMS);
      saveLog({ ts:new Date().toISOString(), action:'crim_edit', details:{id:r.id} });
      window.renderCriminals();
      // restore and close
      saveBtn.onclick = oldHandler;
      document.getElementById('crimModal').style.display = 'none';
      document.getElementById('crimModal').setAttribute('aria-hidden', 'true');
      alert('Updated');
    };
  };
  window.viewCrim = function(id){
    const r = CRIMS.find(x=>x.id===id); if(!r) return alert('Not found');
    alert(`Name: ${r.name}\nAge: ${r.age}\nHeight: ${r.height} cm\nCrime: ${r.crime}\nRisk: ${r.risk}\nStatus: ${r.status}`);
  };

})();
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];

const rooms = [
  {id:"A-101",building:"Корпус A",type:"Компьютерный класс",floor:1,temp:23.4,co2:680,people:18,energy:3.2},
  {id:"A-102",building:"Корпус A",type:"Лекционная",floor:1,temp:24.1,co2:740,people:32,energy:4.4},
  {id:"A-103",building:"Корпус A",type:"Лаборатория",floor:1,temp:22.8,co2:820,people:14,energy:3.8},
  {id:"A-104",building:"Корпус A",type:"Аудитория",floor:1,temp:25.2,co2:910,people:21,energy:3.1},
  {id:"A-105",building:"Корпус A",type:"Переговорная",floor:1,temp:23.8,co2:610,people:6,energy:1.8},
  {id:"A-201",building:"Корпус A",type:"Лекционная",floor:2,temp:24.6,co2:890,people:27,energy:4.9},
  {id:"A-202",building:"Корпус A",type:"Лаборатория",floor:2,temp:33.1,co2:1650,people:19,energy:6.8},
  {id:"A-203",building:"Корпус A",type:"Аудитория",floor:2,temp:23.1,co2:710,people:0,energy:5.1},
  {id:"B-101",building:"Корпус B",type:"Компьютерный класс",floor:1,temp:22.2,co2:640,people:16,energy:2.9},
  {id:"B-102",building:"Корпус B",type:"Лекционная",floor:1,temp:24.7,co2:1040,people:28,energy:4.2},
  {id:"B-201",building:"Корпус B",type:"Лаборатория",floor:2,temp:23.5,co2:760,people:12,energy:3.6},
  {id:"B-202",building:"Корпус B",type:"Аудитория",floor:2,temp:25.1,co2:830,people:17,energy:3.4}
];
const devices = Array.from({length:24},(_,i)=>({
  id:`IOT-${String(i+1).padStart(3,"0")}`,
  room:rooms[i%rooms.length].id,
  type:["Датчик температуры","Датчик CO₂","Датчик освещения","Счётчик энергии"][i%4],
  online:![5,16].includes(i),
  value:[23.4,680,78,3.2][i%4],
  unit:["°C","ppm","%","kWh"][i%4],
  updated:"только что"
}));
let incidents = readIncidents();
let currentPage = "overview";
let energyChart = null;
let toastTimer;
function readIncidents(){
  try {
    const saved=localStorage.getItem("nexus-incidents-v2");
    return saved===null ? [
      {id:1001,title:"Высокий уровень CO₂",room:"A-202",priority:"Критический",status:"Открыт",time:"09:42"},
      {id:1002,title:"Перегрев лаборатории",room:"A-202",priority:"Высокий",status:"В работе",time:"09:18"},
      {id:1003,title:"Датчик не отвечает",room:"B-101",priority:"Средний",status:"Открыт",time:"08:56"}
    ] : JSON.parse(saved);
  } catch { return []; }
}
function saveIncidents(){localStorage.setItem("nexus-incidents-v2",JSON.stringify(incidents));updateBadge();}
function updateBadge(){$("#incidentBadge").textContent=incidents.filter(x=>x.status!=="Решён").length;}
function risk(r){if(r.temp>=32||r.co2>=1500)return "Критический";if(r.temp>=28||r.co2>=1000)return "Внимание";return "Норма";}
function alerts(){
  const out=[];
  rooms.forEach(r=>{
    if(r.co2>=1500)out.push({room:r.id,title:"Высокий уровень CO₂",desc:`${r.co2} ppm · Проверьте вентиляцию помещения.`,level:"critical",time:"Сейчас"});
    if(r.temp>=32)out.push({room:r.id,title:"Температура выше нормы",desc:`${r.temp} °C · Проверьте охлаждение.`,level:"critical",time:"Сейчас"});
    if(r.people===0&&r.energy>4)out.push({room:r.id,title:"Лишнее энергопотребление",desc:"Аудитория свободна, но потребление остаётся высоким.",level:"warning",time:"2 мин"});
    if(r.co2>=1000&&r.co2<1500)out.push({room:r.id,title:"Повышенный уровень CO₂",desc:`${r.co2} ppm · Рекомендуется проветривание.`,level:"warning",time:"5 мин"});
  });
  return out;
}
function metricsHTML(){
  const online=devices.filter(d=>d.online).length;
  const critical=alerts().filter(a=>a.level==="critical").length;
  return [
    {label:"Аудитории",value:rooms.length,icon:"▦",foot:"12 помещений под контролем",color:"rgba(98,230,196,.08)",iconbg:"#17332f",iconcolor:"#62e6c4"},
    {label:"Устройства онлайн",value:`${online}<small style="font-size:13px;color:var(--muted)"> / ${devices.length}</small>`,icon:"⌁",foot:"91,7% доступности",color:"rgba(139,156,255,.1)",iconbg:"#222944",iconcolor:"#9aa8ff"},
    {label:"Открытые инциденты",value:incidents.filter(i=>i.status!=="Решён").length,icon:"⚑",foot:"Требуют внимания",color:"rgba(255,201,121,.08)",iconbg:"#392d1c",iconcolor:"#ffc979"},
    {label:"AI предупреждения",value:alerts().length,icon:"✳",foot:`${critical} критических сигнала`,color:"rgba(255,125,145,.08)",iconbg:"#3b222e",iconcolor:"#ff8b9b"}
  ].map(m=>`<article class="metric-card" style="--glow:${m.color}"><div class="metric-top"><span>${m.label}</span><span class="metric-icon" style="--iconbg:${m.iconbg};--iconcolor:${m.iconcolor}">${m.icon}</span></div><div class="metric-value">${m.value}</div><div class="metric-foot"><b>↗</b>${m.foot}</div><span class="spark">⌁</span></article>`).join("");
}
function roomTableHTML(items){
  if(!items.length)return `<div class="empty-state">По вашему запросу ничего не найдено.</div>`;
  return `<div class="table-scroll"><table class="room-table"><thead><tr><th>АУДИТОРИЯ</th><th>ТИП</th><th>ТЕМПЕРАТУРА</th><th>CO₂</th><th>ЗАНЯТОСТЬ</th><th>СТАТУС</th></tr></thead><tbody>${items.map(r=>{
    const s=risk(r),cls=s==="Критический"?"critical":s==="Внимание"?"warning":"";
    return `<tr><td><span class="room-id">${r.id}</span><span class="room-sub">${r.building}</span></td><td>${r.type}</td><td>${r.temp.toFixed(1)} °C</td><td>${r.co2} ppm</td><td>${r.people} чел.</td><td><span class="status-chip ${cls}">${s}</span></td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function alertsHTML(limit=4){
  const items=alerts().slice(0,limit);
  if(!items.length)return `<div class="empty-state">Отлично! Новых аномалий не обнаружено.</div>`;
  return items.map(a=>`<div class="alert-item"><div class="alert-symbol ${a.level==="critical"?"critical":""}">${a.level==="critical"?"!":"↗"}</div><div class="alert-text"><strong>${a.title} <span style="color:var(--muted);font-weight:400">· ${a.room}</span></strong><p>${a.desc}</p></div><span class="alert-time">${a.time}</span></div>`).join("");
}
function renderOverview(){
  $("#content").innerHTML=`
    <section class="welcome-row"><div><div class="eyebrow"><span class="live-dot"></span> LIVE CAMPUS OVERVIEW</div><h1>Добро пожаловать,<br><span>оператор.</span></h1><p class="intro">Вот что происходит в кампусе прямо сейчас.</p></div><div class="date-card"><span class="date-icon">◷</span><div><small>СЕГОДНЯ</small><strong id="todayDate">${new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</strong><span id="clock"></span></div></div></section>
    <section class="hero-banner"><div class="hero-copy"><div class="hero-pill"><span></span> CAMPUS INTELLIGENCE</div><h2>Умный кампус.<br><em>Умные решения.</em></h2><p>Единый центр управления инфраструктурой, IoT-датчиками и событиями кампуса.</p><button class="button button-light" data-go="analytics">Открыть AI аналитику <span>↗</span></button></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="core"><div class="core-inner">N<span>✳</span></div></div><div class="orbit-node node-a">⌁</div><div class="orbit-node node-b">◈</div><div class="orbit-node node-c">↗</div><div class="orbit-node node-d">▦</div><div class="art-caption">CONNECTED CAMPUS <span>● ONLINE</span></div></div></section>
    <section class="section-heading"><div><span class="eyebrow">CAMPUS PULSE</span><h2>Ключевые показатели</h2></div><button class="text-button" data-go="analytics">Подробная аналитика <span>→</span></button></section>
    <section class="metric-grid" id="metrics">${metricsHTML()}</section>
    <section class="dashboard-grid"><article class="panel chart-panel"><div class="panel-head"><div><span class="eyebrow">ENERGY MONITORING</span><h3>Энергопотребление</h3></div><select id="energyPeriod" aria-label="Период графика"><option value="day">Сегодня</option><option value="week">7 дней</option></select></div><div class="chart-legend"><span><i class="legend-blue"></i>Корпус A</span><span><i class="legend-teal"></i>Корпус B</span><strong id="energyTotal">412 <small>kWh</small></strong></div><div class="chart-wrap"><canvas id="energyChart" aria-label="График энергопотребления"></canvas></div></article>
    <article class="panel health-panel"><div class="panel-head"><div><span class="eyebrow">INFRASTRUCTURE</span><h3>Состояние системы</h3></div><button class="more-button" data-go="devices">•••</button></div><div class="health-score"><div class="score-ring"><div><strong id="healthScore">94</strong><small>из 100</small></div></div><div><strong>Отличное состояние</strong><p>Большинство систем работает штатно.</p></div></div><div class="health-row"><span><i class="dot dot-teal"></i>Онлайн устройства</span><strong>${devices.filter(d=>d.online).length} <small>/ ${devices.length}</small></strong></div><div class="health-row"><span><i class="dot dot-amber"></i>Предупреждения</span><strong>${alerts().filter(a=>a.level==="warning").length.toString().padStart(2,"0")}</strong></div><div class="health-row"><span><i class="dot dot-red"></i>Критические события</span><strong>${alerts().filter(a=>a.level==="critical").length.toString().padStart(2,"0")}</strong></div><button class="button button-outline full-width" data-go="devices">Мониторинг устройств <span>→</span></button></article></section>
    <section class="dashboard-grid lower-grid"><article class="panel rooms-panel"><div class="panel-head"><div><span class="eyebrow">ROOM MONITORING</span><h3>Аудитории кампуса</h3></div><button class="text-button" data-go="rooms">Все аудитории →</button></div>${roomTableHTML(rooms.slice(0,5))}</article><article class="panel alerts-panel"><div class="panel-head"><div><span class="eyebrow">AI OBSERVABILITY</span><h3>События и сигналы</h3></div><span class="live-label"><i></i> LIVE</span></div><div class="alert-list">${alertsHTML(3)}</div><button class="button button-outline full-width" data-go="analytics">Открыть центр аналитики <span>→</span></button></article></section>
    <footer class="page-footer"><span>© 2026 NEXUS AI CAMPUS</span><span><i class="live-dot"></i> Все данные демонстрационные · Учебный прототип</span><span>BUILT FOR A SMARTER FUTURE ↗</span></footer>`;
  drawEnergyChart();
  updateClock();
  $("#energyPeriod").addEventListener("change",drawEnergyChart);
}
function drawEnergyChart(){
  const canvas=$("#energyChart");if(!canvas||!window.Chart)return;
  if(energyChart)energyChart.destroy();
  const week=$("#energyPeriod")?.value==="week";
  const labels=week?["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]:["08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"];
  const a=week?[320,365,390,412,380,245,190]:[28,44,61,54,72,66,50,37];
  const b=week?[210,235,260,275,250,165,120]:[18,27,39,35,48,42,31,22];
  const styles=getComputedStyle(document.body),grid=styles.getPropertyValue("--line"),muted=styles.getPropertyValue("--muted");
  energyChart=new Chart(canvas,{type:"line",data:{labels,datasets:[{label:"Корпус A",data:a,borderColor:"#8797ff",backgroundColor:"rgba(135,151,255,.12)",fill:true,tension:.4,pointRadius:0,pointHoverRadius:4,borderWidth:2},{label:"Корпус B",data:b,borderColor:"#62e6c4",backgroundColor:"rgba(98,230,196,.04)",fill:true,tension:.4,pointRadius:0,pointHoverRadius:4,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:"index"},plugins:{legend:{display:false},tooltip:{backgroundColor:"#101927",borderColor:"#33425b",borderWidth:1,titleColor:"#f0f4fc",bodyColor:"#b7c3d8",padding:11,displayColors:true}},scales:{x:{grid:{display:false},ticks:{color:muted,font:{size:10}},border:{display:false}},y:{grid:{color:grid},ticks:{color:muted,font:{size:10},maxTicksLimit:5},border:{display:false},beginAtZero:true}}}});
}
function renderRooms(){
  $("#content").innerHTML=`<section class="section-heading"><div><span class="eyebrow">INFRASTRUCTURE / ROOMS</span><h2>Аудитории кампуса</h2><p class="intro">Мониторинг температуры, качества воздуха и занятости.</p></div><span class="status-chip">${rooms.length} помещений</span></section><article class="panel table-panel"><div class="table-toolbar"><div><h3>Все помещения</h3><p>Демонстрационные показания датчиков</p></div><div class="form-row"><input id="roomFilterSearch" placeholder="Поиск аудитории..." aria-label="Поиск аудитории"><select id="roomRiskFilter" class="filter-select"><option value="all">Все статусы</option><option>Норма</option><option>Внимание</option><option>Критический</option></select></div></div><div id="roomsTable">${roomTableHTML(rooms)}</div></article>`;
  const update=()=>{const q=$("#roomFilterSearch").value.toLowerCase(),s=$("#roomRiskFilter").value;$("#roomsTable").innerHTML=roomTableHTML(rooms.filter(r=>(`${r.id} ${r.building} ${r.type}`).toLowerCase().includes(q)&&(s==="all"||risk(r)===s)));};
  $("#roomFilterSearch").addEventListener("input",update);$("#roomRiskFilter").addEventListener("change",update);
}
function renderDevices(){
  $("#content").innerHTML=`<section class="section-heading"><div><span class="eyebrow">INFRASTRUCTURE / IOT</span><h2>IoT устройства</h2><p class="intro">Состояние датчиков и точек мониторинга кампуса.</p></div><span class="status-chip">${devices.filter(d=>d.online).length} онлайн</span></section><article class="panel table-panel"><div class="table-toolbar"><div><h3>Реестр устройств</h3><p>${devices.length} устройств · данные симулируются в браузере</p></div><select id="deviceFilter" class="filter-select"><option value="all">Все устройства</option><option value="online">Online</option><option value="offline">Offline</option></select></div><div id="deviceTable" class="table-scroll"></div></article>`;
  const update=()=>{const f=$("#deviceFilter").value,items=devices.filter(d=>f==="all"||(f==="online"&&d.online)||(f==="offline"&&!d.online));$("#deviceTable").innerHTML=`<table class="data-table"><thead><tr><th>DEVICE ID</th><th>ТИП ДАТЧИКА</th><th>АУДИТОРИЯ</th><th>ПОКАЗАНИЕ</th><th>СТАТУС</th><th>ОБНОВЛЕНО</th></tr></thead><tbody>${items.map(d=>`<tr><td><b>${d.id}</b></td><td>${d.type}</td><td>${d.room}</td><td>${d.value} ${d.unit}</td><td><span class="status-chip ${d.online?"":"critical"}">${d.online?"Online":"Offline"}</span></td><td>${d.updated}</td></tr>`).join("")}</tbody></table>`;};
  $("#deviceFilter").addEventListener("change",update);update();
}
function renderIncidents(){
  $("#content").innerHTML=`<section class="section-heading"><div><span class="eyebrow">OPERATIONS / INCIDENTS</span><h2>Инциденты и заявки</h2><p class="intro">Создавайте заявки, обновляйте статусы и контролируйте решение проблем.</p></div><button class="button button-light" id="addIncident">＋ Новая заявка</button></section><article class="panel table-panel"><div class="table-toolbar"><div><h3>Журнал событий</h3><p>Изменения сохраняются в браузере (localStorage)</p></div><select id="incidentFilter" class="filter-select"><option value="all">Все статусы</option><option>Открыт</option><option>В работе</option><option>Решён</option></select></div><div id="incidentTable" class="table-scroll"></div></article>`;
  const update=()=>{const f=$("#incidentFilter").value,items=incidents.filter(i=>f==="all"||i.status===f);$("#incidentTable").innerHTML=items.length?`<table class="data-table"><thead><tr><th>ID</th><th>ОПИСАНИЕ</th><th>АУДИТОРИЯ</th><th>ПРИОРИТЕТ</th><th>СТАТУС</th><th>ДЕЙСТВИЯ</th></tr></thead><tbody>${items.map(i=>`<tr><td>#${i.id}</td><td><b>${escapeHTML(i.title)}</b><span class="room-sub">${i.time||"Создано сейчас"}</span></td><td>${escapeHTML(i.room)}</td><td><span class="status-chip ${i.priority==="Критический"?"critical":i.priority==="Высокий"?"warning":""}">${i.priority}</span></td><td>${i.status}</td><td><button class="action-btn" data-status="${i.id}">Изменить статус</button> <button class="action-btn" data-delete="${i.id}">Удалить</button></td></tr>`).join("")}</tbody></table>`:`<div class="empty-state">Заявок в этом разделе нет.</div>`;};
  $("#addIncident").addEventListener("click",()=>{const title=prompt("Кратко опиши проблему:");if(!title?.trim())return;const room=prompt("Номер аудитории (например A-101):","A-101");if(!room?.trim())return;incidents.unshift({id:Date.now(),title:title.trim(),room:room.trim().toUpperCase(),priority:"Средний",status:"Открыт",time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})});saveIncidents();update();renderMetricsIfNeeded();showToast("Заявка успешно создана");});
  $("#incidentTable").addEventListener("click",e=>{const s=e.target.closest("[data-status]"),d=e.target.closest("[data-delete]");if(s){const item=incidents.find(i=>i.id===Number(s.dataset.status));if(item){item.status=({"Открыт":"В работе","В работе":"Решён","Решён":"Открыт"})[item.status];saveIncidents();update();showToast("Статус обновлён");}}if(d&&confirm("Удалить выбранную заявку?")){incidents=incidents.filter(i=>i.id!==Number(d.dataset.delete));saveIncidents();update();showToast("Заявка удалена");}});
  $("#incidentFilter").addEventListener("change",update);update();
}
function renderAnalytics(){
  const list=alerts();
  $("#content").innerHTML=`<section class="section-heading"><div><span class="eyebrow">INTELLIGENCE / ANALYTICS</span><h2>AI аналитика</h2><p class="intro">Поиск необычных показаний и рекомендации для оператора.</p></div><span class="status-chip">RULE ENGINE ACTIVE</span></section><section class="metric-grid"><article class="metric-card"><div class="metric-top">Проверено помещений</div><div class="metric-value">${rooms.length}</div><div class="metric-foot">Все аудитории в выборке</div></article><article class="metric-card"><div class="metric-top">Найдено сигналов</div><div class="metric-value">${list.length}</div><div class="metric-foot">По текущим порогам</div></article><article class="metric-card"><div class="metric-top">Критический риск</div><div class="metric-value">${list.filter(a=>a.level==="critical").length}</div><div class="metric-foot">Нужна проверка</div></article><article class="metric-card"><div class="metric-top">Метод анализа</div><div class="metric-value" style="font-size:19px">Rule-based</div><div class="metric-foot">Пороговые правила</div></article></section><section class="dashboard-grid"><article class="panel"><div class="panel-head"><div><span class="eyebrow">ANOMALY DETECTION</span><h3>Обнаруженные аномалии</h3></div><span class="live-label"><i></i> ${list.length} СИГНАЛОВ</span></div><div class="alert-list">${alertsHTML(20)}</div></article><article class="panel"><div class="panel-head"><div><span class="eyebrow">MODEL LOGIC</span><h3>Правила анализа</h3></div></div><div class="recommendation"><strong>Температура</strong><p>Норма: 18–27 °C. Предупреждение: 28–31 °C. Критично: от 32 °C.</p></div><div class="recommendation"><strong>Уровень CO₂</strong><p>Норма: ниже 1000 ppm. Предупреждение: 1000–1499 ppm. Критично: от 1500 ppm.</p></div><div class="recommendation"><strong>Энергопотребление</strong><p>Если помещение пустует, а расход высокий, система предлагает проверить оборудование.</p></div><p class="room-sub" style="line-height:1.7;margin-top:15px">Важно: это учебная rule-based аналитика на демонстрационных данных, а не обученная нейросеть и не реальная телеметрия.</p></article></section>`;
}
function renderSettings(){
  $("#content").innerHTML=`<section class="section-heading"><div><span class="eyebrow">SYSTEM / PREFERENCES</span><h2>Настройки</h2><p class="intro">Управление интерфейсом и демонстрационными данными.</p></div></section><section class="settings-grid"><article class="panel"><div class="panel-head"><div><span class="eyebrow">APPEARANCE</span><h3>Внешний вид</h3></div></div><div class="setting-item"><div><strong>Светлая тема</strong><small>Переключить оформление панели</small></div><button class="toggle ${document.body.classList.contains("light")?"on":""}" id="settingTheme" aria-label="Переключить тему"></button></div><div class="setting-item"><div><strong>Живые часы</strong><small>Показывать текущее время в шапке</small></div><button class="toggle on" id="settingClock" aria-label="Переключить часы"></button></div></article><article class="panel"><div class="panel-head"><div><span class="eyebrow">DATA MANAGEMENT</span><h3>Данные проекта</h3></div></div><div class="setting-item"><div><strong>Заявки и инциденты</strong><small>Сейчас сохранено: ${incidents.length}</small></div><button class="action-btn" id="resetIncidents">Сбросить</button></div><div class="setting-item"><div><strong>Информация о проекте</strong><small>Учебный прототип Smart Campus</small></div><span class="status-chip">v1.0.6</span></div></article></section><article class="panel" style="margin-top:15px"><span class="eyebrow">ABOUT NEXUS</span><h3>Интеллектуальная платформа кампуса</h3><p class="intro">Интерфейс создан на HTML, CSS и JavaScript. Chart.js используется для графика. localStorage сохраняет заявки и настройки в браузере. Реальные датчики и сервер не подключены.</p></article>`;
  $("#settingTheme").addEventListener("click",toggleTheme);
  $("#settingClock").addEventListener("click",e=>{e.currentTarget.classList.toggle("on");const on=e.currentTarget.classList.contains("on");localStorage.setItem("nexus-clock",on?"on":"off");if($("#clock"))$("#clock").style.display=on?"":"none";});
  $("#resetIncidents").addEventListener("click",()=>{if(!confirm("Восстановить стартовые заявки?"))return;localStorage.removeItem("nexus-incidents-v2");incidents=readIncidents();updateBadge();renderSettings();showToast("Начальные данные восстановлены");});
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderMetricsIfNeeded(){updateBadge();if(currentPage==="overview")renderOverview();}
function showToast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500);}
const pages={overview:{title:"Обзор кампуса",render:renderOverview},rooms:{title:"Аудитории",render:renderRooms},devices:{title:"IoT устройства",render:renderDevices},incidents:{title:"Инциденты",render:renderIncidents},analytics:{title:"AI аналитика",render:renderAnalytics},settings:{title:"Настройки",render:renderSettings}};
function navigate(page){if(!pages[page])return;currentPage=page;$("#pageTitle").textContent=pages[page].title;$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#sidebar").classList.remove("open");pages[page].render();window.scrollTo({top:0,behavior:"smooth"});}
function toggleTheme(){document.body.classList.toggle("light");localStorage.setItem("nexus-theme",document.body.classList.contains("light")?"light":"dark");if(currentPage==="overview")drawEnergyChart();if(currentPage==="settings")renderSettings();}
function updateClock(){const el=$("#clock");if(!el)return;const now=new Date();el.textContent=now.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"})+" · local time";}
$$(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.addEventListener("click",e=>{const go=e.target.closest("[data-go]");if(go)navigate(go.dataset.go);});
$("#themeToggle").addEventListener("click",toggleTheme);
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#notificationButton").addEventListener("click",()=>{navigate("analytics");showToast("Открыт центр событий и сигналов");});
$("#globalSearch").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();if(!q)return;const matched=rooms.some(r=>`${r.id} ${r.type} ${r.building}`.toLowerCase().includes(q))||devices.some(d=>`${d.id} ${d.room} ${d.type}`.toLowerCase().includes(q));if(matched){navigate("rooms");const input=$("#roomFilterSearch");if(input){input.value=q;input.dispatchEvent(new Event("input"));}}});
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#globalSearch").focus();}});
if(localStorage.getItem("nexus-theme")==="light")document.body.classList.add("light");
updateBadge();navigate("overview");setInterval(()=>{if(localStorage.getItem("nexus-clock")!=="off")updateClock();},1000);

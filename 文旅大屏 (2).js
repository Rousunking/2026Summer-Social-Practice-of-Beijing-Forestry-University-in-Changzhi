const DATA = window.YSD_DATA;
const TOUR_DATA = DATA.tour || {};
const TOUR_POINTS = (TOUR_DATA.scenic || []);
const COLORS = ["#1f9d64", "#3fa7d6", "#f3b63f", "#f47b64", "#50c878", "#7b88d1"];

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function mapUrl(id){ return `tour.html?id=${encodeURIComponent(id)}`; }

function tourPointById(id){
  return TOUR_POINTS.find(p => p.id === id) || TOUR_POINTS[0];
}

function cleanText(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || s === "未标注" || s === "待补充") return "";
  return s;
}

function detailFacts(p){
  return [
    ["景点编号", p.id],
    ["景点名称", p.name],
    ["所在乡镇", p.town],
    ["景点等级", p.level || "未评级"],
    ["景点类型", p.type || "人文景观"],
    ["详细地址", p.address || ""],
    ["经纬度", `${p.lng}, ${p.lat}`],
    ["体验业态", p.experience || ""],
    ["特色美食", p.food || ""],
    ["文创产品", p.cultural || ""],
    ["主要特色", p.feature || ""],
  ];
}

function renderBars(id, rows, limit=8){
  const list = qs("#"+id);
  const sliced = rows.slice(0, limit);
  const max = Math.max(...sliced.map(x => x.value), 1);
  list.innerHTML = sliced.map((row, idx) => `
    <div class="bar-row">
      <div class="bar-name" title="${esc(row.name)}">${esc(row.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, row.value / max * 100)}%; background:linear-gradient(90deg, ${COLORS[idx % COLORS.length]}, #50c878)"></div></div>
      <div class="bar-value">${row.value}</div>
    </div>`).join("");
}

function renderDonut(donutId, legendId, rows){
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  let start = 0;
  const segments = rows.map((row, idx) => {
    const end = start + row.value / total * 100;
    const seg = `${COLORS[idx % COLORS.length]} ${start}% ${end}%`;
    start = end;
    return seg;
  });
  qs("#"+donutId).style.background = `conic-gradient(${segments.join(", ")})`;
  qs("#"+legendId).innerHTML = rows.map((row, idx) => `
    <div class="legend-row"><span><span style="color:${COLORS[idx % COLORS.length]}">●</span> ${esc(row.name)}</span><strong>${row.value}</strong></div>
  `).join("");
}

function pointXY(p){
  const pts = TOUR_POINTS.filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
  if(pts.length === 0) return { x: 50, y: 50 };
  const lngs = pts.map(x => x.lng), lats = pts.map(x => x.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return {
    x: (p.lng - minLng) / Math.max(maxLng - minLng, .0001) * 72 + 14,
    y: (1 - (p.lat - minLat) / Math.max(maxLat - minLat, .0001)) * 68 + 17
  };
}

function calculateKpis(){
  const total = TOUR_POINTS.length;
  const withCoord = TOUR_POINTS.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).length;
  const aLevel = TOUR_POINTS.filter(p => p.level && p.level.includes("A")).length;
  const townCount = new Set(TOUR_POINTS.map(p => p.town)).size;
  const typeCount = new Set(TOUR_POINTS.map(p => p.type)).size;
  const hasFood = TOUR_POINTS.filter(p => cleanText(p.food)).length;
  const hasExperience = TOUR_POINTS.filter(p => cleanText(p.experience)).length;
  
  return {
    total,
    withCoord,
    aLevel,
    townCount,
    typeCount,
    hasFood,
    hasExperience
  };
}

function calculateTowns(){
  const counts = {};
  TOUR_POINTS.forEach(p => {
    counts[p.town] = (counts[p.town] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateLevels(){
  const counts = {};
  TOUR_POINTS.forEach(p => {
    const level = p.level || "未评级";
    counts[level] = (counts[level] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateTypes(){
  const counts = {};
  TOUR_POINTS.forEach(p => {
    const type = p.type || "其他";
    counts[type] = (counts[type] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateFoodStats(){
  const foodCount = {};
  TOUR_POINTS.forEach(p => {
    if(cleanText(p.food)){
      const foods = p.food.split(/[,，、]/);
      foods.forEach(food => {
        const f = food.trim();
        if(f) foodCount[f] = (foodCount[f] || 0) + 1;
      });
    }
  });
  return Object.entries(foodCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

let selected = tourPointById(paramId());

function renderKpis(){
  const k = calculateKpis();
  const items = [
    ["景点点位总数", k.total, "个"],
    ["具备经纬度", k.withCoord, "个"],
    ["A级景区", k.aLevel, "个"],
    ["覆盖乡镇", k.townCount, "个"],
    ["景点类型", k.typeCount, "类"],
    ["含特色美食", k.hasFood, "个"],
    ["含体验业态", k.hasExperience, "个"]
  ];
  qs("#kpis").innerHTML = items.map(([label,value,unit]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}<span class="unit">${unit}</span></div></div>`).join("");
}

function renderDetail(p){
  qs("#backMap").href = mapUrl(p.id);
  const facts = detailFacts(p).filter(([,v]) => cleanText(v));
  qs("#detailContent").innerHTML = `
    <div class="detail-title"><strong>${esc(p.name)}</strong><span>${esc(p.level || "未评级")}</span></div>
    <div class="facts">${facts.map(([k,v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="story"><b>景点介绍：</b>${esc(p.desc || "暂无介绍")}</div>`;
}
function renderPointSelect(){
  const select = qs("#pointSelect");
  select.innerHTML = TOUR_POINTS.map(p => `<option value="${p.id}">${p.name} - ${p.town}</option>`).join("");
  select.value = selected.id;
  select.addEventListener("change", () => selectMiniPoint(select.value));
}

function selectMiniPoint(id){
  selected = tourPointById(id);
  renderDetail(selected);
  const select = qs("#pointSelect");
  if(select) select.value = selected.id;
  qsa("#miniMap .mini-group").forEach(group => {
    const isActive = group.dataset.id === selected.id;
    group.classList.toggle("active", isActive);
  });
  qsa("#pointList .item").forEach(item => {
    item.classList.toggle("active", item.dataset.id === selected.id);
  });
  const url = new URL(location.href);
  url.searchParams.set("id", selected.id);
  history.replaceState(null, "", url);
}

function renderMiniMap(pick){
  const map = qs("#miniMap");
  map.innerHTML = "";
  TOUR_POINTS.forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const group = document.createElement("div");
    group.className = "mini-group" + (p.id === pick.id ? " active" : "");
    group.dataset.id = p.id;
    group.style.left = `${x}%`;
    group.style.top = `${y}%`;
    group.title = `${p.name}`;
    const dot = document.createElement("span");
    dot.className = "dot";
    const label = document.createElement("span");
    label.className = "mini-label";
    const labelName = p.name.length > 6 ? p.name.slice(0,5) + "…" : p.name;
    label.textContent = labelName;
    group.appendChild(dot);
    group.appendChild(label);
    group.addEventListener("click", () => selectMiniPoint(p.id));
    map.appendChild(group);
  });
}

function renderPointList(){
  const list = qs("#pointList");
  list.innerHTML = TOUR_POINTS.map(p => `
    <div class="item ${p.id === selected.id ? "active" : ""}" data-id="${esc(p.id)}">
      <strong>${esc(p.name)}</strong>
      <span>${esc(p.town)}｜${esc(p.level || "未评级")}</span>
    </div>
  `).join("");
  qsa("#pointList .item").forEach(el => el.addEventListener("click", () => selectMiniPoint(el.dataset.id)));
}

renderKpis();
renderBars("townBars", calculateTowns(), 8);
renderBars("levelBars", calculateLevels(), 6);
renderBars("foodBars", calculateFoodStats(), 8);
renderDonut("typeDonut", "typeLegend", calculateTypes());
renderDonut("levelDonut", "levelLegend", calculateLevels());
renderPointSelect();
renderDetail(selected);
renderMiniMap(selected);
renderPointList();
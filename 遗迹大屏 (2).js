const DATA = window.YSD_DATA;
const TOUR_DATA = DATA.tour || {};
const HISTORIC_POINTS = (TOUR_DATA.historic || []);
const COLORS = ["#1f9d64", "#3fa7d6", "#f3b63f", "#f47b64", "#50c878", "#7b88d1"];

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function mapUrl(id){ return `tour.html?id=${encodeURIComponent(id)}`; }

function historicPointById(id){
  return HISTORIC_POINTS.find(p => p.id === id) || HISTORIC_POINTS[0];
}

function cleanText(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || s === "未标注" || s === "待补充") return "";
  return s;
}

function detailFacts(p){
  return [
    ["遗迹编号", p.id],
    ["遗迹名称", p.name],
    ["所在乡镇", p.town],
    ["所在村庄", p.village || ""],
    ["年代", p.era || ""],
    ["保护级别", p.level || "全国重点文物保护单位"],
    ["类别", p.category || "古建筑"],
    ["详细地址", p.address || ""],
    ["经纬度", `${p.lng}, ${p.lat}`],
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
  const pts = HISTORIC_POINTS.filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
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
  const total = HISTORIC_POINTS.length;
  const withCoord = HISTORIC_POINTS.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).length;
  const townCount = new Set(HISTORIC_POINTS.map(p => p.town)).size;
  const villageCount = new Set(HISTORIC_POINTS.map(p => p.village)).size;
  const categoryCount = new Set(HISTORIC_POINTS.map(p => p.category)).size;
  const eraCount = new Set(HISTORIC_POINTS.map(p => p.era)).size;
  
  return {
    total,
    withCoord,
    townCount,
    villageCount,
    categoryCount,
    eraCount
  };
}

function calculateTowns(){
  const counts = {};
  HISTORIC_POINTS.forEach(p => {
    counts[p.town] = (counts[p.town] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateEras(){
  const counts = {};
  HISTORIC_POINTS.forEach(p => {
    const era = p.era || "未知";
    counts[era] = (counts[era] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateCategories(){
  const counts = {};
  HISTORIC_POINTS.forEach(p => {
    const category = p.category || "其他";
    counts[category] = (counts[category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateProtectionLevels(){
  const counts = {};
  HISTORIC_POINTS.forEach(p => {
    const level = p.protectionLevel || "其他";
    counts[level] = (counts[level] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

let selected = historicPointById(paramId());

function renderKpis(){
  const k = calculateKpis();
  const items = [
    ["遗迹点位总数", k.total, "个"],
    ["具备经纬度", k.withCoord, "个"],
    ["覆盖乡镇", k.townCount, "个"],
    ["覆盖村庄", k.villageCount, "个"],
    ["遗迹类别", k.categoryCount, "类"],
    ["年代跨度", k.eraCount, "个"],
  ];
  qs("#kpis").innerHTML = items.map(([label,value,unit]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}<span class="unit">${unit}</span></div></div>`).join("");
}

function renderDetail(p){
  qs("#backMap").href = mapUrl(p.id);
  const facts = detailFacts(p).filter(([,v]) => cleanText(v));
  qs("#detailCard").innerHTML = `<h2>当前遗迹详情</h2>
    <div class="detail-title"><strong>${esc(p.name)}</strong><span>${esc(p.level || "全国重点文物保护单位")}</span></div>
    <div class="facts">${facts.map(([k,v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="story"><b>遗迹介绍：</b>${esc(p.desc || "暂无介绍")}</div>`;
}

function selectMiniPoint(id){
  selected = historicPointById(id);
  renderDetail(selected);
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
  HISTORIC_POINTS.forEach(p => {
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
  list.innerHTML = HISTORIC_POINTS.map(p => `
    <div class="item ${p.id === selected.id ? "active" : ""}" data-id="${esc(p.id)}">
      <strong>${esc(p.name)}</strong>
      <span>${esc(p.protectionLevel || "")}｜${esc(p.town)} ${esc(p.village || "")}｜${esc(p.era)}</span>
    </div>
  `).join("");
  qsa("#pointList .item").forEach(el => el.addEventListener("click", () => selectMiniPoint(el.dataset.id)));
}

renderKpis();
renderBars("townBars", calculateTowns(), 8);
renderBars("eraBars", calculateEras(), 6);
renderDonut("categoryDonut", "categoryLegend", calculateCategories());
renderDonut("townDonut", "townLegend", calculateProtectionLevels());
renderDetail(selected);
renderMiniMap(selected);
renderPointList();
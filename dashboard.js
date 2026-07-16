
const DATA = window.YSD_DATA;
const POINTS = DATA.points;
const COLORS = ["#1f9d64", "#3fa7d6", "#f3b63f", "#f47b64", "#50c878", "#7b88d1"];
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function gradeLabel(v){ if(v === "1") return "一级"; if(v === "2") return "二级"; if(v === "3") return "三级"; return v || "未标注"; }
function pointById(id){ return POINTS.find(p => p.id === id) || POINTS[0]; }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function dashboardUrl(id){ return `数据大屏.html?id=${encodeURIComponent(id)}`; }
function mapUrl(id){ return `map.html?id=${encodeURIComponent(id)}`; }
function detailFacts(p){
  return [
    ["古树编号", p.id], ["位置", `${p.town} / ${p.village} / ${p.place}`],
    ["经纬度", `${p.lng}, ${p.lat}`], ["树种", `${p.species}（${p.family} · ${p.genus}）`],
    ["树龄等级", `${p.age || "未知"} 年 / ${gradeLabel(p.grade)}`], ["生长状态", `${p.growth} / 环境${p.environment}`],
    ["形态指标", `树高${p.height ?? "—"}米，胸围${p.chest ?? "—"}厘米，冠幅${p.avgCrown ?? "—"}米`],
    ["保护养护", `${p.measure || "待补充"}；${p.revive || "待补充"}`],
    ["权属责任", `${p.ownership}；养护责任人：${p.maintainer}`], ["调查信息", `${p.surveyPerson} / ${p.surveyDate}`],
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
    <div class="legend-row"><span><span style="color:${COLORS[idx % COLORS.length]}">●</span> ${esc(gradeLabel(row.name))}</span><strong>${row.value}</strong></div>
  `).join("");
}
function pointXY(p){
  const pts = POINTS.filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
  const lngs = pts.map(x => x.lng), lats = pts.map(x => x.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return {
    x: (p.lng - minLng) / Math.max(maxLng - minLng, .0001) * 72 + 14,
    y: (1 - (p.lat - minLat) / Math.max(maxLat - minLat, .0001)) * 68 + 17
  };
}

let selected = pointById(paramId());
function renderKpis(){
  const k = DATA.kpis;
  const items = [["古树点位总数", k.total, "条"], ["具备经纬度", k.withCoord, "条"], ["最高树龄", k.maxAge, "年"], ["平均树龄", k.avgAge, "年"], ["一级古树", k.gradeOne, "条"], ["记录树种", k.speciesCount, "类"], ["覆盖乡镇", k.townCount, "个"]];
  qs("#kpis").innerHTML = items.map(([label,value,unit]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}<span class="unit">${unit}</span></div></div>`).join("");
}
function renderDetail(p){
  qs("#backMap").href = mapUrl(p.id);
  qs("#detailCard").innerHTML = `<h2>当前点位详情</h2>
    <div class="detail-title"><strong>${esc(p.species)} · ${esc(p.town)}</strong><span>${esc(p.age || "—")}<small style="font-size:14px"> 年</small></span></div>
    <div class="facts">${detailFacts(p).map(([k,v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="story"><b>历史资料：</b>${esc(p.story)}</div>`;
}
function selectMiniPoint(id){
  selected = pointById(id);
  renderDetail(selected);
  qsa("#miniMap .dot").forEach(dot => {
    const isActive = dot.dataset.id === selected.id;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
  const url = new URL(location.href);
  url.searchParams.set("id", selected.id);
  history.replaceState(null, "", url);
}
function renderMiniMap(pick){
  const map = qs("#miniMap");
  POINTS.forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.id = p.id;
    dot.role = "button";
    dot.tabIndex = 0;
    dot.setAttribute("aria-pressed", String(p.id === pick.id));
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.title = `${p.id} · ${p.species}`;
    if(p.id === pick.id){
      dot.classList.add("active");
    }
    dot.addEventListener("click", () => selectMiniPoint(p.id));
    dot.addEventListener("keydown", event => {
      if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        selectMiniPoint(p.id);
      }
    });
    map.appendChild(dot);
  });
}
renderKpis();
renderBars("townBars", DATA.towns, 8);
renderBars("speciesBars", DATA.species, 8);
renderBars("envBars", DATA.environment, 6);
renderBars("ownershipBars", DATA.ownership, 6);
renderDonut("gradeDonut", "gradeLegend", DATA.grades);
renderDonut("growthDonut", "growthLegend", DATA.growth);
renderDetail(selected);
renderMiniMap(selected);

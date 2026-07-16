
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

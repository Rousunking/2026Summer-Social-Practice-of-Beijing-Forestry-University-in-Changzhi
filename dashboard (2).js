
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
  qs("#detailContent").innerHTML = `
    <div class="detail-title"><strong>${esc(p.species)} · ${esc(p.town)}</strong><span>${esc(p.age || "—")}<small style="font-size:14px"> 年</small></span></div>
    <div class="facts">${detailFacts(p).map(([k,v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="story"><b>历史资料：</b>${esc(p.story)}</div>`;
}
function renderPointSelect(){
  const select = qs("#pointSelect");
  select.innerHTML = POINTS.map(p => `<option value="${p.id}">${p.species} - ${p.town}</option>`).join("");
  select.value = selected.id;
  select.addEventListener("change", () => selectMiniPoint(select.value));
}
function selectMiniPoint(id){
  selected = pointById(id);
  renderDetail(selected);
  const select = qs("#pointSelect");
  if(select) select.value = selected.id;
  qsa("#miniMap .mini-group").forEach(group => {
    const isActive = group.dataset.id === selected.id;
    group.classList.toggle("active", isActive);
  });
  const url = new URL(location.href);
  url.searchParams.set("id", selected.id);
  history.replaceState(null, "", url);
}
function renderMiniMap(pick){
  const map = qs("#miniMap");
  map.innerHTML = "";
  const groups = [];
  POINTS.forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const group = document.createElement("div");
    group.className = "mini-group" + (p.id === pick.id ? " active" : "");
    group.dataset.id = p.id;
    group.style.left = `${x}%`;
    group.style.top = `${y}%`;
    group.title = `${p.id} · ${p.species}`;
    const dot = document.createElement("span");
    dot.className = "dot" + (p.grade ? ` grade-${p.grade}` : "");
    const label = document.createElement("span");
    label.className = "mini-label";
    label.textContent = p.id.slice(-3);
    group.appendChild(dot);
    group.appendChild(label);
    group.addEventListener("click", () => selectMiniPoint(p.id));
    map.appendChild(group);
    groups.push({ group, x, y, id: p.id });
  });
  arrangeMiniLabels(groups);
}
function arrangeMiniLabels(groups){
  const mapEl = qs("#miniMap");
  if(!mapEl) return;
  const mapRect = mapEl.getBoundingClientRect();
  const mapW = mapRect.width;
  const mapH = mapRect.height;
  const LABEL_H = 16;
  const LABEL_W = 28;
  const DOT_OFFSET = 10;
  groups.forEach(g => {
    g.group.classList.remove("label-up", "label-left", "label-right");
  });
  const placed = [];
  groups.forEach(g => {
    const cx = g.x / 100 * mapW;
    const cy = g.y / 100 * mapH;
    const candidates = [
      {x: cx - LABEL_W/2, y: cy + DOT_OFFSET, dir: "down"},
      {x: cx - LABEL_W/2, y: cy - DOT_OFFSET - LABEL_H, dir: "up"},
      {x: cx + DOT_OFFSET + 6, y: cy - LABEL_H/2, dir: "right"},
      {x: cx - DOT_OFFSET - 6 - LABEL_W, y: cy - LABEL_H/2, dir: "left"},
    ];
    let chosen = null;
    for(const c of candidates){
      const rect = {
        left: c.x, top: c.y,
        right: c.x + LABEL_W, bottom: c.y + LABEL_H
      };
      if(rect.left < -5 || rect.right > mapW + 5) continue;
      if(rect.top < -5 || rect.bottom > mapH + 5) continue;
      let overlap = false;
      for(const p of placed){
        if(rect.left < p.right - 2 && rect.right > p.left + 2 &&
           rect.top < p.bottom - 2 && rect.bottom > p.top + 2){
          overlap = true;
          break;
        }
      }
      if(!overlap){
        chosen = c;
        break;
      }
    }
    if(!chosen) chosen = candidates[0];
    placed.push({
      left: chosen.x, top: chosen.y,
      right: chosen.x + LABEL_W, bottom: chosen.y + LABEL_H
    });
    g.group.classList.toggle("label-up", chosen.dir === "up");
    g.group.classList.toggle("label-left", chosen.dir === "left");
    g.group.classList.toggle("label-right", chosen.dir === "right");
  });
}
renderKpis();
renderBars("townBars", DATA.towns, 8);
renderBars("speciesBars", DATA.species, 8);
renderBars("envBars", DATA.environment, 6);
renderBars("ownershipBars", DATA.ownership, 6);
renderDonut("gradeDonut", "gradeLegend", DATA.grades);
renderDonut("growthDonut", "growthLegend", DATA.growth);
renderPointSelect();
renderDetail(selected);
renderMiniMap(selected);

const DATA = window.YSD_DATA;
const FEIYI = DATA.feiyi || {};

const allFeiyiPoints = [
  ...(FEIYI.national || []),
  ...(FEIYI.provincial || []),
  ...(FEIYI.municipal || []),
  ...(FEIYI.district || [])
];

const COLORS = ["#ef4444", "#f97316", "#3b82f6", "#6366f1", "#22c55e", "#14b8a6", "#8b5cf6", "#06b6d4"];

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function mapUrl(id){ return `feiyi.html?id=${encodeURIComponent(id)}`; }

function openLightbox(src, caption) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  img.src = src;
  cap.textContent = caption ? `${caption} - 点击关闭` : '点击关闭';
  lightbox.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('visible');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
});

function feiyiPointById(id){
  return allFeiyiPoints.find(p => p.id === id) || allFeiyiPoints[0];
}

function cleanText(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || s === "未标注" || s === "待补充") return "";
  return s;
}

function detailFacts(p){
  return [
    ["项目编号", p.id],
    ["项目名称", p.name],
    ["级别", p.level || "区级"],
    ["类别", p.category || ""],
    ["所在乡镇", p.town || ""],
    ["保护单位", p.protectUnit || ""],
    ["入选年份", p.year || ""],
    ["项目编号", p.code || ""],
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
  const pts = allFeiyiPoints.filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
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
  const total = allFeiyiPoints.length;
  const withCoord = allFeiyiPoints.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).length;
  const national = (FEIYI.national || []).length;
  const provincial = (FEIYI.provincial || []).length;
  const municipal = (FEIYI.municipal || []).length;
  const district = (FEIYI.district || []).length;
  const townCount = new Set(allFeiyiPoints.map(p => p.town)).size;
  const categoryCount = new Set(allFeiyiPoints.map(p => p.category)).size;
  
  return {
    total,
    withCoord,
    national,
    provincial,
    municipal,
    district,
    townCount,
    categoryCount
  };
}

function calculateTowns(){
  const counts = {};
  allFeiyiPoints.forEach(p => {
    counts[p.town] = (counts[p.town] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateCategories(){
  const counts = {};
  allFeiyiPoints.forEach(p => {
    const category = p.category || "其他";
    counts[category] = (counts[category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function calculateLevels(){
  const counts = {};
  allFeiyiPoints.forEach(p => {
    const level = p.level || "区级";
    counts[level] = (counts[level] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

let selected = allFeiyiPoints.length > 0 ? feiyiPointById(paramId()) : null;

function renderKpis(){
  const k = calculateKpis();
  const items = [
    ["非遗项目总数", k.total, "项"],
    ["国家级", k.national, "项"],
    ["省级", k.provincial, "项"],
    ["市级", k.municipal, "项"],
    ["区级", k.district, "项"],
    ["覆盖乡镇", k.townCount, "个"],
    ["项目类别", k.categoryCount, "类"],
  ];
  qs("#kpis").innerHTML = items.map(([label,value,unit]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}<span class="unit">${unit}</span></div></div>`).join("");
}

function renderDetail(p){
  if(!p){
    qs("#detailContent").innerHTML = `<div class="empty">选择一个非遗项目查看详情</div>`;
    return;
  }
  qs("#backMap").href = mapUrl(p.id);
  const facts = detailFacts(p).filter(([,v]) => cleanText(v));
  const imageHtml = p.image ? `<img class="feiyi-image" src="${esc(p.image)}" alt="${esc(p.name)}" onclick="openLightbox('${esc(p.image)}', '${esc(p.name)}')"/><div style="color:#999;font-size:11px;margin-top:4px;">点击图片放大查看</div>` : '';
  qs("#detailContent").innerHTML = `
    <div class="detail-title"><strong>${esc(p.name)}</strong><span>${esc(p.level || "区级")}</span></div>
    <div class="facts">${facts.map(([k,v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    <div class="story"><b>项目介绍：</b>${esc(p.desc || "暂无介绍")}</div>${imageHtml}`;
}
function renderPointSelect(){
  const select = qs("#pointSelect");
  if(!select || !selected) return;
  select.innerHTML = allFeiyiPoints.map(p => `<option value="${p.id}">${p.name} - ${p.level || "区级"}</option>`).join("");
  select.value = selected.id;
  select.addEventListener("change", () => selectMiniPoint(select.value));
}

function selectMiniPoint(id){
  selected = feiyiPointById(id);
  renderDetail(selected);
  const select = qs("#pointSelect");
  if(select && selected) select.value = selected.id;
  qsa("#miniMap .mini-group").forEach(group => {
    const items = group.querySelectorAll(".mini-multi-item");
    let isActive = false;
    if(items.length > 0){
      items.forEach(item => {
        const itemActive = item.dataset.id === selected.id;
        item.classList.toggle("active", itemActive);
        if(itemActive) isActive = true;
        // 滚动到选中项可见位置
        if(itemActive){
          const list = item.parentElement;
          const itemRect = item.getBoundingClientRect();
          const listRect = list.getBoundingClientRect();
          if(itemRect.top < listRect.top || itemRect.bottom > listRect.bottom){
            item.scrollIntoView({block: "nearest"});
          }
        }
      });
    } else {
      isActive = group.dataset.id === selected.id;
    }
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
  if(!pick){
    map.innerHTML = `<div class="empty">暂无点位数据</div>`;
    return;
  }
  // 按经纬度分组（5位小数足够区分同一点位）
  const groups = new Map();
  allFeiyiPoints.forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const key = `${p.lng.toFixed(5)}_${p.lat.toFixed(5)}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  groups.forEach(pts => {
    const p = pts[0];
    const {x,y} = pointXY(p);
    const group = document.createElement("div");
    const isActive = pts.some(pt => pt.id === pick.id);
    group.className = "mini-group" + (isActive ? " active" : "");
    group.dataset.id = p.id;
    group.style.left = `${x}%`;
    group.style.top = `${y}%`;
    const dot = document.createElement("span");
    dot.className = "dot";
    group.appendChild(dot);
    if(pts.length === 1){
      // 单项点位：保持原 label 显示
      const label = document.createElement("span");
      label.className = "mini-label";
      const labelName = p.name.length > 6 ? p.name.slice(0,5) + "…" : p.name;
      label.textContent = labelName;
      group.appendChild(label);
      group.title = p.name;
      group.addEventListener("click", () => selectMiniPoint(p.id));
    } else {
      // 多项共用同一点位：使用纵向滚轮列表
      group.classList.add("mini-group-multi");
      const list = document.createElement("div");
      list.className = "mini-multi-list";
      const title = document.createElement("div");
      title.className = "mini-multi-title";
      title.textContent = `${pts.length} 项共用`;
      list.appendChild(title);
      pts.forEach(pt => {
        const item = document.createElement("div");
        item.className = "mini-multi-item" + (pt.id === pick.id ? " active" : "");
        item.dataset.id = pt.id;
        item.textContent = pt.name;
        item.title = pt.name;
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          selectMiniPoint(pt.id);
        });
        list.appendChild(item);
      });
      group.appendChild(list);
      group.title = `${pts.length}个非遗项目共用此点位`;
    }
    map.appendChild(group);
  });
  // 排列共用点位的列表，基于实际像素位置检测重叠
  arrangeMultiLists();
}

// 基于 mini-map 实际尺寸，为每个共用点位的列表找到不重叠的位置
function arrangeMultiLists(){
  const mapEl = qs("#miniMap");
  if(!mapEl) return;
  const mapRect = mapEl.getBoundingClientRect();
  const mapW = mapRect.width;
  const mapH = mapRect.height;
  // 列表预估尺寸（与 CSS 中 min-width/max-height 对应）
  const LIST_W = 130;
  const LIST_H = 95;
  const DOT_OFFSET = 8; // dot 中心到列表的间距

  const groups = qsa("#miniMap .mini-group-multi");
  // 重置所有 group 的状态
  groups.forEach(g => {
    g.classList.remove("list-up", "list-side-left", "list-side-right");
    g.style.removeProperty("--h-shift");
  });

  const placed = []; // 已放置列表的矩形 {left, top, right, bottom}

  groups.forEach(g => {
    // group 中心点在 mini-map 中的像素位置
    const cx = parseFloat(g.style.left) / 100 * mapW;
    const cy = parseFloat(g.style.top) / 100 * mapH;

    // 候选位置（按优先级），每个返回 {x, y, dir, hShift}
    // x,y 是列表左上角的像素位置
    const candidates = [
      // 1. 下方居中（默认）
      {x: cx - LIST_W/2, y: cy + DOT_OFFSET, dir: "down", hShift: 0},
      // 2. 上方居中
      {x: cx - LIST_W/2, y: cy - DOT_OFFSET - LIST_H, dir: "up", hShift: 0},
      // 3. 右侧
      {x: cx + DOT_OFFSET + 6, y: cy - LIST_H/2, dir: "side-right", hShift: 0},
      // 4. 左侧
      {x: cx - DOT_OFFSET - 6 - LIST_W, y: cy - LIST_H/2, dir: "side-left", hShift: 0},
      // 5. 下方右偏
      {x: cx - LIST_W/2 + 24, y: cy + DOT_OFFSET, dir: "down", hShift: 24},
      // 6. 下方左偏
      {x: cx - LIST_W/2 - 24, y: cy + DOT_OFFSET, dir: "down", hShift: -24},
      // 7. 上方右偏
      {x: cx - LIST_W/2 + 24, y: cy - DOT_OFFSET - LIST_H, dir: "up", hShift: 24},
      // 8. 上方左偏
      {x: cx - LIST_W/2 - 24, y: cy - DOT_OFFSET - LIST_H, dir: "up", hShift: -24},
      // 9. 下方更远右偏
      {x: cx - LIST_W/2 + 48, y: cy + DOT_OFFSET, dir: "down", hShift: 48},
      // 10. 下方更远左偏
      {x: cx - LIST_W/2 - 48, y: cy + DOT_OFFSET, dir: "down", hShift: -48},
      // 11. 上方更远右偏
      {x: cx - LIST_W/2 + 48, y: cy - DOT_OFFSET - LIST_H, dir: "up", hShift: 48},
      // 12. 上方更远左偏
      {x: cx - LIST_W/2 - 48, y: cy - DOT_OFFSET - LIST_H, dir: "up", hShift: -48},
    ];

    let chosen = null;
    for(const c of candidates){
      const rect = {
        left: c.x, top: c.y,
        right: c.x + LIST_W, bottom: c.y + LIST_H
      };
      // 必须基本在 mini-map 范围内（允许小幅度溢出）
      if(rect.left < -10 || rect.right > mapW + 10) continue;
      if(rect.top < -10 || rect.bottom > mapH + 10) continue;
      // 检查与已放置列表是否重叠
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
    // 所有候选都重叠时，挑选与已放置列表重叠面积最小的候选
    if(!chosen){
      let minArea = Infinity;
      for(const c of candidates){
        const rect = {
          left: c.x, top: c.y,
          right: c.x + LIST_W, bottom: c.y + LIST_H
        };
        let area = 0;
        for(const p of placed){
          const ix = Math.max(0, Math.min(rect.right, p.right) - Math.max(rect.left, p.left));
          const iy = Math.max(0, Math.min(rect.bottom, p.bottom) - Math.max(rect.top, p.top));
          area += ix * iy;
        }
        if(area < minArea){
          minArea = area;
          chosen = c;
        }
      }
    }
    if(!chosen) chosen = candidates[0];

    placed.push({
      left: chosen.x, top: chosen.y,
      right: chosen.x + LIST_W, bottom: chosen.y + LIST_H
    });
    g.classList.toggle("list-up", chosen.dir === "up");
    g.classList.toggle("list-side-left", chosen.dir === "side-left");
    g.classList.toggle("list-side-right", chosen.dir === "side-right");
    if(chosen.hShift !== 0){
      g.style.setProperty("--h-shift", `${chosen.hShift}px`);
    }
  });
}

function renderPointList(){
  const list = qs("#pointList");
  if(!selected){
    list.innerHTML = `<div class="empty">暂无数据</div>`;
    return;
  }
  list.innerHTML = allFeiyiPoints.map(p => `
    <div class="item ${p.id === selected.id ? "active" : ""}" data-id="${esc(p.id)}">
      <strong>${esc(p.name)}</strong>
      <span>${esc(p.level || "")}｜${esc(p.category || "")}｜${esc(p.town || "")}</span>
    </div>
  `).join("");
  qsa("#pointList .item").forEach(el => el.addEventListener("click", () => selectMiniPoint(el.dataset.id)));
}

renderKpis();
renderBars("townBars", calculateTowns(), 8);
renderBars("categoryBars", calculateCategories(), 8);
renderDonut("levelDonut", "levelLegend", calculateLevels());
renderDonut("categoryDonut", "categoryLegend", calculateCategories());
renderPointSelect();
renderDetail(selected);
renderMiniMap(selected);
renderPointList();
const DATA = window.YSD_DATA;
const POINTS = DATA.points;
const TOUR_DATA = DATA.tour || {};
const FEIYI_DATA = DATA.feiyi || {};
const COLORS = ["#1f9d64", "#3fa7d6", "#f3b63f", "#f47b64", "#50c878", "#7b88d1"];

const IS_TOUR_PAGE = location.pathname.endsWith("tour.html");
const IS_FEIYI_PAGE = location.pathname.endsWith("feiyi.html");

const LAYER_CONFIG = {
  tree:  { label: "古树名木",   color: "#1f9d64", icon: "树", real: true,  page: null,         desc: "53 条真实古树名木点位" },
  forest:{ label: "林场资源",   color: "#2a8c3a", icon: "林", real: false, page: "forest.html", desc: "林场资源专题图层（独立页面）" },
  agri:  { label: "特色农产品", color: "#f3b63f", icon: "农", real: false, page: "agri.html",   desc: "特色农产品专题图层（独立页面）" },
  tour:  { label: "文旅景点",   color: "#3fa7d6", icon: "游", real: false, page: "tour.html",   desc: "文旅景点专题图层（独立页面）" },
  plan:  { label: "保护规划",   color: "#7b88d1", icon: "划", real: false, page: "plan.html",   desc: "古树保护规划专题图层（独立页面）" },
};

const TOUR_LAYER_CONFIG = {
  tour_scenic:   { label: "全部景点", color: "#3fa7d6", icon: "景", subType: "scenic" },
  tour_historic: { label: "历史遗迹", color: "#7b88d1", icon: "史", subType: "historic" },
};

const HISTORIC_LEVEL_CONFIG = {
  "国保": { color: "#e74c3c", icon: "国" },
  "省保": { color: "#27ae60", icon: "省" },
  "市保": { color: "#f39c12", icon: "市" },
  "区保": { color: "#3498db", icon: "区" },
};

function getHistoricLevelConfig(level){
  if(!level) return HISTORIC_LEVEL_CONFIG["区保"];
  const levelMap = {
    "全国重点文物保护单位": "国保",
    "国家级": "国保",
    "省级": "省保",
    "市级": "市保",
    "区级": "区保",
    "省保": "省保",
    "市保": "市保",
    "区保": "区保",
  };
  const key = levelMap[level] || level;
  return HISTORIC_LEVEL_CONFIG[key] || HISTORIC_LEVEL_CONFIG["区保"];
}

const FEIYI_LAYER_CONFIG = {
  feiyi_national:    { label: "国家级非遗", color: "#f47b64", icon: "国", subType: "national" },
  feiyi_provincial:  { label: "省级非遗", color: "#f3b63f", icon: "省", subType: "provincial" },
  feiyi_municipal:   { label: "市级非遗", color: "#3fa7d6", icon: "市", subType: "municipal" },
  feiyi_district:    { label: "区级非遗", color: "#7b88d1", icon: "区", subType: "district" },
};

function feiyiLevelToConfig(level){
  if(level === "国家级") return FEIYI_LAYER_CONFIG.feiyi_national;
  if(level === "省级") return FEIYI_LAYER_CONFIG.feiyi_provincial;
  if(level === "市级") return FEIYI_LAYER_CONFIG.feiyi_municipal;
  return FEIYI_LAYER_CONFIG.feiyi_district;
}

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function gradeLabel(v){ if(v === "1") return "一级"; if(v === "2") return "二级"; if(v === "3") return "三级"; return v || "未标注"; }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function dashboardUrl(id){
  if(IS_FEIYI_PAGE){
    return `非遗大屏.html?id=${encodeURIComponent(id)}`;
  }
  if(IS_TOUR_PAGE && currentTourLayer() === "tour_historic"){
    return `遗迹大屏.html?id=${encodeURIComponent(id)}`;
  }
  return IS_TOUR_PAGE ? `文旅大屏.html?id=${encodeURIComponent(id)}` : `数据大屏.html?id=${encodeURIComponent(id)}`;
}
function mapUrl(id){ return `map.html?id=${encodeURIComponent(id)}`; }

function currentTourLayer(){
  const btn = qs(".layer.active") || qs(".category-btn.active") || qs(".tree-item.active");
  if(btn) return btn.dataset.layer;
  if(IS_FEIYI_PAGE) return null;
  const urlLayer = new URLSearchParams(location.search).get("layer");
  if(urlLayer && TOUR_LAYER_CONFIG[urlLayer]) return urlLayer;
  return "tour_scenic";
}

function currentTourData(){
  if(IS_FEIYI_PAGE){
    const layer = currentTourLayer();
    const config = FEIYI_LAYER_CONFIG[layer];
    return config ? (FEIYI_DATA[config.subType] || []) : [];
  }
  const layer = currentTourLayer();
  const config = TOUR_LAYER_CONFIG[layer];
  return config ? (TOUR_DATA[config.subType] || []) : [];
}

function allTourPoints(){
  if(IS_FEIYI_PAGE){
    return Object.values(FEIYI_DATA).flat() || [];
  }
  return Object.values(TOUR_DATA).flat() || [];
}

function tourPointById(id){
  if(IS_FEIYI_PAGE){
    const all = allTourPoints();
    return all.find(p => p.id === id) || all[0];
  }
  const all = allTourPoints();
  return all.find(p => p.id === id) || all[0];
}

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

function pointXY(p, dataSource){
  const pts = (dataSource || POINTS).filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
  if(pts.length === 0) return { x: 50, y: 50 };
  const lngs = pts.map(x => x.lng), lats = pts.map(x => x.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return {
    x: (p.lng - minLng) / Math.max(maxLng - minLng, .0001) * 72 + 14,
    y: (1 - (p.lat - minLat) / Math.max(maxLat - minLat, .0001)) * 68 + 17
  };
}

let map, infoWindow, markers = [];
let markerById = new Map();
let activeId = paramId();
let activeLayers = new Set(IS_FEIYI_PAGE ? [] : IS_TOUR_PAGE ? ["tour_scenic"] : ["tree"]);
const statusEl = qs("#status");

function cleanText(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || s === "未标注" || s === "待补充") return "";
  return s;
}

function locationText(p){
  return [cleanText(p.town), cleanText(p.village), cleanText(p.location) || cleanText(p.place)].filter(Boolean).join(" / ");
}

function protectionText(p){
  return cleanText(p.protection) || cleanText(p.measure) || "暂无记录";
}

function pointTitle(p){
  if(IS_TOUR_PAGE) return p.name || p.id;
  return p.name || `${p.town}·${p.village || ""} ${p.species}`;
}

function markerClass(p){
  if(IS_TOUR_PAGE || IS_FEIYI_PAGE) return "layer-marker";
  return `tree-marker grade-${esc(p.grade || "unknown")} growth-${esc(p.growth || "unknown")}`;
}

function markerHtml(p){
  const activeClass = p.id === activeId ? " is-active" : "";
  if(IS_FEIYI_PAGE){
    const config = feiyiLevelToConfig(p.level);
    return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}" aria-label="${esc(pointTitle(p))}" style="background:${config.color}">
      <span>${esc(config.icon)}</span>
    </button>`;
  }
  if(IS_TOUR_PAGE){
    const layer = currentTourLayer();
    if(layer === "tour_historic"){
      const isActive = p.id === activeId;
      if(isActive && p.protectionLevel){
        const levelConfig = getHistoricLevelConfig(p.protectionLevel);
        return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}" aria-label="${esc(pointTitle(p))}" style="background:${levelConfig.color}">
          <span>${esc(levelConfig.icon)}</span>
        </button>`;
      }
    }
    const config = TOUR_LAYER_CONFIG[layer];
    return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}" aria-label="${esc(pointTitle(p))}" style="background:${config.color}">
      <span>${esc(config.icon)}</span>
    </button>`;
  }
  return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}" aria-label="${esc(pointTitle(p))}">
    <span>${esc(gradeLabel(p.grade).slice(0, 1))}</span>
  </button>`;
}

function pointHtml(p){
  if(IS_FEIYI_PAGE){
    const layer = currentTourLayer();
    const config = FEIYI_LAYER_CONFIG[layer];
    const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${p.lng},${p.lat}`)}&name=${encodeURIComponent(pointTitle(p))}`;
    const year = cleanText(p.year) ? `<div><b>入选年份</b><span>${esc(p.year)}</span></div>` : "";
    const code = cleanText(p.code) ? `<div><b>项目编号</b><span>${esc(p.code)}</span></div>` : "";
    const protectUnit = cleanText(p.protectUnit) ? `<div><b>保护单位</b><span>${esc(p.protectUnit)}</span></div>` : "";
    return `<div class="popup">
      <div class="popup-head">
        <span class="popup-kicker">编号 ${esc(p.id)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="popup-tags">
          <span class="tag-grade tag-grade-${esc(p.level === "国家级" ? "1" : p.level === "省级" ? "2" : p.level === "市级" ? "3" : "0")}">${esc(p.level || "区级")}</span>
          <span>${esc(p.category || "传统技艺")}</span>
          <span>${esc(p.town)}</span>
        </div>
      </div>
      <div class="popup-facts">
        <div class="fact-location"><b>所在乡镇</b><span>${esc(p.town)}</span></div>
        <div class="fact-coord"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
        ${year}
        ${code}
        ${protectUnit}
      </div>
      <div class="popup-story"><b>项目介绍</b><p>${esc(p.desc || "暂无介绍")}</p></div>
      <div class="actions">
        <a href="${dashboardUrl(p.id)}">查看数据大屏</a>
        <a class="secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
      </div>
    </div>`;
  }
  if(IS_TOUR_PAGE){
    const layer = currentTourLayer();
    const config = TOUR_LAYER_CONFIG[layer];
    const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${p.lng},${p.lat}`)}&name=${encodeURIComponent(pointTitle(p))}`;
    if(layer === "tour_historic"){
      const era = cleanText(p.era) ? `<div><b>年代</b><span>${esc(p.era)}</span></div>` : "";
      const category = cleanText(p.category) ? `<div><b>类别</b><span>${esc(p.category)}</span></div>` : "";
      const village = cleanText(p.village) ? `<div><b>所在村庄</b><span>${esc(p.village)}</span></div>` : "";
      const protectionLevel = cleanText(p.protectionLevel) ? `<div><b>保护级别</b><span>${esc(p.protectionLevel)}</span></div>` : "";
      return `<div class="popup">
        <div class="popup-head">
          <span class="popup-kicker">编号 ${esc(p.id)}</span>
          <h3>${esc(p.name)}</h3>
          <div class="popup-tags">
            <span class="tag-grade tag-grade-1">${esc(p.level || "全国重点文物保护单位")}</span>
            <span>${esc(p.protectionLevel || "")}</span>
            <span>${esc(p.category || "古建筑")}</span>
            <span>${esc(p.town)}</span>
          </div>
        </div>
        <div class="popup-facts">
          <div class="fact-location"><b>地址</b><span>${esc(p.address || p.town)}</span></div>
          ${village}
          <div class="fact-coord"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
          ${protectionLevel}
          ${era}
          ${category}
        </div>
        <div class="popup-story"><b>遗迹介绍</b><p>${esc(p.desc || "暂无介绍")}</p></div>
        <div class="actions">
          <a href="${dashboardUrl(p.id)}">查看数据大屏</a>
          <a class="secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
        </div>
      </div>`;
    }
    const experience = cleanText(p.experience) ? `<div><b>体验业态</b><span>${esc(p.experience)}</span></div>` : "";
    const food = cleanText(p.food) ? `<div><b>特色美食</b><span>${esc(p.food)}</span></div>` : "";
    const cultural = cleanText(p.cultural) ? `<div><b>文创产品</b><span>${esc(p.cultural)}</span></div>` : "";
    const feature = cleanText(p.feature) ? `<div><b>主要特色</b><span>${esc(p.feature)}</span></div>` : "";
    return `<div class="popup">
      <div class="popup-head">
        <span class="popup-kicker">编号 ${esc(p.id)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="popup-tags">
          <span class="tag-grade tag-grade-${esc(p.level ? p.level.includes("A") ? "1" : "2" : "0")}">${esc(p.level || "未评级")}</span>
          <span>${esc(p.type || "人文景观")}</span>
          <span>${esc(p.town)}</span>
        </div>
      </div>
      <div class="popup-facts">
        <div class="fact-location"><b>地址</b><span>${esc(p.address || p.town)}</span></div>
        <div class="fact-coord"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
        ${experience}
        ${food}
        ${cultural}
        ${feature}
      </div>
      <div class="popup-story"><b>景点介绍</b><p>${esc(p.desc || "暂无介绍")}</p></div>
      <div class="actions">
        <a href="${dashboardUrl(p.id)}">查看数据大屏</a>
        <a class="secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
      </div>
    </div>`;
  }
  const note = cleanText(p.data_note) ? `<p class="popup-note">${esc(p.data_note)}</p>` : "";
  const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${p.lng},${p.lat}`)}&name=${encodeURIComponent(pointTitle(p))}`;
  const loc = locationText(p) || "待补充";
  const morphology = [
    p.height ? `树高 ${esc(p.height)} m` : "",
    p.chest ? `胸围 ${esc(p.chest)} cm` : "",
    p.avgCrown ? `冠幅 ${esc(p.avgCrown)} m` : ""
  ].filter(Boolean).join("，") || "暂无记录";
  const maintainer = cleanText(p.maintainer) || "未指定";
  return `<div class="popup">
    <div class="popup-head">
      <span class="popup-kicker">编号 ${esc(p.id)}</span>
      <h3>${esc(p.species)} · ${esc(p.town)}</h3>
      <div class="popup-tags">
        <span class="tag-grade tag-grade-${esc(p.grade || "0")}">${esc(gradeLabel(p.grade))}古树</span>
        <span class="tag-growth">${esc(cleanText(p.growth) || "生长势未标注")}</span>
        <span class="tag-env">环境${esc(cleanText(p.environment) || "未标注")}</span>
      </div>
    </div>
    <div class="popup-facts">
      <div class="fact-age"><b>树龄</b><span>${esc(p.age || "未知")} 年</span></div>
      <div class="fact-species"><b>树种</b><span>${esc(p.species)}（${esc(cleanText(p.family) || "—")}/${esc(cleanText(p.genus) || "—")}）</span></div>
      <div class="fact-coord"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
      <div class="fact-altitude"><b>海拔</b><span>${p.altitude ? esc(p.altitude) + " m" : "未记录"}</span></div>
      <div class="fact-morph"><b>形态指标</b><span>${morphology}</span></div>
      <div class="fact-protect"><b>保护措施</b><span>${esc(protectionText(p))}</span></div>
      <div class="fact-location"><b>位置</b><span>${esc(loc)}</span></div>
      <div class="fact-maintainer"><b>养护责任人</b><span>${esc(maintainer)}</span></div>
    </div>
    <div class="popup-story"><b>古树故事</b><p>${esc(cleanText(p.story) || "暂无故事资料，待内容采编组补充。")}</p></div>
    ${note}
    <p class="popup-source">坐标状态：${esc(cleanText(p.coordinate_status) || "未标注")} · 数据来源：points.json</p>
    <div class="actions">
      <a href="${dashboardUrl(p.id)}">查看数据大屏</a>
      <a class="secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
    </div>
  </div>`;
}

function renderList(rows){
  if(!rows) rows = IS_TOUR_PAGE || IS_FEIYI_PAGE ? currentTourData() : POINTS;
  const currentLayer = currentTourLayer();
  if(IS_FEIYI_PAGE){
    const keyword = qs("#search").value.trim();
    if(keyword){
      const html = rows.length ? rows.map(p => `
        <div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
          <strong>${esc(pointTitle(p))}</strong>
          <span>${esc(p.level)}｜${esc(p.category)}｜${esc(p.town)}</span>
        </div>
      `).join("") : `<div style="padding:20px;text-align:center;color:#999;">未找到匹配的非遗项目</div>`;
      qs("#categoryTree").innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:#144d35;">搜索结果（${rows.length} 条）：</div>${html}`;
      qsa("#categoryTree .item").forEach(el => el.addEventListener("click", () => selectPoint(el.dataset.id)));
      return;
    }
    renderFeiyiTree();
    return;
  }
  if(IS_TOUR_PAGE && currentLayer === "tour_historic"){
    const grouped = rows.reduce((acc, p) => {
      const key = `${p.town}·${p.village}`;
      if(!acc[key]) acc[key] = { town: p.town, village: p.village, items: [] };
      acc[key].items.push(p);
      return acc;
    }, {});
    const html = Object.values(grouped).map(group => {
      const groupId = `${group.town}-${group.village}`;
      return `<div class="group">
        <div class="group-header" data-group="${esc(groupId)}">
          <span class="group-icon">▼</span>
          <strong>${esc(group.town)} ${esc(group.village)}</strong>
          <span class="group-count">(${group.items.length})</span>
        </div>
        <div class="group-items">
          ${group.items.map(p => `
            <div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
              <strong>${esc(pointTitle(p))}</strong>
              <span>${esc(p.protectionLevel || '')}｜${esc(p.era)}｜${esc(p.category)}</span>
            </div>
          `).join("")}
        </div>
      </div>`;
    }).join("");
    qs("#pointList").innerHTML = html;
    qsa("#pointList .item").forEach(el => el.addEventListener("click", () => selectPoint(el.dataset.id)));
    qsa("#pointList .group-header").forEach(el => {
      el.addEventListener("click", () => {
        const items = el.nextElementSibling;
        const icon = el.querySelector(".group-icon");
        items.classList.toggle("visible");
        icon.textContent = items.classList.contains("visible") ? "▲" : "▼";
      });
    });
    return;
  }
  const html = rows.map(p => {
    if(IS_FEIYI_PAGE){
      return `<div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
        <strong>${esc(pointTitle(p))}</strong>
        <span>${esc(p.level)}｜${esc(p.category)}</span>
      </div>`;
    }
    if(IS_TOUR_PAGE){
      return `<div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
        <strong>${esc(pointTitle(p))}</strong>
        <span>${esc(p.town)}｜${esc(p.level)}</span>
      </div>`;
    }
    return `<div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
      <strong>${esc(pointTitle(p))}</strong>
      <span>${esc(p.id)}｜${esc(locationText(p))}｜${esc(p.age || "未知")}年｜${esc(gradeLabel(p.grade))}</span>
    </div>`;
  }).join("");
  qs("#pointList").innerHTML = html;
  qsa(".item").forEach(el => el.addEventListener("click", () => selectPoint(el.dataset.id)));
}

function renderFeiyiTree(){
  const treeEl = qs("#categoryTree");
  if(!treeEl) return;
  
  const layers = [
    { key: "feiyi_national", label: "国家级非遗", data: DATA.feiyi.national || [] },
    { key: "feiyi_provincial", label: "省级非遗", data: DATA.feiyi.provincial || [] },
    { key: "feiyi_municipal", label: "市级非遗", data: DATA.feiyi.municipal || [] },
    { key: "feiyi_district", label: "区级非遗", data: DATA.feiyi.district || [] }
  ];
  
  let html = "";
  layers.forEach(layer => {
    const isActive = false;
    html += `<div class="tree-item ${isActive ? 'active' : ''}" data-layer="${layer.key}">
      <span class="arrow">▶</span>
      ${layer.label}
      <span class="count">${layer.data.length}</span>
    </div>`;
    html += `<div class="sub-list ${isActive ? 'active' : ''}" data-layer="${layer.key}">`;
    layer.data.forEach(item => {
      html += `<div class="sub-item ${item.id === activeId ? 'active' : ''}" data-id="${esc(item.id)}" data-layer="${layer.key}">
        ${esc(item.name)}
      </div>`;
    });
    html += "</div>";
  });
  
  treeEl.innerHTML = html;
  
  qsa(".tree-item").forEach(el => {
    el.addEventListener("click", () => {
      const layerKey = el.dataset.layer;
      const subList = el.nextElementSibling;
      const isActive = el.classList.contains("active");
      
      if(isActive){
        el.classList.remove("active");
        subList.classList.remove("active");
        activeLayers.delete(layerKey);
      } else {
        qsa(".tree-item").forEach(t => t.classList.remove("active"));
        qsa(".sub-list").forEach(s => s.classList.remove("active"));
        el.classList.add("active");
        subList.classList.add("active");
        activeLayers.clear();
        activeLayers.add(layerKey);
      }
      
      activeId = null;
      qs("#fallbackPopup")?.classList.remove("visible");
      
      if(map && window.AMap){
        markers.forEach(({ marker, point }) => {
          const data = currentTourData();
          const shouldShow = data.some(d => d.id === point.id);
          marker.setContent(markerHtml(point));
          marker.setMap(shouldShow ? map : null);
        });
        if(markers.length){
          const visibleMarkers = markers.filter(({ point }) => currentTourData().some(d => d.id === point.id));
          if(visibleMarkers.length){
            map.setFitView(visibleMarkers.map(item => item.marker), false, [80, 80, 80, 80]);
          }
        }
      } else {
        renderFallback();
      }
      
      const config = FEIYI_LAYER_CONFIG[layerKey];
      statusEl.innerHTML = isActive ? "已收起图层" : `${config.label}图层已显示`;
    });
  });
  
  qsa(".sub-item").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      qsa(".sub-item").forEach(s => s.classList.remove("active"));
      el.classList.add("active");
      selectPoint(el.dataset.id);
    });
  });
}

function updateListActive(){
  if(IS_FEIYI_PAGE){
    qsa(".sub-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === activeId);
    });
    return;
  }
  qsa("#pointList .item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === activeId);
  });
}

function renderFallback(){
  const fm = qs("#fallbackMap");
  fm.classList.add("visible");
  fm.querySelectorAll(".dot, .layer-dot").forEach(dot => dot.remove());
  
  if(IS_FEIYI_PAGE){
    const keyword = qs("#search").value.trim();
    const layer = currentTourLayer();
    let data;
    let statusText;
    if(keyword){
      data = filteredRows();
      statusText = `搜索结果：${data.length} 条非遗项目`;
    } else {
      data = currentTourData();
      if(!layer || !data.length){
        statusEl.innerHTML = "请选择非遗级别目录查看对应点位，或在搜索框中输入关键词搜索";
        return;
      }
      const config = FEIYI_LAYER_CONFIG[layer];
      statusText = `未检测到可用高德 Key，当前显示 ${data.length} 条${config.label}本地点位示意。配置 <b>config.js</b> 后将自动加载高德地图。`;
    }
    statusEl.innerHTML = statusText;
    data.forEach(p => {
      if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
      const {x,y} = pointXY(p, allTourPoints());
      const dot = document.createElement("span");
      dot.className = `layer-dot ${p.id===activeId ? "active" : ""}`;
      dot.style.left = `${x}%`;
      dot.style.top = `${y}%`;
      const pointConfig = feiyiLevelToConfig(p.level);
      dot.style.background = pointConfig.color;
      dot.textContent = pointConfig.icon;
      dot.title = pointTitle(p);
      dot.addEventListener("click", () => selectPoint(p.id));
      fm.appendChild(dot);
    });
    return;
  }
  
  if(IS_TOUR_PAGE){
    const layer = currentTourLayer();
    const config = TOUR_LAYER_CONFIG[layer];
    const data = currentTourData();
    statusEl.innerHTML = `未检测到可用高德 Key，当前显示 ${data.length} 条${config.label}本地点位示意。配置 <b>config.js</b> 后将自动加载高德地图。<br/><span style="font-size:11px;color:#f97316">拖动图标可调整位置</span>`;
    data.forEach(p => {
      if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
      const {x,y} = pointXY(p, allTourPoints());
      const dot = document.createElement("span");
      dot.className = `layer-dot ${p.id===activeId ? "active" : ""}`;
      dot.style.left = `${x}%`;
      dot.style.top = `${y}%`;
      dot.style.background = config.color;
      dot.textContent = config.icon;
      dot.title = pointTitle(p);
      dot.addEventListener("click", () => selectPoint(p.id));
      makeDraggable(dot, p, data, allTourPoints());
      fm.appendChild(dot);
    });
    return;
  }
  
  if(!activeLayers.has("tree")){
    statusEl.innerHTML = "古树名木图层已隐藏，点击「古树名木」按钮可重新显示";
    return;
  }
  statusEl.innerHTML = `未检测到可用高德 Key，当前显示 ${POINTS.length} 条古树名木本地点位示意。配置 <b>config.js</b> 后将自动加载高德地图。`;
  filteredRows().forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const dot = document.createElement("span");
    dot.className = `dot grade-${p.grade || "unknown"} ${p.id===activeId ? "active" : ""}`;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.title = pointTitle(p);
    dot.addEventListener("click", () => selectPoint(p.id));
    fm.appendChild(dot);
  });
}

function feiyiDetailHtml(p){
  const protectUnit = cleanText(p.protectUnit) ? `<div class="detail-row"><span class="detail-label">保护单位</span><span>${esc(p.protectUnit)}</span></div>` : "";
  return `<div class="feiyi-detail">
    <div class="detail-tags">
      <span class="tag-grade tag-grade-${esc(p.level === "国家级" ? "1" : p.level === "省级" ? "2" : p.level === "市级" ? "3" : "0")}">${esc(p.level || "区级")}</span>
      <span>${esc(p.category || "传统技艺")}</span>
    </div>
    ${protectUnit}
    <div class="detail-desc"><b>项目介绍</b><p>${esc(p.desc || "暂无介绍")}</p></div>
  </div>`;
}

function selectPoint(id){
  activeId = id;
  const p = IS_FEIYI_PAGE ? tourPointById(id) : (IS_TOUR_PAGE ? tourPointById(id) : (POINTS.find(p => p.id === id) || POINTS[0]));
  
  if(IS_FEIYI_PAGE){
    const layer = currentTourLayer();
    if(!layer){
      statusEl.innerHTML = "请先选择非遗级别目录";
      return;
    }
    
    qsa(".feiyi-detail").forEach(el => el.remove());
    
    const itemEl = qs(`.sub-item[data-id="${esc(id)}"]`) || qs(`.item[data-id="${esc(id)}"]`);
    if(itemEl){
      itemEl.classList.add("active");
      itemEl.insertAdjacentHTML("afterend", feiyiDetailHtml(p));
    }
    
    qsa(".sub-item, .item").forEach(el => {
      if(el.dataset.id !== id) el.classList.remove("active");
    });
    
    if(map && window.AMap){
      const position = [Number(p.lng), Number(p.lat)];
      map.setZoomAndCenter(15, position, true);
      infoWindow.setContent(pointHtml(p));
      infoWindow.open(map, position);
    }
    return;
  }
  
  updateListActive();
  
  const dashLink = qs("#dashLink");
  if(dashLink) dashLink.href = dashboardUrl(p.id);
  
  if(IS_TOUR_PAGE){
    const layer = currentTourLayer();
    if(!activeLayers.has(layer)){
      activeLayers.add(layer);
      const btn = qs(`.layer[data-layer="${layer}"]`) || qs(`.category-btn[data-layer="${layer}"]`);
      if(btn) btn.classList.add("active");
    }
  } else {
    if(!activeLayers.has("tree")){
      activeLayers.add("tree");
      const treeBtn = qs(".layer[data-layer='tree']");
      if(treeBtn) treeBtn.classList.add("active");
    }
  }
  
  if(map && window.AMap){
    // 文旅页面：优先使用 Geocoder 返回的 marker 实际位置
    let position = [Number(p.lng), Number(p.lat)];
    if(IS_TOUR_PAGE && markerById && markerById.has(p.id)){
      const markerItem = markerById.get(p.id);
      if(markerItem && markerItem.marker){
        const markerPos = markerItem.marker.getPosition();
        if(markerPos){
          position = [markerPos.getLng(), markerPos.getLat()];
        }
      }
    }
    map.setZoomAndCenter(15, position, true);
    updateMarkerActive();
    infoWindow.setContent(pointHtml(p));
    infoWindow.open(map, position);
    syncMarkers(IS_TOUR_PAGE ? currentTourData() : filteredRows());
  } else {
    renderFallback();
    const popup = qs("#fallbackPopup");
    const {x, y} = pointXY(p, IS_TOUR_PAGE ? allTourPoints() : undefined);
    popup.innerHTML = `<button class="popup-close" title="关闭">&times;</button>` + pointHtml(p);
    popup.style.left = `${x}%`;
    popup.style.top = `${y}%`;
    popup.classList.toggle("flip-below", y < 30);
    popup.classList.add("visible");
    popup.querySelector(".popup-close")?.addEventListener("click", closeInfo);
  }
}

function closeInfo(){
  activeId = null;
  updateListActive();
  if(map && window.AMap && infoWindow){
    infoWindow.close();
    updateMarkerActive();
  } else {
    qs("#fallbackPopup")?.classList.remove("visible");
    renderFallback();
  }
}

function filteredRows(){
  if(IS_FEIYI_PAGE){
    const keyword = qs("#search").value.trim().toLowerCase();
    const layer = currentTourLayer();
    let data;
    if(keyword && !layer){
      data = allTourPoints();
    } else {
      data = currentTourData();
    }
    if(!keyword) return data;
    return data.filter(p => [p.name, p.town, p.category].some(v => String(v).toLowerCase().includes(keyword)));
  }
  if(IS_TOUR_PAGE){
    const keyword = qs("#search").value.trim().toLowerCase();
    const data = currentTourData();
    if(!keyword) return data;
    return data.filter(p => [p.name, p.town, p.village, p.category].some(v => String(v).toLowerCase().includes(keyword)));
  }
  const keyword = qs("#search").value.trim();
  if(!keyword) return POINTS;
  return POINTS.filter(p => [p.id,p.name,p.species,p.town,p.village,p.place,p.location,p.story,p.protection,p.coordinate_status].some(v => String(v).includes(keyword)));
}

function syncMarkers(rows){
  if(!rows) rows = IS_TOUR_PAGE || IS_FEIYI_PAGE ? filteredRows() : filteredRows();
  const visibleIds = new Set(rows.map(p => p.id));
  markers.forEach(({ marker, point }) => {
    let shouldShow;
    if(IS_FEIYI_PAGE){
      const keyword = qs("#search").value.trim();
      if(keyword){
        shouldShow = visibleIds.has(point.id);
      } else {
        const layer = currentTourLayer();
        const config = FEIYI_LAYER_CONFIG[layer];
        if(!config){
          shouldShow = false;
        } else {
          const layerData = FEIYI_DATA[config.subType] || [];
          shouldShow = layerData.some(d => d.id === point.id);
        }
      }
    } else {
      const currentLayer = IS_TOUR_PAGE ? currentTourLayer() : "tree";
      shouldShow = visibleIds.has(point.id) && activeLayers.has(currentLayer);
    }
    marker.setMap(shouldShow ? map : null);
  });
}

function makeDraggable(dot, point, data, allPoints){
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  dot.style.cursor = "move";
  
  dot.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseFloat(dot.style.left);
    startTop = parseFloat(dot.style.top);
    dot.style.zIndex = "1000";
    e.stopPropagation();
  });
  
  document.addEventListener("mousemove", (e) => {
    if(!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const fm = qs("#fallbackMap");
    const rect = fm.getBoundingClientRect();
    const newLeft = Math.max(0, Math.min(100, startLeft + (deltaX / rect.width) * 100));
    const newTop = Math.max(0, Math.min(100, startTop + (deltaY / rect.height) * 100));
    dot.style.left = `${newLeft}%`;
    dot.style.top = `${newTop}%`;
  });
  
  document.addEventListener("mouseup", () => {
    if(!isDragging) return;
    isDragging = false;
    dot.style.zIndex = "";
    
    const fm = qs("#fallbackMap");
    const rect = fm.getBoundingClientRect();
    const x = parseFloat(dot.style.left);
    const y = parseFloat(dot.style.top);
    
    const lng = allPoints.minLng + (x / 100) * (allPoints.maxLng - allPoints.minLng);
    const lat = allPoints.maxLat - (y / 100) * (allPoints.maxLat - allPoints.minLat);
    
    point.lng = Math.round(lng * 10000) / 10000;
    point.lat = Math.round(lat * 10000) / 10000;
    
    statusEl.innerHTML = `已调整「${point.name}」位置：${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}<br/><span style="font-size:11px;color:#f97316">拖动图标可调整位置</span>`;
    
    if(point.id === activeId){
      selectPoint(point.id);
    }
  });
}

function updateMarkerActive(){
  markers.forEach(({ marker, point }) => {
    marker.setContent(markerHtml(point));
  });
}

function renderSearch(){
  const rows = filteredRows();
  renderList(rows);
  if(map && window.AMap) syncMarkers(rows);
  else renderFallback();
}

function initAmap(){
  if(!window.AMap_KEY || window.AMap_KEY.includes("YOUR_AMAP")){
    renderFallback();
    return;
  }
  if(window.AMap_SECURITY_CODE && !window.AMap_SECURITY_CODE.includes("OPTIONAL")){
    window._AMapSecurityConfig = { securityJsCode: window.AMap_SECURITY_CODE };
  }
  const script = document.createElement("script");
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMap_KEY)}&plugin=AMap.Scale,AMap.ToolBar,AMap.Geocoder,AMap.PlaceSearch&callback=onAmapReady`;
  script.onerror = renderFallback;
  document.head.appendChild(script);
  let amapTimedOut = false;
  window._amapTimeout = setTimeout(() => {
    if(!map){
      amapTimedOut = true;
      renderFallback();
      statusEl.innerHTML = "地图服务加载超时，已切换为点位示意图。如需真实地图，请将本机 IP 加入高德控制台安全域名。";
    }
  }, 5000);
  const _origReady = window.onAmapReady;
  window.onAmapReady = function(){
    if(amapTimedOut) return;
    clearTimeout(window._amapTimeout);
    const r = _origReady.apply(this, arguments);
    setTimeout(() => {
      if(amapTimedOut || !map) return;
      const hasTiles = qs("#map canvas") || qs("#map img") || qs("#map .amap-maps");
      if(!hasTiles){
        amapTimedOut = true;
        try { map.destroy(); } catch(e){}
        map = null;
        markers = [];
        renderFallback();
        statusEl.innerHTML = "地图服务在当前访问地址下不可用（需配置高德安全域名），已切换为点位示意图，点位均可点击查看详情。";
      }
    }, 3000);
    return r;
  };
}

window.onAmapReady = function(){
  if(IS_FEIYI_PAGE){
    statusEl.innerHTML = "高德地图已加载，请选择非遗级别目录查看对应点位。";
  } else if(IS_TOUR_PAGE){
    statusEl.innerHTML = "高德地图已加载，点击景点点位可查看详情。";
  } else {
    statusEl.innerHTML = "高德地图已加载，点击古树点位可查看详情并进入数据大屏。";
  }
  map = new AMap.Map("map", { zoom: DATA.meta.zoom, center: DATA.meta.center, viewMode: "2D" });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({ position: "RB" }));
  infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30), isCustom: false, autoMove: false });
  map.on("click", () => { if(activeId) closeInfo(); });
  markerById = new Map();

  let dataSource;
  if(IS_FEIYI_PAGE){
    dataSource = allTourPoints();
    markers = dataSource.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).map(p => {
      const marker = new AMap.Marker({
        position: [p.lng, p.lat],
        title: pointTitle(p),
        content: markerHtml(p),
        offset: new AMap.Pixel(-14, -30),
        map: null
      });
      marker.on("click", () => selectPoint(p.id));
      const item = { marker, point: p };
      markerById.set(p.id, item);
      return item;
    });
  } else {
    dataSource = IS_TOUR_PAGE ? allTourPoints() : POINTS;
    markers = dataSource.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).map(p => {
      const currentLayer = IS_TOUR_PAGE ? currentTourLayer() : "tree";
      const marker = new AMap.Marker({
        position: [p.lng, p.lat],
        title: pointTitle(p),
        content: markerHtml(p),
        offset: new AMap.Pixel(-14, -30),
        map: activeLayers.has(currentLayer) ? map : null
      });
      marker.on("click", () => selectPoint(p.id));
      const item = { marker, point: p };
      markerById.set(p.id, item);
      return item;
    });

    // 文旅景点：使用 AMap.Geocoder 和 POI 搜索进行精准定位
    // 搜索策略：先搜景点/遗迹名称→完整地址→自然村→村委会→乡镇
    if(IS_TOUR_PAGE){
      const scenicPoints = TOUR_DATA.scenic || [];
      const historicPoints = TOUR_DATA.historic || [];
      const allPoints = [...scenicPoints, ...historicPoints];
      if(allPoints.length){
        const total = allPoints.length;
        let geocodedCount = 0;
        let completedCount = 0;
        let failedCount = 0;
        window._tourGeocoding = true;
        window._tourGeocodeResult = "";
        statusEl.innerHTML = `正在通过地址精确定位景点（0/${total}）...`;

        const queue = allPoints.slice();
        const geocoder = new AMap.Geocoder({ city: "长治市" });
        const placeSearch = new AMap.PlaceSearch({ city: "长治市", citylimit: true });
        
        function geocodeAddress(address, callback) {
          geocoder.getLocation(address, (status, result) => {
            if(status === 'complete' && result && result.geocodes && result.geocodes.length){
              const loc = result.geocodes[0].location;
              if(loc && loc.lng && loc.lat){
                callback(null, { lng: loc.lng, lat: loc.lat });
                return;
              }
            }
            callback(new Error("Geocode failed"));
          });
        }

        function searchPOI(keyword, types, callback) {
          placeSearch.search(keyword, (status, result) => {
            if(status === 'complete' && result && result.poiList && result.poiList.pois && result.poiList.pois.length){
              const sdPoi = result.poiList.pois.find(poi => poi.adname === "上党区");
              const targetPoi = sdPoi || result.poiList.pois[0];
              if(targetPoi && targetPoi.location){
                const loc = targetPoi.location;
                if(loc && loc.lng && loc.lat){
                  callback(null, { lng: loc.lng, lat: loc.lat });
                  return;
                }
              }
            }
            callback(new Error("POI search failed"));
          });
        }

        const processNext = () => {
          if(queue.length === 0){
            window._tourGeocoding = false;
            statusEl.innerHTML = "点击景点点位可查看详情。";
            console.log(`[景点定位] 全部完成: 成功 ${geocodedCount}/${total}, 失败 ${failedCount}`);
            const currentLayer = currentTourLayer();
            if(activeLayers.has(currentLayer)){
              const visibleMarkers = markers.filter(({ point }) =>
                (currentTourData() || []).some(d => d.id === point.id)
              );
              if(visibleMarkers.length){
                map.setFitView(visibleMarkers.map(item => item.marker), false, [80, 80, 80, 80]);
              }
            }
            return;
          }
          const p = queue.shift();
          
          const searchStrategies = [];
          
          if(Number.isFinite(p.lng) && Number.isFinite(p.lat) && p.lng > 100 && p.lng < 120 && p.lat > 30 && p.lat < 40){
            searchStrategies.push({ type: 'direct_coord', lng: p.lng, lat: p.lat });
          }
          
          searchStrategies.push({ type: 'poi_name', keyword: p.name, types: '110000' });
          
          const nameVariants = [];
          if(p.name.includes("景区")) nameVariants.push(p.name.replace("景区", ""));
          if(p.name.includes("景点")) nameVariants.push(p.name.replace("景点", ""));
          if(p.name.includes("文化园")) nameVariants.push(p.name.replace("文化园", ""));
          if(p.name.includes("古镇")) nameVariants.push(p.name.replace("古镇", ""));
          if(p.name.includes("古村")) nameVariants.push(p.name.replace("古村", ""));
          if(p.name.includes("生态园")) nameVariants.push(p.name.replace("生态园", ""));
          if(p.name.includes("公园")) nameVariants.push(p.name.replace("公园", ""));
          if(p.name.includes("游园")) nameVariants.push(p.name.replace("游园", ""));
          nameVariants.forEach(variant => {
            if(variant.trim()) searchStrategies.push({ type: 'poi_name_variant', keyword: variant.trim(), types: '110000' });
          });
          
          const fullAddress = `山西省长治市上党区${p.town || ''}${p.village || ''}${p.location || ''}${p.place || ''}`.replace(/\s+/g, '');
          if(fullAddress.length > 10){
            searchStrategies.push({ type: 'geocode_full', address: fullAddress });
          }
          
          const villageNames = [];
          if(p.village) villageNames.push(p.village);
          if(p.location) villageNames.push(p.location);
          if(p.place) villageNames.push(p.place);
          
          villageNames.forEach(village => {
            searchStrategies.push({ type: 'geocode_village', address: `山西省长治市上党区${p.town || ''}${village}` });
            searchStrategies.push({ type: 'poi_village', keyword: `${p.town || ''}${village}`, types: '130106' });
          });
          
          if(p.town){
            searchStrategies.push({ type: 'geocode_town', address: `山西省长治市上党区${p.town}` });
          }
          
          let strategyIndex = 0;
          
          const tryNextStrategy = () => {
            if(strategyIndex >= searchStrategies.length){
              completedCount++;
              failedCount++;
              console.warn(`[定位失败] ${p.id} ${p.name} 所有策略均失败`);
              statusEl.innerHTML = `正在通过地址精确定位景点（${completedCount}/${total}）...`;
              setTimeout(processNext, 400);
              return;
            }
            
            const strategy = searchStrategies[strategyIndex];
            strategyIndex++;
            
            if(strategy.type === 'direct_coord'){
              geocodedCount++;
              const item = markerById.get(p.id);
              if(item && item.marker){
                item.marker.setPosition([strategy.lng, strategy.lat]);
                item.geocoded = true;
                item.geocodeLng = strategy.lng;
                item.geocodeLat = strategy.lat;
              }
              console.log(`[定位成功] ${p.id} ${p.name} - 通过${strategy.type}: ${strategy.lng},${strategy.lat}`);
              completedCount++;
              statusEl.innerHTML = `正在通过地址精确定位景点（${completedCount}/${total}）...`;
              setTimeout(processNext, 400);
            } else if(strategy.type === 'poi_name' || strategy.type === 'poi_name_variant' || strategy.type === 'poi_village'){
              searchPOI(strategy.keyword, strategy.types, (err, result) => {
                if(result){
                  geocodedCount++;
                  const item = markerById.get(p.id);
                  if(item && item.marker){
                    item.marker.setPosition([result.lng, result.lat]);
                    item.geocoded = true;
                    item.geocodeLng = result.lng;
                    item.geocodeLat = result.lat;
                  }
                  console.log(`[定位成功] ${p.id} ${p.name} - 通过${strategy.type}: ${strategy.keyword}`);
                  completedCount++;
                  statusEl.innerHTML = `正在通过地址精确定位景点（${completedCount}/${total}）...`;
                  setTimeout(processNext, 400);
                } else {
                  tryNextStrategy();
                }
              });
            } else {
              geocodeAddress(strategy.address, (err, result) => {
                if(result){
                  geocodedCount++;
                  const item = markerById.get(p.id);
                  if(item && item.marker){
                    item.marker.setPosition([result.lng, result.lat]);
                    item.geocoded = true;
                    item.geocodeLng = result.lng;
                    item.geocodeLat = result.lat;
                  }
                  console.log(`[定位成功] ${p.id} ${p.name} - 通过${strategy.type}: ${strategy.address}`);
                  completedCount++;
                  statusEl.innerHTML = `正在通过地址精确定位景点（${completedCount}/${total}）...`;
                  setTimeout(processNext, 400);
                } else {
                  tryNextStrategy();
                }
              });
            }
          };
          
          tryNextStrategy();
        };
        
        processNext();
      }
    }
  }

  // 非遗项目：使用保护单位名称进行 POI 搜索定位
  // 公司类→定位到公司地点，乡镇类→定位到乡镇政府，机构类→回退到韩店街道办事处
  if(IS_FEIYI_PAGE){
    const allFeiyiPoints = allTourPoints();
    if(allFeiyiPoints.length){
      const total = allFeiyiPoints.length;
      let geocodedCount = 0;
      let completedCount = 0;
      let failedCount = 0;
      window._feiyiGeocoding = true;
      statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（0/${total}）...`;

      const protectUnitCache = new Map();

      const queue = allFeiyiPoints.slice();
      const processNext = () => {
        if(queue.length === 0){
          window._feiyiGeocoding = false;
          statusEl.innerHTML = "请选择非遗级别目录查看对应点位。";
          console.log(`[非遗 POI] 全部完成: 成功 ${geocodedCount}/${total}, 失败回退 ${failedCount}`);
          const currentLayer = currentTourLayer();
          if(activeLayers.has(currentLayer)){
            const visibleMarkers = markers.filter(({ point }) =>
              (currentTourData() || []).some(d => d.id === point.id)
            );
            if(visibleMarkers.length){
              map.setFitView(visibleMarkers.map(item => item.marker), false, [80, 80, 80, 80]);
            }
          }
          return;
        }
        const p = queue.shift();
        const protectUnit = (p.protectUnit || "").trim();
        
        if(!protectUnit){
          completedCount++;
          failedCount++;
          fallbackToHandian(p);
          statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
          setTimeout(processNext, 400);
          return;
        }

        if(protectUnitCache.has(protectUnit)){
          const cachedResult = protectUnitCache.get(protectUnit);
          if(cachedResult){
            const [newLng, newLat] = cachedResult;
            geocodedCount++;
            const item = markerById.get(p.id);
            if(item && item.marker){
              item.marker.setPosition([newLng, newLat]);
              item.geocoded = true;
              item.geocodeLng = newLng;
              item.geocodeLat = newLat;
            }
          } else {
            failedCount++;
            fallbackToHandian(p);
          }
          completedCount++;
          statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
          setTimeout(processNext, 400);
          return;
        }

        const unitType = classifyProtectUnit(protectUnit);
        
        if(unitType === 'org'){
          completedCount++;
          failedCount++;
          protectUnitCache.set(protectUnit, null);
          fallbackToHandian(p);
          statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
          setTimeout(processNext, 400);
          return;
        }

        let searchKeyword = protectUnit;
        if(unitType === 'village'){
          searchKeyword = buildVillageKeyword(protectUnit);
        }

        const searchAttempts = [];
        searchAttempts.push(searchKeyword);
        if(unitType === 'company'){
          if(!searchKeyword.includes('上党区')){
            searchAttempts.push('上党区 ' + searchKeyword);
          }
          if(searchKeyword.includes('上党区')){
            searchAttempts.push(searchKeyword.replace('上党区 ', ''));
          }
        } else if(unitType === 'village'){
          if(!searchKeyword.includes('上党区')){
            searchAttempts.push('上党区 ' + searchKeyword);
          }
          if(searchKeyword.includes('上党区') && !searchKeyword.includes('人民政府') && !searchKeyword.includes('村委会')){
            const match = searchKeyword.match(/(.+[乡镇])/);
            if(match){
              searchAttempts.push(match[1] + '人民政府');
            }
          }
        }

        let attemptIndex = 0;

        const trySearch = () => {
          if(attemptIndex >= searchAttempts.length){
            completedCount++;
            failedCount++;
            protectUnitCache.set(protectUnit, null);
            console.warn(`[非遗 POI] ${p.id} 所有尝试失败，回退到韩店街道办事处: protectUnit=${protectUnit}`);
            fallbackToHandian(p);
            statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
            setTimeout(processNext, 400);
            return;
          }

          const currentKeyword = searchAttempts[attemptIndex];

          if(protectUnitCache.has(currentKeyword)){
            const cached = protectUnitCache.get(currentKeyword);
            if(cached){
              geocodedCount++;
              const item = markerById.get(p.id);
              if(item && item.marker){
                item.marker.setPosition(cached);
                item.geocoded = true;
                item.geocodeLng = cached[0];
                item.geocodeLat = cached[1];
              }
              protectUnitCache.set(protectUnit, cached);
              completedCount++;
              statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
              setTimeout(processNext, 400);
              return;
            } else {
              attemptIndex++;
              trySearch();
              return;
            }
          }

          const apiUrl = `https://restapi.amap.com/v3/place/text?key=${encodeURIComponent(window.AMap_KEY)}&keywords=${encodeURIComponent(currentKeyword)}&city=${encodeURIComponent("长治市")}&citylimit=true&output=JSON`;

          fetch(apiUrl)
            .then(r => r.json())
            .then(data => {
              if(data && data.infocode === "10021"){
                queue.unshift(p);
                setTimeout(processNext, 2000);
                return;
              }
              if(data && data.status === "1" && data.info === "OK" && data.pois && data.pois.length){
                const sdPoi = data.pois.find(poi => poi.adname === "上党区");
                const targetPoi = sdPoi || data.pois[0];
                if(targetPoi){
                  const locStr = targetPoi.location;
                  const [newLng, newLat] = locStr.split(",").map(Number);
                  if(Number.isFinite(newLng) && Number.isFinite(newLat)){
                    protectUnitCache.set(currentKeyword, [newLng, newLat]);
                    protectUnitCache.set(protectUnit, [newLng, newLat]);
                    geocodedCount++;
                    console.info(`[非遗 POI] ${p.id} 成功定位: protectUnit=${protectUnit}, keyword=${currentKeyword}`);
                    const item = markerById.get(p.id);
                    if(item && item.marker){
                      item.marker.setPosition([newLng, newLat]);
                      item.geocoded = true;
                      item.geocodeLng = newLng;
                      item.geocodeLat = newLat;
                    }
                    completedCount++;
                    statusEl.innerHTML = `正在通过保护单位名称精确定位非遗项目（${completedCount}/${total}）...`;
                    setTimeout(processNext, 400);
                    return;
                  }
                }
              }
              attemptIndex++;
              trySearch();
            })
            .catch(err => {
              attemptIndex++;
              trySearch();
            });
        };

        trySearch();
      };

      const classifyProtectUnit = (unit) => {
        const companyKeywords = ['公司', '有限公司', '工作室', '坊', '厂', '品行'];
        const villageKeywords = ['村委会', '居委会', '村委'];
        const orgKeywords = ['协会', '文旅', '文化站', '剧团', '中心', '研究院', '研究会'];
        
        if(companyKeywords.some(k => unit.includes(k))){
          return 'company';
        }
        if(villageKeywords.some(k => unit.includes(k))){
          return 'village';
        }
        if(unit.includes('乡') || unit.includes('镇')){
          return 'village';
        }
        if(orgKeywords.some(k => unit.includes(k))){
          return 'org';
        }
        return 'org';
      };

      const buildVillageKeyword = (unit) => {
        if(unit.includes('村委会') || unit.includes('村委') || unit.includes('村民委员会')){
          return unit;
        }
        if(unit.includes('乡')){
          const match = unit.match(/(.+乡)/);
          return match ? `${match[1]}人民政府` : unit;
        }
        if(unit.includes('镇')){
          const match = unit.match(/(.+镇)/);
          return match ? `${match[1]}人民政府` : unit;
        }
        if(unit.includes('村')){
          const match = unit.match(/(.+村)/);
          return match ? `${match[1]}村委会` : unit;
        }
        return unit;
      };

      const fallbackToHandian = (p) => {
        const handianKeyword = "韩店街道办事处";
        if(protectUnitCache.has(handianKeyword)){
          const cached = protectUnitCache.get(handianKeyword);
          if(cached){
            const item = markerById.get(p.id);
            if(item && item.marker){
              item.marker.setPosition(cached);
              item.geocoded = true;
              item.geocodeLng = cached[0];
              item.geocodeLat = cached[1];
            }
          }
          return;
        }
        
        const apiUrl = `https://restapi.amap.com/v3/place/text?key=${encodeURIComponent(window.AMap_KEY)}&keywords=${encodeURIComponent(handianKeyword)}&city=${encodeURIComponent("长治市")}&citylimit=true&types=130106&output=JSON`;
        fetch(apiUrl)
          .then(r => r.json())
          .then(data => {
            if(data && data.status === "1" && data.info === "OK" && data.pois && data.pois.length){
              const locStr = data.pois[0].location;
              const [newLng, newLat] = locStr.split(",").map(Number);
              if(Number.isFinite(newLng) && Number.isFinite(newLat)){
                protectUnitCache.set(handianKeyword, [newLng, newLat]);
                const item = markerById.get(p.id);
                if(item && item.marker){
                  item.marker.setPosition([newLng, newLat]);
                  item.geocoded = true;
                  item.geocodeLng = newLng;
                  item.geocodeLat = newLat;
                }
              }
            }
          })
          .catch(() => {});
      };

      processNext();
    }
  }

  if(markers.length){
    const currentLayer = IS_TOUR_PAGE || IS_FEIYI_PAGE ? currentTourLayer() : "tree";
    if(activeLayers.has(currentLayer)){
      map.setFitView(markers.map(item => item.marker), false, [80, 80, 80, 80]);
    } else {
      map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center);
    }
  } else {
    map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center);
  }
  if(activeId) selectPoint(activeId);
};

// 构造 POI 搜索关键字：用于搜索村委员会的位置
function buildVillageKeyword(p){
  // 优先用 village 字段（historic 遗迹）
  if(p.village && p.village.trim()){
    return p.village.trim();
  }
  // 从 address 中提取村子名字（scenic 景点）
  const address = (p.address || "").trim();
  if(address){
    // 匹配"X村"格式的村子名字
    const match = address.match(/([^\s镇乡街道]+村)/);
    if(match) return match[1];
    // 匹配"X新区"格式
    const match2 = address.match(/([^\s镇乡街道]+新区)/);
    if(match2) return match2[1];
  }
  // 最后用景点名字
  return p.name || "";
}

// 构造完整地址（用于 Geocoder 回退）
function buildHistoricFullAddress(p){
  const base = "山西省长治市";
  const address = (p.address || "").trim();
  if(!address) {
    return `${base}上党区${p.town || ""}${p.village || ""}`;
  }
  if(address.startsWith("山西省") || address.startsWith("长治市")){
    return address;
  }
  return `${base}${address}`;
}

qs("#search").addEventListener("input", renderSearch);

let statusTimeout;
qs("#centerBtn").addEventListener("click", () => {
  if(map && window.AMap){
    map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center, true);
    statusEl.innerHTML = "地图已居中到上党区";
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      if(IS_FEIYI_PAGE){
        statusEl.innerHTML = "点击非遗项目点位可查看详情。";
      } else if(IS_TOUR_PAGE){
        statusEl.innerHTML = "点击景点点位可查看详情。";
      } else {
        statusEl.innerHTML = "点击古树点位可查看详情并进入数据大屏。";
      }
    }, 2500);
  }
});

function toggleLayer(layerName){
  const btn = qs(`.layer[data-layer="${layerName}"]`) || qs(`.category-btn[data-layer="${layerName}"]`);
  if(!btn) return;
  
  if(IS_FEIYI_PAGE){
    const config = FEIYI_LAYER_CONFIG[layerName];
    if(!config) return;
    
    activeLayers.clear();
    activeLayers.add(layerName);
    qsa(".layer, .category-btn").forEach(b => b.classList.toggle("active", b.dataset.layer === layerName));
    activeId = null;
    qs("#fallbackPopup")?.classList.remove("visible");
    renderList(currentTourData());
    if(map && window.AMap){
      markers.forEach(({ marker, point }) => {
        const data = currentTourData();
        const shouldShow = data.some(d => d.id === point.id);
        marker.setContent(markerHtml(point));
        marker.setMap(shouldShow ? map : null);
      });
      if(markers.length){
        const visibleMarkers = markers.filter(({ point }) => currentTourData().some(d => d.id === point.id));
        if(visibleMarkers.length){
          map.setFitView(visibleMarkers.map(item => item.marker), false, [80, 80, 80, 80]);
        }
      }
    } else {
      renderFallback();
    }
    statusEl.innerHTML = `${config.label}图层已显示`;
    return;
  }

  if(IS_TOUR_PAGE){
    const config = TOUR_LAYER_CONFIG[layerName];
    if(!config) return;

    activeLayers.clear();
    activeLayers.add(layerName);
    qsa(".layer, .category-btn").forEach(b => b.classList.toggle("active", b.dataset.layer === layerName));
    activeId = null;
    qs("#fallbackPopup")?.classList.remove("visible");
    renderList(currentTourData());
    if(map && window.AMap){
      markers.forEach(({ marker, point }) => {
        const data = currentTourData();
        const shouldShow = data.some(d => d.id === point.id);
        marker.setContent(markerHtml(point));
        marker.setMap(shouldShow ? map : null);
      });
      if(markers.length){
        const visibleMarkers = markers.filter(({ point }) => currentTourData().some(d => d.id === point.id));
        if(visibleMarkers.length){
          map.setFitView(visibleMarkers.map(item => item.marker), false, [80, 80, 80, 80]);
        }
      }
    } else {
      renderFallback();
    }
    if(window._tourGeocoding){
      statusEl.innerHTML = `正在通过地址精确定位景点...`;
    } else {
      statusEl.innerHTML = `${config.label}图层已显示`;
    }
    return;
  }

  const cfg = LAYER_CONFIG[layerName];
  if(!cfg) return;

  if(layerName === "tree"){
    if(activeLayers.has("tree")){
      activeLayers.delete("tree");
      btn.classList.remove("active");
      statusEl.innerHTML = "古树名木图层已隐藏";
      closeInfo();
    } else {
      activeLayers.add("tree");
      btn.classList.add("active");
      statusEl.innerHTML = `古树名木图层已显示，共 ${POINTS.length} 条真实点位`;
    }
    if(map && window.AMap){
      syncMarkers(filteredRows());
    } else {
      renderFallback();
    }
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusEl.innerHTML = activeLayers.has("tree")
        ? "点击古树点位可查看详情并进入数据大屏。"
        : "古树名木图层已隐藏。";
    }, 3000);
    return;
  }

  statusEl.innerHTML = `正在跳转到「${cfg.label}」专题图层页面…`;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    const target = cfg.page;
    fetch(target, { method: "HEAD" })
      .then(r => {
        if(r.ok){
          window.location.href = target;
        } else {
          statusEl.innerHTML = `「${cfg.label}」专题图层独立页面正在开发中，敬请期待。`;
        }
      })
      .catch(() => {
        statusEl.innerHTML = `「${cfg.label}」专题图层独立页面正在开发中，敬请期待。`;
      });
  }, 300);
}

qsa(".layer, .category-btn").forEach(btn => btn.addEventListener("click", () => toggleLayer(btn.dataset.layer)));

qs("#fallbackPopup")?.addEventListener("click", e => e.stopPropagation());
qs("#fallbackMap")?.addEventListener("click", e => { if(e.target === e.currentTarget && activeId) closeInfo(); });

initAmap();

if(IS_TOUR_PAGE){
  const urlLayer = new URLSearchParams(location.search).get("layer");
  if(urlLayer && TOUR_LAYER_CONFIG[urlLayer]){
    toggleLayer(urlLayer);
  } else {
    renderList();
  }
} else {
  renderList();
}

if(activeId){
  const p = IS_FEIYI_PAGE ? tourPointById(activeId) : (IS_TOUR_PAGE ? tourPointById(activeId) : POINTS.find(p => p.id === activeId));
  const dashLink = qs("#dashLink");
  if(dashLink && p) dashLink.href = dashboardUrl(p.id);
}
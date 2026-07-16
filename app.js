
const DATA = window.YSD_DATA;
const POINTS = DATA.points;
const COLORS = ["#1f9d64", "#3fa7d6", "#f3b63f", "#f47b64", "#50c878", "#7b88d1"];

// ============ 五个图层配置 ============
// tree: 古树名木（当前界面，真实数据，53 条）
// 其余 4 个图层为独立页面入口，将来跳转到对应的专题图层界面
const LAYER_CONFIG = {
  tree:  { label: "古树名木",   color: "#1f9d64", icon: "树", real: true,  page: null,         desc: "53 条真实古树名木点位" },
  forest:{ label: "林场资源",   color: "#2a8c3a", icon: "林", real: false, page: "forest.html", desc: "林场资源专题图层（独立页面）" },
  agri:  { label: "特色农产品", color: "#f3b63f", icon: "农", real: false, page: "agri.html",   desc: "特色农产品专题图层（独立页面）" },
  tour:  { label: "文旅景点",   color: "#3fa7d6", icon: "游", real: false, page: "tour.html",   desc: "文旅景点专题图层（独立页面）" },
  plan:  { label: "保护规划",   color: "#7b88d1", icon: "划", real: false, page: "plan.html",   desc: "古树保护规划专题图层（独立页面）" },
};
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

let map, infoWindow, markers = [];
let markerById = new Map();
let activeId = paramId();
let activeLayers = new Set(["tree"]);
const statusEl = qs("#status");
function cleanText(v){
  // 过滤掉空值、"未标注"、"待补充" 等无效字段，返回空字符串
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || s === "未标注" || s === "待补充") return "";
  return s;
}
function locationText(p){
  // 拼接乡镇/村委会/小地名，过滤未标注字段
  return [cleanText(p.town), cleanText(p.village), cleanText(p.location) || cleanText(p.place)].filter(Boolean).join(" / ");
}
function protectionText(p){
  return cleanText(p.protection) || cleanText(p.measure) || "暂无记录";
}
function pointTitle(p){
  return p.name || `${p.town}·${p.village || ""} ${p.species}`;
}
function markerClass(p){
  return `tree-marker grade-${esc(p.grade || "unknown")} growth-${esc(p.growth || "unknown")}`;
}
function markerHtml(p){
  const activeClass = p.id === activeId ? " is-active" : "";
  return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}" aria-label="${esc(pointTitle(p))}">
    <span>${esc(gradeLabel(p.grade).slice(0, 1))}</span>
  </button>`;
}
function pointHtml(p){
  const note = cleanText(p.data_note) ? `<p class="popup-note">${esc(p.data_note)}</p>` : "";
  const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${p.lng},${p.lat}`)}&name=${encodeURIComponent(pointTitle(p))}`;
  const loc = locationText(p) || "待补充";
  // 形态指标：拼接树高/胸围/冠幅，缺失项不显示
  const morphology = [
    p.height ? `树高 ${esc(p.height)} m` : "",
    p.chest ? `胸围 ${esc(p.chest)} cm` : "",
    p.avgCrown ? `冠幅 ${esc(p.avgCrown)} m` : ""
  ].filter(Boolean).join("，") || "暂无记录";
  // 养护责任人
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
function renderList(rows=POINTS){
  qs("#pointList").innerHTML = rows.map(p => `<div class="item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
    <strong>${esc(pointTitle(p))}</strong>
    <span>${esc(p.id)}｜${esc(locationText(p))}｜${esc(p.age || "未知")}年｜${esc(gradeLabel(p.grade))}</span>
  </div>`).join("");
  qsa(".item").forEach(el => el.addEventListener("click", () => selectPoint(el.dataset.id)));
}
function updateListActive(){
  qsa("#pointList .item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === activeId);
  });
}
function renderFallback(){
  const fm = qs("#fallbackMap");
  fm.classList.add("visible");
  fm.querySelectorAll(".dot").forEach(dot => dot.remove());
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
function selectPoint(id){
  activeId = id;
  const p = pointById(id);
  updateListActive();
  // 同步更新顶栏「进入数据大屏」链接，带上当前选中古树的 ID
  const dashLink = qs("#dashLink");
  if(dashLink) dashLink.href = dashboardUrl(p.id);
  if(!activeLayers.has("tree")){
    activeLayers.add("tree");
    const treeBtn = qs(".layer[data-layer='tree']");
    if(treeBtn) treeBtn.classList.add("active");
    if(map && window.AMap){
      syncMarkers(filteredRows());
    } else {
      renderFallback();
    }
  }
  if(map && window.AMap){
    const position = [Number(p.lng), Number(p.lat)];
    map.setZoomAndCenter(15, position, true);
    updateMarkerActive();
    infoWindow.setContent(pointHtml(p));
    infoWindow.open(map, position);
    syncMarkers(filteredRows());
  } else {
    renderFallback();
    // fallback 模式：介绍以浮动弹窗形式出现在点位旁边（与定位图标同步在一起）
    const popup = qs("#fallbackPopup");
    const {x, y} = pointXY(p);
    popup.innerHTML = `<button class="popup-close" title="关闭">&times;</button>` + pointHtml(p);
    popup.style.left = `${x}%`;
    popup.style.top = `${y}%`;
    // 点位在顶部 30% 区域时，弹窗翻转到下方显示，避免超出地图
    popup.classList.toggle("flip-below", y < 30);
    popup.classList.add("visible");
    // 关闭按钮
    popup.querySelector(".popup-close")?.addEventListener("click", closeInfo);
  }
}
// 关闭弹窗并取消 marker 高亮：定位图标和介绍同步消失
function closeInfo(){
  activeId = null;
  updateListActive();
  if(map && window.AMap && infoWindow){
    infoWindow.close();
    updateMarkerActive();
  } else {
    // fallback 模式：隐藏浮动弹窗并重绘点位（取消高亮）
    qs("#fallbackPopup")?.classList.remove("visible");
    renderFallback();
  }
}
function filteredRows(){
  const keyword = qs("#search").value.trim();
  if(!keyword) return POINTS;
  return POINTS.filter(p => [p.id,p.name,p.species,p.town,p.village,p.place,p.location,p.story,p.protection,p.coordinate_status].some(v => String(v).includes(keyword)));
}
function syncMarkers(rows=filteredRows()){
  const visibleIds = new Set(rows.map(p => p.id));
  markers.forEach(({ marker, point }) => {
    const shouldShow = visibleIds.has(point.id) && activeLayers.has("tree");
    marker.setMap(shouldShow ? map : null);
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
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMap_KEY)}&plugin=AMap.Scale,AMap.ToolBar&callback=onAmapReady`;
  script.onerror = renderFallback;
  document.head.appendChild(script);
  // 超时检测：5 秒内地图未初始化成功（如 Key 域名不匹配），自动回退到点位图
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
    if(amapTimedOut) return; // 已超时回退到点位图，不再初始化真实地图
    clearTimeout(window._amapTimeout);
    const r = _origReady.apply(this, arguments);
    // 瓦片渲染检测：3 秒后检查地图容器是否真正渲染了瓦片
    // 域名不匹配时 map 对象会创建但瓦片不渲染，导致空白
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
  statusEl.innerHTML = "高德地图已加载，点击古树点位可查看详情并进入数据大屏。";
  map = new AMap.Map("map", { zoom: DATA.meta.zoom, center: DATA.meta.center, viewMode: "2D" });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({ position: "RB" }));
  infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30), isCustom: false, autoMove: false });
  // 点击地图空白处：弹窗与 marker 高亮同步消失
  map.on("click", () => { if(activeId) closeInfo(); });
  markerById = new Map();
  // 1. 创建古树图层 marker（真实数据）
  markers = POINTS.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).map(p => {
    const marker = new AMap.Marker({
      position: [p.lng, p.lat],
      title: pointTitle(p),
      content: markerHtml(p),
      offset: new AMap.Pixel(-14, -30),
      map: activeLayers.has("tree") ? map : null
    });
    marker.on("click", () => selectPoint(p.id));
    const item = { marker, point: p };
    markerById.set(p.id, item);
    return item;
  });
  // 2. 视图适配
  if(markers.length && activeLayers.has("tree")){
    map.setFitView(markers.map(item => item.marker), false, [80, 80, 80, 80]);
  } else {
    map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center);
  }
  if(activeId) selectPoint(activeId);
};
qs("#search").addEventListener("input", renderSearch);
let statusTimeout;
qs("#centerBtn").addEventListener("click", () => {
  if(map && window.AMap){
    map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center, true);
    statusEl.innerHTML = "地图已居中到上党区";
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusEl.innerHTML = "点击古树点位可查看详情并进入数据大屏。";
    }, 2500);
  }
});
function toggleLayer(layerName){
  const btn = qs(`.layer[data-layer="${layerName}"]`);
  if(!btn) return;
  const cfg = LAYER_CONFIG[layerName];
  if(!cfg) return;

  // 古树名木图层：在当前界面切换点位显示/隐藏
  if(layerName === "tree"){
    if(activeLayers.has("tree")){
      activeLayers.delete("tree");
      btn.classList.remove("active");
      statusEl.innerHTML = "古树名木图层已隐藏";
      // 同步关闭弹窗并取消 marker 高亮（定位图标与介绍同步消失）
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

  // 其余 4 个图层：跳转到对应的独立专题页面
  statusEl.innerHTML = `正在跳转到「${cfg.label}」专题图层页面…`;
  // 短暂延迟以便用户看到提示，再尝试跳转
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    const target = cfg.page;
    // 用 fetch 探测目标页面是否存在，存在则跳转，否则提示开发中
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
qsa(".layer").forEach(btn => btn.addEventListener("click", () => toggleLayer(btn.dataset.layer)));
// fallback 模式：点击弹窗内部不冒泡（避免误触发关闭），点击地图空白处则同步消失
qs("#fallbackPopup")?.addEventListener("click", e => e.stopPropagation());
qs("#fallbackMap")?.addEventListener("click", e => { if(e.target === e.currentTarget && activeId) closeInfo(); });
renderList();
initAmap();
// 页面初始加载：同步顶栏「进入数据大屏」链接，带上 URL 中的古树 ID
if(activeId){
  const p = pointById(activeId);
  const dashLink = qs("#dashLink");
  if(dashLink && p) dashLink.href = dashboardUrl(p.id);
}

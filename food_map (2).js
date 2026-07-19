const DATA = window.FOOD_DATA;
const TOWNS = DATA.towns;
const FOODS = DATA.foods;

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

let map, infoWindow, markers = [];
let markerByTown = new Map();
let activeTown = null;
let activeFood = null;
const statusEl = qs("#status");

function getFoodsByTown(townName){
  return FOODS.filter(f => f.town === townName);
}

function renderTownList(){
  const keyword = qs("#search").value.trim().toLowerCase();
  
  if(keyword){
    const filteredFoods = FOODS.filter(f => f.name.toLowerCase().includes(keyword));
    qs("#townList").innerHTML = filteredFoods.map(food => {
      const town = TOWNS.find(t => t.name === food.town);
      return `<div class="item ${food.id === activeFood ? 'active' : ''}" data-food="${esc(food.id)}">
        <strong>${esc(food.name)}</strong>
        <span>${esc(food.category)}｜${esc(food.town)}</span>
      </div>`;
    }).join("") || `<div class="empty">未找到匹配的美食</div>`;
    
    qsa("#townList .item").forEach(el => el.addEventListener("click", () => {
      const foodId = el.dataset.food;
      const food = FOODS.find(f => f.id === foodId);
      activeTown = food.town;
      qs("#townList").style.display = "none";
      qs("#foodList").style.display = "grid";
      qs("#backBtn").style.display = "block";
      renderFoodList(food.town);
      selectFood(foodId);
    }));
  } else {
    const filtered = TOWNS;
    qs("#townList").innerHTML = filtered.map(town => {
      const foods = getFoodsByTown(town.name);
      return `<div class="item ${town.name === activeTown ? 'active' : ''}" data-town="${esc(town.name)}">
        <strong>${esc(town.name)}</strong>
        <span>${esc(foods.length)} 种特色美食</span>
      </div>`;
    }).join("");
    
    qsa("#townList .item").forEach(el => el.addEventListener("click", () => selectTown(el.dataset.town)));
  }
}

function renderFoodList(townName){
  const foods = getFoodsByTown(townName);
  qs("#foodList").innerHTML = foods.map(food => `
    <div class="item ${food.id === activeFood ? 'active' : ''}" data-food="${esc(food.id)}">
      <strong>${esc(food.name)}</strong>
      <span>${esc(food.category)}｜${esc(food.town)}</span>
    </div>
  `).join("");
  
  qsa("#foodList .item").forEach(el => el.addEventListener("click", () => selectFood(el.dataset.food)));
}

function selectTown(townName){
  activeTown = townName;
  activeFood = null;
  
  qs("#townList").style.display = "none";
  qs("#foodList").style.display = "grid";
  qs("#backBtn").style.display = "block";
  
  renderFoodList(townName);
  
  const town = TOWNS.find(t => t.name === townName);
  const foods = getFoodsByTown(townName);
  
  if(foods.length === 1){
    selectFood(foods[0].id);
  } else {
    if(map && window.AMap){
      map.setZoomAndCenter(14, [town.lng, town.lat], true);
    }
    statusEl.innerHTML = `已选择「${townName}」，共 ${foods.length} 种特色美食`;
  }
}

function selectFood(foodId){
  activeFood = foodId;
  const food = FOODS.find(f => f.id === foodId);
  const town = TOWNS.find(t => t.name === food.town);
  
  qsa("#foodList .item").forEach(el => {
    el.classList.toggle("active", el.dataset.food === foodId);
  });
  
  if(map && window.AMap){
    const position = [Number(town.lng), Number(town.lat)];
    map.setZoomAndCenter(15, position, true);
    updateMarkerActive(town.name);
    infoWindow.setContent(foodHtml(food));
    infoWindow.open(map, position);
  } else {
    const fm = qs("#fallbackMap");
    fm.classList.add("visible");
    
    fm.querySelectorAll(".layer-dot").forEach(dot => {
      const isActive = dot.textContent === town.name.charAt(0);
      dot.classList.toggle("active", isActive);
    });
    
    const popup = qs("#fallbackPopup");
    const {x, y} = townXY(town);
    popup.innerHTML = `<button class="popup-close" title="关闭">&times;</button>` + foodHtml(food);
    popup.style.left = `${x}%`;
    popup.style.top = `${y}%`;
    popup.classList.toggle("flip-below", y < 30);
    popup.classList.add("visible");
    popup.querySelector(".popup-close")?.addEventListener("click", closeInfo);
  }
  
  statusEl.innerHTML = `已选择美食：${food.name}（${food.town}）`;
}

function backToTownList(){
  activeTown = null;
  activeFood = null;
  qs("#townList").style.display = "grid";
  qs("#foodList").style.display = "none";
  qs("#backBtn").style.display = "none";
  qs("#fallbackPopup")?.classList.remove("visible");
  renderTownList();
  if(!map){
    renderFallback();
  }
  statusEl.innerHTML = "特色饮食专题图层展示中";
}

function foodHtml(food){
  const town = TOWNS.find(t => t.name === food.town);
  const lng = town ? town.lng : 113.07;
  const lat = town ? town.lat : 36.00;
  const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${lng},${lat}`)}&name=${encodeURIComponent(food.name)}`;
  return `<div class="popup">
    <div class="popup-head">
      <span class="popup-kicker">${esc(food.category)}</span>
      <h3>${esc(food.name)}</h3>
      <div class="popup-tags">
        <span class="tag-sample">${esc(food.town)}</span>
        <span>${esc(food.category)}</span>
      </div>
    </div>
    <div class="popup-facts">
      <div class="fact-location"><b>所在乡镇</b><span>${esc(food.town)}</span></div>
      <div><b>美食类别</b><span>${esc(food.category)}</span></div>
    </div>
    <div class="popup-story"><b>美食介绍</b><p>${esc(food.description)}</p></div>
    <div class="actions">
      <a href="food_dashboard.html?id=${encodeURIComponent(food.id)}">查看数据大屏</a>
      <a class="secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
    </div>
  </div>`;
}

function closeInfo(){
  activeFood = null;
  qsa("#foodList .item").forEach(el => el.classList.remove("active"));
  if(map && window.AMap && infoWindow){
    infoWindow.close();
    updateMarkerActive(null);
  } else {
    qs("#fallbackPopup")?.classList.remove("visible");
    if(!map){
      renderFallback();
    }
  }
}

function townXY(town){
  const lngs = TOWNS.map(t => t.lng), lats = TOWNS.map(t => t.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return {
    x: (town.lng - minLng) / Math.max(maxLng - minLng, .0001) * 72 + 14,
    y: (1 - (town.lat - minLat) / Math.max(maxLat - minLat, .0001)) * 68 + 17
  };
}

function renderFallback(){
  const fm = qs("#fallbackMap");
  fm.classList.add("visible");
  fm.querySelectorAll(".layer-dot").forEach(dot => dot.remove());
  
  TOWNS.forEach(town => {
    const {x, y} = townXY(town);
    const dot = document.createElement("span");
    const isActive = activeFood && FOODS.find(f => f.id === activeFood)?.town === town.name;
    dot.className = `layer-dot ${town.name === activeTown || isActive ? "active" : ""}`;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.background = "#f3b63f";
    dot.textContent = town.name.charAt(0);
    dot.title = `${town.name}（${getFoodsByTown(town.name).length}种美食）`;
    dot.addEventListener("click", () => selectTown(town.name));
    fm.appendChild(dot);
  });
}

function markerHtml(townName){
  const isActive = activeFood && FOODS.find(f => f.id === activeFood)?.town === townName;
  const activeClass = isActive ? " is-active" : "";
  return `<button class="layer-marker${activeClass}" style="background:#f3b63f;border-color:#fff"><span>${townName.charAt(0)}</span></button>`;
}

function updateMarkerActive(townName){
  markers.forEach(({ marker, town }) => {
    marker.setContent(markerHtml(town.name));
  });
}

window.onFoodMapReady = function(){
  statusEl.innerHTML = "高德地图已加载，正在精确定位乡镇政府位置...";
  
  const fm = qs("#fallbackMap");
  fm.classList.remove("visible");
  
  map = new AMap.Map("map", { zoom: DATA.meta.zoom, center: DATA.meta.center, viewMode: "2D" });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({ position: "RB" }));
  infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30), isCustom: false, autoMove: false });
  
  map.on("click", () => { if(activeFood) closeInfo(); });
  
  markerByTown = new Map();
  markers = TOWNS.map(town => {
    const marker = new AMap.Marker({
      position: [town.lng, town.lat],
      title: `${town.name}（${getFoodsByTown(town.name).length}种美食）`,
      content: markerHtml(town.name),
      offset: new AMap.Pixel(-14, -14)
    });
    marker.on("click", () => selectTown(town.name));
    map.add(marker);
    markerByTown.set(town.name, marker);
    return { marker, town };
  });
  
  if(markers.length){
    map.setFitView(markers.map(item => item.marker), false, [80, 80, 80, 80]);
  }
  
  const buildGovKeyword = (townName) => {
    if(townName.includes('街道')){
      return townName + '办事处';
    }
    if(townName.includes('镇')){
      return townName + '人民政府';
    }
    if(townName.includes('乡')){
      return townName + '人民政府';
    }
    return townName;
  };
  
  const townGeocodeCache = new Map();
  let geocodeCompleted = 0;
  const totalTowns = TOWNS.length;
  
  const processTownGeocode = (town, index) => {
    const keyword = buildGovKeyword(town.name);
    
    if(townGeocodeCache.has(keyword)){
      const cached = townGeocodeCache.get(keyword);
      if(cached){
        const item = markers[index];
        if(item && item.marker){
          item.marker.setPosition(cached);
          town.lng = cached[0];
          town.lat = cached[1];
        }
      }
      geocodeCompleted++;
      if(geocodeCompleted === totalTowns){
        statusEl.innerHTML = "高德地图已加载，点击乡镇点位查看特色美食。";
        if(markers.length){
          map.setFitView(markers.map(item => item.marker), false, [80, 80, 80, 80]);
        }
      }
      return;
    }
    
    const apiUrl = `https://restapi.amap.com/v3/place/text?key=${encodeURIComponent(window.AMap_KEY)}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent("长治市")}&citylimit=true&output=JSON`;
    
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => {
        if(data && data.infocode === "10021"){
          setTimeout(() => processTownGeocode(town, index), 2000);
          return;
        }
        if(data && data.status === "1" && data.info === "OK" && data.pois && data.pois.length){
          const sdPoi = data.pois.find(poi => poi.adname === "上党区");
          const targetPoi = sdPoi || data.pois[0];
          if(targetPoi){
            const locStr = targetPoi.location;
            const [newLng, newLat] = locStr.split(",").map(Number);
            if(Number.isFinite(newLng) && Number.isFinite(newLat)){
              townGeocodeCache.set(keyword, [newLng, newLat]);
              const item = markers[index];
              if(item && item.marker){
                item.marker.setPosition([newLng, newLat]);
                town.lng = newLng;
                town.lat = newLat;
              }
            }
          }
        }
      })
      .catch(err => {})
      .finally(() => {
        geocodeCompleted++;
        if(geocodeCompleted === totalTowns){
          statusEl.innerHTML = "高德地图已加载，点击乡镇点位查看特色美食。";
          if(markers.length){
            map.setFitView(markers.map(item => item.marker), false, [80, 80, 80, 80]);
          }
        }
      });
  };
  
  TOWNS.forEach((town, index) => {
    setTimeout(() => processTownGeocode(town, index), index * 300);
  });
};

function initAmap(){
  if(!window.AMap_KEY || window.AMap_KEY.includes("YOUR_AMAP")){
    renderFallback();
    return;
  }
  if(window.AMap_SECURITY_CODE && !window.AMap_SECURITY_CODE.includes("OPTIONAL")){
    window._AMapSecurityConfig = { securityJsCode: window.AMap_SECURITY_CODE };
  }
  const script = document.createElement("script");
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMap_KEY)}&plugin=AMap.Scale,AMap.ToolBar&callback=onFoodMapReady`;
  script.onerror = () => {
    renderFallback();
    statusEl.innerHTML = "地图服务加载失败，已切换为点位示意图。";
  };
  document.head.appendChild(script);
  
  let amapTimedOut = false;
  window._foodMapTimeout = setTimeout(() => {
    if(!map){
      amapTimedOut = true;
      renderFallback();
      statusEl.innerHTML = "地图服务加载超时，已切换为点位示意图。配置 config.js 后将自动加载高德地图。";
    }
  }, 5000);
  
  const _origReady = window.onFoodMapReady;
  window.onFoodMapReady = function(){
    if(amapTimedOut) return;
    clearTimeout(window._foodMapTimeout);
    const r = _origReady.apply(this, arguments);
    
    setTimeout(() => {
      if(amapTimedOut || !map) return;
      const hasTiles = qs("#map canvas") || qs("#map img") || qs("#map .amap-maps");
      if(!hasTiles){
        amapTimedOut = true;
        try { map.destroy(); } catch(e){}
        map = null;
        markers = [];
        markerByTown.clear();
        renderFallback();
        statusEl.innerHTML = "地图服务在当前访问地址下不可用（需配置高德安全域名），已切换为点位示意图，点位均可点击查看详情。";
      }
    }, 3000);
    return r;
  };
}

qs("#search").addEventListener("input", () => {
  if(qs("#townList").style.display !== "none"){
    renderTownList();
  }
});

qs("#backBtn").addEventListener("click", backToTownList);

qs("#fallbackPopup")?.addEventListener("click", e => e.stopPropagation());
qs("#fallbackMap")?.addEventListener("click", e => { if(e.target === e.currentTarget && activeFood) closeInfo(); });

qs("#centerBtn").addEventListener("click", () => {
  if(map && window.AMap){
    map.setZoomAndCenter(DATA.meta.zoom, DATA.meta.center, true);
  }
  statusEl.innerHTML = "地图已居中到上党区";
  setTimeout(() => {
    statusEl.innerHTML = "特色饮食专题图层展示中";
  }, 2500);
});

renderTownList();
initAmap();
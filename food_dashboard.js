const DATA = window.FOOD_DATA;
const FOODS = DATA.foods;
const TOWNS = DATA.towns;
const COLORS = ["#f3b63f", "#3fa7d6", "#1f9d64", "#f47b64", "#7b88d1", "#50c878", "#e0a020", "#4cae50"];

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

function foodById(id){ return FOODS.find(f => f.id === id) || FOODS[0]; }
function paramId(){ return new URLSearchParams(location.search).get("id"); }

let selected = foodById(paramId());

function renderOverview(){
  qs("#overviewText").innerHTML = esc(DATA.overview);
}

function renderKpis(){
  const k = DATA.kpis;
  const items = [
    ["美食总数", k.total, "种"], 
    ["覆盖乡镇", k.townCount, "个"], 
    ["美食类别", k.categoryCount, "类"], 
    ["乡镇平均", k.avgPerTown, "种"]
  ];
  qs("#kpis").innerHTML = items.map(([label,value,unit]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}<span class="unit">${unit}</span></div></div>`).join("");
}

function renderBars(id, rows, limit=8){
  const list = qs("#"+id);
  const sliced = rows.slice(0, limit);
  const max = Math.max(...sliced.map(x => x.value), 1);
  list.innerHTML = sliced.map((row, idx) => `
    <div class="bar-row">
      <div class="bar-name" title="${esc(row.name)}">${esc(row.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, row.value / max * 100)}%; background:linear-gradient(90deg, ${COLORS[idx % COLORS.length]}, #f3b63f)"></div></div>
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

function renderDetail(food){
  qs("#backMap").href = `agri.html`;
  qs("#detailContent").innerHTML = `
    <div class="detail-title"><strong>${esc(food.name)}</strong><span>${esc(food.category)}</span></div>
    <div class="facts">
      <div class="fact"><b>美食名称</b><span>${esc(food.name)}</span></div>
      <div class="fact"><b>所在乡镇</b><span>${esc(food.town)}</span></div>
      <div class="fact"><b>美食类别</b><span>${esc(food.category)}</span></div>
      <div class="fact"><b>美食编号</b><span>${esc(food.id)}</span></div>
    </div>
    <div class="story"><b>美食介绍：</b>${esc(food.description)}</div>`;
}
function renderFoodSelect(){
  const select = qs("#foodSelect");
  select.innerHTML = FOODS.map(f => `<option value="${f.id}">${f.name} - ${f.town}</option>`).join("");
  select.value = selected.id;
  select.addEventListener("change", () => selectFood(select.value));
}

function selectFood(id){
  selected = foodById(id);
  renderDetail(selected);
  const select = qs("#foodSelect");
  if(select) select.value = selected.id;
  
  qsa("#foodIndex .item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === selected.id);
  });
  
  qsa("#miniMap .town-group").forEach(group => {
    const dot = group.querySelector(".dot");
    const isActive = dot.dataset.town === selected.town;
    group.classList.toggle("active", isActive);
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
  
  const url = new URL(location.href);
  url.searchParams.set("id", selected.id);
  history.replaceState(null, "", url);
}

function townXY(town){
  return {
    x: town.x,
    y: town.y
  };
}

function renderMiniMap(){
  const map = qs("#miniMap");
  map.innerHTML = "";
  
  const region = document.createElement("span");
  region.className = "region-outline";
  map.appendChild(region);
  
  TOWNS.forEach(town => {
    const {x, y} = townXY(town);
    const foodCount = getFoodCountByTown(town.name);
    
    const group = document.createElement("div");
    group.className = "town-group";
    group.style.left = `${x}%`;
    group.style.top = `${y}%`;
    
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.town = town.name;
    dot.role = "button";
    dot.tabIndex = 0;
    dot.setAttribute("aria-pressed", String(town.name === selected.town));
    dot.style.background = "#f3b63f";
    dot.title = `${town.name}（${foodCount}种美食）`;
    
    if(town.name === selected.town){
      dot.classList.add("active");
    }
    
    const label = document.createElement("span");
    label.className = "town-label";
    label.textContent = town.name;
    
    const count = document.createElement("span");
    count.className = "town-count";
    count.textContent = foodCount;
    
    group.appendChild(dot);
    group.appendChild(label);
    group.appendChild(count);
    
    group.addEventListener("click", () => {
      const firstFood = FOODS.find(f => f.town === town.name);
      if(firstFood) selectFood(firstFood.id);
    });
    
    map.appendChild(group);
  });
}

function getFoodCountByTown(townName){
  return FOODS.filter(f => f.town === townName).length;
}

function renderFoodIndex(){
  const index = qs("#foodIndex");
  index.innerHTML = FOODS.map(food => `
    <div class="item ${food.id === selected.id ? 'active' : ''}" data-id="${esc(food.id)}">
      <strong>${esc(food.name)}</strong>
      <span>${esc(food.category)}｜${esc(food.town)}</span>
    </div>
  `).join("");
  
  qsa("#foodIndex .item").forEach(el => el.addEventListener("click", () => selectFood(el.dataset.id)));
}

function getTownStats(){
  return TOWNS.map(town => ({
    name: town.name,
    value: getFoodCountByTown(town.name)
  })).sort((a, b) => b.value - a.value);
}

renderOverview();
renderKpis();
renderBars("townBars", getTownStats(), 8);
renderBars("categoryBars", DATA.categories, 9);
renderDonut("categoryDonut", "categoryLegend", DATA.categories);
renderFoodSelect();
renderDetail(selected);
renderMiniMap();
renderFoodIndex();
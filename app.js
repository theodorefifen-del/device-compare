// Données (exemples) — tu pourras remplacer par des vrais modèles ensuite
const DEVICES = [
  {id:"p1", brand:"Nova", model:"A1", price:199, displayType:"AMOLED", hz:120, battery:5000, charge:67, main:50, ultra:12, selfie:16, ois:true, cpu:640, gpu:610, fiveG:true, nfc:true, ram:8, storage:256},
  {id:"p2", brand:"Orion", model:"S9 Pro", price:599, displayType:"LTPO OLED", hz:120, battery:4900, charge:100, main:108, ultra:50, selfie:32, ois:true, cpu:910, gpu:940, fiveG:true, nfc:true, ram:12, storage:512},
  {id:"p3", brand:"Zeno", model:"M5", price:149, displayType:"IPS", hz:90, battery:6000, charge:33, main:50, ultra:8, selfie:13, ois:false, cpu:520, gpu:480, fiveG:false, nfc:false, ram:6, storage:128},
  {id:"p4", brand:"Giga", model:"G7", price:399, displayType:"AMOLED", hz:144, battery:5200, charge:80, main:64, ultra:12, selfie:16, ois:true, cpu:860, gpu:900, fiveG:true, nfc:true, ram:12, storage:256},
  {id:"p5", brand:"Pixelia", model:"CamX", price:499, displayType:"AMOLED", hz:120, battery:4700, charge:45, main:50, ultra:48, selfie:20, ois:true, cpu:790, gpu:760, fiveG:true, nfc:true, ram:8, storage:256},
  {id:"p6", brand:"Lite", model:"L1", price:119, displayType:"IPS", hz:60, battery:5000, charge:18, main:13, ultra:0, selfie:8, ois:false, cpu:360, gpu:300, fiveG:false, nfc:false, ram:4, storage:64}
];

const clamp = (v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const norm = (v,min,max)=>clamp(((v-min)/(max-min))*100);

function subScores(d){
  const autonomie = clamp(0.7*norm(d.battery,3500,6500)+0.3*norm(d.charge,10,120));
  const perf = clamp(0.55*(d.cpu/10)+0.35*(d.gpu/10)+0.10*clamp((d.ram-4)*6));
  const ecran = clamp(0.6*norm(d.hz,60,144)+0.4*(/OLED|AMOLED/i.test(d.displayType)?15:0));
  const photo = clamp(0.5*norm(d.main,12,108)+0.25*norm(d.ultra,0,50)+0.15*norm(d.selfie,8,32)+0.10*(d.ois?100:0));
  return {photo, perf, autonomie, ecran};
}
function globalScore(d, profile, minP, maxP){
  const s = subScores(d);
  const tech = 0.25*s.photo+0.30*s.perf+0.25*s.autonomie+0.20*s.ecran;
  const priceNorm = (maxP===minP)?50:clamp(((d.price-minP)/(maxP-minP))*100);
  const qp = clamp(tech - 0.7*priceNorm + 30);

  const w = {
    photo:{photo:.45,perf:.15,autonomie:.15,ecran:.15,qp:.10},
    gaming:{photo:.15,perf:.45,autonomie:.15,ecran:.15,qp:.10},
    autonomie:{photo:.10,perf:.10,autonomie:.55,ecran:.15,qp:.10},
    budget:{photo:.15,perf:.15,autonomie:.15,ecran:.10,qp:.45},
  }[profile];

  const total = clamp(w.photo*s.photo + w.perf*s.perf + w.autonomie*s.autonomie + w.ecran*s.ecran + w.qp*qp);
  return {...s, qp, total};
}

// UI state
let compareIds = JSON.parse(localStorage.getItem("compare_ids_v1") || "[]");
const saveCompare = () => localStorage.setItem("compare_ids_v1", JSON.stringify(compareIds));

const el = (id)=>document.getElementById(id);
const grid = el("grid");
const year = el("year");
year.textContent = new Date().getFullYear();

function updateCompareCount(){
  el("compareCount").textContent = `(${compareIds.length}/4)`;
}
updateCompareCount();

function getFilters(){
  return {
    q: el("q").value.trim().toLowerCase(),
    profile: el("profile").value,
    maxPrice: Number(el("maxPrice").value),
    f5g: el("f5g").checked,
    fnfc: el("fnfc").checked,
    foled: el("foled").checked,
    f120: el("f120").checked
  };
}

function filteredList(){
  const f = getFilters();
  let list = DEVICES.filter(d=>{
    const name = `${d.brand} ${d.model}`.toLowerCase();
    if (f.q && !name.includes(f.q)) return false;
    if (d.price > f.maxPrice) return false;
    if (f.f5g && !d.fiveG) return false;
    if (f.fnfc && !d.nfc) return false;
    if (f.foled && !/OLED|AMOLED/i.test(d.displayType)) return false;
    if (f.f120 && d.hz < 120) return false;
    return true;
  });

  const prices = list.map(x=>x.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  list = list
    .map(d=>({d, s: globalScore(d, f.profile, minP, maxP)}))
    .sort((a,b)=>b.s.total-a.s.total);

  return list;
}

function cardHtml(d, s){
  const inCompare = compareIds.includes(d.id);
  const disabled = (!inCompare && compareIds.length>=4);
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px">
        <div>
          <div class="muted" style="font-size:13px">${d.brand}</div>
          <h3 style="margin:2px 0 0;font-size:18px">${d.model}</h3>
          <div class="muted" style="margin-top:6px">${d.price.toLocaleString("fr-FR")} €</div>
        </div>
        <div style="text-align:right">
          <div class="muted" style="font-size:12px">Score</div>
          <div style="font-size:26px;font-weight:900">${Math.round(s.total)}</div>
        </div>
      </div>

      <div class="badges">
        <span class="badge">${d.displayType} ${d.hz}Hz</span>
        <span class="badge">${d.battery}mAh · ${d.charge}W</span>
        ${d.fiveG ? `<span class="badge">5G</span>` : ``}
        ${d.nfc ? `<span class="badge">NFC</span>` : ``}
      </div>

      <div class="row">
        <button class="btn secondary" data-action="details" data-id="${d.id}">Fiche</button>
        <button class="btn" data-action="compare" data-id="${d.id}" ${disabled ? "disabled":""}>
          ${inCompare ? "Ajouté" : "Comparer"}
        </button>
      </div>
      ${disabled ? `<div class="muted" style="margin-top:8px;font-size:12px">Limite 4 atteinte : retire un modèle pour en ajouter un autre.</div>` : ``}
    </div>
  `;
}

function render(){
  const f = getFilters();
  el("maxPriceLabel").textContent = `${f.maxPrice} €`;

  const list = filteredList();
  grid.innerHTML = list.map(({d,s})=>cardHtml(d,s)).join("");

  renderCompare();
}

function addToCompare(id){
  if (compareIds.includes(id)) return;
  if (compareIds.length >= 4) return;
  compareIds.push(id);
  saveCompare();
  updateCompareCount();
  render();
}
function removeFromCompare(id){
  compareIds = compareIds.filter(x=>x!==id);
  saveCompare();
  updateCompareCount();
  render();
}

function renderCompare(){
  const selected = DEVICES.filter(d=>compareIds.includes(d.id));
  const empty = el("compareEmpty");
  const wrap = el("compareWrap");
  const table = el("compareTable");

  if (selected.length < 2){
    empty.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  empty.classList.add("hidden");
  wrap.classList.remove("hidden");

  const rows = [
    ["Prix", d=>d.price],
    ["Écran", d=>`${d.displayType} · ${d.hz}Hz`],
    ["Batterie", d=>d.battery],
    ["Charge", d=>d.charge],
    ["Photo (main)", d=>d.main],
    ["Selfie", d=>d.selfie],
    ["Performance (CPU)", d=>d.cpu],
    ["5G", d=>d.fiveG ? 1 : 0],
    ["NFC", d=>d.nfc ? 1 : 0],
  ];

  // Determine "best" value per row
  const bestIndexByRow = rows.map(([,get])=>{
    const values = selected.map(get);
    // For 0/1: prefer 1; for price: prefer MIN; else prefer MAX
    const isPrice = get === rows[0][1];
    if (isPrice){
      const min = Math.min(...values);
      return values.indexOf(min);
    }
    const max = Math.max(...values);
    return values.indexOf(max);
  });

  const head = `
    <thead>
      <tr>
        <th>Critère</th>
        ${selected.map(d=>`
          <th>
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <div>
                <div class="muted" style="font-size:12px">${d.brand}</div>
                <div style="font-weight:900">${d.model}</div>
              </div>
              <button class="btn secondary" data-action="remove" data-id="${d.id}">Retirer</button>
            </div>
          </th>
        `).join("")}
      </tr>
    </thead>
  `;

  const body = `
    <tbody>
      ${rows.map((r, ri)=>{
        const [label, get] = r;
        const bestIdx = bestIndexByRow[ri];
        return `
          <tr>
            <td class="muted"><b>${label}</b></td>
            ${selected.map((d, i)=>{
              const v = get(d);
              const display =
                label==="5G" || label==="NFC" ? (v===1 ? "Oui" : "Non") :
                label==="Prix" ? `${v.toLocaleString("fr-FR")} €` :
                label==="Batterie" ? `${v} mAh` :
                label==="Charge" ? `${v} W` :
                v;
              return `<td class="${i===bestIdx ? "best":""}">${display}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("")}
    </tbody>
  `;

  table.innerHTML = head + body;
}

function openModal(d){
  el("modalTitle").textContent = `${d.brand} ${d.model}`;
  const s = subScores(d);
  el("modalBody").innerHTML = `
    <p><b>Prix :</b> ${d.price.toLocaleString("fr-FR")} €</p>
    <p><b>Écran :</b> ${d.displayType}, ${d.hz}Hz</p>
    <p><b>Batterie :</b> ${d.battery}mAh · Charge ${d.charge}W</p>
    <p><b>Caméras :</b> main ${d.main}MP, ultra ${d.ultra}MP, selfie ${d.selfie}MP, OIS: ${d.ois?"Oui":"Non"}</p>
    <p><b>Perf :</b> CPU ${d.cpu} · GPU ${d.gpu} · RAM ${d.ram}GB · Stockage ${d.storage}GB</p>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.10);margin:12px 0">
    <p><b>Sous-scores (0–100)</b></p>
    <p>Photo: ${Math.round(s.photo)} · Performance: ${Math.round(s.perf)} · Autonomie: ${Math.round(s.autonomie)} · Écran: ${Math.round(s.ecran)}</p>
  `;
  el("modal").classList.remove("hidden");
}
function closeModal(){
  el("modal").classList.add("hidden");
}

document.addEventListener("click", (e)=>{
  const t = e.target;
  if (t?.dataset?.action === "compare") addToCompare(t.dataset.id);
  if (t?.dataset?.action === "remove") removeFromCompare(t.dataset.id);
  if (t?.dataset?.action === "details") {
    const d = DEVICES.find(x=>x.id===t.dataset.id);
    if (d) openModal(d);
  }
  if (t?.id === "closeModal") closeModal();
  if (t?.id === "modal") closeModal();
});

el("clearCompare").addEventListener("click", ()=>{
  compareIds = [];
  saveCompare();
  updateCompareCount();
  render();
});

// Live filters
["q","profile","f5g","fnfc","foled","f120","maxPrice"].forEach(id=>{
  el(id).addEventListener("input", render);
});

render();

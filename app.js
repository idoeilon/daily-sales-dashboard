/* ===== embedded snapshot (current data from the workbook) ===== */
/* \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05d3\u05de\u05d5 (SNAPSHOT) \u05d4\u05d5\u05e1\u05e8\u05d5 \u2014 \u05d4\u05d3\u05d0\u05e9\u05d1\u05d5\u05e8\u05d3 \u05e0\u05d8\u05e2\u05df \u05d0\u05da \u05d5\u05e8\u05e7 \u05de-Google Sheets, \u05dc\u05dc\u05d0 \u05e0\u05e4\u05d9\u05dc\u05d4 \u05d7\u05d6\u05e8\u05d4 \u05dc\u05d3\u05de\u05d5. */

const nf = new Intl.NumberFormat("he-IL");
const pf = v => Math.round(v*100) + "%";
const el = id => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

const STATUS = {
  invoices:{label:"\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05d5\u05ea", color:"#2dd4bf"},
  deliveries:{label:"\u05de\u05e1\u05d9\u05e8\u05d5\u05ea", color:"#5b8def"},
  inProcess:{label:"\u05d1\u05ea\u05d4\u05dc\u05d9\u05da", color:"#8b7cf6"},
  open:{label:"\u05ea\u05d9\u05e7 \u05e4\u05ea\u05d5\u05d7", color:"#f5a524"},
  newCustomers:{label:"\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d3\u05e9\u05d9\u05dd", color:"#41e3cf"}
};
let CURRENT = null;
const BUILD = "5 \u00b7 11.6.2026 \u00b7 \u05d6\u05d9\u05d4\u05d5\u05d9-\u05dc\u05e4\u05d9-\u05db\u05d5\u05ea\u05e8\u05d5\u05ea";
const esc = s => String(s).replace(/[&<>"]/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));

function openPopup(key){
  const meta = STATUS[key]; if(!meta || !CURRENT) return;
  const groups = CURRENT.reps.map(r=>({
    rep:r.name,
    items:((r.detail && r.detail[key]) ? r.detail[key] : []).slice().sort((a,b)=>b.v-a.v)
  })).filter(g=>g.items.length);
  const total = groups.reduce((s,g)=>s + g.items.reduce((a,x)=>a+x.v,0), 0);
  const body = groups.map(g=>{
    const sub = g.items.reduce((a,x)=>a+x.v,0);
    const rows = g.items.map(x=>`<div class="prow"><span class="pc-name">${esc(x.c)}</span>${key==="newCustomers"?"":`<span class="pc-v num">${nf.format(x.v)}</span>`}</div>`).join("");
    return `<div class="pgroup"><div class="pgh"><span>${esc(g.rep)}</span><span class="num">${nf.format(sub)}</span></div>${rows}</div>`;
  }).join("") || `<div class="pempty">\u05d0\u05d9\u05df \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d1\u05e1\u05d8\u05d8\u05d5\u05e1 \u05d6\u05d4</div>`;
  const t = el("modalTitle");
  t.innerHTML = `${meta.label} <span class="mt-total num">${nf.format(total)}</span>`;
  t.style.setProperty("--mc", meta.color);
  el("modalBody").innerHTML = body;
  const m = el("modal"); m.classList.add("show"); m.setAttribute("aria-hidden","false");
}
function closePopup(){ const m=el("modal"); m.classList.remove("show"); m.setAttribute("aria-hidden","true"); }


function compute(d){
  const t = { invoices:0, inProcess:0, open:0, deliveries:0, target:0 };
  d.reps.forEach(r=>{ t.invoices+=r.invoices; t.inProcess+=r.inProcess; t.open+=r.open; t.deliveries+=r.deliveries; t.target+=r.target; });
  const elapsed = d.workDaysInMonth>0 ? (d.workDaysInMonth-d.workDaysLeft)/d.workDaysInMonth : 0;
  const ach = t.target>0 ? t.invoices/t.target : 0;
  const remaining = Math.max(t.target - t.invoices, 0);
  const perDay = d.workDaysLeft>0 ? remaining/d.workDaysLeft : 0;
  const potential = t.target>0 ? (t.invoices+t.inProcess+t.open)/t.target : 0;
  return { t, elapsed, ach, remaining, perDay, potential };
}

let countTimers=[];
function countUp(node, to, fmt){
  countTimers.forEach(clearInterval); 
  if(reduce){ node.textContent=fmt(to); return; }
  const dur=750, t0=performance.now();
  function step(now){ const p=Math.min((now-t0)/dur,1); const e=1-Math.pow(1-p,3);
    node.textContent=fmt(to*e); if(p<1) requestAnimationFrame(step); }
  requestAnimationFrame(step);
}

function render(d){
  CURRENT = d;
  const c = compute(d);
  el("subtitle").textContent = "\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05db\u05d9\u05e8\u05d5\u05ea \u05d7\u05d5\u05d3\u05e9\u05d9 \u2014 " + d.month;

  /* hero */
  const behind = c.ach < c.elapsed;
  const verdict = el("verdict");
  verdict.textContent = behind ? "\u05de\u05d0\u05d7\u05d5\u05e8\u05d9 \u05d4\u05e7\u05e6\u05d1" : "\u05d1\u05e7\u05e6\u05d1 / \u05dc\u05e4\u05e0\u05d9 \u05d4\u05e7\u05e6\u05d1";
  verdict.className = "verdict " + (behind ? "behind":"ahead");
  countUp(el("achPct"), c.ach, v=>pf(v));
  countUp(el("achAbs"), c.t.invoices, v=>nf.format(Math.round(v)));
  el("achTgt").textContent = nf.format(c.t.target);
  el("trackEnd").textContent = nf.format(c.t.target);
  const fill = el("paceFill");
  fill.className = "fill" + (behind?" behind":"");
  el("timeNote").textContent = pf(c.elapsed) + " \u05de\u05d4\u05d7\u05d5\u05d3\u05e9 \u05d7\u05dc\u05e3";
  el("hsDays").textContent = nf.format(d.workDaysLeft);
  countUp(el("hsRate"), c.perDay, v=>v.toFixed(1));
  el("hsLeft").textContent = nf.format(c.remaining);
  el("hsPot").textContent = pf(c.potential);
  requestAnimationFrame(()=>{ setTimeout(()=>{
    fill.style.width = Math.min(c.ach,1)*100 + "%";
    el("timeMark").style.right = Math.min(c.elapsed,1)*100 + "%";
  }, reduce?0:60); });

  /* kpis */
  const kpis = [
    {l:"\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05d5\u05ea (\u05d1\u05d9\u05e6\u05d5\u05e2)", v:c.t.invoices, s:"\u05dc\u05d7\u05e5 \u05dc\u05e4\u05d9\u05e8\u05d5\u05d8 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", color:"var(--teal)", st:"invoices"},
    {l:"\u05d1\u05ea\u05d4\u05dc\u05d9\u05da (\u05e8\u05d9\u05e9\u05d5\u05d9)", v:c.t.inProcess, s:"\u05dc\u05d7\u05e5 \u05dc\u05e4\u05d9\u05e8\u05d5\u05d8 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", color:"var(--violet)", st:"inProcess"},
    {l:"\u05ea\u05d9\u05e7 \u05e4\u05ea\u05d5\u05d7", v:c.t.open, s:"\u05dc\u05d7\u05e5 \u05dc\u05e4\u05d9\u05e8\u05d5\u05d8 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", color:"var(--amber)", st:"open"},
    {l:"\u05d9\u05e2\u05d3 \u05db\u05d5\u05dc\u05dc", v:c.t.target, s:"\u05d9\u05e2\u05d3 \u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05d5\u05ea \u05dc\u05d7\u05d5\u05d3\u05e9", color:"var(--muted)", st:""}
  ];
  el("kpis").innerHTML = kpis.map(k=>`<div class="kpi${k.st?' clickable':''}" style="--accent:${k.color}"${k.st?` data-status="${k.st}" role="button" tabindex="0"`:''}>
    ${k.st?'<span class="kpi-go" aria-hidden="true">\u2315</span>':''}<div class="v num" data-to="${k.v}">0</div><div class="l">${k.l}</div><div class="s">${k.s}</div></div>`).join("");
  el("kpis").querySelectorAll(".v").forEach(n=>countUp(n, +n.dataset.to, v=>nf.format(Math.round(v))));
  el("kpis").querySelectorAll("[data-status]").forEach(card=>{
    const open=()=>openPopup(card.dataset.status);
    card.onclick=open;
    card.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } };
  });

  /* reps bars (scale to max target) */
  const maxScale = Math.max(...d.reps.map(r=>Math.max(r.target, r.invoices+r.inProcess+r.open)), 1);
  el("reps").innerHTML = d.reps.map(r=>{
    const backlog = r.inProcess + r.open;               // \u05e6\u05d1\u05e8 \u05d0\u05de\u05d9\u05ea\u05d9: \u05d1\u05ea\u05d4\u05dc\u05d9\u05da + \u05ea\u05d9\u05e7 \u05e4\u05ea\u05d5\u05d7 \u05d1\u05dc\u05d1\u05d3
    const pipe = r.invoices + backlog;                  // \u05e7\u05e6\u05d4 \u05d4\u05e4\u05e1 \u05d4\u05de\u05e4\u05d5\u05e1\u05e4\u05e1 (\u05d2\u05d9\u05d0\u05d5\u05de\u05d8\u05e8\u05d9\u05d4 \u05d1\u05dc\u05d1\u05d3)
    const aPct = r.target>0 ? r.invoices/r.target : 0;
    return `<div class="repbar">
      <div class="row"><span class="name">${r.name}</span>
        <span class="vals"><b>${nf.format(r.invoices)}</b> / ${nf.format(r.target)} \u00b7 ${pf(aPct)} \u00b7 \u05e6\u05d1\u05e8 <b>${nf.format(backlog)}</b></span></div>
      <div class="bartrack">
        <div class="barpipe" data-w="${pipe/maxScale*100}"></div>
        <div class="barfill" data-w="${r.invoices/maxScale*100}"></div>
      </div></div>`;
  }).join("");
  requestAnimationFrame(()=>setTimeout(()=>{
    el("reps").querySelectorAll(".barpipe,.barfill").forEach(b=>b.style.width=b.dataset.w+"%");
  }, reduce?0:80));

  /* donut: invoices / inProcess / open */
  const parts = [
    {n:"\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05d5\u05ea", v:c.t.invoices, col:"var(--teal)"},
    {n:"\u05d1\u05ea\u05d4\u05dc\u05d9\u05da", v:c.t.inProcess, col:"var(--violet)"},
    {n:"\u05ea\u05d9\u05e7 \u05e4\u05ea\u05d5\u05d7", v:c.t.open, col:"var(--amber)"}
  ];
  const sum = parts.reduce((a,p)=>a+p.v,0) || 1;
  let off=0; const R=15.9155;
  el("donut").innerHTML =
    `<circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--bg2)" stroke-width="6"></circle>` +
    parts.map(p=>{ const len=p.v/sum*100; const seg=`<circle cx="21" cy="21" r="${R}" fill="none" stroke="${p.col}" stroke-width="6"
       stroke-dasharray="${reduce?len:0} 100" stroke-dashoffset="${-off}" style="transition:stroke-dasharray .9s cubic-bezier(.2,.7,.2,1)" data-len="${len}"></circle>`;
       off+=len; return seg; }).join("");
  el("dPipe").textContent = nf.format(sum);
  if(!reduce) requestAnimationFrame(()=>setTimeout(()=>{
    el("donut").querySelectorAll("circle[data-len]").forEach(ci=>ci.setAttribute("stroke-dasharray", ci.dataset.len+" 100"));
  },120));
  el("dlegend").innerHTML = parts.map(p=>`<div class="it"><i style="background:${p.col}"></i>
     <span class="n">${p.n}</span><span class="x num">${nf.format(p.v)}</span></div>`).join("");

  /* quality */
  el("quality").innerHTML = d.quality.map(q=>{
    const dots = Array.from({length:q.target},(_,i)=>`<span class="d ${i<q.done?'on':''}"></span>`).join("");
    const over = q.done>q.target;
    const meta = q.done===0 ? "\u05d8\u05e8\u05dd \u05e0\u05d5\u05e1\u05e4\u05d5 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d3\u05e9\u05d9\u05dd"
               : over ? `${nf.format(q.done)} \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d3\u05e9\u05d9\u05dd \u00b7 \u05de\u05e2\u05dc \u05d4\u05d9\u05e2\u05d3 \u1f389`
               : q.done>=q.target ? `${nf.format(q.done)} \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d3\u05e9\u05d9\u05dd \u00b7 \u05d9\u05e2\u05d3 \u05d4\u05d5\u05e9\u05dc\u05dd \u2713`
               : `${nf.format(q.done)} \u05de\u05ea\u05d5\u05da ${nf.format(q.target)} \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d7\u05d3\u05e9\u05d9\u05dd`;
    return `<div class="qcard clickable" data-newcust="1" role="button" tabindex="0"><div class="qn"><span>${q.name}</span><span class="frac num${over?' over':''}">${nf.format(q.done)}/${nf.format(q.target)}</span></div>
      <div class="dots">${dots}</div>
      <div class="qmeta">${meta}</div></div>`;
  }).join("");
  el("quality").querySelectorAll("[data-newcust]").forEach(card=>{
    const open=()=>openPopup("newCustomers");
    card.onclick=open;
    card.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } };
  });
  el("focus").innerHTML = d.focusModels.map(m=>`<span class="chip">${m}</span>`).join("");

  /* incentive \u2014 \u05d3\u05d9\u05e0\u05de\u05d9: \u05de\u05d5\u05e6\u05d2 \u05e8\u05e7 \u05d0\u05dd \u05d9\u05e9 \u05ea\u05d5\u05db\u05df \u05d4\u05d7\u05d5\u05d3\u05e9, \u05d0\u05d7\u05e8\u05ea \u05e0\u05e2\u05dc\u05dd */
  const incData = d.incentive || [];
  const incSection = el("incentiveSection");
  if(!incData.length){
    if(incSection) incSection.style.display = "none";
  } else {
    if(incSection) incSection.style.display = "";
    const it = el("inctitleTxt"); if(it) it.textContent = "\u05d0\u05d9\u05e0\u05e1\u05e0\u05d8\u05d9\u05d1 " + ((d.month||"").split(" ")[0]);
    el("incentive").innerHTML = incData.map(r=>{
      const pct = r.potentialPct!=null ? r.potentialPct : (r.target>0?r.actual/r.target:0);
      const col = pct>=1?"var(--teal)":pct>=.6?"var(--gold)":"var(--amber)";
      return `<div class="incrow"><div><div class="nm">${r.name}</div>
        <div class="det">\u05d1\u05d9\u05e6\u05d5\u05e2 <b style="color:var(--text)">${nf.format(r.actual)}</b> \u00b7 \u05d9\u05e2\u05d3 ${nf.format(r.target)}</div></div>
        <div class="pc" style="color:${col}">${pf(pct)}</div></div>`;
    }).join("");
    el("incnote").textContent = d.incentiveNote || "";
  }

  /* footer */
  el("foot").innerHTML = `\u05de\u05e7\u05d5\u05e8 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd: \u05d2\u05d9\u05dc\u05d9\u05d5\u05df <code>\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05ea-\u05e4\u05ea\u05d5\u05d7-\u05d1\u05ea\u05d4\u05dc\u05d9\u05da</code> \u00b7 \u05d7\u05d9\u05e9\u05d5\u05d1 \u05dc\u05e4\u05d9 \u05e9\u05dd \u05e0\u05e6\u05d9\u05d2 \u05d5\u05db\u05d5\u05ea\u05e8\u05d5\u05ea (\u05e2\u05de\u05d9\u05d3 \u05dc\u05d4\u05d6\u05d6\u05ea \u05e9\u05d5\u05e8\u05d5\u05ea/\u05e2\u05de\u05d5\u05d3\u05d5\u05ea)<br>${window.__lastUpdate||("\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05de\u05d5\u05d8\u05de\u05e2\u05d9\u05dd \u2014 \u05e0\u05db\u05d5\u05df \u05dc"+d.month)}<br><span style="color:#3f4a60">\u05de\u05d4\u05d3\u05d5\u05e8\u05d4 ${BUILD}</span>`;
}

/* ===== refresh from an uploaded / co-hosted .xlsx ===== */
const LABEL="\u05dc\u05e7\u05d5\u05d7 / \u05de\u05e9\u05e4\u05d7\u05ea \u05d3\u05d2\u05dd", TOTAL='\u05e1\u05d4"\u05db';
const txt = v => (v==null?"":String(v)).trim();
const n = v => { const x=Number(v); return isFinite(x)?x:0; };

function aggregateSales(rows){
  // Header-driven & range-origin-robust: locate columns by their header TEXT within each
  // header row (the row that contains "\u05dc\u05e7\u05d5\u05d7 / \u05de\u05e9\u05e4\u05d7\u05ea \u05d3\u05d2\u05dd"), not by fixed column numbers.
  const findAll = (arr,val) => { const o=[]; (arr||[]).forEach((c,i)=>{ if(txt(c)===val) o.push(i); }); return o; };
  const findIdx = (arr,pred) => { for(let i=0;i<(arr||[]).length;i++){ if(pred(txt(arr[i]))) return i; } return -1; };
  const headerRows = [];
  rows.forEach((row,i)=>{ if(row && row.some(c=>txt(c)===LABEL)) headerRows.push(i); });
  const reps=[];
  headerRows.forEach((hr,k)=>{
    const row = rows[hr];
    const cust = findAll(row, LABEL);
    const leftCust  = cust[0];
    const rightCust = cust.length>1 ? cust[1] : cust[0];
    const inProcIdx = findIdx(row, t=>t.indexOf("\u05d1\u05ea\u05d4\u05dc\u05d9\u05da")>=0);
    const openIdx   = findIdx(row, t=>t.indexOf("\u05ea\u05d9\u05e7 \u05e4\u05ea\u05d5\u05d7")>=0);
    const invIdx    = findIdx(row, t=>t.indexOf("\u05d7\u05e9\u05d1\u05d5\u05e0")>=0);
    const delIdx    = findIdx(row, t=>t.indexOf("\u05de\u05e1\u05d9\u05e8")>=0);
    let newIdx      = findIdx(row, t=>t==="\u05d7\u05d3\u05e9" || t.indexOf("\u05d7\u05d3\u05e9")>=0);
    if(newIdx<0) newIdx = 12; // \u05e2\u05de\u05d5\u05d3\u05d4 M \u2014 \u05e1\u05d9\u05de\u05d5\u05df "\u05db\u05df" \u05dc\u05dc\u05e7\u05d5\u05d7 \u05d7\u05d3\u05e9
    // salesperson name sits in the row above the header (merged anchor), same column as leftCust
    let name="";
    for(let u=hr-1; u>=Math.max(0,hr-3) && !name; u--){ const c=txt(rows[u]?.[leftCust]); if(c && c!==LABEL && c!==TOTAL) name=c; }
    if(!name) name = "\u05e0\u05e6\u05d9\u05d2 "+(k+1);
    const end = k+1<headerRows.length ? headerRows[k+1]-1 : rows.length;
    const det={invoices:[],inProcess:[],open:[],deliveries:[],newCustomers:[]};
    const add=(arr,cellVal,name)=>{ const v=n(cellVal); if(v) arr.push({c:name,v}); };
    for(let r=hr+1;r<end;r++){
      const cL=txt(rows[r]?.[leftCust]), cR=txt(rows[r]?.[rightCust]);
      if(cL && cL!==LABEL && cL!==TOTAL){ add(det.inProcess, rows[r][inProcIdx], cL); add(det.open, rows[r][openIdx], cL); }
      if(cR && cR!==LABEL && cR!==TOTAL){ add(det.invoices, rows[r][invIdx], cR); add(det.deliveries, rows[r][delIdx], cR); }
      if(newIdx>=0){ const mv=txt(rows[r]?.[newIdx]);
        if(mv==="\u05db\u05df"){
          const nm=(cR && cR!==LABEL && cR!==TOTAL)?cR:((cL && cL!==LABEL && cL!==TOTAL)?cL:"\u05dc\u05e7\u05d5\u05d7 \u05d7\u05d3\u05e9");
          det.newCustomers.push({c:nm, v:1});
        }
      }
    }
    const sum=a=>a.reduce((s,x)=>s+x.v,0);
    reps.push({name, invoices:sum(det.invoices), inProcess:sum(det.inProcess), open:sum(det.open), deliveries:sum(det.deliveries), target:0, detail:det});
  });
  return reps;
}

function readTargetsAndQuality(rows, reps){
  const norm=s=>s.replace(/\s+/g,"");
  const hdr=[];
  rows.forEach((row,i)=>{ if(row && row.some(c=>txt(c)==="\u05d1\u05d9\u05e6\u05d5\u05e2 \u05d1\u05e4\u05d5\u05e2\u05dc")) hdr.push(i); });
  const collect = hi => {
    const map={}; if(hi==null) return map;
    let actualIdx=-1; (rows[hi]||[]).forEach((c,j)=>{ if(txt(c)==="\u05d1\u05d9\u05e6\u05d5\u05e2 \u05d1\u05e4\u05d5\u05e2\u05dc") actualIdx=j; });
    if(actualIdx<2) return map;
    const nameIdx=actualIdx-2, targetIdx=actualIdx-1;   // layout: name | target | actual
    for(let i=hi+1;i<rows.length;i++){
      const nm=txt(rows[i]?.[nameIdx]); if(!nm) break;
      map[nm]={ target:n(rows[i][targetIdx]), actual:n(rows[i][actualIdx]) };
    }
    return map;
  };
  const sales=collect(hdr[0]), qual=collect(hdr[1]);
  const find=(map,name)=>{ for(const k in map){ if(norm(k)===norm(name)) return map[k]; } return null; };
  reps.forEach(r=>{ const s=find(sales,r.name); if(s) r.target=s.target; });
  return reps.map(r=>{ const q=find(qual,r.name); return {name:r.name, target:q?q.target:4, done:q?q.actual:0}; });
}

/* ====================== DATA LAYER ======================
   \u05de\u05e7\u05d5\u05e8 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d4\u05e7\u05d1\u05d5\u05e2: Google Sheets \u05d3\u05e8\u05da Apps Script (JSONP).
   \u05d8\u05e2\u05d9\u05e0\u05ea Excel \u05de\u05e7\u05d5\u05de\u05d9\u05ea = \u05d0\u05d5\u05e4\u05e6\u05d9\u05d5\u05e0\u05dc\u05d9\u05ea \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4 \u05d1\u05dc\u05d1\u05d3 (\u05d6\u05de\u05e0\u05d9 \u05e2\u05d3 \u05e8\u05e2\u05e0\u05d5\u05df \u05d4\u05d3\u05e3). */

/* >>> \u05d4\u05d2\u05d3\u05e8 \u05db\u05d0\u05df \u05d0\u05ea \u05db\u05ea\u05d5\u05d1\u05ea \u05d4-Web App \u05e9\u05dc \u05d4-Apps Script \u05e9\u05dc\u05da <<< */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQMzHfAVBU1xA4v6Nodp034WGwwi8BShgB4lzdyOxnodAgqHqmUP2x7h-zXU1w9APleQ/exec";

const HEB_MONTHS=["\u05d9\u05e0\u05d5\u05d0\u05e8","\u05e4\u05d1\u05e8\u05d5\u05d0\u05e8","\u05de\u05e8\u05e5","\u05d0\u05e4\u05e8\u05d9\u05dc","\u05de\u05d0\u05d9","\u05d9\u05d5\u05e0\u05d9","\u05d9\u05d5\u05dc\u05d9","\u05d0\u05d5\u05d2\u05d5\u05e1\u05d8","\u05e1\u05e4\u05d8\u05de\u05d1\u05e8","\u05d0\u05d5\u05e7\u05d8\u05d5\u05d1\u05e8","\u05e0\u05d5\u05d1\u05de\u05d1\u05e8","\u05d3\u05e6\u05de\u05d1\u05e8"];
function monthLabel(){ const d=new Date(); return HEB_MONTHS[d.getMonth()]+" "+d.getFullYear(); }

function jsonp(url, params){
  /* \u05de\u05d5\u05d2\u05e9 \u05de\u05ea\u05d5\u05da Apps Script \u2014 \u05ea\u05e7\u05e9\u05d5\u05e8\u05ea \u05d1\u05e2\u05e8\u05d5\u05e5 \u05d4\u05de\u05d0\u05d5\u05d1\u05d8\u05d7 \u05e9\u05dc \u05d2\u05d5\u05d2\u05dc (google.script.run) */
  return new Promise((resolve,reject)=>{
    if (typeof google==="undefined" || !google.script || !google.script.run){
      reject(new Error("\u05d4\u05d3\u05e3 \u05d7\u05d9\u05d9\u05d1 \u05dc\u05d4\u05d9\u05e4\u05ea\u05d7 \u05d3\u05e8\u05da \u05db\u05ea\u05d5\u05d1\u05ea \u05d4-Apps Script (\u05dc\u05d0 \u05db\u05e7\u05d5\u05d1\u05e5 \u05de\u05e7\u05d5\u05de\u05d9)")); return;
    }
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(err=>reject(new Error((err && err.message) || "\u05e9\u05d2\u05d9\u05d0\u05ea \u05e9\u05e8\u05ea")))
      .api((params && params.action) || "sales");
  });
}

/* \u05d1\u05d5\u05e0\u05d4 \u05d0\u05ea \u05d0\u05d5\u05d1\u05d9\u05d9\u05e7\u05d8 \u05d4\u05d3\u05d0\u05e9\u05d1\u05d5\u05e8\u05d3 \u05de\u05ea\u05d5\u05da \u05e1\u05e4\u05e7-\u05e9\u05d5\u05e8\u05d5\u05ea. \u05d0\u05d5\u05ea\u05d5 \u05e4\u05e8\u05e1\u05e8 \u05d1\u05d3\u05d9\u05d5\u05e7 \u05dc\u05d0\u05e7\u05e1\u05dc \u05de\u05e7\u05d5\u05de\u05d9 \u05d5\u05d2\u05dd \u05dc-Apps Script. */
function buildData(getRows){
  const rows = getRows("\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05ea-\u05e4\u05ea\u05d5\u05d7-\u05d1\u05ea\u05d4\u05dc\u05d9\u05da");
  if(!rows || !rows.length) throw new Error("\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05de\u05db\u05d9\u05e8\u05d5\u05ea (\u05d2\u05d9\u05dc\u05d9\u05d5\u05df '\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05ea-\u05e4\u05ea\u05d5\u05d7-\u05d1\u05ea\u05d4\u05dc\u05d9\u05da')");
  const reps = aggregateSales(rows);
  if(!reps.length){
    const sample = rows.map(r=>txt(r && r[2])).filter(Boolean).slice(0,8).join(" \u00b7 ");
    throw new Error("\u05dc\u05d0 \u05d6\u05d5\u05d4\u05d5 \u05d1\u05dc\u05d5\u05e7\u05d9\u05dd \u05e9\u05dc \u05e0\u05e6\u05d9\u05d2\u05d9\u05dd [\u05de\u05d4\u05d3\u05d5\u05e8\u05d4 "+BUILD+"]. \u05d3\u05d2\u05d9\u05de\u05d4: "+(sample||"(\u05e8\u05d9\u05e7)"));
  }
  const norm=s=>s.replace(/\s+/g,"");
  let quality=[], focus=[], incentive=[], wdMonth=0, wdLeft=0;
  const trows = getRows("\u05d9\u05e2\u05d3\u05d9\u05dd");
  if(trows){
    quality = readTargetsAndQuality(trows, reps);
    // "\u05de\u05e9\u05d9\u05de\u05d5\u05ea \u05d0\u05d9\u05db\u05d5\u05ea" \u05de\u05e6\u05d9\u05d2 \u05d0\u05ea \u05de\u05e1\u05e4\u05e8 \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d4\u05d7\u05d3\u05e9\u05d9\u05dd (\u05e1\u05d9\u05de\u05d5\u05df "\u05db\u05df" \u05d1\u05e2\u05de\u05d5\u05d3\u05d4 M), \u05d9\u05e2\u05d3 4, \u05e2\u05dd \u05d1\u05d9\u05e6\u05d5\u05e2 \u05d9\u05ea\u05e8
    const ncount = r => (r.detail && r.detail.newCustomers) ? r.detail.newCustomers.length : 0;
    if(!quality.length) quality = reps.map(r=>({name:r.name, target:4, done:0}));
    quality.forEach(q=>{ const rep=reps.find(r=>r.name===q.name); if(rep) q.done = ncount(rep); if(!q.target) q.target=4; });
    let fRow=-1,fCol=-1;
    trows.forEach((row,i)=>{ if(fRow<0&&row) row.forEach((c,j)=>{ if(txt(c)==="\u05d3\u05d2\u05de\u05d9\u05dd \u05d1\u05de\u05d9\u05e7\u05d5\u05d3"){fRow=i;fCol=j;} }); });
    if(fRow>=0){ const fm=[]; for(let i=fRow+1;i<trows.length;i++){ const v=txt(trows[i] && trows[i][fCol]); if(v&&v!=="\u05e7\u05d5\u05e0\u05d4") fm.push(v); else if(!v&&fm.length) break; } focus=fm; }
    let hRow=-1; trows.forEach((row,i)=>{ if(hRow<0&&row&&row.some(c=>txt(c)==="\u05d1\u05d9\u05e6\u05d5\u05e2 \u05d1\u05e4\u05d5\u05e2\u05dc")) hRow=i; });
    if(hRow>=0){ const hr=trows[hRow]||[]; let li=-1,mi=-1;
      hr.forEach((c,j)=>{ const t=txt(c); if(t.indexOf("\u05e9\u05e0\u05d5\u05ea\u05e8\u05d5")>=0) li=j; if(t.indexOf("\u05d9\u05de\u05d9\u05dd \u05d7\u05d5\u05d3\u05e9\u05d9")>=0) mi=j; });
      const dr=trows[hRow+1]||[]; if(li>=0) wdLeft=n(dr[li]); if(mi>=0) wdMonth=n(dr[mi]);
    }
  }
  const irows = getRows("\u05d0\u05d9\u05e0\u05e1\u05e0\u05d8\u05d9\u05d1 \u05d9\u05d5\u05e0\u05d9");
  if(irows){ irows.forEach(r=>{ const nm=txt(r && r[0]); const tg=n(r && r[1]); if(nm&&tg&&nm!=='\u05de\u05ea"\u05dc') incentive.push({name:nm,target:tg,actual:n(r[2]),potentialPct:n(r[5])}); }); }
  return { month:monthLabel(), workDaysInMonth:wdMonth, workDaysLeft:wdLeft, reps, quality, focusModels:focus, incentive,
           incentiveNote:"\u05e2\u05de\u05d9\u05d3\u05d4 \u05d1\u05d9\u05e2\u05d3 \u201c\u05e9\u05de\u05d9\u05d9\u05dd\u201d \u05de\u05d6\u05db\u05d4 \u05d1-3,000 \u20aa \u05e9\u05d5\u05d1\u05e8\u05d9 \u05d4\u05d9\u05d9\u05d8\u05e7\u05d6\u05d5\u05df" };
}

/* \u05e1\u05e4\u05e7-\u05e9\u05d5\u05e8\u05d5\u05ea \u05de\u05ea\u05d5\u05da \u05e7\u05d5\u05d1\u05e5 \u05d0\u05e7\u05e1\u05dc \u05de\u05e7\u05d5\u05de\u05d9 (SheetJS) */
async function rowsFromWorkbook(arrayBuffer){
  await ensureXLSX();
  const wb = XLSX.read(arrayBuffer,{type:"array"});
  return (name)=>{ const sh=wb.Sheets[name]; return sh ? XLSX.utils.sheet_to_json(sh,{header:1,raw:true,defval:null}) : null; };
}

let xlsxLoading=null;
function ensureXLSX(){
  if(window.XLSX) return Promise.resolve();
  if(xlsxLoading) return xlsxLoading;
  xlsxLoading=new Promise((res,rej)=>{ const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=res; s.onerror=()=>rej(new Error("\u05d8\u05e2\u05d9\u05e0\u05ea \u05de\u05e0\u05d5\u05e2 \u05d4\u05d0\u05e7\u05e1\u05dc \u05e0\u05db\u05e9\u05dc\u05d4 (\u05e0\u05d3\u05e8\u05e9 \u05d0\u05d9\u05e0\u05d8\u05e8\u05e0\u05d8)")); document.head.appendChild(s); });
  return xlsxLoading;
}

function showNotice(html, kind){ const nEl=el("notice"); nEl.innerHTML=html; nEl.className="notice show"+(kind?(" "+kind):""); }
function hideNotice(){ el("notice").className="notice"; }
function setSource(kind){
  const p=el("srcPill"), l=el("srcLabel");
  if(kind==="live"){ p.className="pill"; l.textContent="\u05de\u05d7\u05d5\u05d1\u05e8 \u05dc-Google Sheets \u00b7 "+new Date().toLocaleTimeString("he-IL"); }
  else if(kind==="local"){ p.className="pill embedded"; l.textContent="\u05e7\u05d5\u05d1\u05e5 \u05de\u05e7\u05d5\u05de\u05d9 (\u05d6\u05de\u05e0\u05d9)"; }
  else if(kind==="loading"){ p.className="pill embedded"; l.textContent="\u05d8\u05d5\u05e2\u05df \u05de-Google Sheets\u2026"; }
  else { p.className="pill embedded"; l.textContent="\u05e9\u05d2\u05d9\u05d0\u05ea \u05d7\u05d9\u05d1\u05d5\u05e8"; }
}

/* ====== PRIMARY source: Apps Script (Google Sheets). \u05e0\u05d8\u05e2\u05df \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea \u05d1\u05db\u05dc \u05e8\u05e2\u05e0\u05d5\u05df. ====== */
async function loadData(){
  hideNotice(); setSource("loading");
  try{
    const resp = await jsonp(APPS_SCRIPT_URL, {action:"sales"});
    if(resp && resp.ok===false) throw new Error(resp.error||"\u05e9\u05d2\u05d9\u05d0\u05d4 \u05de\u05d4\u05e9\u05e8\u05ea");
    const sheets = resp && (resp.sheets || resp.data);
    if(!sheets) throw new Error("\u05de\u05d1\u05e0\u05d4 \u05ea\u05d2\u05d5\u05d1\u05d4 \u05dc\u05d0 \u05e6\u05e4\u05d5\u05d9 \u05de-Apps Script");
    const data = buildData(name => sheets[name] || null);
    render(data); setSource("live");
  }catch(err){
    setSource("error");
    showNotice('<div><b>\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\u05e2\u05d5\u05df \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05de-Google Sheets.</b> '+err.message+'. \u05d1\u05d3\u05d5\u05e7 \u05d0\u05ea \u05db\u05ea\u05d5\u05d1\u05ea \u05d4-Apps Script \u05d5\u05d0\u05ea \u05d4\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea.</div>',"err");
  }
}

/* ====== OPTIONAL: local Excel \u2014 \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4 \u05d1\u05dc\u05d1\u05d3, \u05d6\u05de\u05e0\u05d9 \u05e2\u05d3 \u05e8\u05e2\u05e0\u05d5\u05df ====== */
async function loadFromBuffer(buf){
  try{
    const data = buildData(await rowsFromWorkbook(buf));
    render(data); setSource("local");
    const c=compute(data);
    showNotice('<div><b>\u05e7\u05d5\u05d1\u05e5 Excel \u05e9\u05e0\u05d8\u05e2\u05df \u05d9\u05d3\u05e0\u05d9\u05ea \u05e0\u05e9\u05de\u05e8 \u05e8\u05e7 \u05e2\u05d3 \u05e8\u05e2\u05e0\u05d5\u05df \u05d4\u05d3\u05e3. \u05dc\u05e2\u05d3\u05db\u05d5\u05df \u05e7\u05d1\u05d5\u05e2 \u05d9\u05e9 \u05dc\u05e2\u05d3\u05db\u05df \u05d0\u05ea Google Sheet.</b><br>\u05e0\u05d8\u05e2\u05df \u05d6\u05de\u05e0\u05d9\u05ea: '
      +data.reps.length+' \u05e0\u05e6\u05d9\u05d2\u05d9\u05dd \u00b7 \u05d9\u05e2\u05d3 \u05db\u05d5\u05dc\u05dc '+nf.format(c.t.target)+' \u00b7 \u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05d5\u05ea '+nf.format(c.t.invoices)+'.</div>',"ok");
  }catch(err){
    showNotice('<div><b>\u05dc\u05d0 \u05d4\u05e6\u05dc\u05d7\u05ea\u05d9 \u05dc\u05e7\u05e8\u05d5\u05d0 \u05d0\u05ea \u05d4\u05e7\u05d5\u05d1\u05e5.</b> '+err.message+'.</div>',"err");
  }
}

/* wire controls */
el("loadBtn").onclick=()=>el("fileInput").click();
el("fileInput").onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>loadFromBuffer(rd.result); rd.readAsArrayBuffer(f); };
el("refreshBtn").onclick=()=>loadData();
el("modalClose").onclick=closePopup;
el("modalBackdrop").onclick=closePopup;
addEventListener("keydown",e=>{ if(e.key==="Escape") closePopup(); });
addEventListener("dragover",e=>{e.preventDefault();});
addEventListener("drop",e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ const rd=new FileReader(); rd.onload=()=>loadFromBuffer(rd.result); rd.readAsArrayBuffer(f);} });

/* ====== TABS ====== */
function showScreen(which){
  ["sales","stock","brands","terms"].forEach(function(s){ var elm=document.getElementById("screen-"+s); if(elm) elm.hidden=(s!==which); });
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.screen===which));
  if(which==="stock") StockOrders.show();
  if(which==="brands") BrandSplit.show();
  if(which==="terms") Terms.show();
}
/* ensure the "terms" tab + screen exist even if the HTML shell is an older version */
(function ensureTermsUI(){
  try{
    var tabs=document.querySelector(".tabs");
    if(tabs && !document.querySelector('.tab[data-screen="terms"]')){
      var b=document.createElement("button"); b.className="tab"; b.setAttribute("data-screen","terms");
      b.textContent="\u05ea\u05e0\u05d0\u05d9\u05dd \u05de\u05e1\u05d7\u05e8\u05d9\u05d9\u05dd"; tabs.appendChild(b);
    }
    if(!document.getElementById("screen-terms")){
      var wrap=document.querySelector(".wrap")||document.body;
      var s=document.createElement("div"); s.id="screen-terms"; s.hidden=true;
      s.innerHTML='<div class="so-head"><div><h2>\u05ea\u05e0\u05d0\u05d9\u05dd \u05de\u05e1\u05d7\u05e8\u05d9\u05d9\u05dd</h2>'
        +'<p>\u05de\u05d7\u05d9\u05e8\u05d5\u05df \u05d5\u05d4\u05e0\u05d7\u05d5\u05ea \u05d4\u05d7\u05d5\u05d3\u05e9 \u2014 \u05dc\u05d7\u05e5 \u05e2\u05dc \u05e8\u05db\u05d1 \u05db\u05d3\u05d9 \u05dc\u05d7\u05e9\u05d1 \u05de\u05d7\u05d9\u05e8 \u05e2\u05dd \u05d0\u05d7\u05d5\u05d6 \u05d4\u05e0\u05d7\u05d4 \u05de\u05e9\u05dc\u05da</p></div>'
        +'<input id="terms-q" class="so-input" type="search" placeholder="\u05d7\u05d9\u05e4\u05d5\u05e9 \u05d3\u05d2\u05dd / \u05d2\u05d9\u05de\u05d5\u05e8"></div>'
        +'<div id="terms-error" class="notice" style="margin:0 0 14px"></div>'
        +'<div id="terms-count" class="so-count"></div>'
        +'<div class="so-tablewrap"><table class="so-table" id="terms-table"><thead><tr id="terms-thead"></tr></thead><tbody id="terms-tbody"></tbody></table></div>';
      var stock=document.getElementById("screen-stock")||document.getElementById("screen-brands");
      if(stock && stock.parentNode) stock.parentNode.insertBefore(s, stock.nextSibling); else wrap.appendChild(s);
    }
  }catch(e){}
})();

document.querySelectorAll(".tab").forEach(t=>{ t.onclick=()=>showScreen(t.dataset.screen); });

/* ====== STOCK ORDERS screen (data from Apps Script action=stockOrders) ====== */
var StockOrders=(function(){
  var raw=[], view=[], loaded=false, CAP=400;
  var sel={rep:new Set(),model:new Set(),loc:new Set()};   // selected values per filter
  var MSITEMS={rep:[],model:[],loc:[]};                    // all options per filter
  var FACC={rep:function(o){return tx(o.rep);},model:function(o){return tx(o.model);},loc:function(o){return tx(o.location);}};
  var COLS=[
    {k:'rep',t:'\u05de\u05ea"\u05dc'},{k:'customer',t:'\u05dc\u05e7\u05d5\u05d7'},{k:'order',t:'\u05de\u05e1\u05f3 \u05d4\u05d6\u05de\u05e0\u05d4'},{k:'model',t:'\u05d3\u05d2\u05dd'},
    {k:'trim',t:'\u05d2\u05d9\u05de\u05d5\u05e8'},{k:'color',t:'\u05e6\u05d1\u05e2'},{k:'vin',t:'\u05de\u05e1\u05f3 \u05e9\u05dc\u05d3\u05d4'},{k:'orderDate',t:'\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05d6\u05de\u05e0\u05d4'},
    {k:'__days',t:'\u05d9\u05de\u05d9\u05dd \u05de\u05d4\u05d4\u05d6\u05de\u05e0\u05d4'},{k:'location',t:'\u05de\u05d9\u05e7\u05d5\u05dd \u05e8\u05db\u05d1'},{k:'plate',t:'\u05dc\u05d5\u05d7\u05d9\u05ea'},{k:'__action',t:'\u05e4\u05e2\u05d5\u05dc\u05d4'}
  ];
  function g(id){ return document.getElementById(id); }
  function days(d){ if(!d) return 0; var t=new Date(d); if(isNaN(t.getTime())) return 0; return Math.max(0,Math.floor((Date.now()-t.getTime())/86400000)); }
  function urg(d){ return d>14?'crit':d>7?'red':d>=4?'orange':'green'; }
  function actOf(d){ return d>14?'\u05d3\u05d7\u05d5\u05e3 \u2014 \u05dc\u05e7\u05d3\u05dd \u05de\u05e1\u05d9\u05e8\u05d4':d>7?'\u05dc\u05d9\u05e6\u05d5\u05e8 \u05e7\u05e9\u05e8 / \u05dc\u05e2\u05e7\u05d5\u05d1':'\u05d1\u05de\u05e2\u05e7\u05d1'; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];}); }
  function tx(v){ return v==null?'':String(v).trim(); }
  function proc(list){ return (list||[]).map(function(o){ var c={}; for(var k in o) c[k]=o[k]; c.__days=days(o.orderDate); c.__urg=urg(c.__days); c.__action=actOf(c.__days); return c; }); }
  function uniq(a){ return a.filter(function(v,i){return v!==''&&a.indexOf(v)===i;}).sort(function(x,y){return x.localeCompare(y,'he');}); }
  function closeAllMS(){ var els=document.querySelectorAll('.so-ms.open'); for(var i=0;i<els.length;i++) els[i].classList.remove('open'); }
  function msLabel(field){
    var c=document.querySelector('.so-ms[data-field="'+field+'"]'); if(!c)return;
    var s=sel[field], all=c.getAttribute('data-all');
    var txtEl=c.querySelector('.so-ms-txt'), cntEl=c.querySelector('.cnt');
    if(!txtEl)return;
    var arr=[]; s.forEach(function(v){arr.push(v);});
    txtEl.textContent = s.size===0 ? all : (s.size===1 ? arr[0] : all);
    if(s.size>0){ cntEl.style.display=''; cntEl.textContent=s.size; } else { cntEl.style.display='none'; }
  }
  function buildMS(field, items){
    var c=document.querySelector('.so-ms[data-field="'+field+'"]'); if(!c)return;
    var all=c.getAttribute('data-all');
    c.innerHTML =
      '<button type="button" class="so-ms-btn"><span class="so-ms-txt">'+esc(all)+'</span>'+
        '<span style="display:flex;align-items:center;gap:6px"><span class="cnt" style="display:none"></span><span class="arr">\u25be</span></span></button>'+
      '<div class="so-ms-panel">'+
        '<input type="text" class="so-ms-search" placeholder="\u05d7\u05d9\u05e4\u05d5\u05e9\u2026">'+
        '<div class="so-ms-tools"><button type="button" data-act="all">\u05d1\u05d7\u05e8 \u05d4\u05db\u05dc</button><button type="button" data-act="none">\u05e0\u05e7\u05d4</button></div>'+
        '<div class="so-ms-list"></div></div>';
    var listEl=c.querySelector('.so-ms-list'), searchEl=c.querySelector('.so-ms-search');
    function renderList(f){
      f=(f||'').toLowerCase();
      var shown=items.filter(function(v){ return !f || v.toLowerCase().indexOf(f)>=0; });
      if(!shown.length){ listEl.innerHTML='<div class="so-ms-empty">\u05d0\u05d9\u05df \u05ea\u05d5\u05e6\u05d0\u05d5\u05ea</div>'; return; }
      listEl.innerHTML=shown.map(function(v){
        return '<label class="so-ms-opt"><input type="checkbox" value="'+esc(v)+'"'+(sel[field].has(v)?' checked':'')+'>'+esc(v)+'</label>';
      }).join('');
    }
    renderList('');
    c.querySelector('.so-ms-btn').addEventListener('click',function(e){ e.stopPropagation(); var wasOpen=c.classList.contains('open'); closeAllMS(); if(!wasOpen){ c.classList.add('open'); searchEl.focus(); } });
    c.querySelector('.so-ms-panel').addEventListener('click',function(e){ e.stopPropagation(); });
    searchEl.addEventListener('input',function(e){ renderList(e.target.value); });
    listEl.addEventListener('change',function(e){
      if(e.target&&e.target.type==='checkbox'){ var v=e.target.value;
        if(e.target.checked) sel[field].add(v); else sel[field].delete(v);
        msLabel(field); apply(); }
    });
    var tools=c.querySelectorAll('.so-ms-tools button');
    for(var i=0;i<tools.length;i++){ (function(b){
      b.addEventListener('click',function(e){ e.stopPropagation();
        if(b.getAttribute('data-act')==='all'){ items.forEach(function(v){sel[field].add(v);}); }
        else { sel[field].clear(); }
        renderList(searchEl.value); msLabel(field); apply();
      });
    })(tools[i]); }
    msLabel(field);
  }
  function soErr(m){ var e=g("so-error"); if(!m){ e.className="notice"; return; } e.innerHTML='<div><b>'+esc(m)+'</b></div>'; e.className="notice show err"; }

  function apply(){
    var q=tx(g("so-q").value).toLowerCase(), ds=g("so-days").value;
    view=raw.filter(function(o){
      if(sel.rep.size   && !sel.rep.has(tx(o.rep)))        return false;
      if(sel.model.size && !sel.model.has(tx(o.model)))    return false;
      if(sel.loc.size   && !sel.loc.has(tx(o.location)))   return false;
      if(ds){ var d=o.__days;
        if(ds==='0-3'&&!(d<=3))return false; if(ds==='4-7'&&!(d>=4&&d<=7))return false;
        if(ds==='7+'&&!(d>7))return false; if(ds==='14+'&&!(d>14))return false; }
      if(q){ var hay=(tx(o.customer)+' '+tx(o.order)+' '+tx(o.model)+' '+tx(o.vin)).toLowerCase(); if(hay.indexOf(q)<0) return false; }
      return true;
    });
    kpis(); table();
  }
  function kpis(){
    var total=view.length;
    var over7=view.filter(function(o){return o.__days>7;}).length;
    var over14=view.filter(function(o){return o.__days>14;}).length;
    var custs={}, models={}, reps={};
    view.forEach(function(o){ if(tx(o.customer))custs[tx(o.customer)]=1; if(tx(o.model))models[tx(o.model)]=1; var r=tx(o.rep)||'\u2014'; reps[r]=(reps[r]||0)+1; });
    var topRep='\u2014',topN=0; Object.keys(reps).forEach(function(r){ if(reps[r]>topN){topN=reps[r];topRep=r;} });
    var cards=[
      {l:'\u05e1\u05da \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d1\u05de\u05dc\u05d0\u05d9',v:total,c:'#5b8def'},
      {l:'\u05de\u05e2\u05dc 7 \u05d9\u05de\u05d9\u05dd',v:over7,c:'#ef4444'},
      {l:'\u05de\u05e2\u05dc 14 \u05d9\u05de\u05d9\u05dd',v:over14,c:'#b91c1c'},
      {l:'\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d9\u05d9\u05d7\u05d5\u05d3\u05d9\u05d9\u05dd',v:Object.keys(custs).length,c:'#2dd4bf'},
      {l:'\u05d3\u05d2\u05de\u05d9\u05dd',v:Object.keys(models).length,c:'#8b7cf6'},
      {l:'\u05de\u05ea\u05f4\u05dc \u05e2\u05dd \u05d4\u05db\u05d9 \u05d4\u05e8\u05d1\u05d4',v:topRep+(topN?(' ('+topN+')'):''),c:'#f5a524',sm:true}
    ];
    g("so-kpis").innerHTML=cards.map(function(k){ return '<div class="so-kpi" style="--c:'+k.c+'"><div class="so-kpi-v'+(k.sm?' sm':'')+'">'+esc(String(k.v))+'</div><div class="so-kpi-l">'+k.l+'</div></div>'; }).join('');
  }
  function badge(a){ var cls=a.indexOf('\u05d3\u05d7\u05d5\u05e3')>=0?'so-b-red':a.indexOf('\u05e7\u05e9\u05e8')>=0?'so-b-orange':'so-b-green'; return '<span class="so-badge '+cls+'">'+a+'</span>'; }
  var sortKey=null, sortDir=-1;   // -1 = high\u2192low (\u05d9\u05d5\u05e8\u05d3), 1 = low\u2192high (\u05e2\u05d5\u05dc\u05d4)
  function cmp(a,b){
    var k=sortKey;
    if(k==='__days'||k==='__action') return (a.__days-b.__days)*sortDir;
    if(k==='orderDate'){ var x=tx(a.orderDate), y=tx(b.orderDate); return (x<y?-1:x>y?1:0)*sortDir; } // ISO yyyy-mm-dd
    return tx(a[k]).localeCompare(tx(b[k]),'he')*sortDir;
  }
  function exportXlsx(){
    var rows=view.slice(); if(sortKey) rows.sort(cmp);
    ensureXLSX().then(function(){
      var aoa=[ COLS.map(function(c){return c.t;}) ];
      rows.forEach(function(o){ aoa.push(COLS.map(function(c){
        if(c.k==='__days') return o.__days;
        if(c.k==='__action') return o.__action;
        return tx(o[c.k]);
      })); });
      var ws=XLSX.utils.aoa_to_sheet(aoa), wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "\u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d1\u05de\u05dc\u05d0\u05d9");
      XLSX.writeFile(wb, "\u05d4\u05d6\u05de\u05e0\u05d5\u05ea_\u05d1\u05de\u05dc\u05d0\u05d9_"+new Date().toISOString().slice(0,10)+".xlsx");
    }).catch(function(err){ soErr('\u05d4\u05d9\u05d9\u05e6\u05d5\u05d0 \u05e0\u05db\u05e9\u05dc: '+err.message); });
  }
  function table(){
    g("so-thead").innerHTML=COLS.map(function(c){
      var act=(sortKey===c.k); var ar=act?('<span class="ar">'+(sortDir<0?' \u25bc':' \u25b2')+'</span>'):'';
      return '<th data-key="'+c.k+'"'+(act?' class="active"':'')+'>'+c.t+ar+'</th>';
    }).join('');
    if(!view.length){ g("so-tbody").innerHTML='<tr><td class="so-empty" colspan="'+COLS.length+'">\u05d0\u05d9\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d4\u05ea\u05d5\u05d0\u05de\u05d5\u05ea \u05dc\u05e1\u05d9\u05e0\u05d5\u05df</td></tr>'; g("so-count").textContent=''; return; }
    var rows=view.slice(); if(sortKey) rows.sort(cmp);
    var shown=rows.slice(0,CAP);
    g("so-count").textContent='\u05de\u05e6\u05d9\u05d2 '+shown.length+' \u05de\u05ea\u05d5\u05da '+view.length+(view.length>CAP?' (\u05e6\u05de\u05e6\u05dd \u05e2\u05dd \u05d4\u05e1\u05d9\u05e0\u05d5\u05df \u05dc\u05e8\u05d0\u05d5\u05ea \u05e2\u05d5\u05d3)':'');
    g("so-tbody").innerHTML=shown.map(function(o){
      var tds=COLS.map(function(col){
        var lbl=' data-label="'+esc(col.t)+'"';
        if(col.k==='__days') return '<td'+lbl+' class="so-days"><span class="so-dot so-'+o.__urg+'"></span>'+o.__days+'</td>';
        if(col.k==='__action') return '<td'+lbl+'>'+badge(o.__action)+'</td>';
        return '<td'+lbl+'>'+esc(tx(o[col.k]))+'</td>';
      }).join('');
      return '<tr class="so-row so-urg-'+o.__urg+'">'+tds+'</tr>';
    }).join('');
  }
  function wire(){
    ['so-q','so-days'].forEach(function(id){ var x=g(id); if(x){ x.addEventListener('input',apply); x.addEventListener('change',apply); } });
    var clr=g("so-clear"); if(clr) clr.onclick=function(){
      sel.rep.clear(); sel.model.clear(); sel.loc.clear();
      if(g("so-q")) g("so-q").value=''; if(g("so-days")) g("so-days").value='';
      buildMS('rep',MSITEMS.rep); buildMS('model',MSITEMS.model); buildMS('loc',MSITEMS.loc);
      apply();
    };
    var th=g("so-thead"); if(th) th.addEventListener('click',function(e){
      var cell=e.target.closest('th'); if(!cell) return; var k=cell.getAttribute('data-key'); if(!k) return;
      if(sortKey===k){ sortDir=-sortDir; } else { sortKey=k; sortDir=-1; }  // \u05e2\u05de\u05d5\u05d3\u05d4 \u05d7\u05d3\u05e9\u05d4 -> \u05de\u05d4\u05d2\u05d1\u05d5\u05d4 \u05dc\u05e0\u05de\u05d5\u05da
      table();
    });
    var ex=g("so-export"); if(ex) ex.onclick=exportXlsx;
    document.addEventListener('click',closeAllMS);
  }
  function load(){
    soErr(''); g("so-kpis").innerHTML='<div class="so-loading">\u05d8\u05d5\u05e2\u05df \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd\u2026</div>';
    jsonp(APPS_SCRIPT_URL,{action:'stockOrders'}).then(function(resp){
      if(resp && resp.ok===false) throw new Error(resp.error||'\u05e9\u05d2\u05d9\u05d0\u05d4 \u05de\u05d4\u05e9\u05e8\u05ea');
      var data = resp && (resp.data || (Array.isArray(resp)?resp:null));
      if(!data) throw new Error('\u05de\u05d1\u05e0\u05d4 \u05ea\u05d2\u05d5\u05d1\u05d4 \u05dc\u05d0 \u05e6\u05e4\u05d5\u05d9');
      raw=proc(data); loaded=true;
      MSITEMS.rep   = uniq(raw.map(function(o){return tx(o.rep);}));
      MSITEMS.model = uniq(raw.map(function(o){return tx(o.model);}));
      MSITEMS.loc   = uniq(raw.map(function(o){return tx(o.location);}));
      sel.rep.clear(); sel.model.clear(); sel.loc.clear();
      buildMS('rep',MSITEMS.rep); buildMS('model',MSITEMS.model); buildMS('loc',MSITEMS.loc);
      apply();
    }).catch(function(err){ g("so-kpis").innerHTML=''; soErr('\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\u05e2\u05d5\u05df \u05d0\u05ea \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05d4\u05d6\u05de\u05e0\u05d5\u05ea: '+err.message); });
  }
  wire();
  return { show:function(){ if(!loaded) load(); }, reload:load };
})();

/* ====== BRAND SPLIT screen (data from Apps Script action=brandSplit) ====== */
var BrandSplit=(function(){
  var payload=null, loaded=false, cssDone=false, selMonth={};
  var BRANDS=[{k:'HYUNDAI',c:'#5b8def'},{k:'MITSUBISHI',c:'#ff8e8e'},{k:'JAECOO',c:'#45e6d2'},{k:'OMODA',c:'#ffc04f'},{k:'ORA',c:'#ab9dff'}];
  function g(id){return document.getElementById(id);}
  function num(v){var n=parseFloat(v);return isNaN(n)?0:n;}
  function tot(c){return BRANDS.reduce(function(s,b){return s+num(c&&c[b.k]);},0);}
  function yearCounts(rep){ var o={}; BRANDS.forEach(function(b){o[b.k]=0;});
    (payload.months||[]).forEach(function(m){ var c=payload.data[rep]&&payload.data[rep][m];
      if(c) BRANDS.forEach(function(b){o[b.k]+=num(c[b.k]);}); });
    return o; }
  function injectCss(){ if(cssDone) return; cssDone=true;
    var st=document.createElement('style');
    st.textContent='.brands-sec-title{grid-column:1/-1;font-weight:800;font-size:15px;margin:6px 2px 0}'
      +'.bs-wide{grid-column:1/-1}'
      +'.bs-chart{display:flex;gap:8px;align-items:flex-end;justify-content:space-between;overflow-x:auto;padding:8px 2px 2px;-webkit-overflow-scrolling:touch}'
      +'.bs-col{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:34px;flex:1;cursor:pointer;border-radius:8px;padding:2px}'
      +'.bs-col.sel{background:var(--surface2)}'
      +'.bs-stack{display:flex;flex-direction:column-reverse;width:26px;border-radius:6px;overflow:hidden}'
      +'.bs-num{font-size:11px;color:var(--muted);font-weight:700;height:14px}'
      +'.bs-lbl{font-size:11px;color:var(--muted);white-space:nowrap}'
      +'.bs-detail{border-top:1px solid var(--line);margin-top:10px;padding-top:10px;display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px}'
      +'.bs-detail .bl-row{gap:7px}'
      +'.bs-hint{color:var(--faint);font-size:11.5px;margin-top:6px}'
      +'@media (max-width:640px){'
      +'#brands-month{width:100%;min-width:0;font-size:16px;height:44px}'
      +'.so-head{flex-direction:column;align-items:stretch}'
      +'.bs-col{min-width:30px}.bs-stack{width:20px}'
      +'.brand-pie svg{width:120px!important;height:120px!important}'
      +'}';
    document.head.appendChild(st);
  }
  function pieSVG(counts,size){
    var total=tot(counts), R=15.9155, C=2*Math.PI*R, off=0, segs='';
    if(total>0) BRANDS.forEach(function(b){ var v=num(counts[b.k]); if(!v) return;
      var len=v/total*C;
      segs+='<circle cx="21" cy="21" r="'+R+'" fill="none" stroke="'+b.c+'" stroke-width="6.5" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-off)+'"></circle>';
      off+=len; });
    return '<svg viewBox="0 0 42 42" style="transform:rotate(-90deg);width:'+size+'px;height:'+size+'px">'
      +'<circle cx="21" cy="21" r="'+R+'" fill="none" stroke="var(--bg2)" stroke-width="6.5"></circle>'+segs+'</svg>';
  }
  function legend(counts){ var total=tot(counts);
    return BRANDS.map(function(b){ var v=num(counts[b.k]); var pct=total?Math.round(v/total*100):0;
      return '<div class="bl-row"><span class="bl-dot" style="background:'+b.c+'"></span><span class="bl-name">'+b.k+'</span><span class="bl-val">'+v+' \u00b7 '+pct+'%</span></div>'; }).join(''); }
  function pieCard(title, counts, sub){
    var total=tot(counts);
    var body= total>0
      ? '<div class="brand-body"><div class="brand-pie">'+pieSVG(counts,148)+'<div class="pie-center">'+total+'</div></div><div class="brand-legend">'+legend(counts)+'</div></div>'
      : '<div class="brand-empty">\u05d0\u05d9\u05df \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd</div>';
    return '<div class="brand-card"><div class="brand-head"><span>'+title+'</span><span class="brand-tot">'+(sub||'')+'</span></div>'+body+'</div>';
  }
  function stackChart(rep, idx){
    var ms=payload.months||[]; if(!ms.length) return '';
    var max=1; ms.forEach(function(m){ var t=tot(payload.data[rep]&&payload.data[rep][m]); if(t>max)max=t; });
    var H=120;
    var cols=ms.map(function(m,mi){
      var c=(payload.data[rep]&&payload.data[rep][m])||{}; var t=tot(c);
      var segs=BRANDS.map(function(b){ var v=num(c[b.k]); if(!v)return '';
        var h=Math.max(3, Math.round(v/max*H));
        return '<div title="'+b.k+': '+v+'" style="height:'+h+'px;background:'+b.c+'"></div>'; }).join('');
      var selCls = (selMonth[rep]===m)?' sel':'';
      return '<div class="bs-col'+selCls+'" data-rep="'+idx+'" data-month="'+m+'"><div class="bs-num">'+(t||'')+'</div><div class="bs-stack" style="height:'+H+'px">'+segs+'</div><div class="bs-lbl">'+m.slice(0,3)+'</div></div>';
    }).join('');
    var detail='';
    var sm=selMonth[rep];
    if(sm){ var dc=(payload.data[rep]&&payload.data[rep][sm])||{};
      detail='<div class="bs-detail"><b style="width:100%">'+sm+' \u2014 \u05e1\u05d4\u05f4\u05db '+tot(dc)+'</b>'+legend(dc)+'</div>';
    }
    return '<div class="brand-card bs-wide"><div class="brand-head"><span>'+rep+' \u2014 \u05e4\u05d9\u05dc\u05d5\u05d7 \u05d7\u05d5\u05d3\u05e9\u05d9</span></div>'
      +'<div class="bs-chart">'+cols+'</div>'
      +'<div class="bs-hint">\u05dc\u05d7\u05e5 \u05e2\u05dc \u05e2\u05de\u05d5\u05d3\u05d4 \u05dc\u05e4\u05d9\u05e8\u05d5\u05d8 \u05d4\u05de\u05d5\u05ea\u05d2\u05d9\u05dd</div>'
      +detail+'</div>';
  }
  function monthsWithData(){
    return (payload.months||[]).filter(function(m){
      return Object.keys(payload.data).some(function(rep){ var x=payload.data[rep]&&payload.data[rep][m];
        return x && tot(x)>0; });
    });
  }
  function buildMonths(){
    var sel=g('brands-month'); var all=payload.months||[]; var md=monthsWithData();
    sel.innerHTML=all.map(function(m){return '<option>'+m+'</option>';}).join('');
    sel.value = md.length ? md[md.length-1] : (all[all.length-1]||'');
    sel.addEventListener('change',render);
    sel.addEventListener('input',render);
  }
  function wireChartClicks(){
    var reps=Object.keys(payload.data);
    var grid=g('brands-grid');
    grid.querySelectorAll('.bs-col').forEach(function(col){
      col.addEventListener('click',function(){
        var rep=reps[parseInt(col.getAttribute('data-rep'),10)];
        var m=col.getAttribute('data-month');
        selMonth[rep] = (selMonth[rep]===m) ? null : m;
        render();
      });
    });
  }
  function render(){
    if(!payload) return;
    var reps=Object.keys(payload.data);
    var month=g('brands-month').value;
    var html='<div class="brands-sec-title">\u05e1\u05d9\u05db\u05d5\u05dd \u05e9\u05e0\u05ea\u05d9</div>';
    html+=reps.map(function(r){ var yc=yearCounts(r); return pieCard(r, yc, '\u05e1\u05d4\u05f4\u05db \u05e9\u05e0\u05ea\u05d9 '+tot(yc)); }).join('');
    html+=reps.map(function(r,i){ return stackChart(r,i); }).join('');
    html+='<div class="brands-sec-title">\u05e4\u05d9\u05e8\u05d5\u05d8 \u05d7\u05d5\u05d3\u05e9\u05d9 \u2014 '+month+'</div>';
    html+=reps.map(function(r){ var c=(payload.data[r]&&payload.data[r][month])||{}; return pieCard(r, c, month); }).join('');
    g('brands-grid').innerHTML=html;
    wireChartClicks();
  }
  function load(){
    injectCss();
    jsonp(APPS_SCRIPT_URL,{action:'brandSplit'}).then(function(resp){
      var d=resp&&(resp.data||resp);
      if(!d||!d.months) throw new Error('\u05de\u05d1\u05e0\u05d4 \u05ea\u05d2\u05d5\u05d1\u05d4 \u05dc\u05d0 \u05e6\u05e4\u05d5\u05d9');
      payload=d; loaded=true; g('brands-error').className='notice'; buildMonths(); render();
    }).catch(function(err){ var e=g('brands-error'); e.innerHTML='<div><b>\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\u05e2\u05d5\u05df \u05e1\u05e4\u05dc\u05d9\u05d8 \u05de\u05d5\u05ea\u05d2\u05d9\u05dd: '+err.message+'</b></div>'; e.className='notice show err'; });
  }
  return { show:function(){ if(!loaded) load(); } };
})();


/* ====== COMMERCIAL TERMS + discount calculator (action=commercial) ====== */
var Terms=(function(){
  var rows=[], loaded=false, cssDone=false;
  function g(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function money(v){ return '\u20aa' + (Math.round(v*100)/100).toLocaleString('he-IL',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  var COLS=[{k:'model',t:'\u05d3\u05d2\u05dd \u05e8\u05db\u05d1'},{k:'trim',t:'\u05e7\u05d9\u05d1\u05d5\u05e5 \u05ea\u05d5\u05e1\u05e4\u05d5\u05ea'},{k:'list',t:'\u05de\u05d7\u05d9\u05e8\u05d5\u05df'},{k:'pct',t:'\u05d4\u05e0\u05d7\u05d4 %'},{k:'final',t:'\u05de\u05d7\u05d9\u05e8 \u05dc\u05d0\u05d7\u05e8 \u05d4\u05e0\u05d7\u05d4'}];
  function injectCss(){ if(cssDone)return; cssDone=true; var st=document.createElement('style');
    st.textContent='.terms-calc{background:var(--surface2);border:1px dashed var(--line2);border-radius:10px;margin:2px 0 4px;padding:12px 14px}'
      +'.terms-calc .tc-head{font-weight:800;margin-bottom:8px}'
      +'.terms-calc .tc-row{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center}'
      +'.terms-calc label{font-size:12.5px;color:var(--muted);display:flex;flex-direction:column;gap:4px}'
      +'.terms-calc input{height:36px;width:120px;padding:0 10px;border-radius:8px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);font:inherit;font-size:14px}'
      +'.terms-calc .out{font-size:12.5px;color:var(--muted);display:flex;flex-direction:column;gap:4px}'
      +'.terms-calc .out b{font-size:18px;color:var(--teal)}'
      +'.terms-calc .disc{color:var(--text);font-weight:700}'
      +'.trow{cursor:pointer}.trow.open{background:var(--surface2)}';
    document.head.appendChild(st);
  }
  function render(){
    var q=(g('terms-q').value||'').trim().toLowerCase();
    var view=rows.filter(function(r){ return !q || (r.model+' '+r.trim).toLowerCase().indexOf(q)>=0; });
    g('terms-thead').innerHTML=COLS.map(function(c){return '<th>'+c.t+'</th>';}).join('');
    if(!view.length){ g('terms-tbody').innerHTML='<tr><td class="so-empty" colspan="'+COLS.length+'">\u05d0\u05d9\u05df \u05e8\u05db\u05d1\u05d9\u05dd \u05ea\u05d5\u05d0\u05de\u05d9\u05dd</td></tr>'; g('terms-count').textContent=''; return; }
    g('terms-count').textContent='\u05de\u05e6\u05d9\u05d2 '+view.length+' \u05e8\u05db\u05d1\u05d9\u05dd';
    g('terms-tbody').innerHTML=view.map(function(r,i){
      var cells=COLS.map(function(c){
        var v=r[c.k];
        if(c.k==='list'||c.k==='final') v=money(v);
        else if(c.k==='pct') v=(r.pct?(r.pct+'%'):'\u2014');
        return '<td>'+esc(v)+'</td>';
      }).join('');
      return '<tr class="trow" data-i="'+i+'">'+cells+'</tr>';
    }).join('');
    // wire clicks
    Array.prototype.forEach.call(g('terms-tbody').querySelectorAll('.trow'),function(tr){
      tr.addEventListener('click',function(){ toggleCalc(tr, view[parseInt(tr.getAttribute('data-i'),10)]); });
    });
  }
  function toggleCalc(tr, car){
    var next=tr.nextElementSibling;
    if(next && next.classList.contains('calc-row')){ next.parentNode.removeChild(next); tr.classList.remove('open'); return; }
    // close others
    Array.prototype.forEach.call(g('terms-tbody').querySelectorAll('.calc-row'),function(x){x.parentNode.removeChild(x);});
    Array.prototype.forEach.call(g('terms-tbody').querySelectorAll('.trow.open'),function(x){x.classList.remove('open');});
    tr.classList.add('open');
    var td=document.createElement('td'); td.colSpan=COLS.length;
    var listedPct=(car.pct||0);td.innerHTML='<div class="terms-calc"><div class="tc-head">'+esc(car.model)+(car.trim?(' \u00b7 '+esc(car.trim)):'')+(listedPct?(' <span style="color:var(--muted);font-weight:600;font-size:13px">\u00b7 \u05d4\u05e0\u05d7\u05d4 \u05e0\u05e7\u05d5\u05d1\u05d4: '+listedPct+'%</span>'):'')+'</div>'
      +'<div class="tc-row">'
      +'<label>\u05de\u05d7\u05d9\u05e8\u05d5\u05df<input value="'+money(car.list)+'" disabled></label>'
      +'<label>\u05d4\u05e0\u05d7\u05d4 %<input type="number" min="0" max="100" step="0.1" class="tc-pct" value="'+(Math.round(listedPct*0.85*100)/100)+'"></label>'
      +'<div class="out"><span class="disc"></span><b class="price"></b></div>'
      +'</div></div>';
    var row=document.createElement('tr'); row.className='calc-row'; row.appendChild(td);
    tr.parentNode.insertBefore(row, tr.nextSibling);
    var inp=td.querySelector('.tc-pct'), price=td.querySelector('.price'), disc=td.querySelector('.disc');
    function calc(){ var p=parseFloat(inp.value)||0; if(p<0)p=0; if(p>100)p=100;
      var d=car.list*p/100, f=car.list-d;
      disc.textContent='\u05d4\u05e0\u05d7\u05d4: '+money(d)+' ('+p+'%)';
      price.textContent='\u05de\u05d7\u05d9\u05e8 \u05e1\u05d5\u05e4\u05d9: '+money(f);
    }
    inp.addEventListener('input',calc); calc(); inp.focus(); inp.select();
  }
  function load(){
    injectCss();
    jsonp(APPS_SCRIPT_URL,{action:'commercial'}).then(function(resp){
      var d=resp&&(resp.data||resp);
      if(!Array.isArray(d)) throw new Error('\u05de\u05d1\u05e0\u05d4 \u05ea\u05d2\u05d5\u05d1\u05d4 \u05dc\u05d0 \u05e6\u05e4\u05d5\u05d9');
      rows=d; loaded=true; g('terms-error').className='notice';
      g('terms-q').oninput=render; render();
    }).catch(function(err){ var e=g('terms-error'); e.innerHTML='<div><b>\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d8\u05e2\u05d5\u05df \u05ea\u05e0\u05d0\u05d9\u05dd \u05de\u05e1\u05d7\u05e8\u05d9\u05d9\u05dd: '+err.message+'</b></div>'; e.className='notice show err'; });
  }
  return { show:function(){ if(!loaded) load(); } };
})();

/* ====== initial paint: ALWAYS from Apps Script (no demo, no previous file) ====== */
loadData();

/* ═══════════════════════════════════════════════════════
   Algorithm Visualizer — script.js
   Features: Compare Mode, Graph Editor, Pause/Resume,
   Live step text, Sound engine,
   Sorts: bubble,selection,insertion,shell,merge,quick,heap,counting,radix
   Search: linear,binary,jump,interpolation
   Graph: BFS,DFS,Dijkstra,A*,Bellman-Ford,Prim's MST,Kruskal's MST
═══════════════════════════════════════════════════════ */

// ── Global State ──────────────────────────────────────
let array        = [];
let bars         = [];
let selectedAlgo = null;
let isRunning    = false;
let isPaused     = false;
let stopFlag     = false;
let comparisons  = 0, swapCount = 0;
let startTime    = 0, timerInterval = null;
let soundEnabled = true, audioCtx = null;
let currentMode  = 'single'; // 'single' | 'compare'

// DOM refs — assigned after DOMContentLoaded
let speedSlider, sizeSlider;

function getDelay() { const s = parseInt(speedSlider ? speedSlider.value : '5'); return Math.max(2, Math.round(600/(s*s))); }

// ── Algorithm Metadata ────────────────────────────────
const ALGOS = {
  bubble:      { name:'Bubble Sort',           type:'sort',   best:'O(n)',        avg:'O(n²)',         worst:'O(n²)',         space:'O(1)',       stable:true  },
  selection:   { name:'Selection Sort',         type:'sort',   best:'O(n²)',       avg:'O(n²)',         worst:'O(n²)',         space:'O(1)',       stable:false },
  insertion:   { name:'Insertion Sort',         type:'sort',   best:'O(n)',        avg:'O(n²)',         worst:'O(n²)',         space:'O(1)',       stable:true  },
  shell:       { name:'Shell Sort',             type:'sort',   best:'O(n log n)',  avg:'O(n log²n)',    worst:'O(n²)',         space:'O(1)',       stable:false },
  merge:       { name:'Merge Sort',             type:'sort',   best:'O(n log n)',  avg:'O(n log n)',    worst:'O(n log n)',    space:'O(n)',       stable:true  },
  quick:       { name:'Quick Sort',             type:'sort',   best:'O(n log n)',  avg:'O(n log n)',    worst:'O(n²)',         space:'O(log n)',   stable:false },
  heap:        { name:'Heap Sort',              type:'sort',   best:'O(n log n)',  avg:'O(n log n)',    worst:'O(n log n)',    space:'O(1)',       stable:false },
  counting:    { name:'Counting Sort',          type:'sort',   best:'O(n+k)',      avg:'O(n+k)',        worst:'O(n+k)',        space:'O(k)',       stable:true  },
  radix:       { name:'Radix Sort',             type:'sort',   best:'O(nk)',       avg:'O(nk)',         worst:'O(nk)',         space:'O(n+k)',     stable:true  },
  linear:      { name:'Linear Search',          type:'search', best:'O(1)',        avg:'O(n)',          worst:'O(n)',          space:'O(1)',       stable:null  },
  binary:      { name:'Binary Search',          type:'search', best:'O(1)',        avg:'O(log n)',      worst:'O(log n)',      space:'O(1)',       stable:null  },
  jump:        { name:'Jump Search',            type:'search', best:'O(1)',        avg:'O(√n)',         worst:'O(√n)',         space:'O(1)',       stable:null  },
  interpolation:{name:'Interpolation Search',   type:'search', best:'O(1)',        avg:'O(log log n)',  worst:'O(n)',          space:'O(1)',       stable:null  },
  bfs:         { name:'BFS — Breadth First',    type:'graph',  best:'O(V+E)',      avg:'O(V+E)',        worst:'O(V+E)',        space:'O(V)',       stable:null  },
  dfs:         { name:'DFS — Depth First',      type:'graph',  best:'O(V+E)',      avg:'O(V+E)',        worst:'O(V+E)',        space:'O(V)',       stable:null  },
  dijkstra:    { name:"Dijkstra's Shortest",    type:'graph',  best:'O((V+E)logV)',avg:'O((V+E)logV)',  worst:'O((V+E)logV)', space:'O(V)',       stable:null  },
  astar:       { name:'A* Search',              type:'graph',  best:'O(E log V)',  avg:'O(E log V)',    worst:'O(E log V)',    space:'O(V)',       stable:null  },
  bellmanford: { name:'Bellman-Ford',            type:'graph',  best:'O(VE)',       avg:'O(VE)',         worst:'O(VE)',         space:'O(V)',       stable:null  },
  prim:        { name:"Prim's MST",             type:'graph',  best:'O(E log V)',  avg:'O(E log V)',    worst:'O(E log V)',    space:'O(V)',       stable:null  },
  kruskal:     { name:"Kruskal's MST",          type:'graph',  best:'O(E log E)',  avg:'O(E log E)',    worst:'O(E log E)',    space:'O(V)',       stable:null  },
};
const SORT_ALGOS = Object.keys(ALGOS).filter(k => ALGOS[k].type === 'sort');

// ── Sound Engine ──────────────────────────────────────
function getAudioCtx() { if(!audioCtx) audioCtx = new(window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function beep(freq=440,dur=0.07,vol=0.08,type='sine') {
  if(!soundEnabled) return;
  try { const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value=freq; o.type=type; g.gain.setValueAtTime(vol,c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); o.start(c.currentTime); o.stop(c.currentTime+dur); } catch(_){}
}
function noteFromValue(v) { return 200+(v/99)*1000; }
function playCompare(v)  { beep(noteFromValue(v),0.05,0.06,'sine'); }
function playSwap(v)     { beep(noteFromValue(v),0.09,0.10,'triangle'); }
function playFound()     { beep(880,0.25,0.12,'sine'); setTimeout(()=>beep(1100,0.2,0.1,'sine'),80); }
function playDone()      { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,0.15,0.08),i*60)); }
function playPivotPlaced() {
  // The "fhaaa" — dramatic descending sweep when pivot snaps into place
  if(!soundEnabled) return;
  try {
    const c=getAudioCtx(), o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type='sawtooth';
    o.frequency.setValueAtTime(880, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(110, c.currentTime+0.28);
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime+0.32);
    o.start(c.currentTime); o.stop(c.currentTime+0.35);
  } catch(_) {}
}
function playGraphVisit(){ beep(440,0.06,0.05,'sine'); }
function playGraphEdge() { beep(330,0.04,0.04,'triangle'); }
function toggleSound()   { soundEnabled=!soundEnabled; const b=document.getElementById('soundBtn'); b.textContent=soundEnabled?'🔊':'🔇'; b.classList.toggle('muted',!soundEnabled); }

// ── UI Helpers ─────────────────────────────────────────
function setStatus(type,msg) {
  const bar=document.getElementById('statusBar'), txt=document.getElementById('statusText');
  bar.className='status-bar '+({run:'running',pause:'paused',done:'done',error:'error'}[type]||'');
  txt.textContent=msg;
}
function setStep(msg) {
  const el=document.getElementById('stepText'),w=document.getElementById('stepDisplay');
  el.textContent=msg; w.classList.toggle('active',msg!=='Waiting…');
}
function resetStats() {
  comparisons=0; swapCount=0;
  document.getElementById('comparisons').textContent='0';
  document.getElementById('swaps').textContent='0';
  document.getElementById('elapsed').textContent='0ms';
  clearInterval(timerInterval); setStep('Waiting…');
}
function incCompare() { comparisons++; document.getElementById('comparisons').textContent=comparisons; }
function incSwap()    { swapCount++;   document.getElementById('swaps').textContent=swapCount; }
function startTimer() { startTime=Date.now(); timerInterval=setInterval(()=>{document.getElementById('elapsed').textContent=(Date.now()-startTime)+'ms';},50); }
function stopTimer()  { clearInterval(timerInterval); document.getElementById('elapsed').textContent=(Date.now()-startTime)+'ms'; }

// ── Sleep / Pause / Stop ───────────────────────────────
async function sleep(ms) {
  await new Promise(r=>setTimeout(r,ms));
  while(isPaused&&!stopFlag) await new Promise(r=>setTimeout(r,50));
  if(stopFlag) throw new Error('stopped');
}
function checkStop() { if(stopFlag) throw new Error('stopped'); }

function togglePause() {
  isPaused=!isPaused;
  document.getElementById('pauseIcon').textContent=isPaused?'▶':'⏸';
  document.getElementById('pauseLabel').textContent=isPaused?' Resume':' Pause';
  setStatus(isPaused?'pause':'run', isPaused?'Paused — click Resume to continue':`Running ${ALGOS[selectedAlgo].name}…`);
}
function stopAlgorithm() { stopFlag=true; isPaused=false; setStep('Stopped.'); }

function setRunningUI(on) {
  document.getElementById('runBtn').disabled=on;
  document.getElementById('pauseBtn').style.display=on?'':'none';
  document.getElementById('stopBtn').style.display=on?'':'none';
  document.getElementById('sizeSlider').disabled=on;
  if(!on){ isPaused=false; document.getElementById('pauseIcon').textContent='⏸'; document.getElementById('pauseLabel').textContent=' Pause'; }
}

// ── Mode Switching ─────────────────────────────────────
function switchMode(mode) {
  currentMode=mode;
  document.getElementById('singleMode').style.display=mode==='single'?'':'none';
  document.getElementById('compareMode').style.display=mode==='compare'?'':'none';
  document.getElementById('tabSingle').classList.toggle('active',mode==='single');
  document.getElementById('tabCompare').classList.toggle('active',mode==='compare');
  if(mode==='compare') initCompareMode();
}

// ── Dropdown ───────────────────────────────────────────
function toggleDropdown() {
  const dd=document.getElementById('dropdown'),d=document.getElementById('algoDisplay');
  const open=dd.classList.contains('open');
  dd.classList.toggle('open',!open); d.classList.toggle('open',!open);
}
document.addEventListener('click',e=>{
  if(!document.getElementById('algoSelector').contains(e.target)) {
    document.getElementById('dropdown').classList.remove('open');
    document.getElementById('algoDisplay').classList.remove('open');
  }
});

function selectAlgo(key) {
  selectedAlgo=key; const info=ALGOS[key];
  document.getElementById('algoDisplayText').textContent='▸ '+info.name;
  document.getElementById('dropdown').classList.remove('open');
  document.getElementById('algoDisplay').classList.remove('open');
  document.getElementById('runBtn').disabled=false;
  document.getElementById('searchTargetWrap').classList.toggle('visible',info.type==='search');
  if(info.type==='graph'){ document.getElementById('stat1Label').textContent='Nodes Visited'; document.getElementById('stat2Label').textContent='Edges Explored'; }
  else { document.getElementById('stat1Label').textContent='Comparisons'; document.getElementById('stat2Label').textContent='Swaps / Ops'; }
  document.getElementById('newBtnLabel').textContent=info.type==='graph'?'New Graph':'New Array';
  document.querySelectorAll('.dropdown-item').forEach(el=>el.classList.toggle('active',el.textContent.trim().toLowerCase().startsWith(info.name.split(' ')[0].toLowerCase())));
  const tag=document.getElementById('algoTag'); tag.textContent=info.name; tag.style.display='';
  setVisualizerMode(info.type);
  showComplexity(key); showDetails(key);
  setStatus('idle',`${info.name} selected — click Run to start`); setStep('Waiting…');
  if(!isRunning) handleNew();
}

function setVisualizerMode(type) {
  const isGraph=type==='graph';
  document.getElementById('canvas-container').style.display=isGraph?'none':'';
  document.getElementById('graphCanvas').style.display=isGraph?'block':'none';
  document.getElementById('barLegend').style.display=isGraph?'none':'';
  document.getElementById('graphLegend').style.display=isGraph?'':'none';
  document.getElementById('graphToolbar').style.display=isGraph?'':'none';
}

function handleNew() {
  if(isRunning) return;
  if(selectedAlgo&&ALGOS[selectedAlgo].type==='graph') buildGraph();
  else newArray();
}

function showComplexity(key) {
  const info=ALGOS[key], panel=document.getElementById('complexityPanel');
  panel.classList.add('visible');
  document.getElementById('complexityTitle').textContent=`⊞ ${info.name} — Complexity`;
  const cls=c=>c.includes('1)')||c.includes('log log')?'good':c.includes('log n')||c.includes('√n')||c.includes('V+E')||c.includes('nk')?'mid':'bad';
  const cards=[{label:'Best',val:info.best},{label:'Average',val:info.avg},{label:'Worst',val:info.worst},{label:'Space',val:info.space}];
  if(info.stable!==null) cards.push({label:'Stable',val:info.stable?'Yes ✓':'No ✗',cls:info.stable?'good':'mid'});
  document.getElementById('complexityGrid').innerHTML=cards.map(c=>`<div class="complexity-card"><div class="complexity-card-label">${c.label}</div><div class="complexity-card-val ${c.cls||cls(c.val)}">${c.val}</div></div>`).join('');
}

// ── Array Management ───────────────────────────────────
function generateArray(size) { return Array.from({length:size},()=>Math.floor(Math.random()*90)+10); }
function onSizeChange(v) { document.getElementById('sizeVal').textContent=v; if(!isRunning) newArray(); }
function newArray() {
  const size=parseInt(sizeSlider.value); array=generateArray(size);
  renderBars(array); resetStats(); setStatus('idle','Ready — click Run to visualize');
}
function renderBars(arr, states={}) {
  const cont=document.getElementById('canvas-container'); cont.innerHTML=''; bars=[];
  const maxH=280, maxVal=Math.max(...arr);
  arr.forEach((val,i)=>{
    const bar=document.createElement('div'); bar.className='bar';
    bar.style.height=`${(val/maxVal)*maxH}px`;
    const tt=document.createElement('div'); tt.className='tooltip'; tt.textContent=val; bar.appendChild(tt);
    if(states[i]) bar.classList.add(states[i]);
    cont.appendChild(bar); bars.push(bar);
  });
}
function renderBarsState(arr,maxVal,stateMap,sortedSet) {
  const maxH=280;
  arr.forEach((val,i)=>{
    if(!bars[i]) return;
    bars[i].style.height=`${(val/maxVal)*maxH}px`;
    bars[i].className='bar';
    if(stateMap[i]) bars[i].classList.add(stateMap[i]);
    else if(sortedSet?.has(i)) bars[i].classList.add('sorted');
    const tt=bars[i].querySelector('.tooltip'); if(tt) tt.textContent=val;
  });
}

// ── Run Algorithm (single mode) ────────────────────────
async function runAlgorithm() {
  if(!selectedAlgo||isRunning) return;
  resetStats(); isRunning=true; stopFlag=false; isPaused=false;
  setRunningUI(true); startTimer();
  setStatus('run',`Running ${ALGOS[selectedAlgo].name}…`);
  const info=ALGOS[selectedAlgo];
  try {
    if(info.type==='sort')        await runSort(selectedAlgo,[...array]);
    else if(info.type==='search') await runSearch(selectedAlgo,[...array]);
    else                          await runGraphAlgo(selectedAlgo);
  } catch(e) { if(e.message!=='stopped') setStatus('error','Error: '+e.message); else setStep('Stopped.'); }
  stopTimer(); isRunning=false; setRunningUI(false);
}

// ═══════════════════════════════════════════════════════
// SORTING ALGORITHMS  (ctx-aware for compare mode)
// ═══════════════════════════════════════════════════════

// Default context uses global state/DOM
const mainCtx = {
  get bars()          { return bars; },
  incC()              { incCompare(); },
  incS()              { incSwap(); },
  step(msg)           { setStep(msg); },
  render(a,mv,sm,ss)  { renderBarsState(a,mv,sm,ss); },
};

async function runSort(algo,arr,ctx=mainCtx) {
  const maxVal=Math.max(...arr);
  const fns={bubble,selection,insertion,shell,merge,quick,heap,counting,radix};
  await fns[algo](arr,maxVal,ctx);
  if(!stopFlag) {
    ctx.step('Sorted! Sweeping…');
    const sorted=new Set();
    for(let i=0;i<arr.length;i++) { sorted.add(i); ctx.render(arr,maxVal,{},sorted); await sleep(Math.max(2,Math.round(300/arr.length))); }
    playDone();
    if(ctx===mainCtx) setStatus('done',`✓ ${ALGOS[algo].name} — ${comparisons} comparisons, ${swapCount} swaps`);
  }
}

// ── Bubble ────────────────────────────────────────────
async function bubble(arr,maxVal,ctx=mainCtx) {
  const n=arr.length, sorted=new Set();
  for(let i=0;i<n-1;i++){
    let swapped=false;
    for(let j=0;j<n-i-1;j++){
      checkStop(); ctx.incC(); playCompare(arr[j]);
      ctx.step(`Comparing A[${j}]=${arr[j]} vs A[${j+1}]=${arr[j+1]}`);
      ctx.render(arr,maxVal,{[j]:'comparing',[j+1]:'comparing'},sorted);
      await sleep(getDelay());
      if(arr[j]>arr[j+1]){ [arr[j],arr[j+1]]=[arr[j+1],arr[j]]; ctx.incS(); swapped=true; playSwap(arr[j]); ctx.render(arr,maxVal,{[j]:'active',[j+1]:'active'},sorted); await sleep(getDelay()); }
    }
    sorted.add(n-1-i); if(!swapped) break;
  }
}

// ── Selection ─────────────────────────────────────────
async function selection(arr,maxVal,ctx=mainCtx) {
  const n=arr.length, sorted=new Set();
  for(let i=0;i<n-1;i++){
    let minIdx=i;
    for(let j=i+1;j<n;j++){
      checkStop(); ctx.incC(); playCompare(arr[j]);
      ctx.step(`Finding min: A[${j}]=${arr[j]} vs current min A[${minIdx}]=${arr[minIdx]}`);
      ctx.render(arr,maxVal,{[i]:'active',[minIdx]:'pivot',[j]:'comparing'},sorted);
      await sleep(getDelay()); if(arr[j]<arr[minIdx]) minIdx=j;
    }
    if(minIdx!==i){ [arr[i],arr[minIdx]]=[arr[minIdx],arr[i]]; ctx.incS(); playSwap(arr[i]); ctx.render(arr,maxVal,{[i]:'active',[minIdx]:'active'},sorted); await sleep(getDelay()); }
    sorted.add(i);
  }
}

// ── Insertion ─────────────────────────────────────────
async function insertion(arr,maxVal,ctx=mainCtx) {
  const n=arr.length, sorted=new Set([0]);
  for(let i=1;i<n;i++){
    const key=arr[i]; let j=i-1;
    ctx.step(`Inserting A[${i}]=${key} into sorted portion`);
    while(j>=0&&arr[j]>key){ checkStop(); ctx.incC(); playCompare(arr[j]); ctx.step(`A[${j}]=${arr[j]} > ${key}, shifting`); arr[j+1]=arr[j]; ctx.incS(); ctx.render(arr,maxVal,{[j]:'comparing',[j+1]:'active'},sorted); await sleep(getDelay()); j--; }
    arr[j+1]=key; sorted.add(i);
    ctx.render(arr,maxVal,{[j+1]:'active'},sorted); await sleep(getDelay());
  }
}

// ── Shell ─────────────────────────────────────────────
async function shell(arr,maxVal,ctx=mainCtx) {
  const n=arr.length; let gap=Math.floor(n/2);
  while(gap>0){
    for(let i=gap;i<n;i++){
      const temp=arr[i]; let j=i;
      while(j>=gap&&arr[j-gap]>temp){ checkStop(); ctx.incC(); playCompare(arr[j-gap]); ctx.step(`Gap=${gap}: A[${j-gap}]=${arr[j-gap]} vs ${temp}`); arr[j]=arr[j-gap]; ctx.incS(); ctx.render(arr,maxVal,{[j]:'active',[j-gap]:'comparing'},new Set()); await sleep(getDelay()); j-=gap; }
      arr[j]=temp; ctx.render(arr,maxVal,{[j]:'pivot'},new Set()); await sleep(getDelay());
    }
    gap=Math.floor(gap/2);
  }
}

// ── Merge ─────────────────────────────────────────────
async function merge(arr,maxVal,ctx=mainCtx) { await _mSplit(arr,0,arr.length-1,maxVal,ctx); }
async function _mSplit(arr,l,r,maxVal,ctx) {
  if(l>=r) return; const mid=Math.floor((l+r)/2);
  await _mSplit(arr,l,mid,maxVal,ctx); checkStop();
  await _mSplit(arr,mid+1,r,maxVal,ctx); checkStop();
  await _mMerge(arr,l,mid,r,maxVal,ctx);
}
async function _mMerge(arr,l,mid,r,maxVal,ctx) {
  const L=arr.slice(l,mid+1),R=arr.slice(mid+1,r+1); let i=0,j=0,k=l;
  ctx.step(`Merging [${l}…${mid}] and [${mid+1}…${r}]`);
  while(i<L.length&&j<R.length){ checkStop(); ctx.incC(); playCompare(L[i]); ctx.step(`Merging: ${L[i]} vs ${R[j]}`); ctx.render(arr,maxVal,{[k]:'active',[l+i]:'comparing',[mid+1+j]:'comparing'},new Set()); await sleep(getDelay()); arr[k++]=L[i]<=R[j]?L[i++]:R[j++]; ctx.incS(); ctx.render(arr,maxVal,{[k-1]:'active'},new Set()); await sleep(getDelay()); }
  while(i<L.length) { checkStop(); arr[k++]=L[i++]; ctx.incS(); ctx.render(arr,maxVal,{[k-1]:'active'},new Set()); await sleep(getDelay()); }
  while(j<R.length) { checkStop(); arr[k++]=R[j++]; ctx.incS(); ctx.render(arr,maxVal,{[k-1]:'active'},new Set()); await sleep(getDelay()); }
}

// ── Quick ─────────────────────────────────────────────
async function quick(arr,maxVal,ctx=mainCtx) { await _qSort(arr,0,arr.length-1,maxVal,ctx); }
async function _qSort(arr,lo,hi,maxVal,ctx) {
  if(lo<hi){ const pi=await _qPart(arr,lo,hi,maxVal,ctx); checkStop(); await _qSort(arr,lo,pi-1,maxVal,ctx); checkStop(); await _qSort(arr,pi+1,hi,maxVal,ctx); }
}
async function _qPart(arr,lo,hi,maxVal,ctx) {
  const pivot=arr[hi]; let i=lo-1;
  ctx.step(`Pivot=${pivot} at index ${hi}`);
  for(let j=lo;j<hi;j++){ checkStop(); ctx.incC(); playCompare(arr[j]); ctx.step(`Comparing A[${j}]=${arr[j]} with pivot=${pivot}`); ctx.render(arr,maxVal,{[hi]:'pivot',[j]:'comparing',...(i>=0?{[i]:'active'}:{})},new Set()); await sleep(getDelay()); if(arr[j]<=pivot){ i++; [arr[i],arr[j]]=[arr[j],arr[i]]; ctx.incS(); playSwap(arr[i]); ctx.render(arr,maxVal,{[hi]:'pivot',[i]:'active',[j]:'active'},new Set()); await sleep(getDelay()); } }
  [arr[i+1],arr[hi]]=[arr[hi],arr[i+1]]; ctx.incS(); playSwap(arr[i+1]); playPivotPlaced(); ctx.render(arr,maxVal,{[i+1]:'sorted'},new Set()); await sleep(getDelay()); return i+1;
}

// ── Heap ──────────────────────────────────────────────
async function heap(arr,maxVal,ctx=mainCtx) {
  const n=arr.length, sorted=new Set();
  ctx.step('Building max-heap…');
  for(let i=Math.floor(n/2)-1;i>=0;i--){ checkStop(); await _heapify(arr,n,i,maxVal,sorted,ctx); }
  for(let i=n-1;i>0;i--){ checkStop(); ctx.step(`Extracting max=${arr[0]} → index ${i}`); [arr[0],arr[i]]=[arr[i],arr[0]]; ctx.incS(); playSwap(arr[i]); sorted.add(i); ctx.render(arr,maxVal,{[0]:'active'},sorted); await sleep(getDelay()); await _heapify(arr,i,0,maxVal,sorted,ctx); }
  sorted.add(0);
}
async function _heapify(arr,n,i,maxVal,sorted,ctx=mainCtx) {
  let lg=i,l=2*i+1,r=2*i+2; ctx.incC();
  if(l<n&&arr[l]>arr[lg]) lg=l; if(r<n&&arr[r]>arr[lg]) lg=r;
  if(lg!==i){ ctx.step(`Heapify: swap A[${i}]=${arr[i]} ↔ A[${lg}]=${arr[lg]}`); ctx.render(arr,maxVal,{[i]:'comparing',[lg]:'active'},sorted); await sleep(getDelay()); [arr[i],arr[lg]]=[arr[lg],arr[i]]; ctx.incS(); playSwap(arr[i]); checkStop(); await _heapify(arr,n,lg,maxVal,sorted,ctx); }
}

// ── Counting ──────────────────────────────────────────
async function counting(arr,maxVal,ctx=mainCtx) {
  const max=Math.max(...arr),min=Math.min(...arr),range=max-min+1;
  const count=new Array(range).fill(0);
  ctx.step(`Counting Sort — range ${min}…${max}`);
  for(let i=0;i<arr.length;i++){ checkStop(); count[arr[i]-min]++; ctx.incC(); playCompare(arr[i]); ctx.step(`Counting A[${i}]=${arr[i]} → bucket[${arr[i]-min}]=${count[arr[i]-min]}`); ctx.render(arr,maxVal,{[i]:'comparing'},new Set()); await sleep(getDelay()); }
  let idx=0;
  for(let v=0;v<range;v++) while(count[v]>0){ checkStop(); arr[idx]=v+min; ctx.incS(); playSwap(arr[idx]); ctx.step(`Placing ${v+min} at index ${idx}`); ctx.render(arr,maxVal,{[idx]:'active'},new Set()); await sleep(getDelay()); idx++; count[v]--; }
}

// ── Radix ─────────────────────────────────────────────
async function radix(arr,maxVal,ctx=mainCtx) {
  const max=Math.max(...arr); let exp=1,pass=1;
  while(Math.floor(max/exp)>0){ ctx.step(`Radix pass ${pass} — digit place ${exp}`); await _radixPass(arr,exp,maxVal,ctx); exp*=10; pass++; checkStop(); }
}
async function _radixPass(arr,exp,maxVal,ctx) {
  const n=arr.length,output=new Array(n),count=new Array(10).fill(0);
  for(let i=0;i<n;i++){ const d=Math.floor(arr[i]/exp)%10; count[d]++; ctx.incC(); playCompare(arr[i]); ctx.step(`Digit ${d} of A[${i}]=${arr[i]}`); ctx.render(arr,maxVal,{[i]:'comparing'},new Set()); await sleep(getDelay()); checkStop(); }
  for(let i=1;i<10;i++) count[i]+=count[i-1];
  for(let i=n-1;i>=0;i--){ const d=Math.floor(arr[i]/exp)%10; output[--count[d]]=arr[i]; }
  for(let i=0;i<n;i++){ arr[i]=output[i]; ctx.incS(); playSwap(arr[i]); ctx.step(`Writing ${arr[i]} to index ${i}`); ctx.render(arr,maxVal,{[i]:'active'},new Set()); await sleep(getDelay()); checkStop(); }
}

// ═══════════════════════════════════════════════════════
// SEARCHING ALGORITHMS
// ═══════════════════════════════════════════════════════
async function runSearch(algo,arr) {
  let target=parseInt(document.getElementById('searchTarget').value);
  if(isNaN(target)){ target=arr[Math.floor(Math.random()*arr.length)]; document.getElementById('searchTarget').value=target; }
  if(['binary','jump','interpolation'].includes(algo)){ arr.sort((a,b)=>a-b); renderBars(arr); setStatus('run',`Sorted — searching for ${target}…`); await sleep(400); }
  const maxVal=Math.max(...arr);
  const fns={linear:_linear,binary:_binary,jump:_jump,interpolation:_interpolation};
  const result=await fns[algo](arr,target,maxVal);
  if(!stopFlag){ if(result!==-1){ playFound(); setStatus('done',`✓ Found ${target} at index ${result} — ${comparisons} comparisons`); setStep(`Element ${target} found at index ${result}!`); } else { setStatus('error',`✗ ${target} not found — ${comparisons} comparisons`); setStep(`Element ${target} not in array.`); } }
}
async function _linear(arr,target,maxVal) {
  for(let i=0;i<arr.length;i++){ checkStop(); incCompare(); playCompare(arr[i]); setStep(`Checking A[${i}]=${arr[i]} vs target=${target}`); renderBarsState(arr,maxVal,{[i]:'comparing'},new Set([...Array(i).keys()])); await sleep(getDelay()); if(arr[i]===target){ renderBarsState(arr,maxVal,{[i]:'found'},new Set()); return i; } }
  return -1;
}
async function _binary(arr,target,maxVal) {
  let lo=0,hi=arr.length-1;
  while(lo<=hi){ checkStop(); const mid=Math.floor((lo+hi)/2); incCompare(); playCompare(arr[mid]); setStep(`lo=${lo} hi=${hi} mid=${mid} A[mid]=${arr[mid]}`); const sm={};for(let k=lo;k<=hi;k++) sm[k]='comparing'; sm[mid]='pivot'; renderBarsState(arr,maxVal,sm,new Set([...Array(lo).keys(),...Array.from({length:arr.length-hi-1},(_,i)=>hi+1+i)])); await sleep(getDelay()*2); if(arr[mid]===target){ renderBarsState(arr,maxVal,{[mid]:'found'},new Set()); return mid; } if(arr[mid]<target) lo=mid+1; else hi=mid-1; }
  return -1;
}
async function _jump(arr,target,maxVal) {
  const n=arr.length,step=Math.floor(Math.sqrt(n)); let prev=0,curr=0;
  while(curr<n&&arr[Math.min(curr+step-1,n-1)]<target){ checkStop(); incCompare(); setStep(`Jumping block at ${curr}, step=${step}`); for(let k=curr;k<Math.min(curr+step,n);k++) renderBarsState(arr,maxVal,{[k]:'comparing'},new Set([...Array(curr).keys()])); await sleep(getDelay()*1.5); prev=curr; curr+=step; if(prev>=n) return -1; }
  for(let i=prev;i<=Math.min(curr+step-1,n-1);i++){ checkStop(); incCompare(); playCompare(arr[i]); setStep(`Linear scan: A[${i}]=${arr[i]} vs ${target}`); renderBarsState(arr,maxVal,{[i]:'active'},new Set([...Array(prev).keys()])); await sleep(getDelay()); if(arr[i]===target){ renderBarsState(arr,maxVal,{[i]:'found'},new Set()); return i; } }
  return -1;
}
async function _interpolation(arr,target,maxVal) {
  let lo=0,hi=arr.length-1;
  while(lo<=hi&&target>=arr[lo]&&target<=arr[hi]){ checkStop(); if(lo===hi){ incCompare(); if(arr[lo]===target){ renderBarsState(arr,maxVal,{[lo]:'found'},new Set()); return lo; } return -1; } const pos=lo+Math.floor(((hi-lo)/(arr[hi]-arr[lo]))*(target-arr[lo])); incCompare(); playCompare(arr[pos]); setStep(`Probe at ${pos}: A[pos]=${arr[pos]}, target=${target}`); const sm={};for(let k=lo;k<=hi;k++) sm[k]='comparing'; sm[pos]='pivot'; renderBarsState(arr,maxVal,sm,new Set()); await sleep(getDelay()*2); if(arr[pos]===target){ renderBarsState(arr,maxVal,{[pos]:'found'},new Set()); return pos; } if(arr[pos]<target) lo=pos+1; else hi=pos-1; }
  return -1;
}

// ═══════════════════════════════════════════════════════
// GRAPH EDITOR
// ═══════════════════════════════════════════════════════
const NODE_R=18, NODE_COUNT=12;
let graphNodes=[], graphEdges=[], gCtx=null;
let editorMode='none'; // 'addNode'|'addEdge'|'delete'
let edgeSourceNode=null;
let pendingEdgeTo=null;
let weightResolve=null;

const G_COLORS={ default:'#1a4a6e', current:'#00f5c3', frontier:'#4f8ef7', visited:'#2ecc71', path:'#ffd166', mst:'#ffd166', rejected:'#ff6b6b', negative:'#ff6b6b' };

// ── Editor mode buttons ────────────────────────────────
function setEditorMode(mode) {
  editorMode=editorMode===mode?'none':mode;
  edgeSourceNode=null;
  document.getElementById('btnAddNode').classList.toggle('active-tool',editorMode==='addNode');
  document.getElementById('btnAddEdge').classList.toggle('active-tool',editorMode==='addEdge');
  document.getElementById('btnDelNode').classList.toggle('active-tool',editorMode==='delete');
  const hints={ addNode:'Click empty space to add a node', addEdge:'Click source node, then target node', delete:'Click node or near edge midpoint to delete', none:'Select a tool to edit' };
  document.getElementById('editorHint').textContent=hints[editorMode]||'Select a tool';
}

function clearGraph() { graphNodes=[]; graphEdges=[]; drawGraph({},new Set(),new Set()); }

// Canvas mouse handler
function initGraphCanvasEvents() {
  const canvas=document.getElementById('graphCanvas');
  canvas.addEventListener('click', onCanvasClick);
}

function onCanvasClick(e) {
  if(isRunning) return;
  const canvas=document.getElementById('graphCanvas');
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;

  if(editorMode==='addNode') {
    // Check no node too close
    if(graphNodes.every(n=>Math.hypot(n.x-mx,n.y-my)>NODE_R*2.5)) {
      const id=graphNodes.length;
      const label=id<26?String.fromCharCode(65+id):`N${id}`;
      graphNodes.push({id,x:mx,y:my,label});
      drawGraph({},new Set(),new Set());
    }
  } else if(editorMode==='addEdge') {
    const clicked=nodeAtPoint(mx,my);
    if(clicked!==null) {
      if(edgeSourceNode===null) {
        edgeSourceNode=clicked;
        document.getElementById('editorHint').textContent=`Source: ${graphNodes[clicked].label} — now click target`;
        drawGraph({[clicked]:'current'},new Set(),new Set());
      } else if(clicked!==edgeSourceNode) {
        const from=edgeSourceNode, to=clicked;
        edgeSourceNode=null;
        // Ask for weight
        askWeight().then(w=>{
          if(w!==null) {
            graphEdges.push({from,to,weight:w});
            drawGraph({},new Set(),new Set());
          }
          document.getElementById('editorHint').textContent='Click source node, then target node';
        });
      }
    }
  } else if(editorMode==='delete') {
    const clickedNode=nodeAtPoint(mx,my);
    if(clickedNode!==null) {
      // Remove node and its edges
      graphEdges=graphEdges.filter(e=>e.from!==clickedNode&&e.to!==clickedNode);
      graphNodes.splice(clickedNode,1);
      // Re-index
      graphNodes.forEach((n,i)=>{ n.id=i; n.label=i<26?String.fromCharCode(65+i):`N${i}`; });
      graphEdges=graphEdges.map(e=>({ ...e, from:graphNodes.findIndex((_,i)=>i===e.from)||e.from, to:graphNodes.findIndex((_,i)=>i===e.to)||e.to }));
      drawGraph({},new Set(),new Set());
    } else {
      // Try to delete nearby edge
      const ei=edgeAtPoint(mx,my);
      if(ei>=0) { graphEdges.splice(ei,1); drawGraph({},new Set(),new Set()); }
    }
  }
}

function nodeAtPoint(mx,my) {
  for(let i=0;i<graphNodes.length;i++) if(Math.hypot(graphNodes[i].x-mx,graphNodes[i].y-my)<=NODE_R+4) return i;
  return null;
}
function edgeAtPoint(mx,my) {
  for(let i=0;i<graphEdges.length;i++){
    const e=graphEdges[i],a=graphNodes[e.from],b=graphNodes[e.to];
    if(!a||!b) continue;
    const mpx=(a.x+b.x)/2, mpy=(a.y+b.y)/2;
    if(Math.hypot(mx-mpx,my-mpy)<16) return i;
  }
  return -1;
}

// Weight modal
function askWeight() {
  return new Promise(resolve=>{
    weightResolve=resolve;
    document.getElementById('weightInput').value='5';
    document.getElementById('weightOverlay').style.display='flex';
    setTimeout(()=>document.getElementById('weightInput').focus(),50);
  });
}
function confirmWeight() {
  const v=parseInt(document.getElementById('weightInput').value)||5;
  document.getElementById('weightOverlay').style.display='none';
  if(weightResolve){ weightResolve(Math.max(1,Math.min(99,v))); weightResolve=null; }
}
function cancelWeight() {
  document.getElementById('weightOverlay').style.display='none';
  if(weightResolve){ weightResolve(null); weightResolve=null; }
}
document.getElementById('weightInput').addEventListener('keydown',e=>{ if(e.key==='Enter') confirmWeight(); if(e.key==='Escape') cancelWeight(); });

// Build random graph
function buildGraph() {
  const canvas=document.getElementById('graphCanvas');
  canvas.width=canvas.clientWidth||900; canvas.height=canvas.clientHeight||340;
  gCtx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height,pad=55;
  graphNodes=[]; graphEdges=[];
  let tries=0;
  while(graphNodes.length<NODE_COUNT&&tries<2000){
    const x=pad+Math.random()*(W-2*pad), y=pad+Math.random()*(H-2*pad);
    if(graphNodes.every(n=>Math.hypot(n.x-x,n.y-y)>95)){ graphNodes.push({id:graphNodes.length,x,y,label:String.fromCharCode(65+graphNodes.length)}); }
    tries++;
  }
  // Spanning tree
  const conn=new Set([0]),unconn=new Set(graphNodes.slice(1).map(n=>n.id));
  while(unconn.size>0){
    const from=[...conn][Math.floor(Math.random()*conn.size)], to=[...unconn][Math.floor(Math.random()*unconn.size)];
    graphEdges.push({from,to,weight:Math.floor(Math.random()*14)+1}); conn.add(to); unconn.delete(to);
  }
  for(let e=0;e<Math.floor(NODE_COUNT*0.5);e++){
    const from=Math.floor(Math.random()*graphNodes.length), to=Math.floor(Math.random()*graphNodes.length);
    if(from!==to&&!graphEdges.some(x=>(x.from===from&&x.to===to)||(x.from===to&&x.to===from))) graphEdges.push({from,to,weight:Math.floor(Math.random()*14)+1});
  }
  drawGraph({},new Set(),new Set());
  resetStats(); setStatus('idle','Graph ready — click Run');
  setStep('Graph generated. Click Run or use editor to modify.');
}

// Draw graph
function drawGraph(nodeStates,visitedEdges,pathEdges,distLabels={}) {
  const canvas=document.getElementById('graphCanvas');
  if(!gCtx){ gCtx=canvas.getContext('2d'); }
  canvas.width=canvas.clientWidth||900; canvas.height=canvas.clientHeight||340;
  gCtx=canvas.getContext('2d');
  gCtx.clearRect(0,0,canvas.width,canvas.height);
  const showWeights=selectedAlgo&&['dijkstra','astar','bellmanford','prim','kruskal'].includes(selectedAlgo);

  // Edges
  graphEdges.forEach((e,idx)=>{
    const a=graphNodes[e.from],b=graphNodes[e.to]; if(!a||!b) return;
    const isPath=pathEdges.has(idx), isVis=visitedEdges.has(idx);
    gCtx.beginPath(); gCtx.moveTo(a.x,a.y); gCtx.lineTo(b.x,b.y);
    gCtx.strokeStyle=isPath?'#ffd166':isVis?'#2ecc71':'#1e3a5f';
    gCtx.lineWidth=isPath?3.5:isVis?2:1.5;
    gCtx.globalAlpha=isPath?1:isVis?0.9:0.45; gCtx.stroke(); gCtx.globalAlpha=1;
    if(showWeights){ const mx=(a.x+b.x)/2,my=(a.y+b.y)/2; gCtx.fillStyle=isPath?'#ffd166':'#4a6fa5'; gCtx.font='bold 10px Space Mono,monospace'; gCtx.textAlign='center'; gCtx.textBaseline='middle'; gCtx.fillText(e.weight,mx,my-7); }
  });

  // Nodes
  graphNodes.forEach(node=>{
    const state=nodeStates[node.id]||'default', color=G_COLORS[state]||G_COLORS.default;
    if(state==='current'){ gCtx.shadowBlur=20; gCtx.shadowColor=color; }
    gCtx.beginPath(); gCtx.arc(node.x,node.y,NODE_R,0,Math.PI*2);
    gCtx.fillStyle=color; gCtx.fill();
    gCtx.strokeStyle='#0d1220'; gCtx.lineWidth=2; gCtx.stroke();
    gCtx.shadowBlur=0;
    // Node label
    gCtx.fillStyle=state==='default'?'#64748b':'#0d1220';
    gCtx.font='bold 12px Space Mono,monospace'; gCtx.textAlign='center'; gCtx.textBaseline='middle';
    gCtx.fillText(node.label,node.x,node.y);
    // Distance label (Dijkstra/BF/A*)
    if(distLabels[node.id]!==undefined){ const d=distLabels[node.id]; gCtx.fillStyle='#ffd166'; gCtx.font='bold 9px Space Mono,monospace'; gCtx.fillText(d===Infinity?'∞':d,node.x,node.y-NODE_R-5); }
  });

  // Editor: draw edge preview when source is selected
  if(editorMode==='addEdge'&&edgeSourceNode!==null){
    const src=graphNodes[edgeSourceNode];
    gCtx.setLineDash([5,5]); gCtx.strokeStyle=G_COLORS.current; gCtx.lineWidth=1.5; gCtx.globalAlpha=0.5;
    gCtx.beginPath(); gCtx.arc(src.x,src.y,NODE_R+5,0,Math.PI*2); gCtx.stroke();
    gCtx.setLineDash([]); gCtx.globalAlpha=1;
  }
}

// ── Graph Algorithm Dispatcher ──────────────────────────
async function runGraphAlgo(algo) {
  if(graphNodes.length===0){ setStatus('error','No graph! Generate or build one first.'); return; }
  if(algo==='bfs')        await _bfs();
  else if(algo==='dfs')   await _dfs();
  else if(algo==='dijkstra') await _dijkstra();
  else if(algo==='astar') await _astar();
  else if(algo==='bellmanford') await _bellmanford();
  else if(algo==='prim')  await _prim();
  else if(algo==='kruskal') await _kruskal();
}

// Build adjacency list (undirected)
function buildAdj() {
  const n=graphNodes.length, adj=Array.from({length:n},()=>[]);
  graphEdges.forEach((e,idx)=>{ adj[e.from].push({node:e.to,w:e.weight,edgeIdx:idx}); adj[e.to].push({node:e.from,w:e.weight,edgeIdx:idx}); });
  return adj;
}

// ── BFS ───────────────────────────────────────────────
async function _bfs() {
  const adj=buildAdj(), n=graphNodes.length;
  const visited=new Set(), visitedEdges=new Set(), ns={};
  const queue=[0]; visited.add(0); ns[0]='frontier';
  setStep('BFS: starting from node A');
  drawGraph(ns,visitedEdges,new Set());
  while(queue.length>0){
    checkStop(); const curr=queue.shift(); ns[curr]='current'; incCompare(); playGraphVisit();
    setStep(`BFS: visiting ${graphNodes[curr].label} — queue size ${queue.length}`);
    drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*6);
    for(const {node:nb,edgeIdx} of adj[curr]){ checkStop(); incSwap(); playGraphEdge(); visitedEdges.add(edgeIdx); if(!visited.has(nb)){ visited.add(nb); ns[nb]='frontier'; queue.push(nb); setStep(`BFS: discovered ${graphNodes[nb].label}`); drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*4); } }
    ns[curr]='visited'; drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*3);
  }
  if(!stopFlag){ playDone(); setStatus('done',`✓ BFS — ${comparisons} nodes, ${swapCount} edges`); setStep(`BFS done! ${visited.size} nodes explored.`); }
}

// ── DFS ───────────────────────────────────────────────
async function _dfs() {
  const adj=buildAdj(), visited=new Set(), visitedEdges=new Set(), ns={};
  async function explore(v,depth){
    checkStop(); visited.add(v); ns[v]='current'; incCompare(); playGraphVisit();
    setStep(`DFS: visiting ${graphNodes[v].label} (depth ${depth})`);
    drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*6); ns[v]='frontier';
    for(const {node:nb,edgeIdx} of adj[v]){ checkStop(); incSwap(); playGraphEdge(); visitedEdges.add(edgeIdx); if(!visited.has(nb)){ setStep(`DFS: exploring ${graphNodes[v].label}→${graphNodes[nb].label}`); drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*3); await explore(nb,depth+1); checkStop(); } }
    ns[v]='visited'; drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*2);
  }
  setStep('DFS: starting from node A'); await explore(0,0);
  if(!stopFlag){ playDone(); setStatus('done',`✓ DFS — ${comparisons} nodes, ${swapCount} edges`); setStep(`DFS done! ${visited.size} nodes explored.`); }
}

// ── Dijkstra ─────────────────────────────────────────
async function _dijkstra() {
  const adj=buildAdj(), n=graphNodes.length, INF=Infinity;
  const dist=new Array(n).fill(INF), prev=new Array(n).fill(-1), prevEdge=new Array(n).fill(-1);
  const visited=new Set(), visitedEdges=new Set(), ns={};
  dist[0]=0;
  setStep("Dijkstra: source A=0, others=∞");
  drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*5);
  for(let iter=0;iter<n;iter++){
    checkStop(); let u=-1;
    for(let v=0;v<n;v++) if(!visited.has(v)&&dist[v]<INF&&(u===-1||dist[v]<dist[u])) u=v;
    if(u===-1) break;
    visited.add(u); ns[u]='current'; incCompare(); playGraphVisit();
    setStep(`Dijkstra: processing ${graphNodes[u].label} (dist=${dist[u]})`);
    drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*6);
    for(const {node:v,w,edgeIdx} of adj[u]){ checkStop(); incSwap(); playGraphEdge(); visitedEdges.add(edgeIdx); const nd=dist[u]+w; setStep(`Relax ${graphNodes[u].label}→${graphNodes[v].label}: ${dist[u]}+${w}=${nd} (was ${dist[v]===INF?'∞':dist[v]})`); drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*3); if(nd<dist[v]){ dist[v]=nd; prev[v]=u; prevEdge[v]=edgeIdx; ns[v]='frontier'; setStep(`Updated dist[${graphNodes[v].label}]=${nd}`); drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*2); } }
    ns[u]='visited'; drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*2);
  }
  if(!stopFlag){
    let far=0; dist.forEach((d,i)=>{if(d!==INF&&d>dist[far]) far=i;});
    const pathEdges=new Set(); let cur=far; const pathNodes=[];
    while(cur!==-1){ pathNodes.unshift(cur); if(prevEdge[cur]!==-1) pathEdges.add(prevEdge[cur]); cur=prev[cur]; }
    pathNodes.forEach(id=>ns[id]='path'); drawGraph(ns,visitedEdges,pathEdges,dist);
    playDone(); setStatus('done',`✓ Dijkstra — shortest paths found`);
    setStep(`Path to ${graphNodes[far].label}: ${pathNodes.map(id=>graphNodes[id].label).join('→')} (dist=${dist[far]})`);
  }
}

// ── A* ───────────────────────────────────────────────
async function _astar() {
  const adj=buildAdj(), n=graphNodes.length, INF=Infinity;
  const target=n-1; // A* from node 0 to last node
  function heuristic(a,b){ return Math.hypot(graphNodes[a].x-graphNodes[b].x,graphNodes[a].y-graphNodes[b].y)/20; }
  const gScore=new Array(n).fill(INF), fScore=new Array(n).fill(INF);
  const prev=new Array(n).fill(-1), prevEdge=new Array(n).fill(-1);
  const openSet=new Set([0]), closedSet=new Set(), visitedEdges=new Set(), ns={};
  gScore[0]=0; fScore[0]=heuristic(0,target);
  setStep(`A*: finding path from ${graphNodes[0].label} to ${graphNodes[target].label}`);
  drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*5);
  while(openSet.size>0){
    checkStop();
    let curr=-1;
    openSet.forEach(v=>{ if(curr===-1||fScore[v]<fScore[curr]) curr=v; });
    if(curr===target){ // Reconstruct
      const pathEdges=new Set(); let c=target; const pathNodes=[];
      while(c!==-1){ pathNodes.unshift(c); if(prevEdge[c]!==-1) pathEdges.add(prevEdge[c]); c=prev[c]; }
      pathNodes.forEach(id=>ns[id]='path'); drawGraph(ns,visitedEdges,pathEdges);
      playDone(); setStatus('done',`✓ A* path found — ${comparisons} nodes expanded`);
      setStep(`Path: ${pathNodes.map(id=>graphNodes[id].label).join('→')} (cost=${gScore[target].toFixed(1)})`); return;
    }
    openSet.delete(curr); closedSet.add(curr); ns[curr]='current'; incCompare(); playGraphVisit();
    setStep(`A*: expanding ${graphNodes[curr].label} — f=${fScore[curr].toFixed(1)}`);
    drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*6);
    for(const {node:nb,w,edgeIdx} of adj[curr]){
      checkStop(); if(closedSet.has(nb)) continue;
      incSwap(); playGraphEdge(); visitedEdges.add(edgeIdx);
      const tentG=gScore[curr]+w;
      if(tentG<gScore[nb]){ gScore[nb]=tentG; fScore[nb]=tentG+heuristic(nb,target); prev[nb]=curr; prevEdge[nb]=edgeIdx; if(!openSet.has(nb)){ openSet.add(nb); ns[nb]='frontier'; setStep(`A*: found better path to ${graphNodes[nb].label} (g=${tentG.toFixed(1)} f=${fScore[nb].toFixed(1)})`); } drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*3); }
    }
    ns[curr]='visited'; drawGraph(ns,visitedEdges,new Set()); await sleep(getDelay()*2);
  }
  if(!stopFlag){ setStatus('error','A*: No path found'); setStep('No path exists between source and target.'); }
}

// ── Bellman-Ford ─────────────────────────────────────
async function _bellmanford() {
  const n=graphNodes.length, INF=Infinity;
  const dist=new Array(n).fill(INF), prev=new Array(n).fill(-1), prevEdge=new Array(n).fill(-1);
  dist[0]=0;
  const visitedEdges=new Set(), ns={};
  setStep('Bellman-Ford: initialising all dist=∞, source=0');
  drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*5);

  for(let pass=1;pass<=n-1;pass++){
    let relaxed=false;
    setStep(`Pass ${pass}/${n-1}: relaxing all ${graphEdges.length} edges`);
    for(let i=0;i<graphEdges.length;i++){
      const e=graphEdges[i]; checkStop(); incSwap(); playGraphEdge();
      visitedEdges.add(i);
      // Forward
      if(dist[e.from]!==INF){ const nd=dist[e.from]+e.weight; ns[e.from]='current'; setStep(`Relax ${graphNodes[e.from].label}→${graphNodes[e.to].label}: ${dist[e.from]}+${e.weight}=${nd} (was ${dist[e.to]===INF?'∞':dist[e.to]})`); drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*3); if(nd<dist[e.to]){ dist[e.to]=nd; prev[e.to]=e.from; prevEdge[e.to]=i; ns[e.to]='frontier'; relaxed=true; setStep(`Updated dist[${graphNodes[e.to].label}]=${nd}`); drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*2); } ns[e.from]='visited'; }
      // Backward (undirected)
      if(dist[e.to]!==INF){ const nd=dist[e.to]+e.weight; ns[e.to]='current'; if(nd<dist[e.from]){ dist[e.from]=nd; prev[e.from]=e.to; prevEdge[e.from]=i; ns[e.from]='frontier'; relaxed=true; setStep(`Updated dist[${graphNodes[e.from].label}]=${nd}`); drawGraph(ns,visitedEdges,new Set(),dist); await sleep(getDelay()*2); } ns[e.to]='visited'; }
      drawGraph(ns,visitedEdges,new Set(),dist); incCompare();
    }
    if(!relaxed) break; // Early exit
  }

  if(!stopFlag){
    // Highlight shortest path to most distant node
    let far=0; dist.forEach((d,i)=>{if(d!==INF&&d>dist[far]) far=i;});
    const pathEdges=new Set(); let c=far; const pathNodes=[];
    while(c!==-1){ pathNodes.unshift(c); if(prevEdge[c]!==-1) pathEdges.add(prevEdge[c]); c=prev[c]; }
    pathNodes.forEach(id=>ns[id]='path'); drawGraph(ns,visitedEdges,pathEdges,dist);
    playDone(); setStatus('done',`✓ Bellman-Ford — handles negative weights`);
    setStep(`Shortest paths found from ${graphNodes[0].label}. Path to ${graphNodes[far].label}: ${pathNodes.map(id=>graphNodes[id].label).join('→')}`);
  }
}

// ── Prim's MST ────────────────────────────────────────
async function _prim() {
  const adj=buildAdj(), n=graphNodes.length, INF=Infinity;
  const inMST=new Set([0]), mstEdges=new Set(), visitedEdges=new Set(), ns={};
  ns[0]='visited';
  setStep("Prim's: starting MST from node A");
  drawGraph(ns,visitedEdges,mstEdges); await sleep(getDelay()*5);

  while(inMST.size<n){
    checkStop(); let minW=INF, bestEdge=-1, bestTo=-1;
    // Find minimum weight edge from MST to non-MST
    graphEdges.forEach((e,idx)=>{
      const fromIn=inMST.has(e.from), toIn=inMST.has(e.to);
      if((fromIn&&!toIn)||(toIn&&!fromIn)){
        incCompare();
        const to=fromIn?e.to:e.from;
        if(e.weight<minW){ minW=e.weight; bestEdge=idx; bestTo=to; }
      }
    });
    if(bestEdge===-1) break;
    const e=graphEdges[bestEdge];
    ns[e.from]='current'; ns[e.to]='current';
    setStep(`Prim's: adding cheapest edge (weight=${minW}) connecting ${graphNodes[e.from].label}↔${graphNodes[e.to].label} to MST`);
    drawGraph(ns,visitedEdges,mstEdges); await sleep(getDelay()*6);
    inMST.add(bestTo); mstEdges.add(bestEdge); visitedEdges.add(bestEdge);
    ns[e.from]='visited'; ns[e.to]='visited';
    incSwap(); playGraphVisit();
    drawGraph(ns,visitedEdges,mstEdges); await sleep(getDelay()*4);
  }

  if(!stopFlag){
    const totalW=Array.from(mstEdges).reduce((s,i)=>s+graphEdges[i].weight,0);
    playDone(); setStatus('done',`✓ Prim's MST — ${mstEdges.size} edges, total weight=${totalW}`);
    setStep(`MST spans all ${inMST.size} nodes with minimum total weight ${totalW}.`);
  }
}

// ── Kruskal's MST ─────────────────────────────────────
async function _kruskal() {
  const n=graphNodes.length;
  // Union-Find
  const parent=Array.from({length:n},(_,i)=>i), rank=new Array(n).fill(0);
  function find(x){ if(parent[x]!==x) parent[x]=find(parent[x]); return parent[x]; }
  function union(x,y){ const px=find(x),py=find(y); if(px===py) return false; if(rank[px]<rank[py]) parent[px]=py; else if(rank[px]>rank[py]) parent[py]=px; else{ parent[py]=px; rank[px]++; } return true; }

  // Sort edges by weight
  const sorted=[...graphEdges.map((e,i)=>({...e,idx:i}))].sort((a,b)=>a.weight-b.weight);
  const mstEdges=new Set(), rejectedEdges=new Set(), ns={};
  setStep("Kruskal's: sorting edges by weight, applying Union-Find");
  drawGraph(ns,new Set(),mstEdges); await sleep(getDelay()*5);

  for(const e of sorted){
    checkStop(); incCompare(); playGraphEdge();
    ns[e.from]='current'; ns[e.to]='current';
    setStep(`Kruskal's: considering edge ${graphNodes[e.from].label}↔${graphNodes[e.to].label} (w=${e.weight})`);
    drawGraph(ns,rejectedEdges,mstEdges); await sleep(getDelay()*5);

    if(union(e.from,e.to)){
      mstEdges.add(e.idx); incSwap(); playGraphVisit();
      ns[e.from]='visited'; ns[e.to]='visited';
      setStep(`✓ Added! ${graphNodes[e.from].label}↔${graphNodes[e.to].label} (w=${e.weight}) — MST edges: ${mstEdges.size}`);
    } else {
      rejectedEdges.add(e.idx);
      ns[e.from]='frontier'; ns[e.to]='frontier';
      setStep(`✗ Rejected — would form cycle: ${graphNodes[e.from].label}↔${graphNodes[e.to].label}`);
    }
    drawGraph(ns,rejectedEdges,mstEdges); await sleep(getDelay()*4);
    if(mstEdges.size===n-1) break;
  }

  if(!stopFlag){
    const totalW=Array.from(mstEdges).reduce((s,i)=>s+graphEdges[i].weight,0);
    playDone(); setStatus('done',`✓ Kruskal's MST — ${mstEdges.size} edges, total weight=${totalW}`);
    setStep(`MST complete! ${mstEdges.size} edges selected, ${rejectedEdges.size} rejected. Total weight=${totalW}.`);
  }
}

// ═══════════════════════════════════════════════════════
// COMPARE MODE
// ═══════════════════════════════════════════════════════
let cmpAlgos=[null,null], cmpBarsArr=[[],[]], cmpCounts=[{c:0,s:0},{c:0,s:0}];
let cmpArray=[], cmpRunning=false, cmpStopFlag=false;
let cmpTimers=[null,null], cmpStartTimes=[0,0];
let cmpFinishTimes=[0,0];
let liveEventLog=[];

// ── Complexity rank helper for comparisons ──
const COMPLEXITY_RANK = { 'O(n)':1,'O(n log n)':2,'O(n log²n)':3,'O(n+k)':2,'O(nk)':3,'O(n²)':5 };
function complexityClass(c) {
  if(c.includes('n log n')||c.includes('n+k')||c.includes('nk')) return 'mid';
  if(c.includes('n²')) return 'bad';
  return 'good';
}
function complexityRank(c) { return COMPLEXITY_RANK[c]||3; }

// ── Analysis tab switching ──
function showAnalysisTab(tab) {
  ['prediction','live','verdict'].forEach(t=>{
    document.getElementById(`tab${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle('active',t===tab);
    document.getElementById(`pane${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display=t===tab?'':'none';
  });
}

// ── Build Prediction panel ──
function buildPrediction() {
  const [k0,k1]=[cmpAlgos[0],cmpAlgos[1]];
  if(!k0||!k1) return;
  const [a0,a1]=[ALGOS[k0],ALGOS[k1]];
  document.getElementById('compareAnalysis').style.display='';

  // Row helper
  function row(label,v0,v1,cls0,cls1,adv0,adv1) {
    return `<div class="pred-row"><span class="pred-row-label">${label}</span><div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><span class="pred-row-val ${cls0}">${v0}</span>${adv0?`<span class="pred-advantage ${adv0}">${adv0==='win'?'✓ Better':adv0==='tie'?'= Equal':'✗'}</span>`:''}</div></div>`;
  }

  function compare(v0,v1,lowerBetter=true) {
    const r0=complexityRank(v0),r1=complexityRank(v1);
    if(r0===r1) return ['tie','tie'];
    return lowerBetter ? (r0<r1?['win','lose']:['lose','win']) : (r0>r1?['win','lose']:['lose','win']);
  }

  const [avgAdv0,avgAdv1]=compare(a0.avg,a1.avg);
  const [worstAdv0,worstAdv1]=compare(a0.worst,a1.worst);
  const [bestAdv0,bestAdv1]=compare(a0.best,a1.best);
  const [spaceAdv0,spaceAdv1]=compare(a0.space,a1.space);
  const stableAdv0=a0.stable===a1.stable?'tie':(a0.stable?'win':'lose');
  const stableAdv1=a0.stable===a1.stable?'tie':(a1.stable?'win':'lose');

  const col0=`<div class="pred-col">
    <div class="pred-col-header">◈ ${a0.name}</div>
    ${row('Best Case',a0.best,a0.best,complexityClass(a0.best),'')}
    ${row('Average',a0.avg,a0.avg,complexityClass(a0.avg),'',avgAdv0,'')}
    ${row('Worst Case',a0.worst,a0.worst,complexityClass(a0.worst),'',worstAdv0,'')}
    ${row('Space',a0.space,a0.space,complexityClass(a0.space),'',spaceAdv0,'')}
    ${row('Stable',a0.stable?'Yes ✓':'No ✗','',a0.stable?'good':'mid','',stableAdv0,'')}
  </div>`;

  const col1=`<div class="pred-col">
    <div class="pred-col-header">◈ ${a1.name}</div>
    ${row('Best Case',a1.best,a1.best,complexityClass(a1.best),'')}
    ${row('Average',a1.avg,a1.avg,complexityClass(a1.avg),'',avgAdv1,'')}
    ${row('Worst Case',a1.worst,a1.worst,complexityClass(a1.worst),'',worstAdv1,'')}
    ${row('Space',a1.space,a1.space,complexityClass(a1.space),'',spaceAdv1,'')}
    ${row('Stable',a1.stable?'Yes ✓':'No ✗','',a1.stable?'good':'mid','',stableAdv1,'')}
  </div>`;

  document.getElementById('predictionGrid').innerHTML=col0+col1;

  // Written prediction
  const wins0=[avgAdv0,worstAdv0,bestAdv0,spaceAdv0].filter(x=>x==='win').length;
  const wins1=[avgAdv1,worstAdv1,bestAdv1,spaceAdv1].filter(x=>x==='win').length;
  let predicted, reason;
  if(wins0>wins1){ predicted=a0.name; reason=`${a0.name} has better complexity in ${wins0}/4 categories. On a random array it should perform significantly fewer comparisons.`; }
  else if(wins1>wins0){ predicted=a1.name; reason=`${a1.name} has better complexity in ${wins1}/4 categories and should outperform on random input.`; }
  else { predicted='Tie expected'; reason=`Both algorithms have similar theoretical complexity. The result may come down to implementation constants, cache behaviour, and the specific input array.`; }

  const d0=ALGO_DETAILS[k0], d1=ALGO_DETAILS[k1];
  document.getElementById('predictionSummary').innerHTML=`
    <strong style="color:var(--accent)">🔮 Prediction: ${predicted}</strong><br/>${reason}<br/><br/>
    <strong style="color:var(--text)">Key insight:</strong> ${a0.name} is ${a0.stable?'<span style="color:#2ecc71">stable</span>':'<span style="color:var(--accent3)">unstable</span>'} and uses ${a0.space} extra space.
    ${a1.name} is ${a1.stable?'<span style="color:#2ecc71">stable</span>':'<span style="color:var(--accent3)">unstable</span>'} and uses ${a1.space} extra space.
  `;

  // Reset live events
  liveEventLog=[];
  document.getElementById('liveEvents').innerHTML='';
  document.getElementById('liveStep0').textContent='—'; document.getElementById('liveStep0').classList.remove('active');
  document.getElementById('liveStep1').textContent='—'; document.getElementById('liveStep1').classList.remove('active');
  document.getElementById('liveLabel0').textContent=a0.name;
  document.getElementById('liveLabel1').textContent=a1.name;
  document.getElementById('leaderName0').textContent=a0.name;
  document.getElementById('leaderName1').textContent=a1.name;
  document.getElementById('leaderFill').style.width='50%';

  // Reset verdict
  document.getElementById('verdictPlaceholder').style.display='';
  document.getElementById('verdictContent').style.display='none';
}

function addLiveEvent(pi, msg) {
  const el=document.getElementById('liveEvents');
  const div=document.createElement('div'); div.className='live-event';
  const tag=document.createElement('span'); tag.className='ev-tag'+(pi===1?' b':''); tag.textContent=`[${ALGOS[cmpAlgos[pi]]?.name.split(' ')[0]}]`;
  const txt=document.createElement('span'); txt.textContent=' '+msg;
  div.appendChild(tag); div.appendChild(txt); el.prepend(div);
  // Keep max 40 events
  while(el.children.length>40) el.lastChild.remove();
}

function updateLiveLeader() {
  const c0=cmpCounts[0].c, c1=cmpCounts[1].c;
  if(c0===0&&c1===0) return;
  const total=Math.max(c0+c1,1);
  const pct=Math.round((c0/total)*100);
  document.getElementById('leaderFill').style.width=pct+'%';
}

let cmpModeInited = false;
function initCompareMode() {
  [0,1].forEach(pi=>{
    const dd=document.getElementById(`cmpDropdown${pi}`);
    dd.innerHTML=`<div class="dropdown-section"><div class="dropdown-label">⬚ Sorting</div>${SORT_ALGOS.map(k=>`<div class="dropdown-item" onclick="selectCmpAlgo(${pi},'${k}')">${ALGOS[k].name}<span class="complexity">${ALGOS[k].avg}</span></div>`).join('')}</div>`;
  });
  if(!cmpModeInited){
    cmpModeInited=true;
    document.addEventListener('click',e=>{
      [0,1].forEach(pi=>{
        const sel=document.getElementById(`cmpSelector${pi}`);
        if(sel&&!sel.contains(e.target)){
          document.getElementById(`cmpDropdown${pi}`).classList.remove('open');
          document.getElementById(`cmpDisplay${pi}`).classList.remove('open');
        }
      });
    });
  }
  newCompareArray();
}

function toggleCmpDropdown(pi) {
  const dd=document.getElementById(`cmpDropdown${pi}`),d=document.getElementById(`cmpDisplay${pi}`);
  const open=dd.classList.contains('open');
  dd.classList.toggle('open',!open);
  d.classList.toggle('open',!open);
  // Scroll the dropdown into view so user doesn't have to hunt for it
  if(!open) {
    setTimeout(()=>{
      dd.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 80);
  }
}

function selectCmpAlgo(pi, key) {
  cmpAlgos[pi]=key;
  document.getElementById(`cmpDisplayText${pi}`).textContent='▸ '+ALGOS[key].name;
  document.getElementById(`cmpDropdown${pi}`).classList.remove('open');
  document.getElementById(`cmpDisplay${pi}`).classList.remove('open');
  if(cmpAlgos[0]&&cmpAlgos[1]){ document.getElementById('cmpRunBtn').disabled=false; buildPrediction(); }
  renderCmpBars(pi,cmpArray); resetCmpStats(pi);
}

function onCmpSizeChange(v) { document.getElementById('cmpSizeVal').textContent=v; newCompareArray(); }

function newCompareArray() {
  const size=parseInt(document.getElementById('cmpSizeSlider').value)||40;
  cmpArray=generateArray(size);
  [0,1].forEach(pi=>renderCmpBars(pi,cmpArray));
  resetCmpStats(0); resetCmpStats(1);
  document.getElementById('winnerBanner').style.display='none';
  setCmpStatus(0,'','Select algorithm');
  setCmpStatus(1,'','Select algorithm');
  if(cmpAlgos[0]&&cmpAlgos[1]) buildPrediction();
}

function renderCmpBars(pi,arr) {
  const cont=document.getElementById(`cmpBars${pi}`); cont.innerHTML=''; cmpBarsArr[pi]=[];
  const maxH=160, maxVal=Math.max(...arr);
  arr.forEach(val=>{ const bar=document.createElement('div'); bar.className='compare-bar'; bar.style.height=`${(val/maxVal)*maxH}px`; cont.appendChild(bar); cmpBarsArr[pi].push(bar); });
}

function renderCmpState(pi,arr,maxVal,stateMap,sortedSet) {
  const maxH=160, bars=cmpBarsArr[pi];
  arr.forEach((val,i)=>{ if(!bars[i]) return; bars[i].style.height=`${(val/maxVal)*maxH}px`; bars[i].className='compare-bar'; if(stateMap[i]) bars[i].classList.add(stateMap[i]); else if(sortedSet?.has(i)) bars[i].classList.add('sorted'); });
}

function resetCmpStats(pi) {
  cmpCounts[pi]={c:0,s:0};
  document.getElementById(`cmpC${pi}`).textContent='0';
  document.getElementById(`cmpS${pi}`).textContent='0';
  document.getElementById(`cmpT${pi}`).textContent='0ms';
  clearInterval(cmpTimers[pi]);
}

function setCmpStatus(pi,cls,msg) {
  const el=document.getElementById(`cmpStatus${pi}`), txt=document.getElementById(`cmpStatusTxt${pi}`);
  el.className='compare-status '+(cls||''); txt.textContent=msg;
}

function makeCmpCtx(pi) {
  return {
    get bars() { return cmpBarsArr[pi]; },
    incC() { cmpCounts[pi].c++; document.getElementById(`cmpC${pi}`).textContent=cmpCounts[pi].c; updateLiveLeader(); },
    incS() { cmpCounts[pi].s++; document.getElementById(`cmpS${pi}`).textContent=cmpCounts[pi].s; },
    step(msg) {
      const el=document.getElementById(`liveStep${pi}`);
      el.textContent=msg; el.classList.add('active');
      // log milestones to event panel
      if(msg.includes('Pivot')||msg.includes('pivot')||msg.includes('Sorted')||msg.includes('Placing')||msg.includes('Merging')) addLiveEvent(pi,msg);
    },
    render(a,mv,sm,ss) { renderCmpState(pi,a,mv,sm,ss); },
  };
}

async function runComparison() {
  if(!cmpAlgos[0]||!cmpAlgos[1]) return;
  cmpStopFlag=false; cmpRunning=true; stopFlag=false;
  document.getElementById('cmpRunBtn').disabled=true;
  document.getElementById('cmpStopBtn').style.display='';
  document.getElementById('winnerBanner').style.display='none';
  resetCmpStats(0); resetCmpStats(1);
  document.getElementById(`cmpBadge0`).style.display='none';
  document.getElementById(`cmpBadge1`).style.display='none';

  // Switch to live tab automatically
  showAnalysisTab('live');

  const arr0=[...cmpArray], arr1=[...cmpArray];
  [0,1].forEach(pi=>renderCmpBars(pi,cmpArray));
  setCmpStatus(0,'running',`Running ${ALGOS[cmpAlgos[0]].name}…`);
  setCmpStatus(1,'running',`Running ${ALGOS[cmpAlgos[1]].name}…`);

  cmpStartTimes[0]=cmpStartTimes[1]=Date.now();
  cmpFinishTimes=[0,0];
  [0,1].forEach(pi=>{ cmpTimers[pi]=setInterval(()=>{ document.getElementById(`cmpT${pi}`).textContent=(Date.now()-cmpStartTimes[pi])+'ms'; },50); });

  addLiveEvent(0,'Race started!'); addLiveEvent(1,'Race started!');

  try {
    await Promise.all([
      runSortCompare(0, cmpAlgos[0], arr0),
      runSortCompare(1, cmpAlgos[1], arr1),
    ]);
  } catch(e) { /* stopped */ }

  [0,1].forEach(pi=>{ clearInterval(cmpTimers[pi]); if(!cmpFinishTimes[pi]) cmpFinishTimes[pi]=Date.now(); document.getElementById(`cmpT${pi}`).textContent=(cmpFinishTimes[pi]-cmpStartTimes[pi])+'ms'; });

  if(!cmpStopFlag) { showCompareWinner(); buildVerdict(); }
  cmpRunning=false;
  document.getElementById('cmpRunBtn').disabled=false;
  document.getElementById('cmpStopBtn').style.display='none';
}

async function runSortCompare(pi, algo, arr) {
  const ctx=makeCmpCtx(pi);
  const maxVal=Math.max(...arr);
  const fns={bubble,selection,insertion,shell,merge,quick,heap,counting,radix};
  try {
    await fns[algo](arr,maxVal,ctx);
    const sorted=new Set();
    for(let i=0;i<arr.length;i++){ sorted.add(i); ctx.render(arr,maxVal,{},sorted); await new Promise(r=>setTimeout(r,Math.max(1,Math.round(200/arr.length)))); if(cmpStopFlag) return; }
    clearInterval(cmpTimers[pi]); cmpFinishTimes[pi]=Date.now();
    document.getElementById(`cmpT${pi}`).textContent=(cmpFinishTimes[pi]-cmpStartTimes[pi])+'ms';
    setCmpStatus(pi,'done',`✓ Done — ${cmpCounts[pi].c} comparisons`);
    addLiveEvent(pi,`Finished in ${cmpFinishTimes[pi]-cmpStartTimes[pi]}ms with ${cmpCounts[pi].c} comparisons`);
    document.getElementById(`liveStep${pi}`).textContent='✓ Sorted!';
  } catch(e) { setCmpStatus(pi,'','Stopped'); }
}

function stopComparison() { cmpStopFlag=true; stopFlag=true; }

function showCompareWinner() {
  const c0=cmpCounts[0].c, c1=cmpCounts[1].c;
  const n0=ALGOS[cmpAlgos[0]].name, n1=ALGOS[cmpAlgos[1]].name;
  const winnerByC = c0<=c1?0:1;
  const winnerByT = cmpFinishTimes[0]<=cmpFinishTimes[1]?0:1;
  const overall = winnerByC===winnerByT ? winnerByC : (c0+cmpFinishTimes[0] < c1+cmpFinishTimes[1] ? 0 : 1);

  [0,1].forEach(pi=>{
    const badge=document.getElementById(`cmpBadge${pi}`); badge.style.display='';
    badge.textContent=pi===overall?'🏆 Winner':'Runner-up';
    badge.className='compare-badge '+(pi===overall?'winner':'loser');
    setCmpStatus(pi,pi===overall?'winner-status':'done', pi===overall?'🏆 Winner!':'Done');
  });

  const wb=overall===0?n0:n1, lb=overall===0?n1:n0;
  const cdiff=Math.abs(c0-c1), ratio=(Math.max(c0,c1)/Math.max(1,Math.min(c0,c1))).toFixed(1);
  document.getElementById('winnerBanner').style.display='flex';
  document.getElementById('winnerText').textContent=`${wb} wins! ${cdiff} fewer comparisons (${ratio}× faster than ${lb})`;
}

function buildVerdict() {
  const k0=cmpAlgos[0], k1=cmpAlgos[1];
  const a0=ALGOS[k0], a1=ALGOS[k1];
  const c0=cmpCounts[0].c, c1=cmpCounts[1].c;
  const s0=cmpCounts[0].s, s1=cmpCounts[1].s;
  const t0=cmpFinishTimes[0]-cmpStartTimes[0], t1=cmpFinishTimes[1]-cmpStartTimes[1];
  const winC=c0<c1?0:1, winT=t0<t1?0:1, winS=s0<s1?0:1;
  const overall= (winC===winT)?winC:(c0+t0 < c1+t1?0:1);
  const [wk,lk]=[cmpAlgos[overall],cmpAlgos[1-overall]];
  const [wa,la]=[ALGOS[wk],ALGOS[lk]];
  const [wc,lc]=[cmpCounts[overall].c,cmpCounts[1-overall].c];
  const [wt,lt]=[overall===0?t0:t1, overall===0?t1:t0];
  const cdiff=Math.abs(c0-c1), tratio=(Math.max(t0,t1)/Math.max(1,Math.min(t0,t1))).toFixed(1);
  const cratio=(Math.max(c0,c1)/Math.max(1,Math.min(c0,c1))).toFixed(1);
  const n=cmpArray.length;

  // Build written analysis text
  const analysisWhy = (() => {
    if(wk==='merge'&&lk==='bubble') return `Merge Sort divides the problem in half every pass (O(n log n)), while Bubble Sort repeatedly scans the entire array (O(n²)). For ${n} elements this theoretical gap showed up clearly in practice.`;
    if(wk==='quick'||wk==='merge'||wk==='heap') return `${wa.name}'s O(n log n) average complexity gave it a decisive advantage over ${la.name}'s ${la.avg} for an array of ${n} elements. The gap widens dramatically as input size grows.`;
    if(lk==='bubble'||lk==='selection') return `${la.name} must compare every pair of elements in the worst case — for ${n} elements that's up to ${Math.floor(n*(n-1)/2)} comparisons. ${wa.name}'s smarter strategy needed only ${wc}.`;
    if(wk==='insertion'&&lk==='selection') return `Insertion Sort has an early-exit advantage: once an element is in place it stops shifting. Selection Sort always scans the full remaining array. On this random input Insertion Sort's adaptive nature gave it the edge.`;
    if(wk===lk) return `Both are the same algorithm — performance depends on implementation constants.`;
    return `${wa.name}'s ${wa.avg} average complexity meant it did ${cdiff} fewer comparisons than ${la.name}'s ${la.avg} on this ${n}-element array.`;
  })();

  const useCase0 = (() => {
    if(k0==='bubble')    return 'Nearly-sorted small arrays, educational demos.';
    if(k0==='selection') return 'Write-limited storage (flash), small arrays where swaps are expensive.';
    if(k0==='insertion') return 'Small arrays, nearly-sorted data, online sorting (streaming).';
    if(k0==='shell')     return 'Medium arrays in memory-constrained environments.';
    if(k0==='merge')     return 'Linked lists, stable sort requirement, guaranteed O(n log n).';
    if(k0==='quick')     return 'General-purpose sorting, large random arrays in practice.';
    if(k0==='heap')      return 'Guaranteed O(n log n) with O(1) space, real-time systems.';
    if(k0==='counting')  return 'Integers in small known range (scores, ages, characters).';
    if(k0==='radix')     return 'Fixed-width integers, phone numbers, IP addresses.';
    return 'General use cases.';
  })();
  const useCase1 = (() => {
    if(k1==='bubble')    return 'Nearly-sorted small arrays, educational demos.';
    if(k1==='selection') return 'Write-limited storage (flash), small arrays where swaps are expensive.';
    if(k1==='insertion') return 'Small arrays, nearly-sorted data, online sorting (streaming).';
    if(k1==='shell')     return 'Medium arrays in memory-constrained environments.';
    if(k1==='merge')     return 'Linked lists, stable sort requirement, guaranteed O(n log n).';
    if(k1==='quick')     return 'General-purpose sorting, large random arrays in practice.';
    if(k1==='heap')      return 'Guaranteed O(n log n) with O(1) space, real-time systems.';
    if(k1==='counting')  return 'Integers in small known range (scores, ages, characters).';
    if(k1==='radix')     return 'Fixed-width integers, phone numbers, IP addresses.';
    return 'General use cases.';
  })();

  const content=document.getElementById('verdictContent');
  content.innerHTML=`
    <div class="verdict-trophy">
      <div class="verdict-trophy-icon">🏆</div>
      <div>
        <div class="verdict-winner-name">${wa.name} wins!</div>
        <div class="verdict-winner-sub">${wc} comparisons · ${cmpCounts[overall].s} swaps · ${wt}ms on ${n} elements</div>
      </div>
    </div>

    <div class="verdict-stats-grid">
      <div class="verdict-stat-card highlight">
        <div class="verdict-stat-label">Comparison Ratio</div>
        <div class="verdict-stat-val">${cratio}×</div>
        <div class="verdict-stat-sub">${wa.name} was ${cratio}× fewer</div>
      </div>
      <div class="verdict-stat-card">
        <div class="verdict-stat-label">Comparison Diff</div>
        <div class="verdict-stat-val">${cdiff.toLocaleString()}</div>
        <div class="verdict-stat-sub">fewer comparisons won</div>
      </div>
      <div class="verdict-stat-card">
        <div class="verdict-stat-label">Time Ratio</div>
        <div class="verdict-stat-val">${tratio}×</div>
        <div class="verdict-stat-sub">${wt}ms vs ${lt}ms</div>
      </div>
      <div class="verdict-stat-card">
        <div class="verdict-stat-label">Array Size</div>
        <div class="verdict-stat-val">${n}</div>
        <div class="verdict-stat-sub">elements compared</div>
      </div>
    </div>

    <div class="verdict-analysis">
      <div class="verdict-analysis-section">
        <div class="verdict-analysis-title">🧠 Why ${wa.name} won</div>
        ${analysisWhy}
      </div>
      <div class="verdict-analysis-section">
        <div class="verdict-analysis-title">📊 Numbers breakdown</div>
        <strong style="color:var(--accent)">${a0.name}:</strong> ${c0} comparisons, ${s0} swaps, ${t0}ms — average complexity ${a0.avg}<br/>
        <strong style="color:var(--accent2)">${a1.name}:</strong> ${c1} comparisons, ${s1} swaps, ${t1}ms — average complexity ${a1.avg}
      </div>
      <div class="verdict-analysis-section">
        <div class="verdict-analysis-title">🎯 When to use each</div>
        <strong style="color:var(--accent)">${a0.name}:</strong> ${useCase0}<br/>
        <strong style="color:var(--accent2)">${a1.name}:</strong> ${useCase1}
      </div>
      <div class="verdict-analysis-section">
        <div class="verdict-analysis-title">💡 Key takeaway</div>
        ${overall===winC&&overall===winS ? `${wa.name} dominated in every metric — fewer comparisons, fewer swaps, and faster time. This match wasn't close.` :
          `The result was mixed: ${cmpCounts[winC].c<cmpCounts[1-winC].c?(ALGOS[cmpAlgos[winC]].name+' needed fewer comparisons'):(ALGOS[cmpAlgos[winT]].name+' finished faster')} but overall ${wa.name} edged ahead. The "best" algorithm depends on what you're optimising for.`}
        Try increasing the array size — the performance gap grows dramatically for O(n²) vs O(n log n) algorithms.
      </div>
    </div>
  `;
  document.getElementById('verdictPlaceholder').style.display='none';
  content.style.display='';
  // Switch to verdict tab
  showAnalysisTab('verdict');
}

// ═══════════════════════════════════════════════════════
// ALGORITHM DETAILS KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════
const ALGO_DETAILS = {
  bubble:      { icon:'🫧', type:'Sorting Algorithm',    badges:['sort','stable','inplace'],    what:`Bubble Sort repeatedly steps through the array, compares adjacent elements, and swaps them if out of order. After each pass the largest unsorted element "bubbles up" to its correct position at the end.`, how:['Start at index 0.','Compare arr[j] and arr[j+1]. If left is bigger, swap.','Advance one step and repeat.','After one full pass, the largest element is in its final spot.','Repeat for remaining unsorted portion.','Stop early if a full pass completes with no swaps.'], analogy:`Sorting a line of students by height: walk the line swapping any tall-before-short pairs. After each walk the tallest remaining student has reached the back.`, pros:['Simple to understand — great for learning.','In-place, O(1) extra memory.','Detects already-sorted arrays in O(n) with early-exit.','Stable.'], cons:['O(n²) average and worst case — very slow on large data.','Performs far more swaps than necessary.','Never used in production.'], when:`Use only for education or tiny arrays (under ~20 elements). In real code always prefer Merge Sort or Quick Sort.`, code:`function bubbleSort(arr):\n  n = len(arr)\n  for i in 0..n-1:\n    swapped = false\n    for j in 0..n-i-2:\n      if arr[j] > arr[j+1]:\n        swap(arr[j], arr[j+1])\n        swapped = true\n    if not swapped: break  // early exit`, funfact:`Donald Knuth called it "the most famous thoroughly bad algorithm." Despite this, it's taught in almost every CS course because its logic is so easy to visualise.` },
  selection:   { icon:'🔍', type:'Sorting Algorithm',    badges:['sort','unstable','inplace'],  what:`Selection Sort repeatedly finds the minimum element in the unsorted portion and swaps it to the front. The sorted region grows from left to right one element at a time.`, how:['Set position i = 0.','Scan positions i..n-1 to find the minimum.','Swap the minimum with arr[i].','Advance i by 1.','Repeat until i reaches the end.'], analogy:`Sorting cards from a spread pile: always pick the lowest remaining card and place it next in line.`, pros:['At most O(n) swaps — good when writes are expensive.','Simple logic.','In-place.'], cons:['Always O(n²) comparisons regardless of input.','Not stable.'], when:`When memory writes are expensive (e.g. flash storage). Otherwise prefer Insertion Sort.`, code:`function selectionSort(arr):\n  for i in 0..n-2:\n    minIdx = i\n    for j in i+1..n-1:\n      if arr[j] < arr[minIdx]: minIdx = j\n    swap(arr[i], arr[minIdx])`, funfact:`Selection Sort always makes exactly n−1 swaps, making it uniquely predictable — ideal for write-limited storage media.` },
  insertion:   { icon:'🃏', type:'Sorting Algorithm',    badges:['sort','stable','inplace'],    what:`Insertion Sort builds a sorted array one element at a time, inserting each new element into its correct position within the already-sorted portion by shifting elements right.`, how:['Start with the second element as "key".','Compare key with the element to its left.','Shift left elements right until the correct slot is found.','Insert key in the gap.','Advance to the next element.'], analogy:`Sorting a hand of playing cards: each new card is slid into the correct position among cards you already hold.`, pros:['O(n) best case on nearly-sorted data.','Online: can sort data as it arrives.','Stable, in-place, cache-friendly.','Used inside Timsort for small subarrays.'], cons:['O(n²) average/worst on random data.','Lots of shifting for large arrays.'], when:`Best O(n²) algorithm for small arrays or nearly-sorted data. Used internally by Python and Java for small subarrays.`, code:`function insertionSort(arr):\n  for i in 1..n-1:\n    key = arr[i]\n    j = i-1\n    while j >= 0 and arr[j] > key:\n      arr[j+1] = arr[j]\n      j -= 1\n    arr[j+1] = key`, funfact:`Python's Timsort uses Insertion Sort for runs shorter than 64 elements because sequential shifting is extremely fast on modern CPUs due to cache prefetching.` },
  shell:       { icon:'🐚', type:'Sorting Algorithm',    badges:['sort','unstable','inplace'],  what:`Shell Sort generalises Insertion Sort by comparing elements far apart using a shrinking "gap." Large gaps allow distant elements to jump into place quickly; the final pass (gap=1) is a standard Insertion Sort on a nearly-sorted array.`, how:['Choose starting gap = n/2.','Perform gap-insertion sort: compare elements "gap" apart.','Halve the gap and repeat.','When gap=1, perform standard Insertion Sort (fast since nearly sorted).'], analogy:`Moving a heavy rock across a garden in decreasing leaps rather than one inch at a time.`, pros:['Much faster than Insertion Sort on random data.','In-place, no extra memory.','Very cache-friendly.'], cons:['Complexity depends on gap sequence.','Not stable.'], when:`Good for medium arrays (hundreds to thousands) in memory-constrained environments.`, code:`function shellSort(arr):\n  gap = n/2\n  while gap > 0:\n    for i in gap..n-1:\n      temp = arr[i]; j = i\n      while j >= gap and arr[j-gap] > temp:\n        arr[j] = arr[j-gap]; j -= gap\n      arr[j] = temp\n    gap /= 2`, funfact:`Invented by Donald Shell in 1959 — one of the first algorithms to break the O(n²) barrier. With Ciura's gap sequence it runs in approximately O(n^1.25) in practice.` },
  merge:       { icon:'🔀', type:'Sorting Algorithm',    badges:['sort','stable'],              what:`Merge Sort divides the array in half recursively until subarrays of size 1, then merges sorted halves back together. The merge step combines two sorted arrays into one in O(n) time.`, how:['If length ≤ 1, return (base case).','Split at midpoint.','Recursively sort left half.','Recursively sort right half.','Merge: compare front elements, pick smaller, advance that pointer.','Append remaining elements.'], analogy:`Sorting a giant pile of papers by splitting it repeatedly, having helpers sort small stacks, then merging sorted stacks back into one.`, pros:['Guaranteed O(n log n) in all cases.','Stable.','Parallelises beautifully.','Great for linked lists.'], cons:['O(n) extra memory.','Slower than Quick Sort in practice due to allocation.'], when:`When you need guaranteed O(n log n), are sorting linked lists, or need stability. Basis for Python's Timsort.`, code:`function mergeSort(arr):\n  if len(arr) <= 1: return arr\n  mid = len(arr)/2\n  left = mergeSort(arr[:mid])\n  right = mergeSort(arr[mid:])\n  return merge(left, right)`, funfact:`Invented by John von Neumann in 1945. Still one of the best general-purpose sorts 80 years later.` },
  quick:       { icon:'⚡', type:'Sorting Algorithm',    badges:['sort','unstable','inplace'],  what:`Quick Sort picks a pivot, partitions the array so elements < pivot go left and > pivot go right, then recursively sorts both sides. The pivot ends up in its final sorted position after each partition.`, how:['Choose a pivot (last element, random, or median-of-3).','Partition: rearrange so all < pivot are left, all > pivot are right.','Pivot is now in its final position.','Recursively sort left and right partitions.'], analogy:`A teacher splitting students by score: everyone below the benchmark goes left, everyone above goes right. Repeat for each group.`, pros:['Fastest in practice — excellent cache performance.','In-place, O(log n) stack space.','O(n log n) average case.'], cons:['O(n²) worst case (sorted input with bad pivot choice).','Not stable.'], when:`The go-to for general-purpose sorting. Use randomised pivot to avoid worst case. Basis of C's qsort().`, code:`function partition(arr, lo, hi):\n  pivot = arr[hi]; i = lo-1\n  for j in lo..hi-1:\n    if arr[j] <= pivot:\n      i++; swap(arr[i], arr[j])\n  swap(arr[i+1], arr[hi])\n  return i+1`, funfact:`Invented by Tony Hoare in 1959 while working on machine translation in Moscow. Despite its O(n²) worst case, randomised Quick Sort outperforms even O(n log n) algorithms on real hardware due to superb cache behaviour.` },
  heap:        { icon:'🏔️', type:'Sorting Algorithm',   badges:['sort','unstable','inplace'],  what:`Heap Sort uses a max-heap to repeatedly extract the maximum element, placing it at the end. It builds the heap in O(n) then does n extractions each costing O(log n).`, how:['Build a max-heap from the array (O(n)).','Swap root (max) with the last element.','Shrink the heap by 1.','Restore heap property by sifting down the new root.','Repeat steps 2–4 until heap has 1 element.'], analogy:`A tournament where the winner is placed last, the runner-up is promoted, and a new champion is crowned — repeat until everyone is ranked.`, pros:['Guaranteed O(n log n) in all cases.','In-place, O(1) space.'], cons:['Not stable.','Poor cache performance.','Slower than Quick Sort in practice.'], when:`When you need guaranteed O(n log n) with O(1) space and cannot risk Quick Sort's worst case.`, code:`function heapSort(arr):\n  build_max_heap(arr)\n  for i from n-1 to 1:\n    swap(arr[0], arr[i])\n    heapify(arr, i, 0)`, funfact:`Heap Sort invented by J.W.J. Williams in 1964. Heaps are used everywhere: priority queues, Dijkstra, OS schedulers.` },
  counting:    { icon:'🔢', type:'Sorting Algorithm',    badges:['sort','stable'],              what:`Counting Sort counts the frequency of each value, computes prefix sums, then places each element directly into its final position — no comparisons needed.`, how:['Find value range [min, max].','Count frequency of each value.','Compute prefix sums to determine final positions.','Build output array placing each element at its computed position.','Copy back.'], analogy:`Sorting exam papers (0–100) by dropping each paper in the matching numbered box, then collecting boxes in order.`, pros:['O(n+k) time — faster than O(n log n) for small ranges.','Stable.'], cons:['Only works for discrete non-negative keys.','O(k) memory — unusable for huge value ranges.'], when:`Sorting integers or characters within a small known range. Often a subroutine in Radix Sort.`, code:`function countingSort(arr):\n  count[v] = frequency of v in arr\n  // prefix sums\n  for i in 1..range: count[i] += count[i-1]\n  // place elements (stable)\n  for i from n-1 to 0:\n    output[count[arr[i]]-1] = arr[i]\n    count[arr[i]]--`, funfact:`Counting Sort proves the O(n log n) lower bound does NOT apply to all sorts — you can do better when you know something extra about the data.` },
  radix:       { icon:'🧮', type:'Sorting Algorithm',    badges:['sort','stable'],              what:`Radix Sort processes numbers digit by digit from least significant to most significant, using a stable sort (Counting Sort) on each digit. After processing all digits the array is fully sorted.`, how:['Find the maximum number to determine digit count.','For each digit place (ones, tens, hundreds…):','  Use Counting Sort to sort by current digit.','  Ordering of equal-current-digit elements is preserved (stable).','After all digit passes, array is sorted.'], analogy:`Sorting postal packages by zip code: sort by the last digit first, keeping order, then second-to-last, etc. After 5 passes all packages are in perfect order.`, pros:['O(nk) — faster than O(n log n) for fixed-length integers.','Stable.'], cons:['Requires O(n+k) extra memory per pass.','Only integers or fixed-length strings.'], when:`Sorting millions of integers, phone numbers, dates, or IP addresses.`, code:`function radixSort(arr):\n  exp = 1\n  while max(arr)/exp > 0:\n    countingSortByDigit(arr, exp)\n    exp *= 10`, funfact:`Radix Sort was used by punch-card tabulating machines in the 1880 US Census — the exact same digit-by-digit logic from 140 years ago is still in use today.` },
  linear:      { icon:'🔦', type:'Searching Algorithm',  badges:['search'],                     what:`Linear Search scans every element from start to end, comparing each with the target. No sorting required.`, how:['Start at index 0.','Compare arr[i] with target.','If match — return i.','Otherwise advance to i+1.','If end reached without match — return -1.'], analogy:`Looking for a book on a messy unsorted shelf by checking every book one by one.`, pros:['Works on any array — sorted or unsorted.','No preprocessing needed.','O(1) best case.'], cons:['O(n) average/worst.','Slow for large arrays.'], when:`Small or unsorted arrays, or when searching rarely.`, code:`function linearSearch(arr, target):\n  for i in 0..n-1:\n    if arr[i] == target: return i\n  return -1`, funfact:`Despite being "slow," Linear Search beats Binary Search for arrays under ~10 elements because its simplicity means fewer CPU instructions per iteration.` },
  binary:      { icon:'🎯', type:'Searching Algorithm',  badges:['search'],                     what:`Binary Search halves the search space with each comparison: compare the target with the middle element, then discard the half where it cannot be. 30 comparisons suffice for 1 billion elements.`, how:['Set lo=0, hi=n-1.','Compute mid=(lo+hi)/2.','If arr[mid]==target → found.','If arr[mid] < target → search right half (lo=mid+1).','If arr[mid] > target → search left half (hi=mid-1).','Repeat until lo>hi.'], analogy:`Finding a word in a dictionary: open the middle, discard the irrelevant half, repeat.`, pros:['O(log n) — 30 comparisons for 1 billion elements.','Very fast for large sorted arrays.'], cons:['Array must be sorted first.','Requires random access.'], when:`Any time you search a sorted array repeatedly.`, code:`function binarySearch(arr, target):\n  lo, hi = 0, n-1\n  while lo <= hi:\n    mid = (lo+hi)/2\n    if arr[mid] == target: return mid\n    elif arr[mid] < target: lo = mid+1\n    else: hi = mid-1\n  return -1`, funfact:`A famous bug in Java's Arrays.binarySearch() used "mid = (lo+hi)/2" — which overflows for large arrays! The fix: "mid = lo + (hi-lo)/2".` },
  jump:        { icon:'🦘', type:'Searching Algorithm',  badges:['search'],                     what:`Jump Search jumps forward by √n steps until it finds a block where the target could be, then does a short backward linear scan in that block.`, how:['Set step=√n, prev=0, curr=0.','Jump forward by step until arr[curr] ≥ target.','The target must be in the previous block.','Linear scan from prev to curr to find the target.'], analogy:`Searching a phone book by flipping every 50 pages until you overshoot, then scanning back page by page.`, pros:['O(√n) time — much faster than O(n).','Simpler than Binary Search.','Optimal for systems where backtracking is costly.'], cons:['Slower than Binary Search O(log n).','Requires sorted array.'], when:`Ideal for magnetic tape or disk where backward seeks are expensive.`, code:`function jumpSearch(arr, target):\n  step = √n; prev = 0\n  while arr[min(step,n)-1] < target:\n    prev=step; step+=√n\n  for i in prev..min(step,n)-1:\n    if arr[i]==target: return i\n  return -1`, funfact:`Designed specifically for magnetic tape drives where seeking backward is extremely slow — an increasingly rare but fascinating use case.` },
  interpolation:{ icon:'📐', type:'Searching Algorithm', badges:['search'],                     what:`Interpolation Search estimates where the target is likely to be based on its value relative to the range, rather than always checking the middle. Like opening a dictionary near "Z" when looking for "Zebra."`, how:['pos = lo + ((target-arr[lo]) / (arr[hi]-arr[lo])) × (hi-lo)','Check arr[pos].','If equal — found.','If arr[pos] < target → lo = pos+1.','If arr[pos] > target → hi = pos-1.'], analogy:`Estimating which page your word is on based on its alphabetical position, rather than always opening to the middle.`, pros:['O(log log n) average for uniform data — faster than Binary Search.','Very few comparisons on predictable distributions.'], cons:['O(n) worst case for non-uniform data.','More complex formula.'], when:`Sorted arrays with uniformly distributed numeric values: timestamps, sequential IDs, phone numbers.`, code:`function interpolationSearch(arr, target):\n  lo, hi = 0, n-1\n  while lo<=hi and arr[lo]<=target<=arr[hi]:\n    pos = lo + ((target-arr[lo])*(hi-lo))/(arr[hi]-arr[lo])\n    if arr[pos]==target: return pos\n    if arr[pos]<target: lo=pos+1\n    else: hi=pos-1\n  return -1`, funfact:`First described by W.W. Peterson in 1957. Under ideal uniform conditions it outperforms every other comparison-based search. In practice, Binary Search wins due to its reliable O(log n) guarantee.` },
  bfs:         { icon:'🌊', type:'Graph Algorithm',      badges:['graph'],                      what:`BFS explores all neighbours of a node before their neighbours — level by level outward from the source. It uses a FIFO queue and finds the shortest path in unweighted graphs.`, how:['Add source to queue, mark visited.','Dequeue front node, process it.','Enqueue all unvisited neighbours, mark them.','Repeat until queue is empty.'], analogy:`A rumour spreading through a social network: you tell 5 friends (level 1), they each tell 5 more (level 2), radiating outward.`, pros:['Finds shortest path (fewest edges) in unweighted graphs.','Visits all reachable nodes.','Foundation for many graph algorithms.'], cons:['O(V) memory for the queue.','Does not find shortest path in weighted graphs.'], when:`Shortest paths in unweighted graphs, web crawlers, social network suggestions, connectivity checks.`, code:`function BFS(graph, start):\n  queue=[start]; visited={start}\n  while queue:\n    node=queue.dequeue()\n    process(node)\n    for nb in neighbors(node):\n      if nb not in visited:\n        visited.add(nb); queue.enqueue(nb)`, funfact:`BFS underlies Facebook friend suggestions, Google's web crawler, and the "six degrees of separation" experiments.` },
  dfs:         { icon:'🕳️', type:'Graph Algorithm',      badges:['graph'],                      what:`DFS dives as deep as possible along each branch before backtracking, using a stack (or recursion) to track the current path. It explores the graph depth-first.`, how:['Mark source as visited.','Pick any unvisited neighbour and move to it.','Repeat — go deeper.','When stuck (no unvisited neighbours), backtrack.','Try the next unvisited neighbour.'], analogy:`Exploring a maze: always walk forward until a dead end, then retrace to the last junction and try a different turn.`, pros:['O(V) memory — very space-efficient.','Natural for recursion, tree traversals, topological sort.'], cons:["Does not find shortest paths.",'Can overflow stack on very deep graphs.'], when:`Topological sort, cycle detection, solving mazes and puzzles, connected components.`, code:`function DFS(node, visited):\n  visited.add(node)\n  process(node)\n  for nb in neighbors(node):\n    if nb not in visited:\n      DFS(nb, visited)`, funfact:`DFS is the backbone of topological sort (used by npm, Make), Tarjan's SCC algorithm, and every chess/Go AI that searches game trees.` },
  dijkstra:    { icon:'🗺️', type:'Graph Algorithm',      badges:['graph'],                      what:`Dijkstra's finds the shortest path from a source to all other nodes in a weighted graph with non-negative weights. It greedily always processes the unvisited node with the smallest known distance.`, how:['dist[source]=0, dist[all others]=∞.','Pick unvisited node u with min dist.','For each neighbour v: if dist[u]+w < dist[v], update dist[v].','Mark u as visited.','Repeat until all visited.'], analogy:`Planning road trips from your city: always visit the closest unvisited city next, updating travel times to all cities reachable from it.`, pros:['Exact shortest paths from source to all nodes.','Correct for any non-negative weights.'], cons:['Fails with negative weights (use Bellman-Ford instead).','O((V+E)log V) — slower than BFS for unweighted graphs.'], when:`GPS navigation, network routing (OSPF), game pathfinding, airline scheduling.`, code:`function dijkstra(G, src):\n  dist[src]=0; others=∞\n  pq = MinHeap()\n  while pq:\n    u = pq.extractMin()\n    for (v,w) in adj[u]:\n      if dist[u]+w < dist[v]:\n        dist[v] = dist[u]+w\n        pq.update(v, dist[v])`, funfact:`Edsger Dijkstra designed this algorithm in 20 minutes in a café in Amsterdam in 1956 — without pen or paper — claiming that constraint forced him to find an elegant solution.` },
  astar:       { icon:'⭐', type:'Graph Algorithm',      badges:['graph'],                      what:`A* Search finds the shortest path from source to a specific target using a heuristic function h(n) to estimate remaining cost. It expands nodes ordered by f(n) = g(n) + h(n), where g is actual cost so far. With a good heuristic it explores far fewer nodes than Dijkstra.`, how:['f(n) = g(n) + h(n) where h = Euclidean distance to target.','Add source to open set with f=h(source).','Extract node with minimum f.','If it is the target — reconstruct and return path.','For each neighbour: if a shorter g is found, update and add to open set.','Repeat.'], analogy:`GPS navigation: instead of exploring all roads equally (Dijkstra), A* focuses exploration toward the target city, pruning detours early.`, pros:['Faster than Dijkstra when target is known and a good heuristic exists.','Optimal if heuristic never overestimates (admissible).'], cons:['Memory-intensive — stores all explored nodes.','Quality depends on heuristic design.'], when:`Pathfinding in games and robotics, GPS routing, puzzle solving (15-puzzle, mazes).`, code:`function astar(G, src, tgt, h):\n  open={src}; gScore={src:0}\n  fScore={src: h(src,tgt)}\n  while open:\n    u = min(open, key=fScore)\n    if u==tgt: return reconstruct_path()\n    for (v,w) in adj[u]:\n      tentG = gScore[u]+w\n      if tentG < gScore.get(v, ∞):\n        gScore[v]=tentG\n        fScore[v]=tentG+h(v,tgt)`, funfact:`A* was developed at Stanford in 1968 for Shakey the Robot — one of the first mobile robots. It is still the dominant pathfinding algorithm in video games 55 years later.` },
  bellmanford: { icon:'⚖️', type:'Graph Algorithm',      badges:['graph','negative'],           what:`Bellman-Ford computes shortest paths from a source in graphs that may have negative-weight edges. It relaxes all edges V-1 times, which is enough to propagate the shortest paths. A final pass detects negative cycles (where the total path cost can decrease indefinitely).`, how:['Set dist[source]=0, dist[others]=∞.','Repeat V-1 times: for every edge (u,v,w), if dist[u]+w < dist[v], update dist[v].','Optional: a V-th pass detects if any distance can still be reduced — indicating a negative cycle.'], analogy:`A slow but thorough path-checker: it re-evaluates every road in the map V-1 times, guaranteed to find the best route even through roads with negative costs (like toll credits).`, pros:['Handles negative-weight edges — unique among common shortest-path algorithms.','Simple to implement.','Detects negative cycles.'], cons:['O(VE) — much slower than Dijkstra.','Not suitable for large dense graphs.'], when:`Graphs with negative weights: financial arbitrage detection, network flow problems, currency exchange routing.`, code:`function bellmanFord(G, src):\n  dist[src]=0; others=∞\n  for i in 1..V-1:\n    for each edge (u,v,w):\n      if dist[u]+w < dist[v]:\n        dist[v] = dist[u]+w\n  // Negative cycle check:\n  for each edge (u,v,w):\n    if dist[u]+w < dist[v]:\n      print("Negative cycle!")`, funfact:`Bellman-Ford independently discovered by Richard Bellman (1958) and Lester Ford Jr. (1956). It is used in BGP — the routing protocol that holds the entire internet together — specifically because it handles networks with varying link costs.` },
  prim:        { icon:'🌲', type:'Graph Algorithm',      badges:['graph','mst'],                what:`Prim's Algorithm builds a Minimum Spanning Tree (MST) — a tree connecting all nodes with minimum total edge weight. It grows the MST one edge at a time, always adding the cheapest edge that connects the current MST to a new node.`, how:['Start with any single node in the MST.','Find the minimum-weight edge connecting the MST to any non-MST node.','Add that edge and node to the MST.','Repeat until all nodes are in the MST.'], analogy:`Building a road network connecting all cities at minimum cost: always build the cheapest road that connects an unconnected city to your existing road network.`, pros:['Efficient with a priority queue: O(E log V).','Works well on dense graphs.','Produces an exact MST.'], cons:['Only works on connected graphs.','Does not handle disconnected graphs (use Kruskal for forests).'], when:`Network design (electrical grids, water pipes, telecom cables), circuit design, approximate TSP solutions.`, code:`function prim(G):\n  inMST = {start}\n  while inMST.size < V:\n    find min-weight edge (u,v) where u in MST, v not in MST\n    add v to MST\n    add edge (u,v) to MST edges`, funfact:`Prim's was developed by Vojtěch Jarník in 1930, then independently rediscovered by Robert Prim (1957) and Dijkstra (1959). The algorithm that bears Prim's name was actually invented 27 years earlier!` },
  kruskal:     { icon:'🔗', type:'Graph Algorithm',      badges:['graph','mst'],                what:`Kruskal's Algorithm builds an MST by sorting all edges by weight and adding them one by one, skipping any edge that would form a cycle. It uses a Union-Find (disjoint set) data structure to efficiently detect cycles.`, how:['Sort all edges by weight ascending.','For each edge in sorted order:','  If it connects two different components (no cycle) → add to MST.','  If it would form a cycle → skip.','Stop when V-1 edges have been added.'], analogy:`Selecting the cheapest available roads to connect all cities, but skipping any road that would create a detour loop (cycle) since you only need a tree.`, pros:['Efficient for sparse graphs: O(E log E).','Works on disconnected graphs (produces a spanning forest).','Simple greedy logic.'], cons:['Requires sorting all edges upfront.','Slower than Prim on dense graphs.'], when:`Sparse graphs, network cable laying, cluster analysis, image segmentation.`, code:`function kruskal(G):\n  sort edges by weight\n  uf = UnionFind(V)\n  for each edge (u,v,w) in sorted order:\n    if uf.find(u) != uf.find(v):  // no cycle\n      uf.union(u, v)\n      add edge to MST`, funfact:`Kruskal's Algorithm was published by Joseph Kruskal in 1956. The Union-Find data structure it relies on was later optimised to near-O(1) per operation using path compression and union by rank — one of the most elegant results in computer science.` },
};

function showDetails(key) {
  const d=ALGO_DETAILS[key]; if(!d) return;
  const panel=document.getElementById('detailsPanel'); panel.classList.add('visible');
  document.getElementById('detailsIcon').textContent=d.icon;
  document.getElementById('detailsName').textContent=ALGOS[key].name;
  document.getElementById('detailsType').textContent=d.type;
  const badgeMap={sort:['badge-sort','Sorting'],search:['badge-search','Searching'],graph:['badge-graph','Graph'],mst:['badge-mst','MST'],stable:['badge-stable','Stable'],unstable:['badge-unstable','Unstable'],inplace:['badge-inplace','In-Place'],negative:['badge-negative','Negative Weights']};
  document.getElementById('detailsBadges').innerHTML=d.badges.map(b=>{ const[cls,label]=badgeMap[b]||['badge-inplace',b]; return `<span class="badge ${cls}">${label}</span>`; }).join('');
  document.getElementById('detailsWhat').textContent=d.what;
  document.getElementById('detailsHow').innerHTML=d.how.map((s,i)=>`<li data-n="${i+1}">${s}</li>`).join('');
  document.getElementById('detailsAnalogy').textContent=d.analogy;
  document.getElementById('detailsPros').innerHTML=d.pros.map(p=>`<li>${p}</li>`).join('');
  document.getElementById('detailsCons').innerHTML=d.cons.map(c=>`<li>${c}</li>`).join('');
  document.getElementById('detailsWhen').textContent=d.when;
  document.getElementById('detailsCode').textContent=d.code;
  document.getElementById('detailsFunFact').textContent=d.funfact;
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  speedSlider = document.getElementById('speedSlider');
  sizeSlider  = document.getElementById('sizeSlider');
  speedSlider.addEventListener('input', () => { document.getElementById('speedVal').textContent = speedSlider.value; });
  initGraphCanvasEvents();
  newArray();
});

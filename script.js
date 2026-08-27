/* TapTyping - lightweight typing engine */
const $ = id => document.getElementById(id);
const display = $('words');
let WORDS = [];
let modeType = 'time', duration = 15, targetWords = 25;
let expectedText = '', currentWords = [], charEls = [];
let currentIndex = 0, typedChars = [], correctCount = 0, started = false, finished = false;
let startTime = 0, timer = null, history = [], lastHistorySecond = -1;
let finalResult = null, caretRaf = 0, pendingCaret = false;
const timePresets = [15, 30, 60, 120], wordPresets = [10, 25, 50, 100];

async function loadWords() {
  try {
    const r = await fetch('words.txt', {cache:'no-store'});
    if (!r.ok) throw new Error('words');
    WORDS = (await r.text()).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  } catch {
    WORDS = 'the and you that with have this from time more make like work know good right people world life place great small house water light sound game play type'.split(' ');
  }
  newTest();
}
function pickWords(n) { return Array.from({length:n}, () => WORDS[Math.floor(Math.random()*WORDS.length)]); }
function escapeHtml(s) { return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function testText() { return currentWords.join(' '); }

function buildLines() {
  const maxChars = window.innerWidth <= 700 ? 38 : 64;
  const lines = [];
  let start = 0, line = '';
  for (let i=0;i<expectedText.length;i++) {
    const ch = expectedText[i];
    if (line.length >= maxChars && ch === ' ') { lines.push({start, text:line}); line=''; start=i+1; continue; }
    if (line.length >= maxChars) { lines.push({start, text:line}); line=''; start=i; }
    line += ch;
  }
  if (line) lines.push({start, text:line});
  return lines;
}
function renderText() {
  const lines = buildLines();
  let html = '';
  let wordIndex = 0;
  for (const ln of lines) {
    let h = '', j = 0;
    while (j < ln.text.length) {
      const global = ln.start + j;
      if (expectedText[global] === ' ') {
        h += '<span class="space"> </span>';
        j++;
        wordIndex++;
        continue;
      }
      let k = j;
      while (k < ln.text.length && expectedText[ln.start + k] !== ' ') k++;
      let wh = `<span class="word" data-word="${wordIndex}">`;
      for (let q=j;q<k;q++) {
        const idx = ln.start + q;
        wh += `<span data-index="${idx}" class="char untyped">${escapeHtml(ln.text[q])}</span>`;
      }
      wh += '</span>';
      h += wh;
      j = k;
    }
    html += `<div class="word-line" data-start="${ln.start}" data-end="${ln.start+ln.text.length}">${h}</div>`;
  }
  display.innerHTML = `<div class="word-lines">${html}</div><div id="caret" class="caret" aria-hidden="true"></div>`;
  currentVisualChar = null;
  charEls = [...display.querySelectorAll('.char')];
  positionCaret(true);
  setCurrentWord();
  positionLines(false);
}
let currentVisualChar = null;
function setCurrentWord() {
  if (currentVisualChar) currentVisualChar.classList.remove('current-char');
  currentVisualChar = charEls[Math.min(currentIndex, Math.max(0, charEls.length - 1))] || null;
  if (currentVisualChar) currentVisualChar.classList.add('current-char');
}

function currentLineFor(idx) {
  const lines = [...display.querySelectorAll('.word-line')];
  for (let i=0;i<lines.length;i++) if (idx < Number(lines[i].dataset.end) || i === lines.length-1) return i;
  return 0;
}
function positionLines(animate=true) {
  const wrap = display.querySelector('.word-lines');
  if (!wrap) return;
  const lineH = window.innerWidth <= 700 ? 34 : 42;
  const line = currentLineFor(currentIndex);
  const center = (display.clientHeight-lineH)/2;
  const y = center-line*lineH;
  wrap.style.transition = animate ? 'transform .20s cubic-bezier(.2,.75,.2,1)' : 'none';
  wrap.style.transform = `translate3d(0,${y}px,0)`;
  if (!animate) requestAnimationFrame(()=>wrap.style.transition='transform .20s cubic-bezier(.2,.75,.2,1)');
  scheduleCaret();
  setCurrentWord();
}
function positionCaret(force=false) {
  const caret = $('caret');
  if (!caret || !display) return;
  const target = charEls[Math.min(currentIndex, charEls.length-1)];
  if (!target) return;
  const dr = display.getBoundingClientRect(), tr = target.getBoundingClientRect();
  caret.style.transform = `translate3d(${tr.left-dr.left-1}px,${tr.top-dr.top + tr.height*.08}px,0)`;
  caret.style.height = `${Math.max(22, tr.height*.88)}px`;
  if (force) caret.classList.add('ready');
}
function scheduleCaret() {
  if (pendingCaret) return;
  pendingCaret = true;
  caretRaf = requestAnimationFrame(()=>{ pendingCaret=false; positionCaret(); });
}
function updateChar(index, actual) {
  const el = charEls[index]; if (!el) return;
  el.classList.remove('untyped','correct','wrong');
  el.classList.add(actual === expectedText[index] ? 'correct' : 'wrong');
  if (actual === expectedText[index]) correctCount++;
}
function clearChar(index) {
  const el = charEls[index]; if (!el) return;
  if (typedChars[index] === expectedText[index]) correctCount = Math.max(0, correctCount - 1);
  el.classList.remove('correct','wrong'); el.classList.add('untyped');
}
function metrics() {
  const elapsed = startTime ? Math.max((performance.now()-startTime)/1000, 0.001) : 0;
  const correct = correctCount;
  const total = typedChars.length;
  const incorrect = Math.max(0,total-correct);
  const minutes = Math.max(elapsed/60, 1/3600000);
  const raw = (total/5)/minutes;
  const wpm = Math.max(0,(correct/5)/minutes); // Monkeytype-style net WPM
  const acc = total ? (correct/total)*100 : 100;
  return {elapsed,correct,incorrect,total,raw,wpm,acc};
}
function updateLive() {
  if (!started || finished) return;
  const m = metrics();
  $('wpm').textContent = Math.round(m.wpm);
  $('raw').textContent = Math.round(m.raw);
  $('acc').textContent = Math.round(m.acc);
  if (modeType === 'time') {
    const left = Math.max(0,duration-m.elapsed);
    $('time').textContent = Math.ceil(left);
    if (left <= 0) finish();
  } else {
    const completed = countCompletedWords();
    $('time').textContent = Math.max(0,targetWords-completed);
    if (completed >= targetWords) finish();
  }
}
function recordHistory(force=false) {
  const m=metrics(), t=Math.floor(m.elapsed);
  if (!force && t===lastHistorySecond) return;
  lastHistorySecond=t;
  history.push({t,wpm:m.wpm,raw:m.raw,acc:m.acc});
}
function countCompletedWords() {
  if (!typedChars.length) return 0;
  let count=0;
  for (let i=0;i<typedChars.length;i++) if (typedChars[i] === ' ' && i < expectedText.length) count++;
  return count;
}
function beginTest() {
  if (started || finished) return;
  started=true; startTime=performance.now();
  history=[{t:0,wpm:0,raw:0,acc:100}]; lastHistorySecond=0;
  timer=setInterval(()=>{recordHistory();updateLive()},100);
}
function finish() {
  if (finished || !started) return;
  recordHistory(true); finished=true; clearInterval(timer); timer=null;
  const m=metrics();
  const score=Math.max(0,Math.round(m.wpm*0.8 + m.acc*2));
  finalResult={wpm:Math.round(m.wpm),raw:Math.round(m.raw),acc:Math.round(m.acc),score,date:new Date().toLocaleString(),duration,mode:modeType,words:targetWords};
  $('modalWpm').textContent=finalResult.wpm; $('modalRaw').textContent=finalResult.raw; $('modalAcc').textContent=finalResult.acc+'%'; $('modalScore').textContent=score;
  $('resultsSubtitle').textContent=modeType==='time'?`${duration} second test`:`${targetWords} word test`;
  autoSave(); $('resultsOverlay').classList.remove('hidden'); requestAnimationFrame(drawGraph);
}
function autoSave() {
  const scores=JSON.parse(localStorage.getItem('taptyping_scores')||'[]');
  scores.push(finalResult); scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem('taptyping_scores',JSON.stringify(scores.slice(0,100)));
}
function newTest() {
  clearInterval(timer); timer=null; started=false; finished=false; startTime=0; currentIndex=0; typedChars=[]; correctCount=0; finalResult=null; history=[]; lastHistorySecond=-1;
  const amount=modeType==='words'?targetWords:Math.max(500,Math.ceil(duration*6));
  currentWords=pickWords(amount); expectedText=testText();
  $('resultsOverlay').classList.add('hidden'); $('wpm').textContent='0'; $('raw').textContent='0'; $('acc').textContent='100';
  $('time').textContent=modeType==='words'?targetWords:duration; $('timeUnit').textContent=modeType==='words'?' words':'s';
  renderText();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); newTest(); return; }
  if (finished || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || e.repeat) return;
  if (e.key === 'Backspace') {
    e.preventDefault();
    if (!started || currentIndex===0) return;
    currentIndex--; typedChars.pop(); clearChar(currentIndex);
    positionLines(true); updateLive(); scheduleCaret(); return;
  }
  if (e.key.length !== 1) return;
  e.preventDefault();
  beginTest();
  if (currentIndex >= expectedText.length) return;
  typedChars.push(e.key); updateChar(currentIndex,e.key); currentIndex++;
  setCurrentWord();
  const oldLine=currentLineFor(currentIndex-1), newLine=currentLineFor(currentIndex);
  if (oldLine!==newLine) positionLines(true); else scheduleCaret();
  updateLive();
  if (modeType==='words' && countCompletedWords() >= targetWords) finish();
  else if (currentIndex>=expectedText.length) finish();
});

function openMode(type) {
  const box=$('modeMenu');
  const values=type==='time'?timePresets:wordPresets;
  box.innerHTML=values.map(v=>`<button data-v="${v}">${v}${type==='time'?'s':' words'}</button>`).join('') + '<button data-v="custom">custom</button>';
  box.dataset.type=type; box.classList.remove('hidden');
}
$('timeMenu').onclick=e=>{e.stopPropagation();openMode('time')};
$('wordsMenu').onclick=e=>{e.stopPropagation();openMode('words')};
$('modeMenu').onclick=e=>{
  const b=e.target.closest('button'); if(!b)return;
  const type=$('modeMenu').dataset.type;
  let v=b.dataset.v==='custom'?Number(prompt(type==='time'?'Custom time in seconds:':'Custom word count:',type==='time'?45:75)):Number(b.dataset.v);
  if(!Number.isFinite(v))return;
  if(type==='time') duration=Math.round(Math.max(1,Math.min(3600,v))); else targetWords=Math.round(Math.max(1,Math.min(1000,v)));
  $('timeMenu').querySelector('span').textContent=duration; $('wordsMenu').querySelector('span').textContent=targetWords;
  modeType=type; $('timeMenu').classList.toggle('active',type==='time'); $('wordsMenu').classList.toggle('active',type==='words');
  $('modeMenu').classList.add('hidden'); newTest();
};
document.addEventListener('click',()=> $('modeMenu').classList.add('hidden'));
$('restart').onclick=newTest; $('again').onclick=newTest; $('closeResults').onclick=()=>{$('resultsOverlay').classList.add('hidden');newTest()};
$('theme').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('taptyping_theme',document.body.classList.contains('light')?'light':'dark')};
if(localStorage.getItem('taptyping_theme')==='light') document.body.classList.add('light');
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(b.dataset.page).classList.remove('hidden');if(b.dataset.page==='rankings')renderRankings();if(b.dataset.page==='stats')renderStats()});
window.addEventListener('resize',()=>{if(!expectedText)return;const old=typedChars.slice();renderText();for(let i=0;i<old.length;i++)updateChar(i,old[i]);currentIndex=old.length;positionLines(false);});
function drawGraph(){const c=$('wpmGraph'),r=c.getBoundingClientRect(),d=devicePixelRatio||1,w=r.width,h=r.height;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);if(!history.length)return;const l=36,rr=12,top=15,bottom=25,gw=w-l-rr,gh=h-top-bottom,max=Math.max(20,...history.map(p=>Math.max(p.raw,p.wpm))),total=Math.max(1,modeType==='time'?duration:history.at(-1).t);x.strokeStyle=getComputedStyle(document.body).getPropertyValue('--grid');for(let i=0;i<4;i++){const y=top+gh*i/3;x.beginPath();x.moveTo(l,y);x.lineTo(w-rr,y);x.stroke()}function series(key,scale){x.beginPath();history.forEach((p,i)=>{const px=l+p.t/total*gw,py=top+gh-p[key]/scale*gh;i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=key==='wpm'?'#4be3ff':key==='raw'?'#8094a8':'#ffb84b';x.lineWidth=2;x.stroke()}series('raw',max);series('wpm',max);series('acc',100)}
function scores(){return JSON.parse(localStorage.getItem('taptyping_scores')||'[]')}
function renderRankings(){const s=scores();$('rankTable').innerHTML=!s.length?'<div class="empty">No tests yet.</div>':'<div class="row head"><span>#</span><span>date</span><span>wpm</span><span>accuracy</span><span>score</span></div>'+s.slice(0,25).map((x,i)=>`<div class="row"><span>${i+1}</span><span>${escapeHtml(x.date)}</span><strong>${x.wpm}</strong><span>${x.acc}%</span><strong>${x.score}</strong></div>`).join('')}
function renderStats(){const s=scores();$('count').textContent=s.length;$('best').textContent=s.length?Math.max(...s.map(x=>x.wpm)):0;$('average').textContent=s.length?Math.round(s.reduce((a,x)=>a+x.wpm,0)/s.length):0;$('bestacc').textContent=s.length?Math.max(...s.map(x=>x.acc))+'%':'0%'}
loadWords();

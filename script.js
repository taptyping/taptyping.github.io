let WORDS=[];
let modeType='time',duration=15,targetWords=25;
let started=false,finished=false,startTime=0,timer=null,currentWords=[],typed='',finalResult=null,history=[],lastHistorySecond=-1;
let expectedText='', charEls=[], lineEls=[], currentIndex=0;
const $=id=>document.getElementById(id),display=$('words');
const timePresets=[15,30,60,120],wordPresets=[10,25,50,100];

async function loadWords(){
  try{const r=await fetch('words.txt',{cache:'no-store'});if(!r.ok)throw 0;WORDS=(await r.text()).split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
  catch(e){WORDS='the and you that with have this from time more make like work know good right people world life place great small house water light sound game play type'.split(' ')}
  newTest();
}
function pickWords(n){return Array.from({length:n},()=>WORDS[Math.floor(Math.random()*WORDS.length)])}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function testText(){return currentWords.join(' ')}
function buildLines(){
  const maxChars=window.innerWidth<=700?38:64, lines=[], text=expectedText;
  let start=0,line='';
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(line.length>=maxChars && ch===' '){lines.push({start,text:line});line='';start=i+1;continue}
    if(line.length>=maxChars){lines.push({start,text:line});line='';start=i}
    line+=ch;
  }
  if(line)lines.push({start,text:line});
  return lines;
}
function currentLineIndex(){
  for(let i=0;i<lineEls.length;i++){const end=Number(lineEls[i].dataset.end);if(currentIndex<end||i===lineEls.length-1)return i}
  return 0;
}
function renderInitial(){
  const lines=buildLines(); let html=''; charEls=[]; lineEls=[];
  lines.forEach(ln=>{
    let h=''; for(let j=0;j<ln.text.length;j++){const idx=ln.start+j;h+=`<span data-index="${idx}" class="${idx===0?'current':'untyped'}">${escapeHtml(ln.text[j])}</span>`}
    html+=`<div class="word-line" data-start="${ln.start}" data-end="${ln.start+ln.text.length}">${h}</div>`;
  });
  display.innerHTML=`<div class="word-lines">${html}</div>`;
  charEls=[...display.querySelectorAll('[data-index]')]; lineEls=[...display.querySelectorAll('.word-line')];
  positionLines(false);
}
function positionLines(animate=true){
  const wrap=display.querySelector('.word-lines');if(!wrap)return;
  const lineH=window.innerWidth<=700?34:42, line=currentLineIndex();
  const center=(display.clientHeight-lineH)/2, y=center-line*lineH;
  if(!animate)wrap.style.transition='none'; else wrap.style.transition='transform .18s cubic-bezier(.2,.7,.2,1)';
  wrap.style.transform=`translate3d(0,${y}px,0)`;
  if(!animate)requestAnimationFrame(()=>wrap.style.transition='transform .18s cubic-bezier(.2,.7,.2,1)');
}
function updateChar(index,actual){
  const el=charEls[index]; if(!el)return;
  el.classList.remove('current','untyped','correct','wrong');
  el.classList.add(actual===expectedText[index]?'correct':'wrong');
}
function moveCaret(from,to){
  if(charEls[from])charEls[from].classList.remove('current');
  if(charEls[to])charEls[to].classList.add('current');
}
function renderAfterInput(oldIndex){
  moveCaret(oldIndex,currentIndex);
  const oldLine=currentLineIndexFor(oldIndex),newLine=currentLineIndex();
  if(oldLine!==newLine)positionLines(true);
}
function currentLineIndexFor(idx){for(let i=0;i<lineEls.length;i++){if(idx<Number(lineEls[i].dataset.end)||i===lineEls.length-1)return i}return 0}
function newTest(){
  clearInterval(timer);timer=null;started=false;finished=false;startTime=0;typed='';currentIndex=0;finalResult=null;history=[];lastHistorySecond=-1;
  const amount=modeType==='words'?targetWords:Math.max(500,Math.ceil(duration*6));
  currentWords=pickWords(amount);expectedText=testText();
  $('resultsOverlay').classList.add('hidden');$('wpm').textContent='0';$('raw').textContent='0';$('acc').textContent='100';$('time').textContent=modeType==='words'?targetWords:duration;$('timeUnit').textContent=modeType==='words'?' words':'s';
  renderInitial();
}
function metrics(){
  const elapsed=startTime?Math.max((performance.now()-startTime)/1000,0.001):0;
  let correct=0;for(let i=0;i<typed.length;i++)if(typed[i]===expectedText[i])correct++;
  const incorrect=Math.max(0,typed.length-correct),minutes=elapsed/60;
  const raw=(typed.length/5)/minutes;
  const penalty=(incorrect/5)/minutes;
  const wpm=Math.max(0,raw-penalty);
  const accuracy=typed.length?correct/typed.length*100:100;
  return{wpm,raw,acc:accuracy,elapsed,correct,incorrect};
}
function updateLive(){if(!started||finished)return;const m=metrics();$('wpm').textContent=Math.round(m.wpm);$('raw').textContent=Math.round(m.raw);$('acc').textContent=Math.round(m.acc);
  if(modeType==='time'){const left=Math.max(0,duration-m.elapsed);$('time').textContent=Math.ceil(left);if(left<=0)finish()}
  else{const completed=countCompletedWords();$('time').textContent=Math.max(0,targetWords-completed);if(completed>=targetWords)finish()}
}
function recordHistory(force=false){const m=metrics(),t=Math.floor(m.elapsed);if(!force&&t===lastHistorySecond)return;lastHistorySecond=t;history.push({t,wpm:m.wpm,raw:m.raw,acc:m.acc})}
function countCompletedWords(){if(!typed)return 0;let count=0;for(let i=0;i<typed.length;i++)if(typed[i]===' '&&i<expectedText.length)count++;return count}
function finish(){if(finished||!started)return;recordHistory(true);finished=true;clearInterval(timer);timer=null;const m=metrics();
  const score=Math.max(0,Math.round(m.wpm* (m.acc/100)));
  finalResult={wpm:Math.round(m.wpm),raw:Math.round(m.raw),acc:Math.round(m.acc),score,date:new Date().toLocaleString(),duration,mode:modeType,words:targetWords};
  $('modalWpm').textContent=finalResult.wpm;$('modalRaw').textContent=finalResult.raw;$('modalAcc').textContent=finalResult.acc+'%';$('modalScore').textContent=score;$('resultsSubtitle').textContent=modeType==='time'?`${duration} second test`:`${targetWords} word test`;
  autoSave();$('resultsOverlay').classList.remove('hidden');requestAnimationFrame(drawGraph);
}
function autoSave(){const scores=JSON.parse(localStorage.getItem('taptyping_scores')||'[]');scores.push(finalResult);scores.sort((a,b)=>b.score-a.score);localStorage.setItem('taptyping_scores',JSON.stringify(scores.slice(0,100)))}
function beginTest(){if(started||finished)return;started=true;startTime=performance.now();history=[{t:0,wpm:0,raw:0,acc:100}];lastHistorySecond=0;timer=setInterval(()=>{recordHistory();updateLive()},100)}

document.addEventListener('keydown',e=>{
  if(e.key==='Tab'){e.preventDefault();newTest();return}
  if(finished||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.repeat)return;
  if(e.key==='Backspace'){e.preventDefault();if(!started||currentIndex===0)return;currentIndex--;typed=typed.slice(0,-1);const el=charEls[currentIndex];el.classList.remove('correct','wrong');el.classList.add('current');renderAfterInput(currentIndex+1);updateLive();return}
  if(e.key.length!==1)return;e.preventDefault();beginTest();
  if(currentIndex>=expectedText.length){finish();return}
  const old=currentIndex,actual=e.key;typed+=actual;updateChar(currentIndex,actual);currentIndex++;
  if(currentIndex<expectedText.length)renderAfterInput(old);else{moveCaret(old,currentIndex);finish()}
  updateLive();
});

function openMode(type){const box=$('modeMenu');const values=type==='time'?timePresets:wordPresets;box.innerHTML=values.map(v=>`<button data-v="${v}">${v}${type==='time'?' seconds':' words'}</button>`).join('')+`<button data-v="custom">custom</button>`;box.classList.remove('hidden');box.dataset.type=type}
$('timeMenu').onclick=e=>{e.stopPropagation();openMode('time')};$('wordsMenu').onclick=e=>{e.stopPropagation();openMode('words')};
$('modeMenu').onclick=e=>{const b=e.target.closest('button');if(!b)return;const type=$('modeMenu').dataset.type;let v=b.dataset.v==='custom'?Number(prompt(type==='time'?'Custom time in seconds:':'Custom word count:',type==='time'?45:75)):Number(b.dataset.v);if(!Number.isFinite(v))return;if(type==='time')duration=Math.round(Math.max(1,Math.min(3600,v)));else targetWords=Math.round(Math.max(1,Math.min(1000,v)));$('timeMenu').querySelector('span').textContent=duration;$('wordsMenu').querySelector('span').textContent=targetWords;$('timeMenu').classList.toggle('active',type==='time');$('wordsMenu').classList.toggle('active',type==='words');$('modeMenu').classList.add('hidden');modeType=type;newTest()};
document.addEventListener('click',()=> $('modeMenu').classList.add('hidden'));
$('restart').onclick=newTest;$('again').onclick=newTest;$('closeResults').onclick=()=>{$('resultsOverlay').classList.add('hidden');newTest()};$('theme').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('taptyping_theme',document.body.classList.contains('light')?'light':'dark')};
if(localStorage.getItem('taptyping_theme')==='light')document.body.classList.add('light');
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(b.dataset.page).classList.remove('hidden');if(b.dataset.page==='rankings')renderRankings();if(b.dataset.page==='stats')renderStats()});
window.addEventListener('resize',()=>{if(!display.querySelector('.word-lines'))return;const old=typed;expectedText=testText();renderInitial();for(let i=0;i<old.length;i++)updateChar(i,old[i]);currentIndex=old.length;positionLines(false);if(!$('resultsOverlay').classList.contains('hidden'))drawGraph()});
function drawGraph(){const c=$('wpmGraph'),r=c.getBoundingClientRect(),d=devicePixelRatio||1,w=r.width,h=r.height;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);if(!history.length)return;const l=36,rr=12,top=15,bottom=25,gw=w-l-rr,gh=h-top-bottom,max=Math.max(20,...history.map(p=>Math.max(p.raw,p.wpm))),total=Math.max(1,modeType==='time'?duration:history.at(-1).t);x.strokeStyle=getComputedStyle(document.body).getPropertyValue('--grid');for(let i=0;i<4;i++){const y=top+gh*i/3;x.beginPath();x.moveTo(l,y);x.lineTo(w-rr,y);x.stroke()};function series(key,scale){x.beginPath();history.forEach((p,i)=>{const px=l+p.t/total*gw,py=top+gh-p[key]/scale*gh;i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=key==='wpm'?'#4be3ff':key==='raw'?'#8094a8':'#ffb84b';x.lineWidth=2;x.stroke()}series('raw',max);series('wpm',max);series('acc',100)}
function scores(){return JSON.parse(localStorage.getItem('taptyping_scores')||'[]')}
function renderRankings(){const s=scores();$('rankTable').innerHTML=!s.length?'<div class="empty">No tests yet.</div>':'<div class="row head"><span>#</span><span>date</span><span>wpm</span><span>accuracy</span><span>score</span></div>'+s.slice(0,25).map((x,i)=>`<div class="row"><span>${i+1}</span><span>${escapeHtml(x.date)}</span><strong>${x.wpm}</strong><span>${x.acc}%</span><strong>${x.score}</strong></div>`).join('')}
function renderStats(){const s=scores();$('count').textContent=s.length;$('best').textContent=s.length?Math.max(...s.map(x=>x.wpm)):0;$('average').textContent=s.length?Math.round(s.reduce((a,x)=>a+x.wpm,0)/s.length):0;$('bestacc').textContent=s.length?Math.max(...s.map(x=>x.acc))+'%':'0%'}
loadWords();

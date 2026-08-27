let WORDS=[];
let modeType="time", duration=15, targetWords=50;
let started=false, finished=false, startTime=0, timer=null;
let currentWords=[], typed="", finalResult=null, history=[];

const $=id=>document.getElementById(id), display=$("words");

async function loadWords(){
  try{
    const text=await fetch("words.txt",{cache:"no-store"}).then(r=>r.text());
    WORDS=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  }catch(e){
    WORDS=["the","and","you","that","with","have","this","from","time","more","make","like","work","know","good","right","people","world","life","place","great","small","house","water","light","sound","game","play","type"];
  }
  newTest();
}

function pickWords(n){
  const out=[];
  for(let i=0;i<n;i++) out.push(WORDS[Math.floor(Math.random()*WORDS.length)]);
  return out;
}

function newTest(){
  clearInterval(timer); timer=null;
  started=false; finished=false; typed=""; finalResult=null; history=[];
  const count=modeType==="words" ? targetWords : Math.max(500,Math.ceil(duration*4));
  currentWords=pickWords(count);
  $("resultsOverlay").classList.add("hidden");
  $("save").disabled=false; $("save").textContent="save score";
  $("wpm").textContent="0"; $("raw").textContent="0"; $("acc").textContent="100";
  $("time").textContent=modeType==="words"?targetWords:duration;
  $("timeUnit").textContent=modeType==="words"?" words":"s";
  render();
  render();
}


function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

function render(){
  const charsPerLine=58, lines=[];
  let line="", lineStart=0, pos=0;
  currentWords.forEach((word,i)=>{
    const token=word+(i<currentWords.length-1?" ":"");
    if(line && line.length+token.length>charsPerLine){ lines.push({text:line,start:lineStart}); line=""; lineStart=pos; }
    line+=token; pos+=token.length;
  });
  if(line)lines.push({text:line,start:lineStart});

  let currentLine=0;
  for(let i=0;i<lines.length;i++){
    if(typed.length>=lines[i].start && typed.length<=lines[i].start+lines[i].text.length){currentLine=i;break;}
  }

  let html="";
  lines.forEach((ln,lineIndex)=>{
    let s="";
    for(let j=0;j<ln.text.length;j++){
      const idx=ln.start+j, expected=ln.text[j], c=typed[idx];
      if(c===undefined) s+=idx===typed.length?`<span class="current">${escapeHtml(expected)}</span>`:escapeHtml(expected);
      else s+=`<span class="${c===expected?"correct":"wrong"}">${escapeHtml(expected)}</span>`;
    }
    if(typed.length>ln.start+ln.text.length && currentLine===lineIndex){
      for(let k=ln.start+ln.text.length;k<typed.length;k++) if(typed[k]!==" ") s+=`<span class="extra">${escapeHtml(typed[k])}</span>`;
    }
    html+=`<div class="word-line">${s}</div>`;
  });
  display.innerHTML=`<div class="word-lines">${html}</div>`;
  const lineHeight=window.innerWidth<=700?36:43;
  const center=(display.clientHeight-lineHeight)/2;
  $(".word-lines").style.transform=`translateY(${center-currentLine*lineHeight}px)`;
}

function metrics(){
  const elapsed=Math.max((Date.now()-startTime)/1000,.1);
  const expected=currentWords.join(" ");
  let correct=0, incorrect=0;
  for(let i=0;i<typed.length;i++){
    if(i<expected.length && typed[i]===expected[i]) correct++; else incorrect++;
  }
  const minutes=elapsed/60;
  const raw=Math.max(0,(typed.length/5)/minutes);
  // Monkeytype-style net WPM: incorrect characters reduce WPM.
  const wpm=Math.max(0,(correct/5)/minutes);
  const acc=typed.length?Math.max(0,correct/typed.length*100):100;
  return {wpm:Math.round(wpm),raw:Math.round(raw),acc:Math.round(acc),elapsed,correct,incorrect};
}

function recordHistory(){
  const m=metrics(), t=Math.floor(m.elapsed);
  const point={t,wpm:m.wpm,raw:m.raw,acc:m.acc};
  if(!history.length || history[history.length-1].t!==t) history.push(point);
  else history[history.length-1]=point;
}

function tick(){
  if(!started||finished)return;
  recordHistory();
  const m=metrics();
  $("wpm").textContent=m.wpm; $("raw").textContent=m.raw; $("acc").textContent=m.acc;
  if(modeType==="time"){
    const left=Math.max(0,duration-Math.floor((Date.now()-startTime)/1000));
    $("time").textContent=left; $("timeUnit").textContent="s";
    if(left<=0)finish();
  }else{
    const done=typed.trim().split(/\s+/).filter(Boolean).length;
    $("time").textContent=Math.max(0,targetWords-done); $("timeUnit").textContent=" words";
    if(done>=targetWords)finish();
  }
}

function finish(){
  if(finished)return;
  recordHistory(); finished=true; clearInterval(timer); timer=null;
  const m=metrics();
  const score=Math.max(0,Math.round(m.wpm*m.acc/100));
  finalResult={wpm:m.wpm,raw:m.raw,acc:m.acc,score,date:new Date().toLocaleString(),duration,mode:modeType,words:targetWords};
  $("modalWpm").textContent=m.wpm; $("modalRaw").textContent=m.raw; $("modalAcc").textContent=m.acc+"%"; $("modalScore").textContent=score;
  $("resultsSubtitle").textContent=modeType==="time"?`${duration} second test`:`${targetWords} word test`;
  $("resultsOverlay").classList.remove("hidden");
  requestAnimationFrame(drawGraph); render();
}

document.addEventListener("keydown", e=>{
  // Tab is the global restart key. Never let the browser move focus away.
  if(e.key==="Tab"){
    e.preventDefault();
    if(!e.shiftKey) newTest();
    return;
  }
  if(finished) return;
  // Let browser/system shortcuts work normally.
  if(e.ctrlKey || e.altKey || e.metaKey) return;

  // Typing is captured directly from the document; there is no input box.
  if(e.key==="Backspace"){
    e.preventDefault();
    if(typed.length) typed=typed.slice(0,-1);
    render();
    if(started) tick();
    return;
  }

  // Only accept printable characters. Space is important for word tests.
  if(e.key.length===1){
    e.preventDefault();
    if(!started){
      started=true;
      startTime=Date.now();
      history=[{t:0,wpm:0,raw:0,acc:100}];
      timer=setInterval(tick,100);
    }
    typed += e.key;
    const expected=currentWords.join(" ");
    const done=typed.trim().split(/\s+/).filter(Boolean).length;
    if((modeType==="time" && typed.length>=expected.length) || (modeType==="words" && done>=targetWords)) finish();
    else { render(); tick(); }
  }
});
$("restart").onclick=newTest;

function setMode(type,value=null){
  modeType=type;
  if(type==="time"&&value)duration=value;
  document.querySelectorAll(".mode,.mode-toggle").forEach(x=>x.classList.remove("active"));
  if(type==="time"){
    const btn=document.querySelector(`.mode[data-value="${duration}"]`); if(btn)btn.classList.add("active");
    document.querySelector('.mode-toggle[data-type="time"]').classList.add("active");
    $("customPanel").classList.add("hidden");
  }else{
    document.querySelector('.mode-toggle[data-type="words"]').classList.add("active");
    $("customPanel").classList.add("hidden");
  }
  newTest();
}

document.querySelectorAll(".mode[data-type='time']").forEach(b=>b.onclick=()=>setMode("time",+b.dataset.value));
document.querySelectorAll(".mode-toggle").forEach(b=>b.onclick=()=>b.dataset.type==="time"?setMode("time",15):setMode("words"));
document.querySelector(".mode.custom").onclick=()=>{
  modeType="time"; $("customPanel").classList.remove("hidden");
  document.querySelectorAll(".mode,.mode-toggle").forEach(x=>x.classList.remove("active"));
  document.querySelector(".mode.custom").classList.add("active");
  $("time").textContent=duration; $("timeUnit").textContent="s";
};
$("applyCustom").onclick=()=>{
  duration=Math.max(1,Math.min(3600,Number($("customTime").value)||45));
  targetWords=Math.max(10,Math.min(1000,Number($("customWords").value)||50));
  modeType=$("customType").value;
  newTest();
};

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  document.querySelectorAll(".page").forEach(v=>v.classList.add("hidden")); $(b.dataset.page).classList.remove("hidden");
  if(b.dataset.page==="rankings")renderRankings(); if(b.dataset.page==="stats")renderStats();
});

$("save").onclick=()=>{
  if(!finalResult)return;
  const scores=JSON.parse(localStorage.getItem("typetap_scores")||"[]"); scores.push(finalResult); scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem("typetap_scores",JSON.stringify(scores.slice(0,100)));
  $("save").textContent="saved ✓"; $("save").disabled=true; renderRankings();
};
$("again").onclick=newTest;
$("closeResults").onclick=()=>{$("resultsOverlay").classList.add("hidden");newTest()};
window.addEventListener("resize",()=>{render();if(!$('resultsOverlay').classList.contains('hidden'))drawGraph()});
$("theme").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("typetap_theme",document.body.classList.contains("light")?"light":"dark")};
if(localStorage.getItem("typetap_theme")==="light")document.body.classList.add("light");

function drawGraph(){
  const c=$("wpmGraph"),rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  c.width=Math.floor(w*dpr);c.height=Math.floor(h*dpr);const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!history.length)return;
  const left=42,right=18,top=20,bottom=32,gw=w-left-right,gh=h-top-bottom,maxWpm=Math.max(20,...history.map(p=>Math.max(p.raw,p.wpm))),total=Math.max(1,modeType==="time"?duration:history[history.length-1].t);
  ctx.strokeStyle=document.body.classList.contains("light")?"rgba(16,36,61,.10)":"rgba(217,225,232,.08)";ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=top+gh*i/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();}
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");ctx.font="10px 'JetBrains Mono',monospace";
  for(let i=0;i<4;i++)ctx.fillText(Math.round(maxWpm-maxWpm*i/3),left-30,top+gh*i/3+3);
  ctx.fillText("WPM",4,top+3);ctx.fillText("0s",left,h-9);const endLabel=modeType==="time"?`${duration}s`:`${total}s`;ctx.fillText(endLabel,Math.max(left,w-right-ctx.measureText(endLabel).width),h-9);
  function point(p,key,max){return [left+(p.t/total)*gw,top+gh-(p[key]/max)*gh]}
  function series(key,max,dash){ctx.beginPath();history.forEach((p,i)=>{const [x,y]=point(p,key,max);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.setLineDash(dash);ctx.strokeStyle=key==="wpm"?"#4BE3FF":key==="raw"?"#8AA4BA":"#FFB84B";ctx.lineWidth=2.3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();ctx.setLineDash([])}
  series("raw",maxWpm,[]);series("wpm",maxWpm,[]);series("acc",100,[5,4]);
  const legend=[{x:left,c:"#4BE3FF",t:"WPM"},{x:left+62,c:"#8AA4BA",t:"raw"},{x:left+115,c:"#FFB84B",t:"accuracy"}];
  legend.forEach(l=>{ctx.fillStyle=l.c;ctx.fillRect(l.x,5,16,3);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");ctx.fillText(l.t,l.x+22,9)});
}

function getScores(){return JSON.parse(localStorage.getItem("typetap_scores")||"[]")}
function renderRankings(){const s=getScores();$("rankTable").innerHTML=!s.length?"<div class='empty'>No scores yet. Finish a test and save it.</div>":"<div class='row head'><span>#</span><span>date</span><span>wpm</span><span>accuracy</span><span>score</span></div>"+s.slice(0,25).map((x,i)=>`<div class="row"><span>${i+1}</span><span>${escapeHtml(x.date)}</span><strong>${x.wpm}</strong><span>${x.acc}%</span><strong>${x.score}</strong></div>`).join("")}
function renderStats(){const s=getScores();$("count").textContent=s.length;$("best").textContent=s.length?Math.max(...s.map(x=>x.wpm)):0;$("average").textContent=s.length?Math.round(s.reduce((a,x)=>a+x.wpm,0)/s.length):0;$("bestacc").textContent=s.length?Math.max(...s.map(x=>x.acc))+"%":"0%"}

loadWords();

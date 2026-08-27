let WORDS=[];
let modeType="time", duration=15, targetWords=50;
let started=false, finished=false, startTime=0, timer=null;
let currentWords=[], typed="", finalResult=null, speedHistory=[];

const $=id=>document.getElementById(id), input=$("input"), display=$("wordDisplay");

async function loadWords(){
  try{
    const text=await fetch("words.txt").then(r=>r.text());
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
  clearInterval(timer); started=false; finished=false; typed=""; finalResult=null; speedHistory=[];
  const count=modeType==="words"?targetWords:220;
  currentWords=pickWords(count);
  $("result").classList.add("hidden");
  $("saveScore").disabled=false; $("saveScore").textContent="save score";
  $("liveWpm").textContent="0"; $("liveAcc").textContent="100";
  $("liveTime").textContent=duration;
  render(); input.value=""; input.focus();
}
function render(){
  let pos=0, html="";
  for(const word of currentWords){
    const start=pos,end=pos+word.length;
    if(typed.length>start){
      for(let j=0;j<word.length;j++){
        const c=typed[start+j];
        if(c===undefined) html+="<span class='current'>"+esc(word[j])+"</span>";
        else html+="<span class='"+(c===word[j]?"correct":"wrong")+"'>"+esc(word[j])+"</span>";
      }
      if(typed.length>end){
        for(let j=end;j<typed.length && typed[j]!=" ";j++) html+="<span class='extra'>"+esc(typed[j])+"</span>";
      }
    }else{
      html+=typed.length===start?"<span class='current'>"+esc(word)+"</span>":esc(word);
    }
    html+=" "; pos=end+1;
  }
  display.innerHTML=html;
  // Deliberately do NOT scroll the page or the word area.
}
function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function metrics(){
  const elapsed=Math.max((Date.now()-startTime)/1000,.1);
  const chars=typed.length;
  const wpm=Math.round((chars/5)/(elapsed/60));
  const expected=currentWords.join(" ");
  let correct=0;
  for(let i=0;i<Math.min(typed.length,expected.length);i++) if(typed[i]===expected[i]) correct++;
  const acc=typed.length?Math.round(correct/typed.length*100):100;
  return {wpm,acc,elapsed};
}
function tick(){
  const m=metrics();
  if(started && (!speedHistory.length || speedHistory[speedHistory.length-1].t !== Math.floor(m.elapsed))){
    speedHistory.push({t:Math.floor(m.elapsed),wpm:m.wpm});
  }
  $("liveWpm").textContent=m.wpm;
  $("liveAcc").textContent=m.acc;
  if(modeType==="time"){
    const left=Math.max(0,duration-Math.floor((Date.now()-startTime)/1000));
    $("liveTime").textContent=left;
    if(left<=0) finish();
  }else{
    const done=typed.trim().split(/\s+/).filter(Boolean).length;
    $("liveTime").textContent=Math.max(0,targetWords-done);
    if(done>=targetWords) finish();
  }
}
function finish(){
  if(finished)return;
  finished=true; clearInterval(timer); input.blur();
  const m=metrics(), score=Math.max(0,Math.round(m.wpm*m.acc/100));
  finalResult={wpm:m.wpm,acc:m.acc,score,date:new Date().toLocaleString(),duration,mode:modeType,words:targetWords};
  $("resultWpm").textContent=m.wpm;
  $("resultAcc").textContent=m.acc+"%";
  $("resultScore").textContent=score;
  $("result").classList.remove("hidden");
  $("modalWpm").textContent=m.wpm;
  $("modalAcc").textContent=m.acc+"%";
  $("modalScore").textContent=score;
  $("resultsSubtitle").textContent=modeType==="time"
    ? `${duration} second test`
    : `${targetWords} word test`;
  $("resultsOverlay").classList.remove("hidden");
  requestAnimationFrame(drawGraph);
  render();
}
input.addEventListener("input",()=>{
  if(finished)return;
  typed=input.value;
  if(!started){started=true;startTime=Date.now();timer=setInterval(tick,250)}
  const expected=currentWords.join(" ");
  const done=typed.trim().split(/\s+/).filter(Boolean).length;
  if((modeType==="time" && typed.length>=expected.length)|| (modeType==="words" && done>=targetWords)) finish();
  else {render();tick();}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Tab"){e.preventDefault();$("restart").focus()}
  if(e.key==="Enter" && document.activeElement===$("restart"))newTest();
});
display.addEventListener("click",()=>input.focus());
$("restart").onclick=newTest;

document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  const custom=b.dataset.custom==="true";
  $("customPanel").classList.toggle("hidden",!custom);
  if(!custom){
    modeType="time"; duration=+b.dataset.time;
    $("liveTime").textContent=duration;
    newTest();
  }
});
document.querySelectorAll(".word-mode-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".word-mode-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  modeType=b.dataset.words==="true"?"words":"time";
  if(modeType==="words"){
    document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));
    $("customPanel").classList.remove("hidden");
  }else{
    document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));
    document.querySelector('.mode[data-time="15"]').classList.add("active");
    $("customPanel").classList.add("hidden");
    duration=15;
  }
  newTest();
});
$("applyCustom").onclick=()=>{
  const t=Math.max(1,Math.min(3600,+$("customTime").value||45));
  const w=Math.max(10,Math.min(1000,+$("customWords").value||50));
  duration=t; targetWords=w;
  if(modeType==="words") $("liveTime").textContent=targetWords;
  else $("liveTime").textContent=duration;
  newTest();
};

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(b.dataset.view+"View").classList.remove("hidden");
  if(b.dataset.view==="rankings")renderRankings();
  if(b.dataset.view==="stats")renderStats();
});
$("saveScore").onclick=()=>{
  if(!finalResult)return;
  const scores=JSON.parse(localStorage.getItem("typetap_scores")||"[]");
  scores.push(finalResult);scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem("typetap_scores",JSON.stringify(scores.slice(0,100)));
  $("saveScore").textContent="saved ✓";$("saveScore").disabled=true;renderRankings();
};
$("again").onclick=()=>{ $("resultsOverlay").classList.add("hidden"); newTest(); };
$("closeResults").onclick=()=>{$("resultsOverlay").classList.add("hidden");};
window.addEventListener("resize",()=>{if(!$("resultsOverlay").classList.contains("hidden"))drawGraph();});
$("themeBtn").onclick=()=>{
  document.body.classList.toggle("light");
  localStorage.setItem("typetap_theme",document.body.classList.contains("light")?"light":"dark")
};
if(localStorage.getItem("typetap_theme")==="light")document.body.classList.add("light");

function drawGraph(){
  const c=$("wpmGraph"), rect=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  c.width=Math.max(1,Math.floor(rect.width*dpr)); c.height=Math.max(1,Math.floor(rect.height*dpr));
  const ctx=c.getContext("2d"); ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height;
  ctx.clearRect(0,0,w,h);
  if(!speedHistory.length)return;
  const max=Math.max(20,...speedHistory.map(x=>x.wpm)), left=34,right=12,top=12,bottom=28;
  const gw=w-left-right,gh=h-top-bottom;
  ctx.strokeStyle="rgba(217,225,232,.08)";ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=top+gh*i/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke()}
  ctx.fillStyle="#71849a";ctx.font="10px 'JetBrains Mono',monospace";
  for(let i=0;i<4;i++){const v=Math.round(max-(max*i/3));const y=top+gh*i/3+3;ctx.fillText(v,left-28,y)}
  const total=Math.max(1,modeType==="time"?duration:speedHistory[speedHistory.length-1].t);
  ctx.beginPath();
  speedHistory.forEach((p,i)=>{
    const x=left+(p.t/total)*gw, y=top+gh-(p.wpm/max)*gh;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.strokeStyle="#4BE3FF";ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
  ctx.fillStyle="#71849a";ctx.font="10px 'JetBrains Mono',monospace";
  ctx.fillText("0s",left,h-8);
  ctx.fillText(total+"s",Math.max(left,w-right-22),h-8);
}
function getScores(){return JSON.parse(localStorage.getItem("typetap_scores")||"[]")}
function renderRankings(){
  const s=getScores();
  $("rankings").innerHTML=!s.length?"<div class='empty'>No scores yet. Finish a test and save it.</div>":
    "<div class='rank-row head'><span>#</span><span>date</span><span>wpm</span><span>accuracy</span><span>score</span></div>"+
    s.slice(0,25).map((x,i)=>`<div class="rank-row"><span>${i+1}</span><span>${x.date}</span><strong>${x.wpm}</strong><span>${x.acc}%</span><strong>${x.score}</strong></div>`).join("");
}
function renderStats(){
  const s=getScores();
  $("testsCount").textContent=s.length;
  $("bestWpm").textContent=s.length?Math.max(...s.map(x=>x.wpm)):0;
  $("avgWpm").textContent=s.length?Math.round(s.reduce((a,x)=>a+x.wpm,0)/s.length):0;
  $("bestAcc").textContent=s.length?Math.max(...s.map(x=>x.acc))+"%":"0%";
}
loadWords();

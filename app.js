"use strict";
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const COLORS = ["#e4daf8","#d7eee5","#dce4fb","#f4dadb","#e3dfee","#ede1ce","#d7e6f3","#f7dfd2"];
let selected = [], filter="전체", limit=24, report=null, toastTimer;
const labels=["전체",...DISTANCES,"기록 없음"];
const trainer=()=>cleanNick($("nick").value)||"트레이너";
const pad=n=>String(n).padStart(2,"0");
function toast(message) {
  clearTimeout(toastTimer); $("notice").textContent=message;
  toastTimer=setTimeout(()=>$("notice").textContent="",2800);
}
function cardMatches(person, term) {
  const name=searchable(person.name);
  if (term && ![name, initials(name), searchable(person.ja)].some(s=>s.includes(term))) return false;
  if (filter==="전체") return true;
  const top=leaders(person.dist);
  return filter==="기록 없음" ? !top.length : top.includes(DISTANCES.indexOf(filter));
}
function selectionMark(person) {
  const rank=selected.indexOf(person.id);
  return rank===-1 ? "+" : String(rank+1);
}
function renderGrid() {
  const term=searchable($("query").value);
  const list=ROSTER.filter(p=>cardMatches(p,term));
  if ($("sort").value==="name") list.sort((a,b)=>a.name.localeCompare(b.name,"ko"));
  if ($("sort").value==="height") list.sort((a,b)=>b.height-a.height || a.id-b.id);
  $("filters").innerHTML=labels.map(label=>'<button class="chip" aria-pressed="'+(filter===label)+'">'+label+(label==="전체" ? ' '+ROSTER.length : '')+'</button>').join("");
  $("grid").innerHTML=list.slice(0,limit).map(p=>{
    const meta=leaders(p.dist).map(i=>DISTANCES[i]).join("·")||"기록 없음";
    return '<button class="card" data-id="'+p.id+'" aria-pressed="'+selected.includes(p.id)+'" aria-label="'+escapeHtml(p.name)+' 선택"><span class="photo" style="--color:'+COLORS[(p.id-1)%COLORS.length]+'"><img loading="lazy" src="'+PORTRAITS[p.id]+'" alt=""><span class="bib">'+String(p.id).padStart(3,"0")+'</span><span class="mark">'+selectionMark(p)+'</span></span><span class="cardText"><b>'+escapeHtml(p.name)+'</b><small>'+(p.height===null ? '신장 미입력' : p.height+'cm')+' · '+meta+'</small></span></button>';
  }).join("");
  $("noResults").hidden=!!list.length; $("more").hidden=list.length<=limit;
  $("more").textContent="더 보기 ("+Math.min(limit,list.length)+" / "+list.length+")";
}
function renderLineup() {
  const n=selected.length;
  $("count").textContent=n; $("reset").disabled=!n;
  $("segments").innerHTML=Array.from({length:10},(_,i)=>'<i class="'+(i<n?'on':'')+'"></i>').join("");
  $("lineup").innerHTML=Array.from({length:Math.max(n,3)},(_,i)=>{
    const p=BY_ID.get(selected[i]);
    const number='<span class="rank">'+pad(i+1)+'</span>';
    if (!p) return '<li class="slot empty">'+number+'<span>우마무스메를 선택하세요</span></li>';
    return '<li class="slot">'+number+'<img src="'+PORTRAITS[p.id]+'" alt=""><span>'+escapeHtml(p.name)+'</span><button data-remove="'+p.id+'" aria-label="'+escapeHtml(p.name)+' 선택 해제">×</button></li>';
  }).join("");
  $("analyze").disabled=n<3;
  $("needed").textContent=n<3 ? (3-n)+"명 더 선택하면 발급할 수 있어요" : "선택 순서가 감정에 반영돼요";
  $("mobileLineup").textContent="나의 라인업 · "+n+"/10";
  for (const card of $("grid").children) {
    const id=Number(card.dataset.id);
    card.setAttribute("aria-pressed",selected.includes(id)); card.querySelector(".mark").textContent=selectionMark(BY_ID.get(id));
  }
}
function toggle(id) {
  if (selected.includes(id)) selected=selected.filter(n=>n!==id);
  else if (selected.length<10) selected.push(id);
  else return toast("최대 10명까지 선택할 수 있어요.");
  renderLineup();
}
function charts(title, labels, values, notes=[]) {
  return '<section class="reportBlock"><h3>'+title+'</h3>'+(!sum(values) ? '<p class="muted">연결된 출전 기록이 없습니다.</p>' : labels.map((label,i)=>'<div class="statBar"><div><b>'+label+'</b><small>'+(notes[i]||"")+'</small><strong>'+values[i].toFixed(1)+'%</strong></div><i><span style="width:'+values[i]+'%"></span></i></div>').join(""))+'</section>';
}
const measureText=value=>value===null ? "자료 없음" : value.toFixed(1);
function meetingText(meeting) {
  return meeting.selected.map(id=>BY_ID.get(id).name).join(" · ")+" — "+meeting.date+" "+meeting.name;
}
function deltaText(value) {
  if(value===null) return "자료 없음";
  return (value>0 ? "+" : value<0 ? "−" : "")+Math.abs(value).toFixed(1)+" cm";
}
function profileLine(axis) {
  return axis.key+" "+axis.label+" · "+(axis.trait||"판정 보류")+" · 선택 "+measureText(axis.mean)+" / 전체 "+measureText(axis.referenceMean)+" cm · 차이 "+deltaText(axis.delta);
}
function bodySection(body) {
  const rows=body.axes.map(axis=>'<tr><th scope="row">'+axis.label+' ('+axis.key+')<br><small>'+escapeHtml(axis.trait||'판정 보류')+'</small></th><td>'+measureText(axis.mean)+'</td><td>'+measureText(axis.referenceMean)+'</td><td><b>'+deltaText(axis.delta)+'</b></td></tr>').join("");
  return '<section class="reportBlock bodyScores"><h3>내가 선호하는 B·H·W 특징</h3><p class="profileFinding">'+body.summary+'</p><table><caption>캐릭터 프로필 둘레 평균 비교 (cm)</caption><thead><tr><th scope="col">항목</th><th scope="col">선택 평균</th><th scope="col">전체 평균</th><th scope="col">차이</th></tr></thead><tbody>'+rows+'</tbody></table><p class="method">각 차이를 해당 항목의 전체 표준편차로 나눠 비교했어요. 표에는 부위별 칭호를 모두 표시하고, 요약에는 가장 두드러진 차이를 담았어요.</p></section>';
}
function showReport(focus=false) {
  report=makeReport(selected);
  const r=report;
  const minis=r.people.map((p,i)=>'<div class="mini"><div style="background:'+COLORS[(p.id-1)%COLORS.length]+'"><img src="'+PORTRAITS[p.id]+'" alt=""><b>'+pad(i+1)+'</b></div><small>'+escapeHtml(p.name)+'</small></div>').join("");
  const profile=[["평균 신장",measureText(r.height)+" cm"],["평균 B / H / W",r.measures.map(measureText).join(" / ")+" cm"],["원본마 출전 기록",r.covered ? r.starts+"전 "+r.wins+"승" : "자료 없음"]];
  $("reportPage").innerHTML='<div class="actions"><button id="edit">다시 고르기</button><div><button id="copyText">텍스트 복사</button><button id="copyLink" '+(location.protocol==="file:" || (lineupUsesLocalDatabase() || localTitleChanges()) ? 'disabled title="로컬 수정본은 PNG나 텍스트로 공유하세요"' : "")+'>결과 링크 복사</button><button class="primary" id="png">PNG 저장</button></div></div><article class="reportCard"><div class="reportHero"><div class="eyebrow"><i class="checker"></i> TRAINER PREFERENCE REPORT</div><p>'+escapeHtml(trainer())+' 님의 취향 감정서</p><h1 id="resultTitle" tabindex="-1">'+escapeHtml(r.title)+'</h1><p>'+r.headline+'</p><p>'+escapeHtml(r.styleText)+'</p></div><div class="reportInside"><div class="overline"><span></span> MY LINEUP</div><h2>나의 우마무스메</h2><div class="minis">'+minis+'</div><div class="profiles">'+profile.map(([label,val])=>'<div><small>'+label+'</small><strong>'+val+'</strong></div>').join("")+'</div>'+bodySection(r.body)+specialSection(r)+historySection(r)+'<div class="overline"><span></span> RACE RECORDS</div><h2>원본마로 보는 레이스 취향</h2><p class="muted">선택한 '+selected.length+'명 중 원본마 기록이 있는 '+r.covered+'명의 거리·주로별 출전 비율을 선호 순위로 가중 평균했어요.</p><div class="reports">'+charts("거리별 출전 비율",DISTANCES,r.distance,DISTANCE_INFO)+charts("주로별 출전 비율",SURFACES,r.surface)+'</div>'+(r.meeting ? '<section class="memory"><div class="overline"><span></span> RACE ARCHIVE</div><h3>함께 달린 한 장면</h3><p>'+escapeHtml(meetingText(r.meeting))+'</p><small>선택한 캐릭터의 원본마가 같은 경주에 출전한 기록이에요.</small></section>' : '')+'<p class="method">cm 표시는 항목별 단순 평균입니다. B·H·W 판정은 선택 평균과 전체 평균의 차이를 비교합니다. 출전·승수는 제공된 원본마 기록의 합계이며, 취소·제외된 출전은 집계에서 뺐습니다. 거리가 누락된 경주는 거리 비율에서 제외합니다.</p></div></article>'+((lineupUsesLocalDatabase() || localTitleChanges()) ? '<p class="method">이 브라우저에서 수정한 데이터로 계산한 결과입니다. PNG 또는 텍스트로 공유하거나, database.json을 배포한 후 링크를 복사하세요.</p>' : location.protocol==="file:" ? '<p class="method">GitHub Pages에서 열면 결과 링크도 공유할 수 있어요.</p>' : "");
  $("selectPage").hidden=true; $("reportPage").hidden=false; window.scrollTo(0,0);
  if (focus) $("resultTitle").focus({preventScroll:true});
}
function showSelection() {
  $("selectPage").hidden=false; $("reportPage").hidden=true; report=null; renderLineup(); window.scrollTo(0,0);
}
function route(focus=false) {
  const parsed=readReport(location.hash);
  if (parsed) {selected=parsed.ids; $("nick").value=parsed.name; showReport(focus);}
  else {showSelection(); if (location.hash.startsWith("#p=")) toast("결과 주소를 확인해 주세요.");}
}
function reportText() {
  const r=report;
  return [trainer()+" 님의 트레이너 취향 감정서",r.title,r.basicTitle,...r.special.hits.map(g=>g.title+" · "+g.name),...r.special.traits.map(t=>t.title+" · "+t.pct.toFixed(1)+"%"),...r.history.hits.map(t=>t.title+" · "+t.detail),"G1 기록 평균 "+r.history.mean.toFixed(2)+"승",...r.history.generations.map(([y,c])=>y+"년 세대: "+c+"명"),r.headline,r.styleText,r.people.map((p,i)=>(i+1)+". "+p.name).join(" · "),"평균 신장 "+measureText(r.height)+"cm | B/H/W "+r.measures.map(measureText).join("/")+"cm",r.body.summary,...r.body.axes.map(profileLine),"원본마 기록 "+r.covered+"/"+selected.length+"명"+(r.covered ? " · "+r.starts+"전 "+r.wins+"승" : ""),...(r.meeting ? ["함께 달린 한 장면 · "+meetingText(r.meeting)] : [])].join("\n");
}
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast("복사했어요."); }
  catch { $("manualCopy").value=value; $("copyDialog").showModal(); $("manualCopy").select(); }
}
$("help").onclick=()=>$("guide").showModal(); $("closeGuide").onclick=()=>$("guide").close(); $("closeCopy").onclick=()=>$("copyDialog").close();
$("grid").onclick=e=>{const card=e.target.closest(".card"); if (card) toggle(Number(card.dataset.id));};
$("lineup").onclick=e=>{const btn=e.target.closest("[data-remove]"); if(btn){toggle(Number(btn.dataset.remove)); const next=$("lineup").querySelector("button")||$("query");next.focus({preventScroll:true});}};
$("filters").onclick=e=>{const btn=e.target.closest("button"); if(btn){const i=[...$("filters").children].indexOf(btn);filter=labels[i];limit=24;renderGrid();$("filters").children[i].focus({preventScroll:true});}};
$("sort").onchange=$("query").oninput=()=>{limit=24;renderGrid();};
$("clearSearch").onclick=()=>{filter="전체";$("query").value="";limit=24;renderGrid();$("query").focus();};
$("more").onclick=()=>{const prev=limit;limit+=24;renderGrid();$("grid").children[prev]?.focus({preventScroll:true});};
$("reset").onclick=()=>{selected=[];renderLineup();};
$("random").onclick=()=>{
  const pool=[...ROSTER];
  for (let i=0;i<5;i++) { const j=i+Math.floor(Math.random()*(pool.length-i)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  selected=pool.slice(0,5).map(p=>p.id);renderLineup();toast("랜덤 라인업 5명을 골랐어요.");
};
$("analyze").onclick=()=>{if(selected.length>=3) location.hash=reportHash(selected,$("nick").value);};
function edit(){ if(location.hash) location.hash=""; else showSelection(); }
$("home").onclick=e=>{e.preventDefault();edit();};
$("reportPage").onclick=e=>{
  if(e.target.id==="edit") edit();
  if(e.target.id==="copyText") copy(reportText());
  if(e.target.id==="copyLink") copy(location.href);
  if(e.target.id==="png") savePng();
};
addEventListener("hashchange",()=>route(true));
$("heroA").src=PORTRAITS[2];$("heroB").src=PORTRAITS[1];$("heroC").src=PORTRAITS[3];
document.body.inert=true;
const databaseReady=Promise.all([initializeDatabase(),initializeTitles()]).then(()=>{
  renderGrid();route();if(databaseWarning) toast(databaseWarning);
}).finally(()=>{document.body.inert=false;});
$("mobileLineup").onclick=()=>$("ticket").scrollIntoView({block:"start",behavior:"smooth"});
async function savePng() {
  const r=report, button=$("png"), owner=trainer();
  button.disabled=true;button.textContent="이미지 만드는 중";
  try {
    const imgs=await Promise.all(r.people.map(p=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=PORTRAITS[p.id];
    })));
    const W=960, rows=Math.ceil(imgs.length/5), profileY=430+rows*175, base=profileY+225, H=base+650+(r.meeting ? 114 : 0)+190+Math.max(1,r.history.hits.length)*30;
    const cv=document.createElement("canvas"); cv.width=W*2; cv.height=H*2;
    const g=cv.getContext("2d");g.scale(2,2);
    function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
    function type(str,x,y,size,color="#272037",weight=600,max=W-100){
      g.fillStyle=color;g.font=weight+" "+size+"px 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif";g.fillText(str,x,y,max);
    }
    rect(0,0,W,H,"#f6f3fa");rect(0,0,W,333,"#432787");rect(0,327,W,6,"#ccff73");
    type("TRACEN TASTE LAB   /   TRAINER PREFERENCE REPORT",48,48,18,"#ccff73",800);
    type(owner+" 님의 취향 감정서",48,99,28,"#ffffff",700);
    g.font="900 35px sans-serif";
    const titleLines=[""];
    for(const word of r.title.split(" ")){
      const last=titleLines.length-1;
      const next=[titleLines[last],word].filter(Boolean).join(" ");
      if(titleLines[last] && g.measureText(next).width>844) titleLines.push(word);
      else titleLines[last]=next;
    }
    titleLines.forEach((line,i)=>type(line,48,151+i*43,35,"#ccff73",900));
    type(r.headline,48,271,19,"#ffffff",500);type(r.styleText,48,304,18,"#ffffff",500);
    type("나의 우마무스메",48,395,31);
    imgs.forEach((img,i)=>{
      const x=48+(i%5)*176,y=424+Math.floor(i/5)*175,w=154,h=124;
      rect(x,y,w,h,COLORS[(r.people[i].id-1)%COLORS.length]);
      g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
      g.drawImage(img,x+3,y,w-6,(w-6)*img.height/img.width);g.restore();
      rect(x,y,33,27,"#4b2f86");type(pad(i+1),x+5,y+20,17,"white",800);
      type(r.people[i].name,x,y+h+27,18,"#30233a",700,w);
    });
    rect(48,profileY,864,103,"#e8e1f4");
    type("평균 신장",66,profileY+32,17);type(measureText(r.height)+" cm",66,profileY+77,30);
    type("평균 B / H / W  (cm)",350,profileY+32,17);type(r.measures.map(measureText).join(" / "),350,profileY+77,29);
    type("원본마 출전 기록",690,profileY+32,17);type(r.covered?r.starts+"전 "+r.wins+"승":"자료 없음",690,profileY+77,28);
    type("내가 선호하는 B·H·W 특징",48,profileY+151,27);
    type(r.body.summary,48,profileY+185,22,"#543289",700);
    r.body.axes.forEach((axis,i)=>type(profileLine(axis),48,profileY+223+i*28,19));
    type("각 부위의 전체 표준편차를 기준으로 평균 차이의 크기를 비교했어요.",48,profileY+316,17,"#64596f");
    type("원본마로 보는 레이스 취향",48,base+168,30);
    type("선택 "+r.people.length+"명 중 기록이 있는 "+r.covered+"명 · 원본마별 출전 비율을 선택 순위로 가중 평균",48,base+204,19,"#64596f",500);
    function column(x,title,labels,values,color) {
      type(title,x,base+272,24);
      if(!sum(values)){type("연결된 출전 기록이 없습니다.",x,base+320,17);return;}
      values.forEach((val,i)=>{
        const y=base+319+i*56;
        type(labels[i],x,y,19);type(val.toFixed(1)+"%",x+304,y,19);
        rect(x,y+9,376,8,"#e2dce9");rect(x,y+9,376*val/100,8,color);
      });
    }
    column(48,"거리별 출전 비율",DISTANCES,r.distance,"#7046cb");
    column(520,"주로별 출전 비율",SURFACES,r.surface,"#4b876f");
    if(r.meeting) {
      rect(48,base+557,864,94,"#e9e1f6");
      type("함께 달린 한 장면",63,base+587,20,"#543289",800);
      type(meetingText(r.meeting),63,base+625,18,"#30233a",600,834);
    }
    const hy=base+650+(r.meeting?114:0);
    type("세대 · G1 · 우승 경주",48,hy,26);
    type("기록상 G1 평균 "+r.history.mean.toFixed(2)+"승 · "+r.history.generations.map(([y,c])=>y+"년 "+c+"명").join(" / "),48,hy+36,19);
    r.history.hits.forEach((t,i)=>type(t.title+" · "+t.detail,48,hy+70+i*30,19));
    rect(48,H-86,864,1,"#cfc7d9");type("TRACEN TASTE LAB",48,H-43,19,"#6239bc",800);
    type("우마무스메 프리티 더비 · 비공식 팬 프로젝트",505,H-43,17,"#695e76");
    const blob=await new Promise(resolve=>cv.toBlob(resolve,"image/png"));
    if(!blob) throw Error("PNG");
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="트레이너-취향-감정서.png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  } catch {toast("이미지를 저장하지 못했어요. 다시 시도해 주세요.");}
  finally {button.disabled=false;button.textContent="PNG 저장";}
}

function specialSection(r){return '<section class="memory"><div class="overline">TITLE COLLECTION</div><h3>획득 칭호</h3><p>'+escapeHtml(r.basicTitle)+'</p>'+r.special.hits.map(g=>'<p><b>'+escapeHtml(g.title)+'</b> · '+escapeHtml(g.name)+' ('+g.matched.length+'/'+g.ids.length+')</p>').join('')+r.special.traits.map(t=>'<p><b>'+escapeHtml(t.title)+'</b> · '+t.pct.toFixed(1)+'%</p>').join('')+'</section>'; }

function historySection(r){const h=r.history;const list=a=>a.map(([k,c])=>'<p>'+escapeHtml(k)+' · <b>'+c+'/'+r.people.length+'명</b></p>').join('');return '<section class="memory"><div class="overline">GENERATION &amp; G1 ARCHIVE</div><h3>세대 · G1 · 우승 경주</h3><p>기록상 G1 평균 '+h.mean.toFixed(2)+'승 · 합계 '+h.total+'승</p>'+h.hits.map(t=>'<p><b>'+escapeHtml(t.title)+'</b> · '+escapeHtml(t.detail)+'</p>').join('')+'<div class="reports"><div><h3>클래식 세대</h3>'+list(h.generations.map(([y,c])=>[y+'년',c]))+'</div><div><h3>우승 경주별 인원</h3>'+list(h.races)+'</div></div><small>WORDLE 우승 목록 기준. 복수 우승 표기는 승수에 반영하고 경주별 인원은 중복 없이 집계합니다. 원본 자료의 등급제 이전 경주 등 누락 가능성이 있습니다.</small></section>'; }

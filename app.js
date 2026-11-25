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
function rankButtons(p,i,n){
  return [-1,1].map(step=>'<button type="button" class="rankMove" data-move="'+p.id+'" data-step="'+step+'" aria-label="'+escapeHtml(p.name)+(step<0?' 순위 올리기':' 순위 내리기')+'" '+((i+step<0||i+step>=n)?'disabled':'')+'>'+(step<0?'↑':'↓')+'</button>').join('');
}
function renderLineup() {
  const n=selected.length;
  $("count").textContent=n; $("reset").disabled=!n;
  $("segments").innerHTML=Array.from({length:10},(_,i)=>'<i class="'+(i<n?'on':'')+'"></i>').join("");
  $("lineup").innerHTML=Array.from({length:Math.max(n,3)},(_,i)=>{
    const p=BY_ID.get(selected[i]);
    const number='<span class="rank">'+pad(i+1)+'</span>';
    if (!p) return '<li class="slot empty">'+number+'<span>우마무스메를 선택하세요</span></li>';
    return '<li class="slot">'+number+'<img src="'+PORTRAITS[p.id]+'" alt=""><span class="slotName">'+escapeHtml(p.name)+'</span><div class="rankControls">'+rankButtons(p,i,n)+'</div><button data-remove="'+p.id+'" aria-label="'+escapeHtml(p.name)+' 선택 해제">×</button></li>';
  }).join("");
  $("analyze").disabled=n<3;
  $("needed").textContent=n<3 ? (3-n)+"명 더 선택하면 발급할 수 있어요" : "↑ ↓ 버튼으로 선호 순위를 바꿀 수 있어요";
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
function suspectLines(body){
  return body.axes.filter(a=>a.suspects?.length).map(a=>a.key+' 평균의 범인: '+a.suspects.map(p=>p.name+' ('+measureText(p.value)+' cm, '+deltaText(p.delta)+')').join(' · '));
}
function suspectSection(body){
  const axes=body.axes.filter(a=>a.suspects?.length);
  if(!axes.length) return '';
  return '<div class="suspectBox"><h3>평균 속 범인 찾기</h3><p class="method">평균 판정이 나온 항목마다 전체 캐릭터 평균에서 가장 멀리 떨어진 선택 캐릭터를 찾았어요. 동률은 모두 표시합니다.</p>'+axes.map(a=>'<div class="suspectAxis"><b>'+a.key+' · '+a.label+'</b>'+a.suspects.map(p=>'<div class="suspectPerson"><img src="'+PORTRAITS[p.id]+'" alt=""><span><strong>'+escapeHtml(p.name)+'</strong><small>'+measureText(p.value)+' cm · 전체 평균 대비 '+deltaText(p.delta)+'</small></span></div>').join('')+'</div>').join('')+'</div>';
}
function bodySection(body) {
  const rows=body.axes.map(axis=>'<tr><th scope="row">'+axis.label+' ('+axis.key+')<br><small>'+escapeHtml(axis.trait||'판정 보류')+'</small></th><td>'+measureText(axis.mean)+'</td><td>'+measureText(axis.referenceMean)+'</td><td><b>'+deltaText(axis.delta)+'</b></td></tr>').join("");
  return '<section class="reportBlock bodyScores"><h3>내가 선호하는 B·H·W 특징</h3><p class="profileFinding">'+body.summary+'</p><table><caption>캐릭터 프로필 둘레 평균 비교 (cm)</caption><thead><tr><th scope="col">항목</th><th scope="col">선택 평균</th><th scope="col">전체 평균</th><th scope="col">차이</th></tr></thead><tbody>'+rows+'</tbody></table>'+suspectSection(body)+'<p class="method">각 차이를 해당 항목의 전체 표준편차로 나눠 비교했어요. 표에는 부위별 칭호를 모두 표시하고, 요약에는 가장 두드러진 차이를 담았어요.</p></section>';
}
function reviewSection(v){
  return '<section class="reviewBox" aria-label="감정 소견서"><div class="overline">REVIEW / TRACEN TASTE LAB</div><h3>'+escapeHtml(v.heading)+'</h3>'+(v.keywords.length?'<div class="reviewTags">'+v.keywords.map(t=>'<span>#'+escapeHtml(t)+'</span>').join('')+'</div>':'')+'<p class="reviewIntro">'+escapeHtml(v.intro)+'</p><ul>'+v.lines.map(t=>'<li>'+escapeHtml(t)+'</li>').join('')+'</ul><p class="reviewNote">'+escapeHtml(v.note)+'</p><p class="reviewOutro">'+escapeHtml(v.outro)+'</p><small>기록 기반 자동 소견 · 팬 콘텐츠</small></section>';
}
function reviewText(v){return [v.heading,v.keywords.map(t=>'#'+t).join(' '),v.intro,...v.lines.map(t=>'• '+t),v.note,v.outro];}
function showReport(focus=false) {
  report=makeReport(selected,readReport(location.hash)?.title);
  const r=report;
  const minis=r.people.map((p,i)=>'<div class="mini"><div style="background:'+COLORS[(p.id-1)%COLORS.length]+'"><img src="'+PORTRAITS[p.id]+'" alt=""><b>'+pad(i+1)+'</b></div><small>'+escapeHtml(p.name)+'</small><div class="rankControls">'+rankButtons(p,i,r.people.length)+'</div></div>').join("");
  const profile=[["평균 신장",measureText(r.height)+" cm"],["평균 B / H / W",r.measures.map(measureText).join(" / ")+" cm"],["원본마 출전 기록",r.covered ? r.starts+"전 "+r.wins+"승" : "자료 없음"]];
  $("reportPage").innerHTML='<div class="actions"><button id="edit">다시 고르기</button><div><button id="copyText">텍스트 복사</button><button id="copyLink" '+(location.protocol==="file:" || (lineupUsesLocalDatabase() || localTitleChanges()) ? 'disabled title="로컬 수정본은 PNG나 텍스트로 공유하세요"' : "")+'>결과 링크 복사</button><button class="primary" id="png">PNG 저장</button></div></div><article class="reportCard"><div class="reportHero"><div class="eyebrow"><i class="checker"></i> TRAINER PREFERENCE REPORT</div><p>'+escapeHtml(trainer())+' 님의 취향 감정서</p><h1 id="resultTitle" tabindex="-1">'+escapeHtml(r.title)+'</h1>'+titlePicker(r)+'<p>'+r.headline+'</p><p>'+escapeHtml(r.styleText)+'</p></div><div class="reportInside"><div class="overline"><span></span> MY LINEUP</div><h2>나의 우마무스메</h2><div class="minis">'+minis+'</div><div class="profiles">'+profile.map(([label,val])=>'<div><small>'+label+'</small><strong>'+val+'</strong></div>').join("")+'</div>'+bodySection(r.body)+specialSection(r)+historySection(r)+'<div class="overline"><span></span> RACE RECORDS</div><h2>원본마로 보는 레이스 취향</h2><p class="muted">선택한 '+selected.length+'명 중 원본마 기록이 있는 '+r.covered+'명의 거리·주로별 출전 비율을 선호 순위로 가중 평균했어요.</p><div class="reports">'+charts("거리별 출전 비율",DISTANCES,r.distance,DISTANCE_INFO)+charts("주로별 출전 비율",SURFACES,r.surface)+charts("게임 적성 기반 각질 선호",RUN_STYLES,r.style.percentages)+'</div>'+(r.meeting ? '<section class="memory"><div class="overline"><span></span> RACE ARCHIVE</div><h3>함께 달린 한 장면</h3><p>'+escapeHtml(meetingText(r.meeting))+'</p><small>선택한 캐릭터의 원본마가 같은 경주에 출전한 기록이에요.</small></section>' : '')+reviewSection(r.review)+'<p class="method">cm 표시는 항목별 단순 평균입니다. B·H·W 판정은 선택 평균과 전체 평균의 차이를 비교합니다. 출전·승수는 제공된 원본마 기록의 합계이며, 취소·제외된 출전은 집계에서 뺐습니다. 거리가 누락된 경주는 거리 비율에서 제외합니다.</p></div></article>'+((lineupUsesLocalDatabase() || localTitleChanges()) ? '<p class="method">이 브라우저에서 수정한 데이터로 계산한 결과입니다. PNG 또는 텍스트로 공유하거나, database.json을 배포한 후 링크를 복사하세요.</p>' : location.protocol==="file:" ? '<p class="method">GitHub Pages에서 열면 결과 링크도 공유할 수 있어요.</p>' : "");
  $("selectPage").hidden=true; $("reportPage").hidden=false; window.scrollTo(0,0);
  if (focus) $("resultTitle").focus({preventScroll:true});
}
function titlePicker(r){
  return '<div class="titlePicker"><label for="chooseTitle">대표 칭호 선택 · '+r.titleChoices.length+'종 획득</label><select id="chooseTitle">'+r.titleChoices.map((t,i)=>'<option value="'+i+'"'+(t.title===r.title?' selected':'')+'>'+escapeHtml((t.title===r.recommendedTitle?'[추천] ':'')+t.title+' · '+t.category)+'</option>').join('')+'</select><small id="chosenTitleDetail">'+escapeHtml(r.titleChoices.find(t=>t.title===r.title)?.detail||'')+'</small></div>';
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
  return [trainer()+" 님의 트레이너 취향 감정서",r.title,r.basicTitle,...r.special.hits.map(g=>g.title+" · "+g.name),...r.special.traits.map(t=>t.title+" · "+t.pct.toFixed(1)+"%"),...r.history.hits.map(t=>t.title+" · "+t.detail),"원본마 성별: 암말 "+r.history.sex.mare+"명 · 수말 계열 "+r.history.sex.male+"명 · 미확인 "+r.history.sex.unknown+"명","G1 기록 평균 "+(r.history.mean===null?"자료 없음":r.history.mean.toFixed(2)+"승"),...r.history.generations.map(([y,c])=>y+"년 세대: "+c+"명"),r.headline,r.styleText,...RUN_STYLES.map((label,i)=>label+" "+r.style.percentages[i].toFixed(1)+"%"),r.people.map((p,i)=>(i+1)+". "+p.name).join(" · "),"평균 신장 "+measureText(r.height)+"cm | B/H/W "+r.measures.map(measureText).join("/")+"cm",r.body.summary,...r.body.axes.map(profileLine),...suspectLines(r.body),"원본마 기록 "+r.covered+"/"+selected.length+"명"+(r.covered ? " · "+r.starts+"전 "+r.wins+"승" : ""),...(r.meeting ? ["함께 달린 한 장면 · "+meetingText(r.meeting)] : []),"",...reviewText(r.review)].join("\n");
}
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast("복사했어요."); }
  catch { $("manualCopy").value=value; $("copyDialog").showModal(); $("manualCopy").select(); }
}
$("help").onclick=()=>$("guide").showModal(); $("closeGuide").onclick=()=>$("guide").close(); $("closeCopy").onclick=()=>$("copyDialog").close();
$("grid").onclick=e=>{const card=e.target.closest(".card"); if (card) toggle(Number(card.dataset.id));};
function handleRankMove(e,onReport=false){
  const b=e.target.closest('[data-move]'); if(!b || b.disabled) return false;
  const id=Number(b.dataset.move),step=Number(b.dataset.step),next=moveRank(selected,id,step);
  if(next===selected) return true;
  selected=next;
  if(onReport){const previous=report.title;const updated=makeReport(selected,previous);history.replaceState(null,"",reportHash(selected,$("nick").value,updated.title));const y=window.scrollY;showReport();window.scrollTo(0,y);if(previous!==updated.title)toast("순위 변경으로 기존 칭호 조건이 해제되어 추천 칭호를 적용했어요.");}
  else renderLineup();
  const root=$(onReport?'reportPage':'lineup');const buttons=[...root.querySelectorAll('[data-move="'+id+'"]')];(buttons.find(x=>!x.disabled&&Number(x.dataset.step)===step)||buttons.find(x=>!x.disabled))?.focus({preventScroll:true});
  return true;
}
$("lineup").onclick=e=>{if(handleRankMove(e))return;const btn=e.target.closest("[data-remove]"); if(btn){toggle(Number(btn.dataset.remove)); const next=$("lineup").querySelector("button")||$("query");next.focus({preventScroll:true});}};
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
$("reportPage").onchange=e=>{
  if(e.target.id!=="chooseTitle" || !report) return;
  const choice=report.titleChoices[Number(e.target.value)];
  if(!choice) return;
  report.title=choice.title;
  $("resultTitle").textContent=choice.title;
  $("chosenTitleDetail").textContent=choice.detail;
  history.replaceState(null,"",reportHash(selected,$("nick").value,choice.title));
  $("selectedTitleStatus").textContent=choice.title;
};
$("reportPage").onclick=e=>{
  if(handleRankMove(e,true))return;
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
  const r=report, button=$("png"), owner=trainer(), suspects=suspectLines(r.body);
  button.disabled=true;button.textContent="이미지 만드는 중";
  try {
    const imgs=await Promise.all(r.people.map(p=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=location.protocol==="file:"&&p.id>=143?"data:image/png;base64,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":PORTRAITS[p.id];
    })));
    const W=960, rows=Math.ceil(imgs.length/5), profileY=430+rows*175, base=profileY+225+(suspects.length?54+suspects.length*30:0), oldH=base+650+(r.meeting ? 114 : 0)+190+Math.max(1,r.history.hits.length)*30;
    const measure=document.createElement('canvas').getContext('2d');
    const reviewFont="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif";
    function wrapReview(text,size,weight=600){measure.font=weight+" "+size+"px "+reviewFont;const lines=[];let line='';for(const char of text){if(line&&measure.measureText(line+char).width>798){lines.push(line.trim());line=char.trimStart();}else line+=char;}if(line)lines.push(line.trim());return lines;}
    const reviewRows=[{text:r.review.heading,size:24,color:'#c7adff',weight:800},{text:r.review.keywords.map(t=>'#'+t).join('  '),size:18,color:'#c7adff'}, {text:r.review.intro,size:25,color:'#ffffff',weight:800},...r.review.lines.map(text=>({text:'• '+text,size:20,color:'#e7e4f0'})),{text:r.review.note,size:22,color:'#e5dcf5',weight:600},{text:r.review.outro,size:21,color:'#d2ff83',weight:700}].filter(x=>x.text).map(x=>({...x,lines:wrapReview(x.text,x.size,x.weight)}));
    const reviewHeight=52+reviewRows.reduce((h,x)=>h+x.lines.length*(x.size+9)+12,0), reviewY=oldH-90, H=oldH+reviewHeight+28;
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
    if(suspects.length){type("평균 속 범인 찾기 · 전체 평균 대비 최대 편차",48,profileY+355,23,"#543289",800);suspects.forEach((line,i)=>type(line,48,profileY+390+i*30,19));}
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
    type("세대 · G1 · 우승 경주 · 암말 "+r.history.sex.mare+" / 수말 "+r.history.sex.male+" / 미확인 "+r.history.sex.unknown,48,hy,24);
    type("기록상 G1 평균 "+(r.history.mean===null?"자료 없음":r.history.mean.toFixed(2)+"승")+" · "+r.history.generations.map(([y,c])=>y+"년 "+c+"명").join(" / "),48,hy+36,19);
    r.history.hits.forEach((t,i)=>type(t.title+" · "+t.detail,48,hy+70+i*30,19));
    rect(48,reviewY,864,reviewHeight,"#211a39");rect(48,reviewY,6,reviewHeight,"#9a77df");
    let reviewLineY=reviewY+32;
    for(const item of reviewRows){for(const line of item.lines){type(line,78,reviewLineY,item.size,item.color,item.weight||600,798);reviewLineY+=item.size+9;}reviewLineY+=12;}
    rect(48,H-86,864,1,"#cfc7d9");type("TRACEN TASTE LAB",48,H-43,19,"#6239bc",800);
    type("우마무스메 프리티 더비 · 비공식 팬 프로젝트",505,H-43,17,"#695e76");
    const blob=await new Promise(resolve=>cv.toBlob(resolve,"image/png"));
    if(!blob) throw Error("PNG");
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="트레이너-취향-감정서.png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  } catch {toast("이미지를 저장하지 못했어요. 다시 시도해 주세요.");}
  finally {button.disabled=false;button.textContent="PNG 저장";}
}

function specialSection(r){return '<section class="memory"><div class="overline">TITLE COLLECTION</div><h3>획득 칭호 · '+r.titleChoices.length+'종</h3><p>현재 대표 칭호: <b id="selectedTitleStatus">'+escapeHtml(r.title)+'</b></p><details><summary>획득한 전체 칭호 보기</summary>'+r.titleChoices.map(t=>'<p><b>'+escapeHtml(t.title)+'</b> · '+escapeHtml(t.category)+' <small>'+escapeHtml(t.detail)+'</small></p>').join('')+'</details></section>'; }

function historySection(r){const h=r.history;const list=a=>a.map(([k,c])=>'<p>'+escapeHtml(k)+' · <b>'+c+'/'+r.people.length+'명</b></p>').join('');return '<section class="memory"><div class="overline">GENERATION &amp; G1 ARCHIVE</div><h3>세대 · G1 · 우승 경주 · 원본마 성별</h3><p>암말 '+h.sex.mare+'명 · 수말 계열 '+h.sex.male+'명 · 미확인 '+h.sex.unknown+'명</p><p>기록상 G1 평균 '+(h.mean===null?'자료 없음':h.mean.toFixed(2)+'승')+' · 비교 가능 '+h.known+'/'+r.people.length+'명 · 합계 '+h.total+'승</p>'+h.hits.map(t=>'<p><b>'+escapeHtml(t.title)+'</b> · '+escapeHtml(t.detail)+'</p>').join('')+'<div class="reports"><div><h3>클래식 세대</h3>'+list(h.generations.map(([y,c])=>[y+'년',c]))+'</div><div><h3>우승 경주별 인원</h3>'+list(h.races)+'</div></div><small>WORDLE 우승 목록 기준. 복수 우승 표기는 승수에 반영하고 경주별 인원은 중복 없이 집계합니다. 원본 자료의 등급제 이전 경주 등 누락 가능성이 있습니다.</small></section>'; }

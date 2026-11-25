"use strict";
const dbDialog=$("dataDialog"), dbForm=$("recordForm");
let editingRecord=null;
const fieldGroups=[
  ["프로필 (cm)",[["height","신장"],["B","B · 가슴둘레"],["H","H · 엉덩이둘레"],["W","W · 허리둘레"]]],
  ["원본마 전적",[["starts","총출전"],["wins","승수"]]],
  ["거리별 출전 횟수",DISTANCES.map((label,i)=>["dist"+i,label])],
  ["주로별 출전 횟수",SURFACES.map((label,i)=>["surface"+i,label])]
];
$("dbFields").innerHTML=fieldGroups.map(([title,fields],group)=>'<fieldset><legend>'+title+'</legend><div class="dbFields">'+fields.map(([name,label])=>'<label>'+label+'<input type="number" min="'+(group?"0":"0.01")+'" step="'+(group?"1":"any")+'" name="'+name+'"></label>').join("")+'</div></fieldset>').join("");
$("dbFields").insertAdjacentHTML('beforeend','<fieldset><legend>WORDLE · 원본마 세대 및 G1</legend><div class="dbFields"><label>출생연도<input type="number" name="birthYear"></label><label>클래식 세대<input type="number" name="classicYear"></label><label>생일<input name="birthday"></label><label>G1 우승 경주 (줄바꿈 구분)<textarea name="g1Titles" rows="5"></textarea></label><label>기록상 G1 승수<input name="g1Wins" readonly></label></div></fieldset>');
function dbStatus(message){$("dbStatus").textContent=message;}
function loadEditorRecord(){
  const p=BY_ID.get(Number($("dbCharacter").value));
  dbForm.hidden=!p;
  if(!p){editingRecord=null;return;}
  editingRecord=asRecord(p);
  for(const k of ["height","B","H","W","starts","wins","style"]) dbForm.elements[k].value=editingRecord[k]??"";
  for(const k of ["birthYear","classicYear","birthday","g1Wins"])dbForm.elements[k].value=editingRecord[k];dbForm.elements.g1Titles.value=editingRecord.g1Titles.join('\n');
  for(const k of ["dist","surface"]) editingRecord[k].forEach((n,i)=>dbForm.elements[k+i].value=n);
}
function listEditorRecords(preferred){
  const mode=$("dbFilter").value;
  const people=ROSTER.filter(p=>mode==="all" || (mode==="races" && !p.starts) || (mode==="styles" && !p.style) || (mode==="profiles" && [p.height,...p.measurements].includes(null)));
  const picker=$("dbCharacter");
  picker.replaceChildren(...people.map(p=>new Option(p.name,p.id)));
  if(people.some(p=>p.id===preferred)) picker.value=preferred;
  if(!people.length) picker.append(new Option("해당하는 캐릭터 없음",""));
  loadEditorRecord();
}
function refreshAnalysis(){
  renderGrid();renderLineup();
  if(!$("reportPage").hidden) showReport();
}
$("openData").onclick=()=>{
  listEditorRecords(editingRecord?.id);
  dbStatus(databaseWarning);
  dbDialog.showModal();
};
$("dbClose").onclick=()=>dbDialog.close();
$("dbFilter").onchange=()=>{listEditorRecords();dbStatus("");};
$("dbCharacter").onchange=()=>{loadEditorRecord();dbStatus("");};
dbForm.onsubmit=e=>{
  e.preventDefault();
  if(!editingRecord) return;
  try{
    const row={...editingRecord};
    const number=name=>dbForm.elements[name].valueAsNumber;
    for(const k of ["height","B","H","W"]) row[k]=dbForm.elements[k].value==="" ? null : number(k);
    for(const k of ["starts","wins"]) row[k]=dbForm.elements[k].value==="" ? 0 : number(k);
    for(const k of ["dist","surface"]) row[k]=[0,1,2,3].map(i=>dbForm.elements[k+i].value==="" ? 0 : number(k+i));
    row.style=dbForm.elements.style.value||null;
    for(const k of ["birthYear","classicYear"])row[k]=number(k);row.birthday=dbForm.elements.birthday.value;row.g1Titles=dbForm.elements.g1Titles.value.split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
    writeDatabaseRows([row],editingRecord);
    refreshAnalysis();listEditorRecords(row.id);dbStatus(row.name+" 기록을 이 브라우저에 저장했습니다.");
  }catch(err){dbStatus(err.message);}
};
$("dbExport").onclick=()=>{
  const blob=new Blob([JSON.stringify(databaseSnapshot(),null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="database.json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
};
$("dbImport").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const rows=readDatabase(JSON.parse(await file.text()));
    writeDatabaseRows([...rows.values()]);
    refreshAnalysis();listEditorRecords(editingRecord?.id);dbStatus(rows.size+"명의 기록을 반영했습니다.");
  }catch(err){dbStatus("가져오기 실패 · "+err.message);}
  finally{e.target.value="";}
};
addEventListener("storage",e=>{
  if(e.key!==DB_STORAGE_KEY && e.key!==null)return;
  try{localEdits=readLocalEdits();applyDatabase();refreshAnalysis();if(dbDialog.open)dbStatus("다른 탭에서 데이터가 갱신됐습니다.");}
  catch(err){toast(err.message);}
});

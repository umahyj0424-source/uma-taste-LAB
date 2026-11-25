"use strict";
const DB_VERSION=1;
const DB_STORAGE_KEY="tracen-taste-records-v1";
const RUN_STYLES=["도주","선행","선입","추입"];
const EDIT_FIELDS=["height","B","H","W","starts","wins","dist","surface","style",...HISTORY_KEYS];
function asRecord(p) {
  return {id:p.id,name:p.name,height:p.height,B:p.measurements[0],H:p.measurements[2],W:p.measurements[1],starts:p.starts,wins:p.wins,dist:[...p.dist],surface:[...p.surface],style:p.style??null,...Object.fromEntries(HISTORY_KEYS.map(k=>[k,p[k]??WORDLE_DATA[p.id][k]]))};
}
let publishedRows=new Map(ROSTER.map(p=>[p.id,asRecord(p)]));
let localEdits={};
let databaseWarning="";
function sameValue(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function validateRecord(row){
  const fail=reason=>{throw Error((row?.name || "캐릭터")+" · "+reason);};
  const known=publishedRows.get(row?.id);
  row={...WORDLE_DATA[row?.id],...row};
  if(!known || row.name!==known.name) fail("등록된 ID와 이름을 확인하세요.");
  for(const key of ["height","B","H","W"]){
    if(row[key]!==null && !(Number.isFinite(row[key]) && row[key]>0)) fail(key+" 값은 양수 또는 null이어야 합니다.");
  }
  for(const key of ["starts","wins"]){
    if(!Number.isSafeInteger(row[key]) || row[key]<0) fail("출전·승수는 0 이상의 정수로 입력하세요.");
  }
  if(row.wins>row.starts) fail("승수가 총출전을 초과합니다.");
  for(const key of ["dist","surface"]){
    const counts=row[key];
    if(!Array.isArray(counts) || counts.length!==4 || !counts.every(n=>Number.isSafeInteger(n)&&n>=0)) fail("거리·주로에는 각각 네 개의 출전 횟수가 필요합니다.");
    if(counts.reduce((a,b)=>a+b,0)>row.starts) fail("거리 또는 주로 합계가 총출전을 초과합니다.");
  }
  if(row.style!==null && !RUN_STYLES.includes(row.style)) fail("대표 각질을 확인하세요.");
  if(!Number.isInteger(row.birthYear)||!Number.isInteger(row.classicYear)||!Array.isArray(row.g1Titles)||!row.g1Titles.every(t=>typeof t==="string"&&t.trim()))fail("출생·세대·G1 자료를 확인하세요.");
  row.g1Wins=recordedWins(row.g1Titles);
  return Object.fromEntries(["id","name",...EDIT_FIELDS].map(key=>[key,row[key]]));
}
function readDatabase(data) {
  if(data?.version!==DB_VERSION || !Array.isArray(data.records) || !data.records.length) throw Error("version 1과 records 목록이 있는 database.json을 선택하세요.");
  const rows=new Map();
  for(const entry of data.records){
    const row=validateRecord(entry);
    if(rows.has(row.id)) throw Error("중복 ID "+row.id);
    rows.set(row.id,row);
  }
  return rows;
}
function applyDatabase(){
  for(const person of ROSTER){
    const row=validateRecord({...publishedRows.get(person.id),...localEdits[person.id]});
    person.height=row.height;
    person.measurements=[row.B,row.W,row.H];
    Object.assign(person,{starts:row.starts,wins:row.wins,dist:row.dist,surface:row.surface,style:row.style,...Object.fromEntries(HISTORY_KEYS.map(k=>[k,row[k]]))});
  }
}
function readLocalEdits(){
  const edits=JSON.parse(localStorage.getItem(DB_STORAGE_KEY)||"{}");
  if(!edits || typeof edits!=="object" || Array.isArray(edits)) throw Error("저장 형식을 확인하세요.");
  for(const [id,patch] of Object.entries(edits)){
    if(!publishedRows.has(Number(id))||!patch||Object.keys(patch).some(k=>!EDIT_FIELDS.includes(k))) throw Error("알 수 없는 수정 항목입니다.");
    validateRecord({...publishedRows.get(Number(id)),...patch});
  }
  return edits;
}
async function initializeDatabase(){
  if(/^https?:$/.test(location.protocol)){
    try{
      const response=await fetch("./database.json",{cache:"no-cache",signal:AbortSignal.timeout(8000)});
      if(!response.ok) throw Error(String(response.status));
      const rows=readDatabase(await response.json());
      publishedRows=new Map([...publishedRows,...rows]);
    }catch{databaseWarning="배포용 database.json을 읽을 수 없어 ZIP의 기본 자료로 열었습니다.";}
  }
  try{localEdits=readLocalEdits();}
  catch{databaseWarning+=" 브라우저 수정 자료를 불러올 수 없습니다. JSON 가져오기를 이용하세요.";}
  applyDatabase();
}
function writeDatabaseRows(rows,expected=null){
  const validated=rows.map(validateRecord);
  // Re-read other tabs' latest edits before a single atomic storage write.
  const patches=readLocalEdits();
  for(const row of validated){
    const base=publishedRows.get(row.id);
    if(expected && !sameValue({...base,...patches[row.id]},expected)) throw Error("다른 탭에서 이 기록을 바꿨습니다. 캐릭터를 다시 선택한 뒤 수정하세요.");
    const patch={};
    for(const key of EDIT_FIELDS) if(!sameValue(row[key],base[key])) patch[key]=row[key];
    if(Object.keys(patch).length) patches[row.id]=patch;
    else delete patches[row.id];
  }
  try{localStorage.setItem(DB_STORAGE_KEY,JSON.stringify(patches));}
  catch{throw Error("브라우저 저장 공간을 사용할 수 없습니다. 저장 권한 또는 여유 공간을 확인하세요.");}
  localEdits=patches;
  applyDatabase();
}
function databaseSnapshot(){return {version:DB_VERSION,records:ROSTER.map(asRecord)};}
function lineupUsesLocalDatabase(){
  // Any edited measurement can change the whole roster's reference distribution.
  return Object.entries(localEdits).some(([id,patch])=>Object.keys(patch).some(key=>!sameValue(publishedRows.get(Number(id))[key],patch[key])));
}

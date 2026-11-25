"use strict";
// Each side is ordered by the magnitude of the standardized difference.
// Add a tier with a larger threshold to distinguish a more extreme lineup.
const TITLE_RULES = {
  B: {middle:"평균적인 가슴", high:[[1.5,"빵ㅋㅋ 두 배"],[0.5,"빵ㅋㅋ"]], low:[[1.5,"초슬림한 가슴"],[0.5,"아담한 가슴"]]},
  H: {middle:"평균적인 엉덩이", high:[[1.5,"존재감 넘치는 힙"],[0.5,"볼륨 있는 힙"]], low:[[1.5,"초슬림한 힙"],[0.5,"아담한 엉덩이"]]},
  W: {middle:"평균적인 허리", high:[[1.5,"묵직한 허리"],[0.5,"넉넉한 허리"]], low:[[1.5,"한 줌 허리"],[0.5,"얇은 허리"]]},
  style: {도주:"도주 응원단장",선행:"선행 승부사",선입:"선입 타이밍 장인",추입:"추거노인"}
};
function titleTrait(key,score) {
  if(score===null) return null;
  const rules=TITLE_RULES[key];
  const direction=score<0 ? rules.low : rules.high;
  const tier=direction.filter(([min])=>Math.abs(score)>=min).sort((a,b)=>b[0]-a[0])[0];
  return tier ? tier[1] : rules.middle;
}

// Editable configuration, independent of character records.
const TITLE_STORAGE='tracen-title-rules-v2';
const DEFAULT_CONFIG={version:2,groupPack:3,axes:Object.fromEntries(['B','H','W'].map(k=>[k,{...TITLE_RULES[k],high:[[2,'극한 '+TITLE_RULES[k].high[0][1]],...TITLE_RULES[k].high],low:[[2,'극한 '+TITLE_RULES[k].low[0][1]],...TITLE_RULES[k].low]}])),dominance:[[90,'절대주의자'],[75,'일편단심'],[60,'열혈파']],groups:[
['rttt','ROAD TO THE TOP','정상으로 향하는 길',[76,32,15],3,10,100],
['movie','새로운 시대의 문','새로운 시대를 여는 자',[91,31,140,89],4,10,100],
['bnw','BNW','BNW의 맹세',[23,49,34],3,10,90],
['98','98 황금세대','황금세대의 목격자',[1,20,60,11,14],5,10,100],
['99','99세대','세기말의 증인',[15,32,76,57],4,10,95],
['s2','애니메이션 2기','기적을 믿는 트레이너',[3,13],2,10,50],
['s3','애니메이션 3기','꿈을 잇는 트레이너',[67,66],2,10,50],
['satono','사토노','사토노의 후원자',[66,86],2,10,50],
['ruby','단거리 삼인방','태양과 보석과 기적',[83,64,90],3,10,80],
['dirt','더트 삼인방','모래 위의 지배자',[95,96,97],3,10,80],
["gyaru","갸루 계열","갸루 애호가",[47,39,64,63,142,132,110],3,10,85],
["gyaru-strict","갸루 계열","가루 원리원칙주의자",[47,39,64,63,142,132,110],6,10,120],
["sakura","사쿠라 군단","무적의 사쿠라군단!",[40,68,75,120],3,10,110],
["canopus","카노푸스","G1이 전부는 아니니까",[59,65,62,61],4,10,100],
["v-sisters","V자매","자매덮밥 말고 자매응원단",[141,87,88],3,10,100],
["gold-family","황금 일족","황금 일족",[129,7,112,116,48,121],6,10,120],
["light-speed","광속 추구","빠르면 그만입니다",[40,117],2,10,90],
["food-bankruptcy","지갑 파산","식비로 파산한 트레이너",[6,1,27],3,10,95],
["mejiro","메지로","메지로 가문의 귀빈",[13,26,58,63,70,73,84],7,10,115],
["symboli","심볼리","황제의 일족",[17,69,81,149],4,10,105],
["narita","나리타","나리타 삼총사",[16,49,76],3,10,95],
["hishi","히시","히시 연합",[12,27,103],3,10,95],
["admire","어드마이어","어드마이어의 별",[32,115],2,10,85],
["machikane","마치카네","마치카네 절찬 영업 중",[55,61],2,10,85],
["agnes","아그네스","트레센의 괴짜들",[31,19],2,10,85],
["air","에어","에어 군단",[18,35,108],3,10,95],
["city","시티","시티 라이프",[39,142,104],3,10,95]
].map(([id,name,title,ids,min,top,priority])=>({id,name,title,ids,min,top,priority,enabled:true})),history:defaultHistory(),extra:defaultExtra()};
let titleConfig=structuredClone(DEFAULT_CONFIG), publishedTitleConfig=structuredClone(DEFAULT_CONFIG), titleWarning='';
function validateTitleConfig(c){
 const fail=()=>{throw Error('칭호 설정 형식 또는 범위를 확인하세요.');};
 const str=s=>typeof s==='string'&&s.trim().length>0&&s.length<=100;
 const tiers=(a,max)=>Array.isArray(a)&&a.length<=12&&a.every(t=>Array.isArray(t)&&t.length===2&&Number.isFinite(t[0])&&t[0]>0&&t[0]<=max&&str(t[1]))&&new Set(a.map(t=>t[0])).size===a.length;
 if(c?.version!==2||!c.axes||!tiers(c.dominance,100)||!Array.isArray(c.groups)||c.groups.length>300)fail();
 for(const k of ['B','H','W']){const a=c.axes[k];if(!a||!str(a.middle)||!tiers(a.high,10)||!tiers(a.low,10))fail();}
 const keys=new Set();for(const g of c.groups){if(!g||!str(g.id)||keys.has(g.id)||!str(g.name)||!str(g.title)||!Array.isArray(g.ids)||!g.ids.length||new Set(g.ids).size!==g.ids.length||g.ids.some(id=>!ROSTER.some(p=>p.id===id))||!Number.isInteger(g.min)||g.min<1||g.min>g.ids.length||!Number.isInteger(g.top)||g.top<g.min||g.top>10||!Number.isFinite(g.priority)||typeof g.enabled!=='boolean')fail();keys.add(g.id);}
 c={...c,history:validateHistory(c.history||defaultHistory()),extra:validateExtra(c.extra||defaultExtra())};
 return structuredClone(c);
}
function migrateGroupPack(c){
 if(c.groupPack>=3)return c;
 const pack=Number(c.groupPack)||0;
 const newIds=[...(pack<1?['gyaru','gyaru-strict','sakura']:[]),...(pack<2?['canopus','v-sisters','gold-family','light-speed','food-bankruptcy']:[]),...["mejiro", "symboli", "narita", "hishi", "admire", "machikane", "agnes", "air", "city"]];
 return {...c,groupPack:3,groups:[...c.groups,...DEFAULT_CONFIG.groups.filter(g=>newIds.includes(g.id)&&!c.groups.some(x=>x.id===g.id))]};
}
function applyTitleConfig(c){titleConfig=validateTitleConfig(c);for(const k of ['B','H','W'])TITLE_RULES[k]=titleConfig.axes[k];}
async function initializeTitles(){
 if(/^https?:$/.test(location.protocol)){try{const r=await fetch('./title-config.json',{cache:'no-cache',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();publishedTitleConfig=validateTitleConfig(migrateGroupPack(validateTitleConfig(await r.json())));}catch{titleWarning='배포 설정을 읽지 못해 기본값을 사용합니다.';}}
 applyTitleConfig(publishedTitleConfig);try{const s=localStorage.getItem(TITLE_STORAGE);if(s){const old=validateTitleConfig(JSON.parse(s));const migrated=migrateGroupPack(old);applyTitleConfig(migrated);if(old.groupPack!==migrated.groupPack)localStorage.setItem(TITLE_STORAGE,JSON.stringify(migrated));}}catch{titleWarning+=' 로컬 칭호 설정을 읽지 못했습니다.';}
}
function localTitleChanges(){return JSON.stringify(titleConfig)!==JSON.stringify(publishedTitleConfig);}
function specialTitles(ids,distance,surface,styleVotes){
 const hits=titleConfig.groups.filter(g=>g.enabled).map(g=>({...g,matched:ids.slice(0,g.top).filter(id=>g.ids.includes(id))})).filter(g=>g.matched.length>=g.min).sort((a,b)=>b.priority-a.priority||b.matched.length-a.matched.length||a.id.localeCompare(b.id));
 const traits=[];for(const [labels,values] of [[['단거리','마일','중거리','장거리'],distance],[['잔디','더트','합성','장애물'],surface],[RUN_STYLES,styleVotes]]){const total=values.reduce((a,b)=>a+b,0);if(!total)continue;const max=Math.max(...values);if(values.filter(v=>Math.abs(v-max)<1e-9).length!==1)continue;const pct=max/total*100;const tier=[...titleConfig.dominance].sort((a,b)=>b[0]-a[0]).find(t=>pct>=t[0]);if(tier)traits.push({title:labels[values.indexOf(max)]+' '+tier[1],pct});}return {hits,traits};
}

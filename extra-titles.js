"use strict";
function defaultExtra(){return {"average":{"enabled":true,"minMatches":3,"distances":["마일","중거리"],"tiers":[{"max":0.1,"title":"인간 표준편차","priority":80,"requiresDistance":false},{"max":0.25,"title":"극한의 말평 ㅋㅋ","priority":70,"requiresDistance":true},{"max":0.5,"title":"말평 ㅋㅋ","priority":45,"requiresDistance":true}]},"sex":{"enabled":true,"minMatches":3,"tiers":[[100,"티아라 순혈파","클래식 순혈파",75],[80,"티아라 일편단심","클래식 일편단심",55],[60,"티아라 애호가","클래식 애호가",35]]}};}
function validateExtra(e){
 const fail=()=>{throw Error('말평·원본마 성별 칭호 설정을 확인하세요.');};
 const str=x=>typeof x==='string'&&x.trim()&&x.length<=100;
 const base=x=>x&&typeof x.enabled==='boolean'&&Number.isInteger(x.minMatches)&&x.minMatches>=3&&x.minMatches<=10;
 if(!e||!base(e.average)||!base(e.sex)||!Array.isArray(e.average.distances)||!e.average.distances.every(x=>['단거리','마일','중거리','장거리'].includes(x))||!Array.isArray(e.average.tiers)||!e.average.tiers.every(t=>Number.isFinite(t.max)&&t.max>=0&&t.max<=10&&str(t.title)&&Number.isFinite(t.priority)&&typeof t.requiresDistance==='boolean')||!Array.isArray(e.sex.tiers)||!e.sex.tiers.every(t=>Array.isArray(t)&&t.length===4&&Number.isFinite(t[0])&&t[0]>50&&t[0]<=100&&str(t[1])&&str(t[2])&&Number.isFinite(t[3])))fail();
 return e;
}
function extraReport(people,body,best,all=false){
 const cfg=titleConfig.extra,n=people.length,hits=[];
 const scores=body.axes.map(a=>a.score); const complete=people.every(p=>p.measurements?.length===3&&p.measurements.every(validMeasure));
 if(cfg.average.enabled&&n>=cfg.average.minMatches&&complete&&scores.length===3&&scores.every(Number.isFinite)){
 const peak=Math.max(...scores.map(Math.abs)); const distanceOK=best.length>0&&best.every(i=>cfg.average.distances.includes(DISTANCES[i]))&&people.every(p=>sum(p.dist)>0);
 const matches=[...cfg.average.tiers].sort((a,b)=>a.max-b.max).filter(t=>peak<=t.max&&(!t.requiresDistance||distanceOK));
 for(const t of (all?matches:matches.slice(0,1)))hits.push({title:t.title,name:'평균 취향',detail:'B/H/W 최대 편차 '+peak.toFixed(3)+'σ'+(t.requiresDistance?' · '+best.map(i=>DISTANCES[i]).join('·'):''),priority:t.priority});
 }
 const mare=people.filter(p=>p.sex==='mare').length,male=people.filter(p=>p.sex==='male').length,unknown=n-mare-male;
 if(cfg.sex.enabled&&n>=cfg.sex.minMatches){for(const [count,idx,label] of [[mare,1,'암말'],[male,2,'수말 계열']]){const pct=count/n*100;const matches=[...cfg.sex.tiers].sort((a,b)=>b[0]-a[0]).filter(t=>pct>=t[0]&&count>=cfg.sex.minMatches);for(const t of (all?matches:matches.slice(0,1)))hits.push({title:t[idx],name:'원본마 성별',detail:label+' '+count+'/'+n+'명 · '+pct.toFixed(0)+'%',priority:t[3]});}}
 return {hits,mare,male,unknown};
}

"use strict";
const DISTANCES = ["단거리", "마일", "중거리", "장거리"];
const SURFACES = ["잔디", "더트", "합성", "장애물"];
const DISTANCE_INFO = ["1,600m 미만", "1,600~1,800m", "1,800m 초과~2,400m", "2,400m 초과"];
const BY_ID = new Map(ROSTER.map(person => [person.id, person]));
const sum = values => values.reduce((a, b) => a+b, 0);
function leaders(values) {
  const best = Math.max(...values);
  return best > 0 ? values.flatMap((value, i) => Math.abs(value-best) < 1e-9 ? [i] : []) : [];
}
function weightedGroup(people, field) {
  const values = [0, 0, 0, 0];
  let weights = 0;
  people.forEach((person, i) => {
    const total = sum(person[field]);
    if (!total) return;
    const weight = 10-i;
    weights += weight;
    person[field].forEach((n, j) => { values[j] += n / total * weight; });
  });
  return values.map(n => weights ? n/weights*100 : 0);
}
function avg(values) {
  const known = values.filter(value => Number.isFinite(value) && value>0);
  return known.length ? sum(known)/known.length : null;
}
// The source stores measurements as bust, waist, hip.
const PROFILE_AXES = [
  {key:"B", label:"가슴둘레", index:0},
  {key:"H", label:"엉덩이둘레", index:2},
  {key:"W", label:"허리둘레", index:1}
];
const validMeasure = n => Number.isFinite(n) && n>0;
function profileReference(index) {
  const values=ROSTER.map(p=>p.measurements?.[index]).filter(validMeasure);
  const mean=avg(values);
  const spread=values.length ? Math.sqrt(sum(values.map(value=>(value-mean)**2))/values.length) : 0;
  return {mean,spread};
}
function moveRank(ids,id,step) {
  const from=ids.indexOf(id), to=from+step;
  if(from<0 || ![-1,1].includes(step) || to<0 || to>=ids.length) return ids;
  const next=[...ids]; [next[from],next[to]]=[next[to],next[from]]; return next;
}
function averageSuspects(people,axis,index) {
  if(axis.score===null || axis.trait!==titleConfig.axes[axis.key].middle) return [];
  const known=people.filter(p=>validMeasure(p.measurements?.[index]));
  if(known.length<2) return [];
  const rows=known.map(p=>({id:p.id,name:p.name,value:p.measurements[index],delta:p.measurements[index]-axis.referenceMean}));
  const max=Math.max(...rows.map(p=>Math.abs(p.delta)));
  if(max<1e-9) return [];
  return rows.filter(p=>Math.abs(Math.abs(p.delta)-max)<1e-9);
}
function profileAssessment(people) {
  const axes=PROFILE_AXES.map(({key,label,index}, i)=>{
    const mean=avg(people.map(p=>p.measurements?.[index]));
    const ref=profileReference(index);
    const delta=mean===null || ref.mean===null ? null : mean-ref.mean;
    const score=delta!==null && ref.spread>0 ? delta/ref.spread : null;
    const axis={key,label,mean,referenceMean:ref.mean,delta,score,trait:titleTrait(key,score)};
    axis.suspects=averageSuspects(people,axis,index); return axis;
  });
  const comparable=axes.filter(a=>a.score!==null);
  if(!comparable.length) return {axes,label:"",summary:"비교할 프로필 수치가 부족해요."};
  const peak=Math.max(...comparable.map(a=>Math.abs(a.score)));
  if(peak<0.5) return {axes,label:"평균에 가까운 조합",summary:"선택한 캐릭터의 둘레는 비교 가능한 모든 항목에서 전체 평균에 가까워요. 한 부위에 치우친 경향은 뚜렷하지 않아요."};
  const strongest=comparable.filter(a=>Math.abs(Math.abs(a.score)-peak)<1e-9);
  const label=strongest.map(a=>a.key+(a.delta>0 ? " 큰 편" : " 작은 편")).join(" · ");
  const findings=strongest.map(a=>a.label+"("+a.key+")가 전체 평균보다 "+Math.abs(a.delta).toFixed(1)+" cm "+(a.delta>0 ? "큰" : "작은")+" 캐릭터");
  const summary=strongest.length===1 ? "이번 선택에서는 "+findings[0]+"를 선호하는 경향이 가장 뚜렷해요." :
    "이번 선택에서는 "+findings.join(", ")+"를 고르는 경향이 같은 정도로 나타났어요.";
  return {axes,label,summary};
}
// Game aptitudes are not historical running styles. Manual values override the default.
function preferredStyles(person) {
  if(RUN_STYLES.includes(person.style)) return [person.style];
  const a=person.aptitudes?.style;
  if(!a) return [];
  const grades=['front','pace','late','end'].map(k=>a[k]);
  if(!grades.every(g=>typeof g==='string' && /^[A-G]$/.test(g))) return [];
  const best=grades.reduce((x,y)=>x<y?x:y);
  return RUN_STYLES.filter((_,i)=>grades[i]===best);
}
function styleAssessment(people) {
  const votes=[0,0,0,0]; let known=0;
  people.forEach((p,rank)=>{const styles=preferredStyles(p);if(!styles.length)return;known++;for(const style of styles) votes[RUN_STYLES.indexOf(style)]+=(10-rank)/styles.length;});
  const total=sum(votes);
  return {votes,known,percentages:votes.map(v=>total?v/total*100:0)};
}
// Collect every eligible title, while preserving the former recommendation.
function titleChoices(r, recommended) {
  const options = new Map();
  const add=(title,category,detail,priority=0)=>{
    if(!title || options.has(title)) return;
    options.set(title,{title,category,detail,priority});
  };
  for(const g of r.special.hits) add(g.title,'특별 조합',g.name+' · '+g.matched.length+'/'+g.ids.length+'명',g.priority);
  for(const h of [...historyReport(r.people,true).hits,...extraReport(r.people,r.body,leaders(r.distance),true).hits]) add(h.title,h.name,h.detail,h.priority);
  // The strongest title is recommended, but lower satisfied thresholds are selectable too.
  for(const a of r.body.axes){
    if(!Number.isFinite(a.score)) continue;
    const rules=titleConfig.axes[a.key], tiers=(a.score<0?rules.low:rules.high).filter(t=>Math.abs(a.score)>=t[0]);
    if(!tiers.length) add(rules.middle,'신체 수치 · '+a.key,a.score.toFixed(2)+'σ');
    for(const t of tiers) add(t[1],'신체 수치 · '+a.key,a.score.toFixed(2)+'σ · 기준 '+t[0]+'σ',t[0]);
  }
  for(const [category,labels,values] of [['거리',DISTANCES,r.distance],['주로',SURFACES,r.surface],['각질',RUN_STYLES,r.style.known>=3?r.style.percentages:[0,0,0,0]]]){
    const best=leaders(values), total=sum(values);
    if(best.length!==1||!total) continue;
    const pct=values[best[0]]/total*100;
    for(const [threshold,suffix] of titleConfig.dominance) if(pct>=threshold) add(labels[best[0]]+' '+suffix,category,pct.toFixed(1)+'% · 기준 '+threshold+'%',threshold);
  }
  for(const i of leaders(r.style.votes)) add(TITLE_RULES.style[RUN_STYLES[i]],'대표 각질',RUN_STYLES[i]+' · '+r.style.percentages[i].toFixed(1)+'%');
  add(r.basicTitle,'기본 조합','기존 자동 생성 칭호');
  return [...options.values()].sort((a,b)=>(b.title===recommended)-(a.title===recommended)||b.priority-a.priority);
}
function makeReport(ids, chosenTitle) {
  const people = ids.map(id => BY_ID.get(id));
  const distance = weightedGroup(people, "dist");
  const surface = weightedGroup(people, "surface");
  const best = leaders(distance);
  const body = profileAssessment(people);
  const style=styleAssessment(people);
  const styleVotes=style.votes;
  const styleBest=leaders(styleVotes).map(i=>RUN_STYLES[i]);
  const styleKnown=style.known;
  const styleText=styleKnown ? "게임 적성 기반 대표 각질 "+styleBest.join(" · ")+(styleBest.length>1 ? " 공동 1위" : "")+" · "+styleKnown+"/"+people.length+"명 (수동 설정 우선)" : "게임 각질 적성 미확인";
  const bodyWords=body.axes.map(a=>a.trait).filter(Boolean);
  const distanceWords=best.map(i=>DISTANCES[i]).join("·");
  const profilePhrase=bodyWords.length ? bodyWords.map(word=>"‘"+word+"’").join(", ")+" 조합을 좋아하는 " : "";
  const distancePhrase=distanceWords ? distanceWords+"파 " : "";
  const ending=styleBest.length===1 ? TITLE_RULES.style[styleBest[0]]+" 트레이너님!" :
    styleBest.length>1 ? styleBest.join("·")+" 겸업 트레이너님!" : "트레이너님!";
  const special=specialTitles(ids,distance,surface,styleKnown>=3?styleVotes:[0,0,0,0]);
  const history=historyReport(people);
  const extra=extraReport(people,body,best);
  history.hits.push(...extra.hits);
  history.sex=extra;
  const ranked=[...special.hits,...history.hits].sort((a,b)=>b.priority-a.priority);
  const title=ranked.length ? ranked[0].title : profilePhrase+distancePhrase+ending;
  const covered = people.filter(p => p.starts>0).length;
  const distLabel = best.map(i => DISTANCES[i]).join(" · ");
  const headline = best.length ? "선택한 우마무스메의 원본마 출전 기록에서는 "+distLabel+" 비중이 가장 높아요. "+(best.length>1 ? "여러 거리에서 같은 비중을 보인 라인업이에요." : "선호 순위를 반영한 비율은 "+distance[best[0]].toFixed(1)+"%예요.") :
    "거리별 출전 횟수가 없어 거리 판정은 비워 두었어요.";
  const meetings = MEETINGS.map(event => ({...event, selected:ids.filter(id=>event.ids.includes(id))})).filter(event=>event.selected.length>=2);
  const major = event => ["GI","G1","JpnI"].includes(event.grade) ? 1 : 0;
  meetings.sort((a,b)=>b.selected.length-a.selected.length || major(b)-major(a) || a.date.localeCompare(b.date));
  const meeting = meetings[0];
  const result={people, meeting, body, title, special, history, basicTitle:profilePhrase+distancePhrase+ending, styleText, style, distance, surface, covered, headline, height:avg(people.map(p=>p.height)), measures:body.axes.map(a=>a.mean), starts:sum(people.map(p=>p.starts)), wins:sum(people.map(p=>p.wins))};
  result.recommendedTitle=title;
  result.titleChoices=titleChoices(result,title);
  if(result.titleChoices.some(t=>t.title===chosenTitle)) result.title=chosenTitle;
  return result;
}
function cleanNick(value) {
  return Array.from(String(value).replace(/[\u0000-\u001f\u007f]/g,"").trim()).slice(0,20).join("");
}
function readReport(hash) {
  const params = new URLSearchParams(hash.replace(/^#/,""));
  if (!params.has("p")) return null;
  const ids = params.get("p").split(",").map(Number);
  if (ids.length<3 || ids.length>10 || new Set(ids).size!==ids.length || ids.some(id=>!BY_ID.has(id))) return null;
  return {ids, name:cleanNick(params.get("n")||""), title:params.get("t")||""};
}
function reportHash(ids, name, title="") {
  const params = new URLSearchParams({p:ids.join(",")});
  if (cleanNick(name)) params.set("n",cleanNick(name));
  if(title) params.set("t",title);
  return "#"+params.toString();
}
function searchable(term) { return term.toLowerCase().replace(/\s+/g,""); }
function initials(name) {
  const consonants="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  return [...name].map(c => { const i=c.charCodeAt(0)-44032; return 0<=i && i<11172 ? consonants[Math.floor(i/588)] : c; }).join("");
}

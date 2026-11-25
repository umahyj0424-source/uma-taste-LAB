"use strict";
// Editable sentence bank: deterministic variants, not random personality diagnosis.
const REVIEW_LINES = {
  introGroup:["이 라인업, 어딘가 익숙한데요. 조합부터 심상치 않습니다.","감정서를 열자마자 익숙한 이름들이 보였습니다."],
  introAverage:["특이 취향을 찾으려고 했는데, 통계 교과서가 나왔습니다.","평균값이 이렇게 성실하게 맞아떨어지다니요."],
  introFocused:["취향의 방향이 아주 명확하군요. 담당자도 쉽게 판정했습니다.","우연이라고 하기에는 일관된 선택입니다."],
  introMixed:["한 가지 기준만으로 설명하기는 어려운 라인업입니다.","트레이너님의 선택에는 여러 가지 기준이 공존하는 것 같습니다."],
  group:{
    rttt:["ROAD TO THE TOP의 주역들이 모였습니다. 오늘 훈련은 정상으로 향하는 길부터 시작하겠습니다."],
    movie:["새로운 시대의 문이 열렸습니다. 극장 관람 명단이 그대로 라인업에 들어온 건 아니겠죠?"],
    bnw:["BNW가 한자리에 모였습니다. 셋의 이야기를 다시 보고 싶어지는 조합입니다."],
    '98':["98년 황금세대의 주요 멤버를 모았습니다. 오늘도 그 시절 클래식 이야기가 길어지겠군요."],
    '99':["세기말의 주역들이 함께합니다. 기록 보관실의 1999년 자료부터 꺼내야겠습니다."],
    s2:["테이오와 맥퀸이 함께 있습니다. 애니메이션 2기 재감상 일정도 넣어둘까요?"],
    s3:["키타산 블랙과 사토노 다이아몬드가 한 라인업에 있습니다. 꿈을 잇는 조합이군요."],
    satono:["사토노 가문 조합이 완성됐습니다. 후원 담당 부서에도 알려두겠습니다."],
    ruby:["단거리의 세 주역이 한곳에 모였습니다. 짧은 거리라고 서사까지 짧은 건 아니죠."],
    dirt:["더트의 주역들이 모였습니다. 모래 코스 예약부터 확인하겠습니다."]
  },
  average:["B/H/W의 선택 평균이 모두 기준 평균에 가깝습니다. 숫자만 보면 교과서적인 조합입니다.","프로필 평균이 세 항목 모두 중앙 구간에 있습니다. 통계 담당자가 특별한 결론을 찾지 못했습니다."],
  distance:{
    단거리:["출전 거리 취향은 단거리에 기울어 있습니다. 긴 설명보다 출발 신호가 빠르겠군요.","단거리 비중이 높습니다. 훈련 일지는 짧게, 승부는 빠르게."],
    마일:["마일이 가장 큰 비중을 차지합니다. 1,600m 전후의 승부를 꽤 좋아하시는군요."],
    중거리:["중거리 비중이 가장 큽니다. 트레센의 정석 코스부터 예약하겠습니다."],
    장거리:["장거리 쪽으로 취향이 기울어 있습니다. 감정서보다 레이스가 더 길겠군요.","장거리 비중이 높습니다. 스태미나 훈련 일정은 넉넉하게 잡겠습니다."]
  },
  style:{
    도주:["게임 적성 기준 도주가 우세합니다. 선두 자리를 두고 회의가 길어지겠군요."],
    선행:["게임 적성 기준 선행이 우세합니다. 앞쪽에서 기회를 잡는 레이스를 자주 보시겠네요."],
    선입:["게임 적성 기준 선입이 우세합니다. 마지막 직선까지 기대를 놓지 않는 라인업입니다."],
    추입:["게임 적성 기준 추입이 우세합니다. 마지막 직선까지 중계 화면을 끄지 마세요."]
  },
  surface:{더트:["더트 출전 비중이 높습니다. 모래 코스의 관리 예산을 확인해야겠습니다."],합성:["합성주로의 출전 비중이 높습니다. 상당히 보기 드문 기록 조합입니다."],장애물:["장애물 출전 비중이 높습니다. 일반 레이스와는 다른 기록을 골라내셨군요."]},
  g1zero:["기록상 G1 우승이 없는 원본마로만 구성됐습니다. 우승 횟수만으로 설명할 수 없는 선택이군요."],
  g1low:["기록상 평균 G1 우승은 1승 이하입니다. 우승 기록 외에도 눈여겨볼 이야기가 많겠습니다."],
  g1high:["기록상 G1 평균 승수가 높습니다. 우승 트로피 보관 공간을 추가로 확보하겠습니다."],
  mare:["원본마 암말 비중이 높습니다. 티아라 노선의 기록도 함께 살펴보면 좋겠군요."],
  male:["원본마 수말 계열이 전원인 조합입니다. 클래식 기록 보관실부터 들르겠습니다."],
  outro:["이상, 트레센 취향 연구소의 감정 결과였습니다. 다음 라인업도 기대하겠습니다.","감정서 발급을 승인합니다. 최애를 고르는 데 정답은 없으니까요.","결재 완료. 다음 레이스도 즐겁게 관람하시길 바랍니다.","취향은 기록하되, 응원에는 제한을 두지 않겠습니다."]
};
function tasteReview(r){
  const n=r.people.length;
  const seed=r.people.reduce((h,p,i)=>(Math.imul(h,31)+p.id*(i+1))>>>0,17);
  let variant=0;
  const pick=a=>a[(seed+variant++)%a.length];
  const lines=[],keywords=[];
  const add=(text,tag)=>{if(text&&lines.length<5){lines.push(text);if(tag&&!keywords.includes(tag))keywords.push(tag);}};
  const unique=values=>{const a=leaders(values);return a.length===1?a[0]:null;};
  const d=unique(r.distance), s=unique(r.surface), st=unique(r.style.percentages);
  const axes=r.body.axes;
  const allAvg=axes.length===3&&r.people.every(p=>p.measurements?.length===3&&p.measurements.every(validMeasure))&&axes.every(a=>Number.isFinite(a.score)&&a.trait===titleConfig.axes[a.key].middle);
  const groups=r.special.hits;
  const gen=r.history.generations[0], race=r.history.races[0];
  const avgHit=r.history.hits.find(h=>h.name==='평균 취향');
  const intro=pick(groups.length?REVIEW_LINES.introGroup:allAvg?REVIEW_LINES.introAverage:(d!==null&&r.distance[d]>=60||st!==null&&r.style.percentages[st]>=75&&r.style.known>=3||gen?.[1]/n>=.8)?REVIEW_LINES.introFocused:REVIEW_LINES.introMixed);
  if(groups.length){const group=groups[0];const known=DEFAULT_CONFIG.groups.find(g=>g.id===group.id);const canonical=known&&group.ids.length===known.ids.length&&group.ids.every(id=>known.ids.includes(id))&&group.matched.length===known.ids.length;add(canonical&&REVIEW_LINES.group[group.id]?pick(REVIEW_LINES.group[group.id]):`${group.name} 조합의 조건을 충족했습니다 (${group.matched.length}/${group.ids.length}명). 함께 모인 이름들을 살펴보세요.`,group.name);}
  if(allAvg){add(pick(REVIEW_LINES.average),avgHit?'평균 취향':'평균형');const suspect=axes.flatMap(a=>a.suspects||[]);if(suspect.length){const p=suspect.reduce((a,b)=>Math.abs(b.delta)>Math.abs(a.delta)?b:a);add(`그런데 평균과의 차이가 가장 큰 항목별 기록을 찾아보니 ${p.name}이 눈에 띕니다. 범인 찾기에서 확인해 보세요.`);}}
  if(d!==null&&r.distance[d]>0){add(pick(REVIEW_LINES.distance[DISTANCES[d]])+` (순위 가중 출전 비율 ${r.distance[d].toFixed(1)}%)`,DISTANCES[d]);}
  else if(leaders(r.distance).length>1)add(`거리별 출전 비율은 ${leaders(r.distance).map(i=>DISTANCES[i]).join('·')} 공동 1위입니다.`,'거리 공동 1위');
  if(s!==null&&r.surface[s]>=60&&REVIEW_LINES.surface[SURFACES[s]])add(pick(REVIEW_LINES.surface[SURFACES[s]]),SURFACES[s]);
  if(st!==null&&r.style.known>=3&&r.style.percentages[st]>=40)add(pick(REVIEW_LINES.style[RUN_STYLES[st]])+` (${r.style.known}/${n}명 비교)`,RUN_STYLES[st]);
  if(gen&&gen[1]>=3&&gen[1]/n>=.6)add(`${gen[0]}년 클래식 세대가 ${gen[1]}명이나 모였습니다. 그해의 레이스 다시 보기를 추천합니다.`,`${gen[0]}세대`);
  if(race&&race[1]>=3&&race[1]/n>=.6)add(`${race[0]} 우승마가 ${race[1]}/${n}명입니다. 그 경주의 역사부터 다시 펼쳐봐야겠군요.`,race[0]);
  if(r.history.known===n&&r.history.mean!==null){if(r.history.mean===0)add(pick(REVIEW_LINES.g1zero),'G1 무승');else if(r.history.mean<=1)add(pick(REVIEW_LINES.g1low),'G1 1승 이하');else if(r.history.mean>=5)add(pick(REVIEW_LINES.g1high),'G1 다승');}
  if(r.history.sex.mare/n>=.8)add(pick(REVIEW_LINES.mare),'암말 선호');else if(r.history.sex.male===n)add(pick(REVIEW_LINES.male),'수말 계열');
  if(lines.length===0)add('아직 비교할 수 있는 기록이 많지 않습니다. 확인된 자료만으로 감정서를 작성했습니다.');
  // Keep the report concise; attach the top-ranked character’s unique fan commentary.
  return {heading:'트레센 취향 연구소 · 감정 소견서',intro,keywords:keywords.slice(0,6),lines:lines.slice(0,5),note:favoriteNote(r.people[0]),outro:pick(REVIEW_LINES.outro)};
}

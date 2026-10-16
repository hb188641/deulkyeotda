(function(root){
 'use strict';
 const ROUND_COUNT=10,WARMUP_COUNT=6;
 const warmups=[
  {id:'w1',title:'모처럼 비어 있는 주말.',sub:'지금 더 끌리는 쪽은?',options:['밖에서 기분 전환','집에서 느긋하게']},
  {id:'w2',title:'새로 생긴 식당에 왔어.',sub:'메뉴판 앞에서 너는?',options:['처음 보는 메뉴 도전','늘 먹던 메뉴 선택']}
 ];
 const entries=[
  ['여행 출발까지 딱 10분.','마지막으로 뭘 할래?','일단 나가고 본다','짧게라도 계획을 짠다',0,0],
  ['내일 중요한 일이 있는데,','친구가 지금 만나자고 한다면?','한 시간만 놀고 온다','내일을 위해 푹 쉰다',0,0],
  ['오늘 바로 10만 원,','한 달 뒤 12만 원. 하나만 고른다면?','지금 받는 10만 원','기다렸다가 12만 원',1,0],
  ['딱 하나만 알 수 있다면?','조금 궁금한 쪽을 골라봐.','사람들이 나를 보는 모습','10년 뒤 내가 사는 모습',1,1],
  ['모르는 동네에서 길이 갈려.','어느 쪽으로 가볼래?','처음 보는 골목길','익숙한 큰길',1,0],
  ['여행 일정을 짠다면,','더 마음 편한 쪽은?','하루 정도는 비워둔다','갈 곳을 미리 정해둔다',1,0],
  ['휴가가 딱 사흘 생겼어.','어떻게 쓰고 싶어?','새로운 곳으로 떠난다','익숙한 곳에서 푹 쉰다',0,0],
  ['약속 장소에 너무 일찍 도착했어.','남은 30분은?','주변을 구경한다','근처에 앉아 기다린다',0,0],
  ['여행에서 더 아쉬운 건?','하나만 놓친다면.','유명한 곳을 못 본 것','느긋하게 못 쉰 것',0,0],
  ['갑자기 하루가 통째로 비었어.','처음 드는 생각은?','누구 만날 사람 없나?','아무 약속도 안 잡아야지',0,0],
  ['친구 생일 선물을 고를 때,','더 주고 싶은 건?','취향에 딱 맞는 물건','같이 해볼 새로운 경험',1,1],
  ['친구가 고민을 털어놓으면,','먼저 해주고 싶은 말은?','그럴 때 이렇게 해보면 어때?','많이 힘들었겠다',0,0],
  ['안부가 궁금한 친구가 있어.','어떻게 연락할래?','바로 전화를 건다','짧은 메시지를 보낸다',0,0],
  ['친구들과 모이는 날.','더 편한 자리는?','여럿이 북적이는 자리','둘셋이 오래 얘기하는 자리',0,0],
  ['친한 친구와 의견이 달라.','지금 너라면?','바로 얘기해서 풀고 싶다','조금 정리한 뒤 얘기한다',0,0],
  ['배달 음식을 시키려고 해.','오늘은 어느 쪽?','새로 뜬 가게를 골라본다','후기가 쌓인 단골을 고른다',1,0],
  ['카페에서 딱 한 자리가 남았어.','어디에 앉을래?','길이 보이는 창가','조용한 안쪽 구석',0,0],
  ['영화가 시작되기 5분 전.','간식 하나만 살 수 있다면?','달콤한 팝콘','시원한 음료',1,0],
  ['마지막 한 조각이 남았어.','아직 배는 조금 고파.','먹어도 되냐고 물어본다','누가 먹을지 기다려본다',0,0],
  ['같은 가격의 메뉴 두 개.','무엇에 더 끌려?','처음 보는 조합','좋아하는 재료가 든 메뉴',1,0],
  ['오래 기다리던 물건이 할인 중이야.','예산은 충분하다면?','지금 바로 산다','하루만 더 생각해본다',1,0],
  ['쿠폰이 오늘까지야.','딱히 필요한 건 없는데.','쓸 만한 걸 찾아본다','그냥 보내준다',1,0],
  ['선물을 받는다면,','어느 쪽이 더 좋을까?','내가 골라 쓸 수 있는 상품권','누군가 나를 생각해 고른 물건',1,1],
  ['같은 값의 공연 티켓 두 장.','어느 공연을 볼래?','처음 듣는 팀의 작은 공연','좋아하는 가수의 익숙한 무대',1,0],
  ['새 취미를 시작한다면,','처음 준비하는 방식은?','일단 가볍게 해본다','필요한 걸 찾아보고 시작한다',1,0],
  ['영화를 고르는 밤.','지금 보고 싶은 건?','처음 보는 영화','좋아하는 영화 다시 보기',1,0],
  ['좋은 노래를 발견했어.','다음 행동은?','바로 친구에게 보내준다','혼자 몇 번 더 들어본다',0,0],
  ['책을 읽다가 결말이 궁금해졌어.','너라면?','뒤쪽을 살짝 펼쳐본다','끝까지 순서대로 읽는다',1,0],
  ['게임에서 새로운 지역이 열렸어.','먼저 할 일은?','바로 들어가서 둘러본다','남은 일을 끝내고 간다',1,0],
  ['멋진 풍경을 만났어.','지금 먼저 하고 싶은 건?','사진으로 남긴다','한동안 눈으로만 본다',0,0],
  ['할 일이 세 개 쌓였어.','무엇부터 시작할래?','금방 끝낼 수 있는 것','가장 신경 쓰이는 것',1,0],
  ['아침에 20분 일찍 깼어.','평소보다 여유가 있다면?','미리 준비하고 나간다','조금 더 누워 있는다',0,0],
  ['새로운 앱을 깔았어.','처음 써보는 기능 앞에서.','직접 눌러보며 익힌다','설명을 먼저 읽어본다',1,0],
  ['방을 정리하는 날.','오래 안 쓴 물건을 보면?','이번에 정리해버린다','혹시 몰라 조금 더 둔다',1,0],
  ['예정 없던 제안이 들어왔어.','재미있어 보이긴 하는데.','시간이 되면 해본다','원래 계획을 먼저 지킨다',1,0],
  ['한 가지 능력을 하루 빌린다면?','어느 쪽이 더 재미있을까?','순간이동하기','동물과 대화하기',0,0],
  ['딱 하루 다른 삶을 살 수 있어.','고르고 싶은 하루는?','유명인의 바쁜 하루','외딴집의 조용한 하루',0,0],
  ['하나만 더 잘하게 된다면?','조금 더 갖고 싶은 능력은?','말을 재밌게 하는 능력','그림으로 표현하는 능력',0,0],
  ['오늘의 기억 하나를 남긴다면?','더 오래 간직하고 싶은 건?','웃긴 대화 한 장면','혼자 편안했던 한순간',0,0],
  ['같은 하루를 다시 보낼 수 있어.','이번엔 어떻게 할래?','안 해본 선택을 해본다','좋았던 순간을 그대로 즐긴다',1,0]
 ];
 const freeze=q=>Object.freeze({...q,options:Object.freeze(q.options)});
 const bank=Object.freeze(entries.map((e,i)=>freeze({id:'q'+String(i+1).padStart(2,'0'),title:e[0],sub:e[1],options:e.slice(2,4),clue:e[4],flip:e[5]})));
 const fixedWarmups=Object.freeze(warmups.map(freeze));
 function validQuestionIds(ids,count=ROUND_COUNT){return Array.isArray(ids)&&ids.length===count&&new Set(ids).size===count&&ids.every(id=>bank.some(q=>q.id===id));}
 function shuffle(items,random){const picked=[...items];for(let i=picked.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[picked[i],picked[j]]=[picked[j],picked[i]];}return picked;}
 function makeRound(ids,random=Math.random,warmIds){const predictions=validQuestionIds(ids)?ids:null;const warm=validQuestionIds(warmIds,WARMUP_COUNT)&&(!predictions||warmIds.every(id=>!predictions.includes(id)))?warmIds:null;const excluded=new Set([...(predictions||[]),...(warm||[])]),available=shuffle(bank.filter(q=>!excluded.has(q.id)),random);const prep=warm?warm.map(id=>bank.find(q=>q.id===id)):available.splice(0,WARMUP_COUNT);const picked=predictions?predictions.map(id=>bank.find(q=>q.id===id)):available.slice(0,ROUND_COUNT);return [...prep,...picked];}
 function seal(warm,selected=bank.slice(0,ROUND_COUNT),preparation=bank.slice(ROUND_COUNT,ROUND_COUNT+WARMUP_COUNT)){return Object.freeze(selected.map((q,index)=>{const related=preparation.map((item,i)=>({item,answer:warm[i]})).filter(x=>x.item.clue===q.clue);const samples=related.length?related:preparation.map((item,i)=>({item,answer:warm[i]}));const votes=samples.reduce((sum,x)=>sum+((x.answer^x.item.flip)===1?1:0),0);const choice=(votes>samples.length/2?1:0)^q.flip;return Object.freeze({index,questionId:q.id,choice,confidence:54+(bank.indexOf(q)*7)%35});}));}
 function result(predictions,answers){const rounds=predictions.map((p,i)=>({...p,actual:answers[i],hit:p.choice===answers[i]})).sort((a,b)=>b.confidence-a.confidence);const hits=rounds.filter(x=>x.hit).length;return {rounds,hits,misses:rounds.length-hits,bigMiss:rounds.find(x=>!x.hit),surprise:rounds.filter(x=>x.hit).at(-1)};}
 const api={bank,warmups:fixedWarmups,ROUND_COUNT,WARMUP_COUNT,questions:bank.slice(0,WARMUP_COUNT+ROUND_COUNT),validQuestionIds,makeRound,seal,result};
 root.Game=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);

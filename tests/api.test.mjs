import {test} from 'node:test';
import assert from 'node:assert/strict';
import {predict,reveal} from '../lib/game/server.mjs';
const env={OPENAI_API_KEY:'test-server-key'};
const predictions=[{choice:1,confidence:83},{choice:0,confidence:64},{choice:1,confidence:57},{choice:0,confidence:52}];
const req=(path,data)=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(data)});
const model=async(url,options)=>{const input=JSON.parse(options.body);assert.equal(input.store,false);assert.equal(JSON.parse(input.input).warmup.length,2);assert.ok(!('answers' in JSON.parse(input.input)));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({predictions})}]}]})};
test('predict hides guesses, reveals same sealed values and correct score',async()=>{const r=await predict(req('/api/predict',{warmup:[0,1]}),env,model);assert.equal(r.status,200);const sealed=await r.json();assert.deepEqual(Object.keys(sealed).sort(),['expiresAt','mode','token']);assert.ok(!sealed.token.includes('confidence'));const response=await reveal(req('/api/reveal',{token:sealed.token,answers:[1,1,0,0]}),env);const data=await response.json();assert.equal(data.hits,2);assert.deepEqual(data.rounds.map(x=>x.confidence),[83,64,57,52]);assert.equal(data.bigMiss.confidence,64);assert.equal(data.surprise.confidence,52)});
test('modified envelope and incomplete answers are rejected',async()=>{const data=await(await predict(req('/api/predict',{warmup:[0,0]}),env,model)).json();assert.equal((await reveal(req('/api/reveal',{token:data.token,answers:[0]}),env)).status,400);const token=data.token.slice(0,-8)+'ABCDEFGH';assert.equal((await reveal(req('/api/reveal',{token,answers:[0,0,0,0]}),env)).status,400)});
test('invalid warmups never reach paid API, cross-origin rejected, missing key explicit',async()=>{let called=false;const f=()=>{called=true;throw Error('called')};assert.equal((await predict(req('/api/predict',{warmup:[0,'bad']}),env,f)).status,400);assert.equal(called,false);assert.equal((await predict(req('/api/predict',{warmup:[0,0]}),{},f)).status,503);const r=req('/api/predict',{warmup:[0,0]});r.headers.set('origin','https://evil.example');assert.equal((await predict(r,env,f)).status,403);assert.equal(called,false)});
test('upstream failures and malformed output do not leak credentials or silently simulate',async()=>{const r=await predict(req('/api/predict',{warmup:[1,0]}),env,async()=>Response.json({error:{message:'test-server-key'}},{status:429}));assert.equal(r.status,429);assert.ok(!(await r.text()).includes('test-server-key'));const bad=await predict(req('/api/predict',{warmup:[1,0]}),env,async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]}));assert.equal(bad.status,502)});
const randomIds=Array.from({length:14},(_,i)=>'q'+String(i+1).padStart(2,'0'));
const predictions14=Array.from({length:14},(_,i)=>({choice:i%2,confidence:90-i}));
const model14=async(url,options)=>{const input=JSON.parse(JSON.parse(options.body).input);assert.equal(input.questions.length,14);assert.deepEqual(input.questions.map(q=>q.id),randomIds);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({predictions:predictions14})}]}]})};
test('random 14-question batch is sealed with matching IDs and fully scored',async()=>{
 const response=await predict(req('/api/predict',{warmup:[0,1],questionIds:randomIds}),env,model14);
 assert.equal(response.status,200);const sealed=await response.json();
 const answers=Array.from({length:14},(_,i)=>i%2);
 const incomplete=await reveal(req('/api/reveal',{token:sealed.token,answers:answers.slice(1)}),env);assert.equal(incomplete.status,400);
 const result=await reveal(req('/api/reveal',{token:sealed.token,answers}),env);const data=await result.json();
 assert.equal(data.hits,14);assert.equal(data.misses,0);assert.deepEqual(data.rounds.map(r=>r.questionId),randomIds);
});
test('duplicates or unknown random question IDs cannot trigger paid requests',async()=>{
 let called=false;const fake=()=>{called=true;throw Error('paid call')};
 for(const questionIds of [[...randomIds.slice(0,13),randomIds[0]],['unknown',...randomIds.slice(1)],randomIds.slice(1)]){
  assert.equal((await predict(req('/api/predict',{warmup:[0,1],questionIds}),env,fake)).status,400);
 }
 assert.equal(called,false);
});

test('six random preparation answers feed one sealed ten-question request',async()=>{
 const warmupIds=['q11','q12','q13','q14','q15','q16'],questionIds=randomIds.slice(0,10),warmup=[0,1,0,1,1,0];
 let calls=0;
 const fake=async(url,options)=>{calls++;const payload=JSON.parse(options.body),input=JSON.parse(payload.input);
  assert.equal(input.warmup.length,6);assert.equal(input.questions.length,10);
  assert.deepEqual(input.warmup.map(q=>q.chosen),warmup);
  assert.equal(input.warmup[0].question,globalThis.Game.bank[10].title+' '+globalThis.Game.bank[10].sub);
  assert.equal(payload.text.format.schema.properties.predictions.minItems,10);
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({predictions:predictions14.slice(0,10)})}]}]});};
 const response=await predict(req('/api/predict',{warmup,warmupIds,questionIds}),env,fake);assert.equal(response.status,200);
 const sealed=await response.json();assert.deepEqual(Object.keys(sealed).sort(),['expiresAt','mode','token']);
 const data=await(await reveal(req('/api/reveal',{token:sealed.token,answers:predictions14.slice(0,10).map(p=>p.choice)}),env)).json();
 assert.equal(data.hits,10);assert.equal(calls,1);assert.deepEqual(data.rounds.map(r=>r.questionId),questionIds);
});
test('invalid or overlapping preparation IDs are blocked before paid calls',async()=>{
 const questionIds=randomIds.slice(0,10),warmup=[0,1,0,1,0,1];let calls=0;const fake=()=>{calls++;throw Error('paid')};
 for(const warmupIds of [['q01','q12','q13','q14','q15','q16'],['q11','q11','q13','q14','q15','q16'],['unknown','q12','q13','q14','q15','q16'],['q11']]){
  assert.equal((await predict(req('/api/predict',{warmup,warmupIds,questionIds}),env,fake)).status,400);
 }
 assert.equal(calls,0);
});

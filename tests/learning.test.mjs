import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {history,references,calibrate,summarize,record} from '../lib/game/learning.mjs';
import {predict,reveal} from '../lib/game/server.mjs';
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_foamy_red_ghost.sql',import.meta.url),'utf8'));return {sqlite,prepare(sql){return {bind(...args){return {async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}}}};}
const warmup=Array.from({length:6},(_,i)=>({id:'q'+String(i+1).padStart(2,'0'),answer:i%2}));
const ids=Array.from({length:10},(_,i)=>'q'+String(i+7).padStart(2,'0'));
const rounds=ids.map((questionId,i)=>({questionId,index:i,choice:0,actual:0,confidence:85,rawConfidence:85,hit:true}));
const play={warmup,rounds,strategy:'guided'};
const request=(path,data)=>new Request('https://game.test'+path,{method:'POST',headers:{origin:'https://game.test','content-type':'application/json'},body:JSON.stringify(data)});
const input={warmup:warmup.map(a=>a.answer),warmupIds:warmup.map(a=>a.id),questionIds:ids,learningConsent:true};
const fakeModel=async(_url,options)=>{const sent=JSON.parse(JSON.parse(options.body).input);assert.equal(sent.warmup.length,6);assert.ok(!('answers' in sent));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({predictions:rounds.map(r=>({choice:r.choice,confidence:r.confidence}))})}]}]});};
test('minimum samples, similar preparation matches, smoothing, confidence correction',()=>{
 assert.equal(references(Array(19).fill(play),warmup,ids).length,0);
 const near=references(Array(20).fill(play),warmup,ids);assert.equal(near.length,10);assert.equal(near[0].source,'similar_warmup_choices');assert.ok(near[0].option0Share<1);
 const unrelated=Array(49).fill({...play,warmup:[]});assert.equal(references(unrelated,warmup,ids).length,0);
 const general=references([...unrelated,{...play,warmup:[]}],warmup,ids);assert.equal(general[0].source,'overall_choices');
 assert.equal(calibrate([{choice:0,confidence:85}],Array(29).fill({...play,rounds:rounds.slice(0,1)}))[0].confidence,85);
 const corrected=calibrate([{choice:0,confidence:85}],Array(30).fill({...play,rounds:rounds.slice(0,1).map(r=>({...r,hit:false}))}))[0];assert.equal(corrected.confidence,50);assert.equal(corrected.rawConfidence,85);
});
test('real SQLite stores anonymous completed play only once and separates trial arms',async()=>{
 const db=database(),env={DB:db,OPENAI_API_KEY:'test-only'};
 const sealed=await(await predict(request('/api/predict',input),env,fakeModel)).json();
 assert.equal((await history(db)).length,0);assert.ok(sealed.token);assert.ok(!('warmup' in sealed));
 const incomplete=await reveal(request('/api/reveal',{token:sealed.token,answers:[0]}),env);assert.equal(incomplete.status,400);assert.equal((await history(db)).length,0);
 const result=await(await reveal(request('/api/reveal',{token:sealed.token,answers:Array(10).fill(0)}),env)).json();assert.equal(result.hits,10);assert.equal(result.learning.status,'saved');
 const replay=await(await reveal(request('/api/reveal',{token:sealed.token,answers:Array(10).fill(1)}),env)).json();assert.equal(replay.learning.alreadyRecorded,true);
 const stored=await history(db);assert.equal(stored.length,1);assert.deepEqual(stored[0].warmup,warmup);assert.equal(stored[0].rounds[0].actual,0);assert.equal(summarize(stored).cold.plays,1);
 const columns=db.sqlite.prepare('PRAGMA table_info(learning_plays)').all().map(c=>c.name);assert.deepEqual(columns,['id','question_version','completed_at','warmup','rounds','strategy']);db.sqlite.close();
});
test('opt out never reads or writes data; failed storage does not lose game result',async()=>{
 let calls=0;const broken={prepare(){calls++;throw Error('DB unavailable')}};
 const env={DB:broken,OPENAI_API_KEY:'test-only'};
 const sealed=await(await predict(request('/api/predict',{...input,learningConsent:false}),env,fakeModel)).json();
 const result=await(await reveal(request('/api/reveal',{token:sealed.token,answers:Array(10).fill(0)}),env)).json();assert.equal(result.hits,10);assert.equal(result.learning.status,'off');assert.equal(calls,0);
 const opted=await(await predict(request('/api/predict',input),env,fakeModel)).json();const failed=await(await reveal(request('/api/reveal',{token:opted.token,answers:Array(10).fill(0)}),env)).json();assert.equal(failed.hits,10);assert.equal(failed.learning.status,'unavailable');
});
test('sufficient history supplies only aggregate hints to the model and records trial strategy',async()=>{
 const db=database();for(let i=0;i<20;i++)await record(db,{learning:{consent:true,id:'seed'+i,warmup,strategy:i%2?'guided':'holdout'}},rounds);
 let supplied;
 const fake=async(url,options)=>{supplied=JSON.parse(JSON.parse(options.body).input);return fakeModel(url,options)};
 const env={DB:db,OPENAI_API_KEY:'test-only'},sealed=await(await predict(request('/api/predict',input),env,fake)).json();
 const result=await(await reveal(request('/api/reveal',{token:sealed.token,answers:Array(10).fill(0)}),env)).json();
 assert.ok(['guided','holdout'].includes(result.learning.strategy));
 if(result.learning.strategy==='guided'){assert.equal(supplied.choiceStatistics.length,10);assert.deepEqual(Object.keys(supplied.choiceStatistics[0]).sort(),['option0Share','questionId','sampleSize','source']);}else assert.equal(supplied.choiceStatistics,undefined);
 assert.equal((await history(db)).length,21);db.sqlite.close();
});

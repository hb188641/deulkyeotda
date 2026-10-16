export const QUESTION_VERSION='choices-v1';
const WINDOW_MS=90*24*60*60*1000;
const MAX_HISTORY=1000;
const MIN_NEIGHBORS=20;
const MIN_GENERAL=50;
const MIN_CALIBRATION=30;

export async function history(db,now=Date.now()) {
  if(!db)return [];
  const result=await db.prepare('SELECT warmup, rounds, strategy FROM learning_plays WHERE question_version = ? AND completed_at >= ? ORDER BY completed_at DESC LIMIT ?').bind(QUESTION_VERSION,now-WINDOW_MS,MAX_HISTORY).all();
  return (result.results||[]).flatMap(row=>{
    try { const warmup=JSON.parse(row.warmup),rounds=JSON.parse(row.rounds);return Array.isArray(warmup)&&Array.isArray(rounds)?[{warmup,rounds,strategy:row.strategy}]:[]; } catch { return []; }
  });
}
export function references(plays,warmup,questionIds) {
  const near=plays.filter(play=>{
    const common=play.warmup.filter(a=>warmup.some(b=>a.id===b.id));
    const matches=common.filter(a=>warmup.some(b=>a.id===b.id&&a.answer===b.answer)).length;
    return matches>=2 && matches>common.length-matches;
  });
  return questionIds.flatMap(id=>{
    const similar=near.flatMap(play=>play.rounds.filter(r=>r.questionId===id));
    const general=plays.flatMap(play=>play.rounds.filter(r=>r.questionId===id));
    const rows=similar.length>=MIN_NEIGHBORS?similar:general.length>=MIN_GENERAL?general:[];
    if(!rows.length)return [];
    const base=general.length?(general.filter(r=>r.actual===0).length+10)/(general.length+20):.5;
    const p0=(rows.filter(r=>r.actual===0).length+20*base)/(rows.length+20);
    return [{questionId:id,source:rows===similar?'similar_warmup_choices':'overall_choices',sampleSize:rows.length,option0Share:Math.round(p0*100)/100}];
  });
}
export function calibrate(predictions,plays) {
  return predictions.map(p=>{
    const bucket=Math.floor(p.confidence/10);
    const rows=plays.flatMap(play=>play.strategy==='guided'?play.rounds.filter(r=>Math.floor((r.rawConfidence??r.confidence)/10)===bucket):[]);
    if(rows.length<MIN_CALIBRATION)return {...p,rawConfidence:p.confidence};
    const hits=rows.filter(r=>r.hit).length;
    // Shrink a noisy empirical rate toward 50%; never advertise calibrated certainty.
    return {...p,rawConfidence:p.confidence,confidence:Math.max(50,Math.min(95,Math.round(100*(hits+10)/(rows.length+20)))),calibrationSamples:rows.length};
  });
}
export async function record(db,data,rounds,now=Date.now()) {
  if(!data.learning?.consent)return {status:'off'};
  if(!db)return {status:'unavailable'};
  try {
    const result=await db.prepare('INSERT OR IGNORE INTO learning_plays (id, question_version, completed_at, warmup, rounds, strategy) VALUES (?, ?, ?, ?, ?, ?)').bind(data.learning.id,QUESTION_VERSION,now,JSON.stringify(data.learning.warmup),JSON.stringify(rounds),data.learning.strategy).run();
    return {status:'saved',alreadyRecorded:result.meta?.changes===0};
  } catch { return {status:'unavailable'}; }
}
export function summarize(plays) {
  const arm=strategy=>{const rows=plays.filter(p=>p.strategy===strategy).flatMap(p=>p.rounds);const count=plays.filter(p=>p.strategy===strategy).length,hits=rows.filter(r=>r.hit).length;return {plays:count,predictions:rows.length,hits,hitRate:count>=20&&rows.length>=100?Math.round(hits/rows.length*1000)/10:null};};
  return {completedPlays:plays.length,windowDays:90,maxHistory:MAX_HISTORY,guided:arm('guided'),holdout:arm('holdout'),cold:arm('cold'),minimumSimilar:MIN_NEIGHBORS,minimumOverall:MIN_GENERAL};
}

import {predict,reveal} from '../lib/game/server.mjs';
import {history,summarize} from '../lib/game/learning.mjs';
const security={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'};
const json=(data,status=200)=>Response.json(data,{status});
const tooMany=()=>json({error:'요청이 너무 많아. 잠시 뒤 다시 시도해줘.'},429);
// Per-IP limits are approximate and per Cloudflare location; the IP is only used as a counter key and never stored.
async function allowed(limiter,request){
  if(!limiter)return true;
  const {success}=await limiter.limit({key:request.headers.get('cf-connecting-ip')||'unknown'});
  return success;
}
// Hard daily cap on OpenAI calls across all players, counted in D1 only when a request actually reaches OpenAI.
function cappedFetch(env){
  return async(url,init)=>{
    const limit=Number(env.AI_DAILY_LIMIT);
    if(limit>0){
      const day=new Date().toISOString().slice(0,10);
      const [,counted]=await env.DB.batch([
        env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_usage (day text PRIMARY KEY NOT NULL, count integer NOT NULL)'),
        env.DB.prepare('INSERT INTO ai_usage (day,count) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 RETURNING count').bind(day),
      ]);
      if(counted.results[0].count>limit)return new Response(null,{status:429});
    }
    return fetch(url,init);
  };
}
async function route(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')&&!await allowed(url.pathname==='/api/predict'?env.PREDICT_LIMITER:env.API_LIMITER,request))return tooMany();
  if(request.method==='GET'&&url.pathname==='/api/status')return json({aiAvailable:!!env.OPENAI_API_KEY});
  if(request.method==='GET'&&url.pathname==='/api/learning')return json({available:true,...summarize(await history(env.DB))});
  if(request.method==='POST'&&['/api/predict','/api/reveal'].includes(url.pathname)){
    const body=await request.arrayBuffer();
    if(body.byteLength>4096)return json({error:'요청이 너무 커.'},413);
    const forwarded=new Request(url,{method:'POST',headers:request.headers,body});
    return url.pathname==='/api/predict'?predict(forwarded,env,cappedFetch(env)):reveal(forwarded,env);
  }
  if(url.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request,env){
    let response;
    try{response=await route(request,env)}catch{response=json({error:'요청을 처리하지 못했어.'},500)}
    if(!new URL(request.url).pathname.startsWith('/api/'))return response;
    response=new Response(response.body,response);
    for(const [k,v] of Object.entries(security))response.headers.set(k,v);
    return response;
  },
};

import {predict,reveal} from '../lib/game/server.mjs';
import {history,summarize} from '../lib/game/learning.mjs';
const security={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'};
const json=(data,status=200)=>Response.json(data,{status});
async function route(request,env){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/status')return json({aiAvailable:!!env.OPENAI_API_KEY});
  if(request.method==='GET'&&url.pathname==='/api/learning')return json({available:true,...summarize(await history(env.DB))});
  if(request.method==='POST'&&['/api/predict','/api/reveal'].includes(url.pathname)){
    const body=await request.arrayBuffer();
    if(body.byteLength>4096)return json({error:'요청이 너무 커.'},413);
    const forwarded=new Request(url,{method:'POST',headers:request.headers,body});
    return (url.pathname==='/api/predict'?predict:reveal)(forwarded,env);
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

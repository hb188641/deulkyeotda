import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {predict,reveal} from '../lib/game/server.mjs';
import {history,summarize} from '../lib/game/learning.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function createGameServer(config=process.env) {
  const dbPath=config.DATABASE_PATH||resolve(root,'data/game.sqlite');
  if(dbPath!==':memory:')mkdirSync(dirname(resolve(dbPath)),{recursive:true});
  const sqlite=new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA journal_mode=WAL');
  const version=sqlite.prepare('PRAGMA user_version').get().user_version;
  if(version===0){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(resolve(root,'drizzle/0000_foamy_red_ghost.sql'),'utf8'));sqlite.exec('PRAGMA user_version=1');sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}}
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() { return { results: sqlite.prepare(sql).all(...args) }; },
            async run() {
              const result = sqlite.prepare(sql).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
  const env={DB,OPENAI_API_KEY:config.OPENAI_API_KEY,OPENAI_MODEL:config.OPENAI_MODEL,OPENAI_REASONING_EFFORT:config.OPENAI_REASONING_EFFORT,GAME_SESSION_SECRET:config.GAME_SESSION_SECRET};
  const files=new Map([['/',['index.html','text/html; charset=utf-8']],['/app.js',['public/app.js','application/javascript']],['/game.js',['public/game.js','application/javascript']],['/styles.css',['public/styles.css','text/css']],['/favicon.svg',['public/favicon.svg','image/svg+xml']]]);
  const server=createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));
      let response;
      if(req.method==='GET'&&url.pathname==='/api/status')response=Response.json({aiAvailable:!!env.OPENAI_API_KEY});
      else if(req.method==='GET'&&url.pathname==='/api/learning')response=Response.json({available:true,...summarize(await history(DB))});
      else if(req.method==='POST'&&['/api/predict','/api/reveal'].includes(url.pathname)){
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413,{'content-type':'application/json'});res.end(JSON.stringify({error:'요청이 너무 커.'}));return;}chunks.push(chunk);}
        const request=new Request(url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
        response=await(url.pathname==='/api/predict'?predict:reveal)(request,env);
      }else if(req.method==='GET'&&files.has(url.pathname)){
        const [path,type]=files.get(url.pathname);response=new Response(readFileSync(resolve(root,path)),{headers:{'content-type':type}});
      }else response=new Response('Not found',{status:404});
      res.writeHead(response.status,{...Object.fromEntries(response.headers),'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:'요청을 처리하지 못했어.'}));}
  });
  return {server,closeDatabase:()=>sqlite.close()};
}

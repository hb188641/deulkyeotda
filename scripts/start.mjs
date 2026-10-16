import {createGameServer} from './server.mjs';
const port=Number(process.env.PORT||5087),host=process.env.HOST||'127.0.0.1';
const {server,closeDatabase}=createGameServer();
server.listen(port,host,()=>console.log(`들켰다: http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{closeDatabase();process.exit(0)}));

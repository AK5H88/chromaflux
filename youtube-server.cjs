'use strict';
const http=require('node:http'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
function canonicalYouTube(value){
 if(typeof value!=='string'||value.length>2048)throw Error('Paste a YouTube video link.');
 let url;try{url=new URL(value);}catch{throw Error('Paste a full YouTube video link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Use an HTTPS YouTube video link.');
 let id;const host=url.hostname.toLowerCase();
 if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
 else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
  if(url.pathname==='/watch')id=url.searchParams.get('v');else id=url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)\/?$/)?.[1];
 }else throw Error('Only YouTube video links are supported.');
 if(!/^[\w-]{11}$/.test(id||''))throw Error('This link does not contain a valid YouTube video. Playlists and channel links are not supported.');
 return 'https://www.youtube.com/watch?v='+id;
}
function formatArgs(mode,quality='best',audio='original'){
 if(!['video','audio'].includes(mode))throw Error('Choose video or audio.');
 if(quality!=='best'&&(!/^\d{1,5}$/.test(String(quality))||Number(quality)<1||Number(quality)>16384))throw Error('Choose an available quality.');
 if(!['original','mp3'].includes(audio))throw Error('Choose original audio or MP3.');
 if(mode==='audio')return audio==='mp3'?['-f','ba/b','-x','--audio-format','mp3','--audio-quality','0']:['-f','ba'];
 const cap=quality==='best'?'':`[height<=${quality}]`;
 return ['-f',`bv${cap}+ba/b${cap}`,'--merge-output-format','mkv'];
}
function publicInfo(info){
 const formats=(info.formats||[]).filter(f=>!f.has_drm&&f.vcodec&&!['none','images'].includes(f.vcodec)&&f.ext!=='mhtml'&&f.height>0);
 const heights=[...new Set(formats.map(f=>f.height))].sort((a,b)=>b-a);
 return {id:info.id,title:String(info.title||'YouTube video').slice(0,300),creator:String(info.uploader||info.channel||'').slice(0,180),duration:Number(info.duration)||null,heights,highestHeight:heights[0]||null,hasAudio:(info.formats||[]).some(f=>!f.has_drm&&f.acodec&&f.acodec!=='none'),isLive:!!info.is_live};
}
function friendlyError(text){
 if(/sign in|not a bot|captcha|po token|http error 403|forbidden|blocked|429/i.test(text))return 'YouTube refused access from this server. Try again later or a different video. This service does not bypass sign-in or access restrictions.';
 if(/private|members.only|premium|age.restricted|login required|unavailable|removed|copyright|not available/i.test(text))return 'This video is unavailable to the downloader. Try a public video that does not require sign-in.';
 if(/requested format|no video formats/i.test(text))return 'That quality is not available. Analyze the link again or choose Highest available.';
 if(/max.filesize|larger than max|file is larger/i.test(text))return 'This download exceeds the service file-size limit. Choose a lower video resolution or audio only.';
 if(/ffmpeg|ffprobe/i.test(text))return 'The service could not merge the streams. Check the server FFmpeg installation.';
 return 'The download could not finish. Try again or choose a different video.';
}
function createService(options={}){
 const apiKey=options.apiKey??process.env.DOWNLOAD_ACCESS_KEY??'';
 const allowedOrigins=new Set((options.origins??process.env.ALLOWED_ORIGINS??'https://ak5h88.github.io').split(',').map(x=>x.trim()).filter(Boolean));
 const maxBytes=Number(options.maxBytes??process.env.MAX_FILE_BYTES)||2*1024**3,ttl=60*60*1000;
 const root=path.resolve(options.root||process.env.DOWNLOAD_DIR||path.join(os.tmpdir(),'chromaflux-youtube'));
 const jobs=new Map(),controllers=new Set(),metadata=new Map();let working=false,inspecting=false;let requests=[];
 const python=process.env.PYTHON_BIN||'python3',node=process.env.JS_RUNTIME_BIN||process.execPath;
 const base=['-m','yt_dlp','--ignore-config','--no-cache-dir','--no-playlist','--socket-timeout','20','--retries','2','--fragment-retries','2','--js-runtimes','node:'+node,'--no-warnings'];
 const defaultRun=(args,{onLine=()=>{},signal,timeout=120000}={})=>new Promise((resolve,reject)=>{
  const child=spawn(python,[...base,...args],{windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});let stdout='',stderr='',pending='';
  const stop=()=>{try{if(process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill();}catch{}};
  const timer=setTimeout(()=>{stop();reject(Error('The request timed out. Try a shorter video.'));},timeout);timer.unref();
  const abort=()=>{stop();reject(Error('Cancelled.'));};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  child.stdout.on('data',bytes=>{const text=bytes.toString();stdout+=text;if(stdout.length>12*1024*1024){stop();reject(Error('The video information was too large.'));return;}pending+=text;const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines)onLine(line);});
  child.stderr.on('data',bytes=>{stderr=(stderr+bytes.toString()).slice(-10000);});
  child.on('error',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(Error('The downloader is not installed correctly on this server.'));});
  child.on('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(pending)onLine(pending);code===0?resolve(stdout):reject(Error(friendlyError(stderr)));});
 });
 const run=options.run||defaultRun;
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
 const body=async req=>{let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>4096)throw Error('Request is too large.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts));}catch{throw Error('Invalid request.');}};
 const clean=async job=>{if(job.activeReads)return;await fsp.rm(job.dir,{recursive:true,force:true}).catch(()=>{});jobs.delete(job.id);};
 const summary=job=>({id:job.id,status:job.status,stage:job.stage,percent:job.percent||0,received:job.received||0,total:job.total||null,eta:job.eta??null,error:job.error||null,filename:job.filename||null,size:job.size||null,download:job.status==='ready'?`/api/files/${job.id}?token=${job.token}`:null,expiresAt:job.status==='ready'?job.finishedAt+ttl:null});
 const sweep=setInterval(()=>{const now=Date.now();for(const job of jobs.values())if(!['downloading','preparing','merging'].includes(job.status)&&now-(job.finishedAt||job.createdAt)>ttl)clean(job);for(const [url,item]of metadata)if(now-item.at>10*60*1000)metadata.delete(url);},60000);sweep.unref();
 async function download(job){
  const controller=new AbortController();controllers.add(controller);job.controller=controller;
  try{
   await fsp.mkdir(job.dir,{recursive:true});job.status='downloading';job.stage='Downloading the source streams…';
   const args=['--no-simulate','--no-mtime','--restrict-filenames','--newline','--progress','--progress-delta','1','--progress-template','download:CF_PROGRESS:%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.eta)s','--print','after_move:CF_FILE:%(filepath)s','--max-filesize',String(maxBytes),'--match-filters','!is_live','-o',path.join(job.dir,'%(title).120B [%(id)s].%(ext)s'),...formatArgs(job.mode,job.quality,job.audio),job.url];
   await run(args,{signal:controller.signal,timeout:45*60*1000,onLine:line=>{
    if(job.status==='cancelled')return;
    if(line.startsWith('CF_PROGRESS:')){const [status,received,total,estimate,eta]=line.slice(12).split('|');job.received=Number(received)||0;job.total=Number(total)||Number(estimate)||null;job.percent=job.total?Math.min(99,Math.round(100*job.received/job.total)):0;job.eta=Number.isFinite(Number(eta))?Number(eta):null;if(job.received>maxBytes){job.error='This download exceeds the service file-size limit.';controller.abort();}if(status==='finished'){job.stage=job.mode==='video'?'Combining video and audio without quality loss…':'Preparing your audio file…';job.status='merging';}}
    if(line.startsWith('CF_FILE:'))job.output=line.slice(8).trim();
   }});
   if(controller.signal.aborted)throw Error(job.error||'Cancelled.');
   const output=path.resolve(job.output||'');if(!output.startsWith(job.dir+path.sep))throw Error('The output file could not be verified.');
   const stat=await fsp.lstat(output);if(!stat.isFile()||stat.isSymbolicLink()||!stat.size||stat.size>maxBytes)throw Error('The output is empty or exceeds the service file-size limit.');
   job.output=output;job.filename=path.basename(output);job.size=stat.size;job.status='ready';job.stage='Ready to save';job.percent=100;job.finishedAt=Date.now();
   // Keep only the finished download, removing source fragments and temporary merge files.
   for(const name of await fsp.readdir(job.dir))if(name!==job.filename)await fsp.rm(path.join(job.dir,name),{recursive:true,force:true});
  }catch(error){if(job.status!=='cancelled'){job.status='failed';job.stage='Download stopped';job.error=job.error||error.message;}job.finishedAt=Date.now();await fsp.rm(job.dir,{recursive:true,force:true}).catch(()=>{});}finally{controllers.delete(controller);working=false;}
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  const origin=req.headers.origin;if(origin&&allowedOrigins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');}
  if(req.method==='OPTIONS'){res.writeHead(origin&&allowedOrigins.has(origin)?204:403);res.end();return;}
  if(origin&&!allowedOrigins.has(origin)){json(res,403,{error:'This website is not allowed to use this downloader.'});return;}
  const url=new URL(req.url,'http://service'),route=url.pathname;
  try{
   if(route==='/health'&&req.method==='GET'){json(res,200,{ok:true,configured:apiKey.length>=24,service:'ChromaFlux YouTube downloader'});return;}
   const fileRoute=route.match(/^\/api\/files\/([a-f0-9]{32})$/);
   if(fileRoute&&req.method==='GET'){
    const job=jobs.get(fileRoute[1]);if(!job||job.status!=='ready'||!equal(url.searchParams.get('token')||'',job.token)||Date.now()-job.finishedAt>ttl){json(res,404,{error:'This download expired. Create it again.'});return;}
    const mime={'.mkv':'video/x-matroska','.mp4':'video/mp4','.webm':job.mode==='audio'?'audio/webm':'video/webm','.m4a':'audio/mp4','.mp3':'audio/mpeg','.opus':'audio/ogg'}[path.extname(job.output)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Content-Length':job.size,'Content-Disposition':`attachment; filename="chromaflux-download${path.extname(job.output)}"; filename*=UTF-8''${encodeURIComponent(job.filename)}`,'Cache-Control':'private, no-store'});
    job.activeReads=(job.activeReads||0)+1;const stream=fs.createReadStream(job.output);stream.on('error',()=>res.destroy());res.on('close',()=>{job.activeReads=Math.max(0,job.activeReads-1);stream.destroy();});stream.pipe(res);return;
   }
   if(apiKey.length<24){json(res,503,{error:'The downloader service needs its private access key configured.'});return;}
   const key=(req.headers.authorization||'').replace(/^Bearer /,'');if(!equal(key,apiKey)){json(res,401,{error:'The access key is incorrect. Check your private downloader key.'});return;}
   if(route==='/api/connection'&&req.method==='GET'){json(res,200,{ok:true,maxFileBytes:maxBytes});return;}
   if(route==='/api/info'&&req.method==='POST'){
    const data=await body(req),link=canonicalYouTube(data.url);const cached=metadata.get(link);if(cached&&Date.now()-cached.at<10*60*1000){json(res,200,cached.info);return;}
    if(inspecting||working){json(res,429,{error:'The downloader is busy. Wait for the current request or download to finish.'});return;}
    requests=requests.filter(t=>Date.now()-t<60*60*1000);if(requests.length>=40){json(res,429,{error:'The hourly request limit was reached. Please try again later.'});return;}requests.push(Date.now());
    inspecting=true;try{const text=await run(['--dump-single-json','--skip-download',link]);const full=JSON.parse(text);const info=publicInfo(full);if(info.isLive)throw Error('Wait until this live stream has ended, then try again.');if(!info.hasAudio&&!info.highestHeight)throw Error('No downloadable video or audio was found.');metadata.set(link,{info,at:Date.now()});json(res,200,{...info,maxFileBytes:maxBytes});}finally{inspecting=false;}return;
   }
   if(route==='/api/jobs'&&req.method==='POST'){
    const data=await body(req),link=canonicalYouTube(data.url);formatArgs(data.mode,data.quality,data.audio);
    const cached=metadata.get(link);if(!cached||Date.now()-cached.at>10*60*1000){json(res,409,{error:'Analyze this video first, then start the download.'});return;}
    if(working||inspecting){json(res,429,{error:'A download is already running. Wait for it to finish or cancel it.'});return;}
    const id=crypto.randomBytes(16).toString('hex'),job={id,url:link,mode:data.mode,quality:String(data.quality||'best'),audio:data.audio||'original',dir:path.join(root,id),token:crypto.randomBytes(24).toString('base64url'),createdAt:Date.now(),status:'preparing',stage:'Starting your download…'};jobs.set(id,job);working=true;download(job);json(res,202,summary(job));return;
   }
   const jobRoute=route.match(/^\/api\/jobs\/([a-f0-9]{32})$/);
   if(jobRoute){const job=jobs.get(jobRoute[1]);if(!job){json(res,404,{error:'This download expired or the service restarted. Start again.'});return;}
    if(req.method==='GET'){json(res,200,summary(job));return;}
    if(req.method==='DELETE'){if(job.status==='ready'){await clean(job);}else{job.status='cancelled';job.stage='Cancelled';job.finishedAt=Date.now();job.controller?.abort();}json(res,200,{status:'cancelled'});return;}
   }
   json(res,404,{error:'This endpoint does not exist.'});
  }catch(error){json(res,400,{error:error.message||'The request could not be completed.'});}
 });
 server.requestTimeout=15000;server.headersTimeout=15000;
 return {server,jobs,close(){for(const c of controllers)c.abort();clearInterval(sweep);return new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){const app=createService();app.server.listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('ChromaFlux downloader service is listening.'));for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>app.close().then(()=>process.exit(0)));}
module.exports={createService,canonicalYouTube,formatArgs,publicInfo};

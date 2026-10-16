'use strict';
// FFmpeg core 0.12.10, single-thread build. See MEDIA-LICENSES.txt.
let core, inputName, logTail=[], active=0;
const send=(type,data={})=>postMessage({type,...data});
async function init(){
 if(core)return;
 const manifestResponse=await fetch(new URL('media-engine.json',self.location.href));
 if(!manifestResponse.ok)throw Error('The media engine could not be downloaded. Check your connection and retry.');
 const manifest=await manifestResponse.json(),binary=new Uint8Array(manifest.size);let offset=0,downloaded=0;
 if(manifest.encoding==='gzip'&&typeof DecompressionStream==='undefined')throw Error('Please update your browser to use audio and video tools. This browser cannot unpack the media engine.');
 for(const part of manifest.chunks){
  send('stage',{message:`Preparing local media tools · ${Math.round(downloaded/(manifest.downloadSize||manifest.size)*100)}%`,progress:downloaded/(manifest.downloadSize||manifest.size)});
  const response=await fetch(new URL(part.name,self.location.href));if(!response.ok)throw Error('A media engine file is unavailable. Reload and try again.');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==part.size)throw Error('Incomplete media engine download. Please retry.');
  if(self.crypto?.subtle){const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));if([...hash].map(x=>x.toString(16).padStart(2,'0')).join('')!==part.sha256)throw Error('Media engine integrity check failed. Please reload.');}
  const unpacked=manifest.encoding==='gzip'?new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()):bytes;
  if(unpacked.length!==(part.decodedSize||part.size))throw Error('Media engine data is incomplete. Please reload.');
  binary.set(unpacked,offset);offset+=unpacked.length;downloaded+=bytes.length;
 }
 send('stage',{message:'Starting local media tools…',progress:.98});
 importScripts(new URL('ffmpeg-core.js',self.location.href).href);
 core=await createFFmpegCore({wasmBinary:binary});
 core.setLogger(({message})=>{logTail.push(message);if(logTail.length>35)logTail.shift();});
 core.setProgress(({time})=>send('progress',{time:Math.max(0,time/1000000)}));
}
function remove(name){try{core?.FS.unlink(name);}catch{}}
self.onmessage=async({data})=>{
 const {id,type}=data;active=id;
 try{
  if(type==='load'){
   await init();remove(inputName);inputName=data.name;core.FS.writeFile(inputName,new Uint8Array(data.bytes));logTail=[];
   remove('metadata.json');core.reset();core.setTimeout(30000);
   const code=core.ffprobe('-v','error','-show_format','-show_streams','-of','json','-o','metadata.json',inputName);
   // This core's ffprobe may leave Module.ret at -1 after a successful probe.
   // Validate the emitted metadata rather than treating that sentinel as failure.
   let metadata;try{metadata=JSON.parse(core.FS.readFile('metadata.json',{encoding:'utf8'}));}catch{throw Error('This file could not be read. Try another file or a common audio/video format.');}remove('metadata.json');
   if(!metadata.streams?.length||metadata.error)throw Error('No readable audio or video tracks were found.');
   send('done',{id,metadata});
  }else if(type==='export'){
   if(!core||!inputName)throw Error('Choose a media file first.');
   logTail=[];core.reset();core.setTimeout(20*60*1000);
   const output='output.'+data.extension;remove(output);
   const args=['-hide_banner',...data.before,'-i',inputName,...data.after,output];
   const code=core.exec(...args);
   if(code!==0){remove(output);const detail=logTail.findLast?.(line=>/error|invalid|not found|does not contain|failed/i.test(line))||'';throw Error('Could not create this file. Try a smaller clip or a different output format.'+(detail?' '+detail.slice(0,220):''));}
   const bytes=core.FS.readFile(output).slice();remove(output);
   if(!bytes.length)throw Error('The selected clip is empty. Adjust the start and end times.');
   postMessage({type:'done',id,bytes:bytes.buffer},[bytes.buffer]);
  }
 }catch(error){const detail=error?.message||'Media processing failed.';send('error',{id,message:/memory|out of bounds|allocation|unreachable/i.test(detail)?'Your browser could not finish this media job. Try a shorter clip, a smaller file, or a lower video size.':detail});}
};

'use strict';
let session=null;
const send=(phase,current,total)=>postMessage({type:'progress',phase,current,total});
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function loadModel(){
 if(session)return session;
 send('Loading AI engine…');importScripts('ort.wasm.min.js');
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=new URL('./',location.href).href;ort.env.logLevel='error';
 const response=await fetch('bg-engine.json');if(!response.ok)throw Error('The background removal engine is missing. Open the latest online ChromaFlux site.');const manifest=await response.json(),parts=[];let received=0;const total=manifest.files.reduce((n,f)=>n+f.bytes,0);
 for(const file of manifest.files){
  const r=await fetch(file.name);if(!r.ok)throw Error('The AI files could not download. Check your connection and try again.');
  const chunks=[];if(r.body){const reader=r.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;send('Downloading AI model…',received,total);}}else{const value=new Uint8Array(await r.arrayBuffer());chunks.push(value);received+=value.length;send('Downloading AI model…',received,total);}
  const bytes=new Uint8Array(chunks.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of chunks){bytes.set(p,offset);offset+=p.length;}
  if(bytes.length!==file.bytes||await digest(bytes)!==file.sha256)throw Error('The AI download was incomplete. Please retry.');parts.push(bytes);
 }
 send('Preparing the AI model…');
 if(!self.DecompressionStream)throw Error('This browser needs an update to run background removal.');
 const raw=await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 if(raw.byteLength!==manifest.rawBytes||await digest(raw)!==manifest.modelSha256)throw Error('The AI model could not be verified. Please retry.');
 session=await ort.InferenceSession.create(raw,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 return session;
}
self.onmessage=async({data})=>{
 if(data.type!=='remove')return;
 try{
  const model=await loadModel();send('Separating the subject and fine edges…');
  const tensor=new ort.Tensor('float32',new Float32Array(data.input),[1,3,1024,1024]);
  const outputs=await model.run({[model.inputNames[0]]:tensor}),result=outputs[model.outputNames[0]],values=result.data;
  const height=result.dims.at(-2),width=result.dims.at(-1),count=width*height;let min=Infinity,max=-Infinity;
  for(let i=0;i<count;i++){min=Math.min(min,values[i]);max=Math.max(max,values[i]);}
  if(!Number.isFinite(min)||max-min<.000001)throw Error('The AI could not separate a clear subject in this image. Try another photo.');
  const mask=new Uint8Array(count);for(let i=0;i<count;i++)mask[i]=Math.max(0,Math.min(255,Math.round((values[i]-min)/(max-min)*255)));
  tensor.dispose?.();for(const value of Object.values(outputs))value.dispose?.();
  postMessage({type:'result',mask:mask.buffer,width,height},[mask.buffer]);
 }catch(error){postMessage({type:'error',message:error.message||String(error)});session=null;}
};

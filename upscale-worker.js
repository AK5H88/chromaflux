'use strict';
let model;
const send=(phase,current,total)=>postMessage({type:'progress',phase,current,total});
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function load(){
 if(model)return model;
 if(!self.isSecureContext||!self.crypto?.subtle)throw Error('AI mode needs HTTPS. Open the online ChromaFlux site, or use localhost on this computer.');
 send('Loading the AI engine…');importScripts('ort.wasm.min.js');ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=new URL('./',location.href).href;ort.env.logLevel='error';
 const response=await fetch('upscale-engine.json');if(!response.ok)throw Error('The AI upscaler files are missing. Open the latest ChromaFlux website.');const manifest=await response.json(),parts=[];let received=0;const total=manifest.files.reduce((n,f)=>n+f.bytes,0);
 for(const file of manifest.files){const r=await fetch(file.name);if(!r.ok)throw Error('The AI model could not download. Check your connection and retry.');const chunks=[];if(r.body){const reader=r.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;send('Downloading the AI model…',received,total);}}else{const bytes=new Uint8Array(await r.arrayBuffer());chunks.push(bytes);received+=bytes.length;}
 const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}if(bytes.length!==file.bytes||await digest(bytes)!==file.sha256)throw Error('The AI download is incomplete. Please retry.');parts.push(bytes);}
 if(!self.DecompressionStream)throw Error('Update your browser to use AI upscaling.');send('Preparing the detail model…');const raw=await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();if(raw.byteLength!==manifest.rawBytes||await digest(raw)!==manifest.modelSha256)throw Error('The AI model could not be verified. Please retry.');
 model=await ort.InferenceSession.create(raw,{executionProviders:['wasm'],graphOptimizationLevel:'all'});return model;
}
self.onmessage=async({data})=>{
 if(data.type!=='tile')return;
 try{const session=await load(),tensor=new ort.Tensor('float32',new Float32Array(data.input),[1,3,data.height,data.width]);
 const outputs=await session.run({[session.inputNames[0]]:tensor}),output=outputs[session.outputNames[0]];
 if(output.dims.at(-2)!==data.height*4||output.dims.at(-1)!==data.width*4)throw Error('Unexpected AI output size.');const values=new Float32Array(output.data);
 tensor.dispose?.();for(const value of Object.values(outputs))value.dispose?.();postMessage({type:'tile',output:values.buffer,width:data.width*4,height:data.height*4},[values.buffer]);
 }catch(error){postMessage({type:'error',message:error.message||'The AI engine could not run.'});model=null;}
};

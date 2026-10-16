'use strict';
const fs=require('node:fs'),path=require('node:path');
let url;try{url=new URL(process.argv[2]);}catch{throw Error('Usage: node configure-youtube.cjs https://your-service.onrender.com [website-folder]');}
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Use the root HTTPS URL of your downloader service, without credentials or query parameters.');
const folder=path.resolve(process.argv[3]||'.'),file=path.join(folder,'index.html');let html=fs.readFileSync(file,'utf8');
if(!html.includes('ChromaFluxYouTube')&&!html.includes('youtube.js'))throw Error('This index.html does not contain the downloader interface. Use the prepared frontend first.');
if(!/connect-src [^;]+;/.test(html))throw Error('The website connection policy could not be located.');
html=html.replace(/connect-src [^;]+;/,`connect-src 'self' ${url.origin};`);
fs.writeFileSync(file,html);fs.writeFileSync(path.join(folder,'youtube-service.json'),JSON.stringify({endpoint:url.origin},null,2)+'\n');
console.log('Downloader endpoint and exact connection policy configured. No access key was written.');

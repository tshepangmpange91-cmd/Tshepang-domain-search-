import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const MAX=120;
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj));}
function valid(s){return s.length<=253&&s.length>=4&&s.split('.').length>=2&&s.split('.').every(x=>x.length>0&&x.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x));}
async function jsonFetch(url){const r=await fetch(url,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/rdap+json, application/json'}});if(!r.ok)throw Error('Lookup service HTTP '+r.status);return r.json();}
let bootstrap={time:0,services:[]};
async function rdapBase(domain){if(Date.now()-bootstrap.time>86400000||!bootstrap.services.length){const data=await jsonFetch('https://data.iana.org/rdap/dns.json');bootstrap={time:Date.now(),services:data.services||[]};}const parts=domain.split('.');for(let n=parts.length-1;n>=1;n--){const suffix=parts.slice(n).join('.');for(const [tlds,urls] of bootstrap.services){if(tlds.some(t=>t.toLowerCase()===suffix))return urls[0];}}return null;}
async function lookup(domain){const base=await rdapBase(domain);if(!base)return {domain,status:'unsupported',message:'No RDAP server listed for this extension. Registration status cannot be verified.'};let url=base.replace(/\/$/,'')+'/domain/'+encodeURIComponent(domain);let r;try{r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/rdap+json, application/json'}});}catch(e){return {domain,status:'unknown',message:'The registry lookup could not be reached.'};}
if(r.status===404)return {domain,status:'possibly_available',message:'No registration record was found. This does not guarantee that the domain can be purchased.'};
if(!r.ok)return {domain,status:'unknown',message:'The registry returned HTTP '+r.status+'. Availability could not be confirmed.'};
let data;try{data=await r.json();}catch{return {domain,status:'unknown',message:'The registry returned an unreadable response.'};}
const events=(data.events||[]).filter(e=>['registration','expiration','last changed'].includes(e.eventAction)).map(e=>({type:e.eventAction,date:e.eventDate}));return {domain,status:'registered',registrar:data.entities?.find(e=>e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(x=>x[0]==='fn')?.[3]||null,events,rdapUrl:url,message:'An existing domain registration was found.'};}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');if(req.method==='GET'&&u.pathname==='/api/lookup'){const domain=(u.searchParams.get('domain')||'').trim().toLowerCase().replace(/\.$/,'');if(!valid(domain))return send(res,400,{status:'invalid',message:'Enter a valid domain such as example.co.za.'});try{return send(res,200,await lookup(domain));}catch(e){return send(res,503,{domain,status:'unknown',message:'Live registry lookup is temporarily unavailable.'});}}
if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/index.html')){try{const html=await fs.readFile(path.join(dir,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:"});return res.end(html);}catch{res.writeHead(500);return res.end('Missing index.html');}}
res.writeHead(404);res.end('Not found');});server.listen(PORT,'0.0.0.0',()=>console.log('Domain search ready on port '+PORT));

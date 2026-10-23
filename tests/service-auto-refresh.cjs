const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('app/ServiceTracker.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
for (const expanded of [false,true]) test(`actualización automática con detalle ${expanded ? 'abierto' : 'cerrado'}`, async () => {
 let effect, tick, cleared=false, index=0, status='RECEIVED', fail=false;
 const state=[[],null,expanded?'order-1':null,'',false,0];
 const listeners=new Map();
 const react={useState(initial){const n=index++;return [state[n]??initial,v=>{state[n]=typeof v==='function'?v(state[n]):v;}];},useEffect(fn){effect=fn;}};
 const order=()=>({id:'order-1',orderCode:'JAM-1',status,vehicle:{plate:'TEST',brand:'Toyota',model:'Corolla'},updates:[{id:'u',note:status,photos:[]}]});
 const doc={visibilityState:'visible',addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const win={setInterval(fn,ms){assert.equal(ms,3000);tick=fn;return 1;},clearInterval(){cleared=true;},addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const box={exports:{},require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx:()=>null,jsxs:()=>null};return {default:{}};},window:win,document:doc,localStorage:{getItem:()=> 'customer-token'},AbortController,fetch:async(url,opts)=>{assert.equal(opts.headers.Authorization,'Bearer customer-token');assert.equal(opts.cache,'no-store');return {ok:!fail,json:async()=>fail?{error:'Sin conexión'}:url.endsWith('/orders')?{orders:[order()]}:{order:order()}};}};
 vm.runInNewContext(compiled,box);box.exports.default({apiUrl:'http://test',tokenKey:'token'});
 const cleanup=effect();
 const flush=()=>new Promise(r=>setImmediate(r));await flush();
 assert.equal(state[0][0].status,'RECEIVED');
 status='DIAGNOSIS';tick();await flush();assert.equal(state[0][0].status,'DIAGNOSIS');
 if(expanded){assert.equal(state[1].updates[0].note,'DIAGNOSIS');assert.equal(state[2],'order-1');}
 fail=true;tick();await flush();assert.equal(state[0][0].status,'DIAGNOSIS');assert.equal(state[3],'Sin conexión');
 fail=false;status='READY';tick();await flush();assert.equal(state[0][0].status,'READY');assert.equal(state[3],'');
 doc.visibilityState='hidden';status='DELIVERED';tick();await flush();assert.equal(state[0][0].status,'READY');
 doc.visibilityState='visible';listeners.get('visibilitychange')();await flush();assert.equal(state[0][0].status,'DELIVERED');
 cleanup();assert(cleared);assert.equal(listeners.size,0);
});

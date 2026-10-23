const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
 for (const width of [390,1280]) for (const portal of ['staff','admin']) {
  const context=await browser.newContext({viewport:{width,height:844}});
  await context.addInitScript(()=>{localStorage.setItem('jamiro_staff_token','test');localStorage.setItem('jamiro_admin_token','test');});
  const customer={id:'customer-test',name:'Cliente Prueba',phone:'88888888'};
  let order={id:'order-test',orderCode:'JAM-TEST',status:'RECEIVED',customer,vehicle:{plate:'ABC123',brand:'Toyota',model:'Corolla'},photos:[],updates:[]};
  const posts=[];
  let failNext=false;
  await context.route('**/api/**', async r=>{
   const url=r.request().url(); let data={};let status=200;
   if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'Authorization, Content-Type','access-control-allow-methods':'GET,POST,OPTIONS'}});
   if(url.includes('/staff/me'))data={staff:{id:'s',name:'Flor',role:'RECEPTION'}};
   else if(url.includes('/admin-portal/me'))data={admin:{id:'a',name:'Admin'}};
   else if(url.endsWith('/updates')){
    const body=r.request().postDataJSON();posts.push(body);
    if(failNext){status=500;data={error:'Error de prueba'};failNext=false;}
    else {order={...order,status:body.status,updates:[{id:String(posts.length),...body,createdAt:new Date().toISOString(),createdByStaff:{name:'Prueba'}},...order.updates]}; data={order};}
   }else if(url.includes('/orders/order-test'))data={order};
   else if(url.includes('/orders'))data={orders:[order],hasMore:false};
   return r.fulfill({status,json:data,headers:{'access-control-allow-origin':'*'}});
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3001/'+portal);
  await page.getByText('Procesos del taller',{exact:true}).click();
  await page.getByRole('button',{name:/ABC123/}).click();
  const controls=page.getByRole('region',{name:'Cambiar estado del vehículo'});
  await controls.getByRole('button',{name:'En revisión',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Actualización publicada'}).waitFor();
  assert.equal(posts.at(-1).status,'DIAGNOSIS');
  await controls.getByRole('button',{name:'Sugerencias para el cliente',exact:true}).click();
  await controls.locator('textarea').fill('Recomendamos revisar los inyectores.');
  await controls.getByRole('button',{name:'Publicar sugerencia y volver a revisión'}).click();
  await controls.locator('textarea').waitFor({state:'hidden'});
  assert.equal(posts.at(-1).status,'DIAGNOSIS');assert.match(posts.at(-1).note,/inyectores/);
  await controls.getByRole('button',{name:'En prueba',exact:true}).click();
  await page.locator('h3').filter({hasText:'En prueba'}).waitFor();assert.equal(posts.at(-1).status,'QUALITY_CHECK');
  failNext=true;
  await controls.getByRole('button',{name:'Listo para recoger',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Error de prueba'}).waitFor();
  assert.equal(order.status,'QUALITY_CHECK');
  await controls.getByRole('button',{name:'Listo para recoger',exact:true}).click();
  await page.locator('h3').filter({hasText:'Listo para recoger'}).waitFor();assert.equal(order.status,'READY');
  assert(await page.getByText('Nueva actualización',{exact:true}).isVisible());
  assert(await page.locator('select[name="status"] option[value="DELIVERED"]').count());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  console.log(`${portal} ${width}: revisión, sugerencia, prueba, error y listo OK`);
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const assert = require('node:assert/strict');
const {chromium,webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.ENGINE || 'chromium';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const customer = {id:'12345678-1234-4234-8234-123456789013',customerId:'JAM-TEST',name:'Cliente Prueba',phone:'88888888',email:'test@example.test'};
const order = {id:'order-test',orderCode:'JAM-2026-TEST',status:'RECEIVED',customer,vehicle:{plate:'ABC123',brand:'Toyota',model:'Corolla'},photos:[],updates:[]};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
(async()=>{
 const options={headless:true};if(process.env.BROWSER_EXECUTABLE)options.executablePath=process.env.BROWSER_EXECUTABLE;
 const browser=await (engine==='webkit'?webkit:chromium).launch(options);
 let checks=0;
 try {
 for(const width of [390,1280])for(const portal of ['staff','admin'])for(const scenario of (process.env.SCENARIOS || 'success,refresh-failure,validation,server-error,network-error,missing-customer,missing-photo,native-validation').split(',')){
  let posts=0,posted;
  const context=await browser.newContext({viewport:{width,height:844}});
  await context.addInitScript(()=>{localStorage.setItem('jamiro_staff_token','synthetic');localStorage.setItem('jamiro_admin_token','synthetic')});
  await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));
  await context.route('**/api/**',async r=>{
   const url=r.request().url(),method=r.request().method();let data={};let status=200;
   if(url.includes('/staff/me'))data={staff:{id:'s1',name:'Flor de prueba',role:'RECEPTION'}};
   else if(url.includes('/admin-portal/me'))data={admin:{id:'a1',name:'Admin de prueba'}};
   else if(url.includes('/customers/search'))data={customers:[customer]};
   else if(url.includes('/orders')&&method==='POST'){
    posts++;posted=r.request().postDataJSON();
    if(scenario==='network-error')return r.abort('failed');
    if(scenario==='validation'){status=400;data={error:'Revisá los datos enviados.',details:[{path:['color'],message:'Too small'}]}}
    else if(scenario==='server-error'){status=500;data={error:'Ocurrió un error interno.'}}
    else data={order};
   }else if(url.includes('/orders')){
    if(posts&&scenario==='refresh-failure'){status=500;data={error:'No pudimos actualizar la lista.'}}else data={orders:[],hasMore:false};
   }
   return r.fulfill({status,json:data,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'Authorization, Content-Type','access-control-allow-methods':'GET,POST,OPTIONS'}});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  await page.goto(base+'/'+portal,{waitUntil:'domcontentloaded'});
  await page.getByText('Procesos del taller',{exact:true}).click();
  await page.getByRole('button',{name:'Recibir vehículo',exact:true}).first().click();
  const form=page.locator('form').filter({has:page.locator('input[name="plate"]')});
  if(scenario!=='missing-customer'&&scenario!=='native-validation'){
   await page.locator('input[name="query"]').fill('prueba');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('button',{name:/Cliente Prueba/}).click();
  }
  if(scenario!=='native-validation'){
   for(const [key,value]of Object.entries({plate:'ABC123',brand:'Toyota',model:'Corolla',year:'2020',color:'Rojo',mileage:'1000',reason:'Revisión general'}))await form.locator(`[name="${key}"]`).fill(value);
   if(scenario!=='missing-photo')await form.locator('input[type="file"]').first().setInputFiles({name:'foto.png',mimeType:'image/png',buffer:png});
  }
  await form.getByRole('button',{name:'Recibir vehículo',exact:true}).click();
  if(['success','refresh-failure'].includes(scenario)){
   const result=page.getByRole('status').filter({hasText:/Vehículo ABC123 registrado correctamente.*JAM-2026-TEST/});await result.waitFor();
   await page.getByText('Nueva actualización',{exact:true}).waitFor();
   if(scenario==='refresh-failure')await page.getByText(/La orden está guardada, pero/).waitFor();
   assert.equal(posts,1);assert.equal(posted.customerId,customer.id);assert(posted.photos[0].startsWith('data:image/jpeg;'));
  }else{
   const alert=page.getByRole('alert').filter({hasText:/\S/});await alert.waitFor();
   const text=await alert.innerText();
   const expected={validation:/color/, 'server-error':/error interno/, 'network-error':/evitar duplicados/, 'missing-customer':/elegí al cliente/, 'missing-photo':/al menos una foto/,'native-validation':/Revisá el formulario/};assert.match(text,expected[scenario]);
   if(scenario.startsWith('missing-')||scenario==='native-validation')assert.equal(posts,0);else assert.equal(posts,1);
   if(scenario!=='native-validation')assert.equal(await form.locator('[name="plate"]').inputValue(),'ABC123');
  }
  await page.waitForTimeout(400);
  const feedback=page.getByRole(['success','refresh-failure'].includes(scenario)?'status':'alert').filter({hasText:['success','refresh-failure'].includes(scenario)?/registrado correctamente/:/\S/}).first();
  const box=await feedback.boundingBox();assert(box&&box.y>=0&&box.y<844,'feedback must be visible without scrolling');
  checks++;console.log(`${engine} ${width} ${portal} ${scenario}: OK`);await context.close();
 }
 console.log(`${checks} checks passed`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

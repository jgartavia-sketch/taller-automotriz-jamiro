// Production UI checks with synthetic data; never connects to customer accounts.
const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.ENGINE || 'chromium';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const customer = { id:'test', customerId:'JAM-TEST', name:'Cliente de prueba '+ 'NombreLargo'.repeat(8), email:'correo'.repeat(16)+'@ejemplo.test', phone:'88888888', purchasePoints:100, referralPoints:50, totalPoints:150, referrals:1 };
const order = { id:'o1', orderCode:'JAM-001', status:'IN_PROGRESS', mileage:1000, fuelLevel:'HALF', reason:'Revision', createdAt:new Date().toISOString(), customer, vehicle:{plate:'ABC123',brand:'Marca',model:'ModeloDeVehiculo'.repeat(10),year:'2020',color:'Rojo'}, photos:[], updates:[{id:'u1',status:'IN_PROGRESS',note:'detalle'.repeat(90),createdAt:new Date().toISOString(),photos:[],createdByStaff:{name:'Tecnico'}}] };
(async () => {
  const options = { headless:true };
  if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
  const browser = await (engine === 'webkit' ? webkit : chromium).launch(options);
  const results = [];
  try {
    for (const [width,height] of JSON.parse(process.env.VIEWPORTS || '[[320,700],[375,812],[390,844],[412,915],[768,1024],[844,390],[1024,768],[1051,768],[1200,800],[1280,800],[1440,900]]')) {
      let staffRole = 'MECHANIC';
      const context = await browser.newContext({viewport:{width,height},hasTouch:true});
      await context.addInitScript(() => { for(const key of ['jamiro_token','jamiro_staff_token','jamiro_admin_token']) localStorage.setItem(key,'synthetic-test'); });
      await context.route('https://www.googletagmanager.com/**', route => route.fulfill({body:''}));
      await context.route('**/api/**', route => {
        const url = route.request().url();
        const data = url.includes('/admin-portal/me') ? {admin:{id:'admin',name:'Administrador de pruebas'}}
          : url.includes('/staff/me') ? {staff:{id:'staff',name:'Personal de pruebas',role:staffRole}}
          : url.includes('/auth/me') ? {customer,movements:[],referral:{code:'JAM-TEST',expiry:'2026-12-31'}}
          : url.includes('/orders/o1') ? {order}
          : url.includes('/orders') ? {orders:[order],hasMore:false}
          : {customers:[customer]};
        return route.fulfill({json:data,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'Authorization, Content-Type','access-control-allow-methods':'GET,POST,OPTIONS'}});
      });
      const page = await context.newPage();
      const errors = [], navigationWarnings = [];
      // WebKit reports some cancelled requests during navigation as access-control errors.
      // Keep these in the report; account/role rendering is asserted separately.
      page.on('pageerror', error => {
        if (/\/(localhost:4000\/api\/auth\/me|127\.0\.0\.1:3000\/.*\?_rsc=.*) due to access control checks\.$/.test(error.message)) navigationWarnings.push(error.message);
        else errors.push(error.message);
      });
      async function check(label) {
        const issues = await page.evaluate(() => {
          const w = innerWidth;
          return [...document.querySelectorAll('main *,header *,nav *')].filter(element => {
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
            return rect.width && rect.height && style.visibility !== 'hidden' && (rect.right > w+1 || rect.left < -1) && style.position !== 'absolute' && style.position !== 'fixed';
          }).map(element => ({tag:element.tagName,cls:element.className,text:element.textContent.slice(0,55),right:Math.round(element.getBoundingClientRect().right)}));
        });
        results.push({width,height,label,issues});
        console.error(`${engine} ${width}x${height} ${label}: ${issues.length} overflow`);
      }
      for (const path of ['/','/registro','/login','/servicios','/tienda','/nosotros','/contacto','/mi-cuenta','/staff','/admin']) {
        await page.goto(base+path,{waitUntil:'domcontentloaded'});
        await page.waitForLoadState('networkidle');
        if (path === '/staff') await page.getByRole('tab',{name:'Procesos del taller',exact:true}).waitFor();
        if (path === '/admin') await page.getByRole('button',{name:'Clientes registrados',exact:true}).waitFor();
        if (path === '/mi-cuenta') await page.getByRole('button',{name:/ABC123/}).waitFor();
        await check(path);
        if (path === '/' && width <= 1050) {
          await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
          for (const name of ['Inicio','Registro','Servicios','Tienda','Nosotros','Contacto']) assert(await page.locator('#main-navigation').getByRole('link',{name,exact:true}).isVisible());
          if(width <= 720) {
            const quote = page.locator('#main-navigation').getByRole('link',{name:'Cotizar ahora',exact:true});
            await quote.click(); await page.waitForURL('**/servicios#solicitar-servicio'); await page.waitForLoadState('networkidle');
            assert.equal(await page.getByRole('button',{name:'Abrir menú',exact:true}).getAttribute('aria-expanded'),'false');
          } else await page.getByRole('button',{name:'Cerrar menú',exact:true}).click();
        }
        if (path === '/mi-cuenta') {
          await page.getByRole('button',{name:/ABC123/}).click();
          await page.locator('[aria-expanded="true"]').waitFor();
          await check('customer order detail');
        }
        if(path === '/staff' || path === '/admin') {
          await page.getByText('Acreditar puntos',{exact:true}).first().click();
          await page.locator('input[name="query"]').fill('prueba');
          await page.getByRole('button',{name:'Buscar cliente',exact:true}).click();
          await page.getByRole('heading',{name:customer.name,exact:true}).waitFor();
          await check(path+' points');
          await page.getByText('Registrar clientes',{exact:true}).first().click();
          await page.locator('input[name="query"]').fill('prueba');
          await page.getByRole('button',{name:'Buscar',exact:true}).click();
          await page.getByText(customer.email,{exact:false}).waitFor();
          await check(path+' registration search');
          await page.getByText('Procesos del taller',{exact:true}).click();
          await page.getByRole('button',{name:/ABC123/}).waitFor();
          await check(path+' orders');
          await page.getByRole('button',{name:/ABC123/}).click();
          await page.getByText('Nueva actualización',{exact:true}).waitFor();
          await check(path+' detail');
          await page.getByRole('button',{name:'Recibir vehículo',exact:true}).first().click();
          await check(path+' receive');
          await page.locator('input[name="query"]').fill('prueba');
          await page.getByRole('button',{name:'Buscar',exact:true}).click();
          await page.getByRole('button',{name:customer.name,exact:false}).click();
          const photo = page.locator('input[type="file"]').first();
          await photo.setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64')});
          const remove = page.getByRole('button',{name:'Eliminar foto 1',exact:true});
          await remove.waitFor(); const box = await remove.boundingBox(); assert(box.width>=44 && box.height>=44);
          await check(path+' photo preview');
          await remove.click(); await remove.waitFor({state:'detached'});
        }
        if(path === '/admin') {
          await page.getByRole('button',{name:'Clientes registrados',exact:true}).click();
          await page.locator('tbody tr').waitFor(); await check('admin customers');
          assert.equal(await page.locator('tbody td').count(),6);
          if(width===390) await page.screenshot({path:process.env.SCREENSHOT || '/tmp/jamiro-admin.png',fullPage:true});
        }
      }
      staffRole = 'RECEPTION';
      await page.goto(base+'/staff',{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Registrar clientes',exact:true}).waitFor();
      assert.equal(await page.getByRole('tab').count(),3);
      await page.getByRole('tab',{name:'Acreditar puntos',exact:true}).click();
      await page.getByRole('heading',{name:'Acreditar puntos',exact:true}).waitFor();
      await check('reception points');
      await page.getByRole('tab',{name:'Procesos del taller',exact:true}).click();
      await page.getByRole('button',{name:/ABC123/}).waitFor();
      await page.getByRole('button',{name:'Recibir vehículo',exact:true}).first().click();
      await check('reception receive');
      await page.waitForLoadState('networkidle'); assert.deepEqual(errors,[]);
      if (navigationWarnings.length) results.push({width,height,label:'navigation warnings',issues:[],warnings:navigationWarnings});
      await context.close();
    }
    console.log(JSON.stringify({engine,results},null,2));
    assert.equal(results.filter(result=>result.issues.length).length,0,'UI overflow detected');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});

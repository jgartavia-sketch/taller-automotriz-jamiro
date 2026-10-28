const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const products=JSON.parse(fs.readFileSync('app/shop-products.json','utf8'));
const compiled=ts.transpileModule(fs.readFileSync('app/ProductCatalog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function harness(cart={}) {
 const state=[cart,''];let n=0;
 const jsx=(type,props)=>({type,props});
 const context={exports:{},Intl,encodeURIComponent,require(name){if(name==='react')return {useState(initial){const i=n++;return [state[i]??initial,v=>{state[i]=typeof v==='function'?v(state[i]):v;}];}};if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name.endsWith('.json'))return {default:products};return {default:{}};}};
 vm.runInNewContext(compiled,context);
 return {state,render(){n=0;return context.exports.default();}};
}
function all(node,predicate,result=[]) {if(!node||typeof node!=='object')return result;if(Array.isArray(node)){for(const x of node)all(x,predicate,result);return result;}if(predicate(node))result.push(node);all(node.props?.children,predicate,result);return result;}
function text(node){if(node==null)return '';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children);}
test('21 productos: 6 previos intactos y 15 nuevos, sin identificadores repetidos',()=>{assert.equal(products.length,21);assert.equal(new Set(products.map(p=>p.id)).size,21);assert.equal(products.find(p=>p.id==='piston-caliper-b13-b14').stock,3);assert.equal(products.find(p=>p.id==='rotula-crv-kashima').price,10600);assert.equal(products.find(p=>p.id==='rotula-crv-three-five').stock,1);});
test('P21W se cotiza y no se presenta como gratis ni se inventa un total',()=>{const h=harness({'bombillo-floseer-p21w':2,'bombillo-floseer-5230':1});const tree=h.render();assert.match(text(tree),/Consultar precio/);assert.match(text(tree),/Subtotal con precio/);assert.match(text(tree),/productos por cotizar/);const link=all(tree,n=>n.type==='a'&&n.props.href?.startsWith('https://wa.me/'))[0];const msg=decodeURIComponent(link.props.href.split('?text=')[1]);assert.match(msg,/Precio por confirmar/);assert.match(msg,/más productos pendientes de cotizar/);assert.match(msg,/500/);});
test('el carrito respeta el stock independiente de cada marca',()=>{const h=harness();let tree=h.render();const name='Rótula de suspensión CRV Three Five';const card=all(tree,n=>n.type==='div'&&all(n,x=>x.type==='h4'&&text(x)===name).length>0).at(-1);const button=all(card,n=>n.type==='button')[0];button.props.onClick();tree=h.render();assert.equal(h.state[0]['rotula-crv-three-five'],1);const buttons=all(tree,n=>n.type==='button'&&text(n)==='Agregar al carrito +');assert(buttons[products.findIndex(p=>p.id==='rotula-crv-three-five')].props.disabled);assert(!h.state[0]['rotula-crv-kashima']);});
test('pedido con precio conocido conserva total y WhatsApp',()=>{const h=harness({'bombillo-floseer-5230':2});const tree=h.render();assert.match(text(tree),/Total:/);assert.doesNotMatch(text(tree),/Subtotal con precio/);const link=all(tree,n=>n.type==='a'&&n.props.href?.startsWith('https://wa.me/'))[0];assert.match(link.props.href,/50670111090/);assert.match(decodeURIComponent(link.props.href),/Total de productos:/);});

test('cada producto aparece una sola vez en las seis categorías',()=>{
 const tree=harness().render();const groups=all(tree,n=>n.type==='details'&&n.props.name==='categorias-jamiro');
 assert.equal(groups.length,6);assert(groups.every(n=>n.props.open===undefined));
 const cards=all(tree,n=>n.type==='h4'&&products.some(p=>p.name===text(n)));
 assert.equal(cards.length,products.length);assert.equal(new Set(cards.map(text)).size,products.length);
 for(const category of ['aceites','cuidado','iluminacion','encendido','suspension','frenos'])assert(products.some(p=>p.category===category));
});
test('búsqueda ignora acentos, abre resultados y permite limpiar',()=>{
 const h=harness();let tree=h.render();let input=all(tree,n=>n.type==='input'&&n.props.type==='search')[0];
 input.props.onChange({target:{value:'rotula'}});tree=h.render();
 assert.equal(all(tree,n=>n.type==='details').length,1);assert(all(tree,n=>n.type==='details')[0].props.open);
 assert.match(text(tree),/Kashima/);assert.doesNotMatch(text(tree),/Bombillo Floseer/);
 input=all(tree,n=>n.type==='input'&&n.props.type==='search')[0];input.props.onChange({target:{value:'no-existe-xyz'}});tree=h.render();assert.match(text(tree),/No encontramos/);
 all(tree,n=>n.type==='button'&&text(n)==='Limpiar')[0].props.onClick();tree=h.render();assert.equal(all(tree,n=>n.type==='details').length,6);
});

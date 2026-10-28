"use client";

import { useState } from "react";
import products from "./shop-products.json";
import styles from "./ProductCatalog.module.css";

const money = (value: number | null) => value === null ? "Consultar precio" : new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);
const WHATSAPP = "50670111090";
const categories = [
  { id: "aceites", title: "Aceites y lubricantes", description: "Protección para motor y transmisión" },
  { id: "cuidado", title: "Limpieza y refrigeración", description: "Cuidado y mantenimiento de tu vehículo" },
  { id: "iluminacion", title: "Iluminación", description: "Bombillos y luces automotrices" },
  { id: "encendido", title: "Sistema de encendido", description: "Rotores y tapas de distribuidor" },
  { id: "suspension", title: "Suspensión", description: "Rótulas y componentes de suspensión" },
  { id: "frenos", title: "Frenos", description: "Pistones de cáliper y juegos de zapatas" },
];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function ProductCatalog() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const search = normalize(query.trim());
  const groups = categories.map(category => ({ ...category, items: products.filter(product => product.category === category.id && (!search || normalize(`${product.name} ${product.presentation} ${category.title}`).includes(search))) })).filter(category => category.items.length > 0);
  const lines = products.filter(product => (cart[product.id] || 0) > 0);
  const total = lines.reduce((sum, product) => sum + (product.price ?? 0) * cart[product.id], 0);
  const hasUnpriced = lines.some(product => product.price === null);
  const count = lines.reduce((sum, product) => sum + cart[product.id], 0);

  function change(id: string, value: number) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const quantity = Number.isFinite(value) ? Math.max(0, Math.min(product.stock ?? 999, Math.trunc(value))) : 0;
    setCart(current => ({ ...current, [id]: quantity }));
    setNotice(quantity ? `${product.name}: ${quantity} en el carrito.` : `${product.name} eliminado del carrito.`);
  }

  const message = ["Hola, Taller Jamiro. Quiero solicitar este pedido:", "", ...lines.map(product => `${cart[product.id]} × ${product.name} (${product.presentation}) — ${product.price === null ? "Precio por confirmar" : `${money(product.price)} c/u — Subtotal: ${money(product.price === null ? null : product.price * cart[product.id])}`}${product.stock === null ? " (disponibilidad por confirmar)" : ""}`), "", `${hasUnpriced ? "Subtotal de productos con precio" : "Total de productos"}: ${money(total)}${hasUnpriced ? " (más productos pendientes de cotizar)" : ""}`, "Por favor, confirmar existencias y coordinar pago y entrega."].join("\n");

  return <article className={styles.catalog} aria-label="Catálogo de productos nuevos">
    <div className={styles.heading}><div><p className="eyebrow"><span /> Catálogo Jamiro</p><h3>Lo que tu vehículo necesita.</h3><p>Elegí una categoría para descubrir sus productos.</p></div><a className={styles.cartLink} href="#carrito-jamiro">Ver carrito <span>{count}</span></a></div>
    <div className={styles.searchBar}><label htmlFor="buscar-productos">Buscar un producto</label><div><input id="buscar-productos" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, marca o código de repuesto…"/>{query && <button type="button" onClick={() => setQuery("")}>Limpiar</button>}</div><small>{products.length} productos · {categories.length} categorías</small></div>
    <div className={styles.categories}>{groups.map((category, index) => <details className={styles.category} key={category.id} name={search ? undefined : "categorias-jamiro"} open={search ? true : undefined}>
      <summary><span className={styles.categoryImage}><img src={category.items[0].image} alt="" width={72} height={72}/></span><span className={styles.categoryCopy}><small>Categoría {String(index + 1).padStart(2, "0")}</small><strong>{category.title}</strong><span>{category.description}</span></span><span className={styles.categoryCount}>{category.items.length} {category.items.length === 1 ? "producto" : "productos"}</span><span className={styles.chevron} aria-hidden="true">+</span></summary>
      <div className={styles.categoryBody}><div className={styles.grid}>{category.items.map(product => <div className={styles.card} key={product.id}>
        <img src={product.image} alt={`${product.name}, ${product.presentation}`} width={900} height={900} loading="lazy" />
        <div className={styles.details}><h4>{product.name}</h4><p>{product.presentation}</p><strong className={styles.price}>{money(product.price)}</strong><small>{product.stock === null ? "Disponibilidad por confirmar" : product.stock === 0 ? "Agotado" : `${product.stock} ${product.presentation.startsWith("1 juego") ? "juego disponible" : "unidades disponibles"}`}</small>
        <button type="button" className="button" disabled={product.stock === 0 || (cart[product.id] || 0) >= (product.stock ?? 999)} onClick={() => change(product.id, (cart[product.id] || 0) + 1)}>Agregar al carrito +</button></div>
      </div>)}</div></div>
    </details>)}</div>
    {groups.length === 0 && <p className={styles.empty} role="status">No encontramos productos para “{query}”. Probá con otra marca o código.</p>}
    <div className={styles.cart} id="carrito-jamiro"><h4>Tu carrito ({count})</h4>
      {!lines.length ? <p>Tu carrito está vacío. Elegí los productos que necesitás.</p> : <>
      <ul className={styles.lines}>{lines.map(product => <li key={product.id}><div><strong>{product.name}</strong><small>{product.presentation} · {money(product.price)}{product.price !== null ? " c/u" : ""}</small>{product.stock === null && <small>Disponibilidad por confirmar</small>}</div><div className={styles.quantity}><button type="button" aria-label={`Quitar una unidad de ${product.name}`} onClick={() => change(product.id, cart[product.id] - 1)}>−</button><input type="number" min="1" max={product.stock ?? 999} step="1" aria-label={`Cantidad de ${product.name}`} value={cart[product.id]} onChange={event => change(product.id, Number(event.target.value))} /><button type="button" disabled={cart[product.id] >= (product.stock ?? 999)} aria-label={`Agregar una unidad de ${product.name}`} onClick={() => change(product.id, cart[product.id] + 1)}>+</button></div><strong>{money(product.price === null ? null : product.price * cart[product.id])}</strong><button type="button" className={styles.remove} onClick={() => change(product.id, 0)} aria-label={`Eliminar ${product.name}`}>Eliminar</button></li>)}</ul>
      <div className={styles.checkout}><strong>{hasUnpriced ? "Subtotal con precio" : "Total"}: {money(total)}{hasUnpriced && " + productos por cotizar"}</strong><a className="button" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Continuar por WhatsApp →</a><button type="button" className={styles.remove} onClick={() => { setCart({}); setNotice("Carrito vacío."); }}>Vaciar carrito</button></div>
      <p>Se abrirá WhatsApp con el resumen para que lo enviés. El taller confirmará disponibilidad, pago y entrega.</p></>}
    </div><p className={styles.notice} role="status" aria-live="polite">{notice}</p>
  </article>;
}

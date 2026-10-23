"use client";

import { useState } from "react";
import products from "./shop-products.json";
import styles from "./ProductCatalog.module.css";

const money = (value: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);
const WHATSAPP = "50670111090";

export default function ProductCatalog() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const lines = products.filter(product => (cart[product.id] || 0) > 0);
  const total = lines.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const count = lines.reduce((sum, product) => sum + cart[product.id], 0);

  function change(id: string, value: number) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const quantity = Number.isFinite(value) ? Math.max(0, Math.min(product.stock ?? 999, Math.trunc(value))) : 0;
    setCart(current => ({ ...current, [id]: quantity }));
    setNotice(quantity ? `${product.name}: ${quantity} en el carrito.` : `${product.name} eliminado del carrito.`);
  }

  const message = ["Hola, Taller Jamiro. Quiero solicitar este pedido:", "", ...lines.map(product => `${cart[product.id]} × ${product.name} (${product.presentation}) — ${money(product.price)} c/u — Subtotal: ${money(product.price * cart[product.id])}${product.stock === null ? " (disponibilidad por confirmar)" : ""}`), "", `Total de productos: ${money(total)}`, "Por favor, confirmar existencias y coordinar pago y entrega."].join("\n");

  return <article className={styles.catalog} aria-label="Catálogo de productos nuevos">
    <div className={styles.heading}><div><p className="eyebrow"><span /> Productos nuevos</p><h3>Aceites y cuidado automotriz.</h3><p>Agregá tus productos y coordiná tu pedido por WhatsApp.</p></div><a className={styles.cartLink} href="#carrito-jamiro">Carrito · {count}</a></div>
    <div className={styles.grid}>{products.map(product => <div className={styles.card} key={product.id}>
      <img src={product.image} alt={`${product.name}, ${product.presentation}`} width={900} height={900} loading="lazy" />
      <div className={styles.details}><h4>{product.name}</h4><p>{product.presentation}</p><strong className={styles.price}>{money(product.price)}</strong><small>{product.stock === null ? "Disponibilidad por confirmar" : `${product.stock} unidades · inventario inicial`}</small>
      <button type="button" className="button" disabled={product.stock === 0 || (cart[product.id] || 0) >= (product.stock ?? 999)} onClick={() => change(product.id, (cart[product.id] || 0) + 1)}>Agregar al carrito +</button></div>
    </div>)}</div>
    <div className={styles.cart} id="carrito-jamiro"><h4>Tu carrito ({count})</h4>
      {!lines.length ? <p>Tu carrito está vacío. Elegí los productos que necesitás.</p> : <>
      <ul className={styles.lines}>{lines.map(product => <li key={product.id}><div><strong>{product.name}</strong><small>{product.presentation} · {money(product.price)} c/u</small>{product.stock === null && <small>Disponibilidad por confirmar</small>}</div><div className={styles.quantity}><button type="button" aria-label={`Quitar una unidad de ${product.name}`} onClick={() => change(product.id, cart[product.id] - 1)}>−</button><input type="number" min="1" max={product.stock ?? 999} step="1" aria-label={`Cantidad de ${product.name}`} value={cart[product.id]} onChange={event => change(product.id, Number(event.target.value))} /><button type="button" disabled={cart[product.id] >= (product.stock ?? 999)} aria-label={`Agregar una unidad de ${product.name}`} onClick={() => change(product.id, cart[product.id] + 1)}>+</button></div><strong>{money(product.price * cart[product.id])}</strong><button type="button" className={styles.remove} onClick={() => change(product.id, 0)} aria-label={`Eliminar ${product.name}`}>Eliminar</button></li>)}</ul>
      <div className={styles.checkout}><strong>Total: {money(total)}</strong><a className="button" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Continuar por WhatsApp →</a><button type="button" className={styles.remove} onClick={() => { setCart({}); setNotice("Carrito vacío."); }}>Vaciar carrito</button></div>
      <p>Se abrirá WhatsApp con el resumen para que lo enviés. El taller confirmará disponibilidad, pago y entrega.</p></>}
    </div><p className={styles.notice} role="status" aria-live="polite">{notice}</p>
  </article>;
}

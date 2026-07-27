"use client";

import { useState } from "react";

const services = [
  { icon: "⚡", title: "Electromecánica", text: "Diagnóstico preciso y soluciones para sistemas eléctricos y electrónicos." },
  { icon: "◉", title: "Mecánica general", text: "Mantenimiento y reparación integral para mantenerte siempre en carretera." },
  { icon: "✓", title: "Pre-DEKRA", text: "Inspección preventiva para que llegués a la revisión con todo bajo control." },
  { icon: "▰", title: "Cambio de aceite", text: "Lubricantes, filtros y servicio profesional según las necesidades de tu vehículo." },
];

const products = [
  { id: 1, tag: "Más vendido", icon: "OIL", title: "Cambio de aceite premium", detail: "Aceite + filtro + revisión de 15 puntos", price: "₡32.500" },
  { id: 2, tag: "Diagnóstico", icon: "SCAN", title: "Escaneo computarizado", detail: "Lectura profesional y reporte de fallas", price: "₡18.000" },
  { id: 3, tag: "Seguridad", icon: "DEKRA", title: "Inspección pre-DEKRA", detail: "Chequeo preventivo completo", price: "₡22.500" },
];

export default function Home() {
  const [cart, setCart] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const addToCart = (id: number) => {
    setCart((current) => [...current, id]);
    setCartOpen(true);
  };

  const cartProducts = cart.map((id) => products.find((product) => product.id === id)!);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Taller Automotriz Jamiro, inicio">
          <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
          <span><strong>Taller Automotriz</strong>Jamiro</span>
        </a>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
        <nav className={menuOpen ? "nav-open" : ""}>
          <a href="#servicios" onClick={() => setMenuOpen(false)}>Servicios</a>
          <a href="#tienda" onClick={() => setMenuOpen(false)}>Tienda</a>
          <a href="#proceso" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
        </nav>

        <div className="header-actions">
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label="Ver carrito">
            Bolsa <span>{cart.length}</span>
          </button>
          <button className="button button-small" onClick={() => setQuoteOpen(true)}>Cotizar ahora</button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> Especialistas en electromecánica</p>
          <h1>Tu vehículo en manos de <em>verdaderos expertos.</em></h1>
          <p className="hero-lead">
            Diagnóstico preciso, servicio transparente y soluciones que te devuelven a la carretera con total confianza.
          </p>
          <div className="hero-actions">
            <button className="button" onClick={() => setQuoteOpen(true)}>Solicitar cotización <b>→</b></button>
            <a className="button button-ghost" href="#tienda">Explorar tienda</a>
          </div>
          <div className="trust-row">
            <span><b>✓</b> Calidad garantizada</span>
            <span><b>✓</b> Técnicos especializados</span>
            <span><b>✓</b> Atención profesional</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="logo-stage">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <img src="/logo-jamiro.png" alt="Logo de Taller Automotriz Jamiro" />
          </div>
          <div className="status-card">
            <span className="status-icon">✓</span>
            <div><strong>Diagnóstico confiable</strong><small>Antes de reparar, te explicamos.</small></div>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Ventajas del taller">
        <div><strong>Servicio</strong><span>rápido y confiable</span></div>
        <div><strong>Atención</strong><span>clara y profesional</span></div>
        <div><strong>Técnicos</strong><span>especializados</span></div>
        <div><strong>Calidad</strong><span>garantizada</span></div>
      </section>

      <section className="section services" id="servicios">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Todo en un solo lugar</p><h2>Soluciones para cada kilómetro.</h2></div>
          <p>Desde mantenimiento preventivo hasta diagnósticos complejos, cuidamos cada detalle de tu vehículo.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <span className="service-icon">{service.icon}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <button onClick={() => setQuoteOpen(true)}>Cotizar servicio <b>↗</b></button>
            </article>
          ))}
        </div>
      </section>

      <section className="section shop" id="tienda">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Tienda Jamiro</p><h2>Servicios listos para comprar.</h2></div>
          <p>Comprá ahora y elegí retiro, entrega o instalación profesional en nuestro taller.</p>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-art">
                <span>{product.icon}</span>
                <small>{product.tag}</small>
              </div>
              <div className="product-copy">
                <p>{product.detail}</p>
                <h3>{product.title}</h3>
                <div><strong>{product.price}</strong><button onClick={() => addToCart(product.id)}>Agregar +</button></div>
              </div>
            </article>
          ))}
        </div>
        <button className="button button-ghost shop-all">Ver todos los productos →</button>
      </section>

      <section className="section process" id="proceso">
        <div className="section-heading centered">
          <div><p className="eyebrow"><span /> Sin complicaciones</p><h2>Así de fácil cuidamos tu vehículo.</h2></div>
        </div>
        <div className="process-grid">
          {[
            ["01", "Contanos qué necesitás", "Elegí un servicio o enviá los síntomas de tu vehículo."],
            ["02", "Recibí tu cotización", "Revisamos tu solicitud y te presentamos una propuesta clara."],
            ["03", "Aprobá y agendá", "Elegí el momento que mejor te funcione para visitarnos."],
            ["04", "Volvé a la carretera", "Te entregamos el vehículo listo, respaldado y seguro."],
          ].map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="cta-section" id="contacto">
        <div>
          <p className="eyebrow"><span /> Estamos listos</p>
          <h2>Tu próximo viaje empieza con un vehículo en buenas manos.</h2>
        </div>
        <button className="button" onClick={() => setQuoteOpen(true)}>Solicitar cotización →</button>
      </section>

      <footer>
        <div className="brand footer-brand"><img src="/logo-jamiro.png" alt="" /><span><strong>Taller Automotriz</strong>Jamiro</span></div>
        <p>Especialistas en electromecánica, mecánica automotriz y mantenimiento integral.</p>
        <p>© 2026 Taller Automotriz Jamiro</p>
      </footer>

      {quoteOpen && (
        <div className="modal-backdrop" onMouseDown={() => setQuoteOpen(false)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Solicitar cotización">
            <button className="modal-close" onClick={() => setQuoteOpen(false)}>×</button>
            {!sent ? (
              <>
                <p className="eyebrow"><span /> Cotización en línea</p>
                <h2>Contanos qué necesita tu vehículo.</h2>
                <p>Esta primera versión simula el recorrido que tendrá el cliente.</p>
                <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
                  <label>Nombre completo<input required placeholder="Ej. José Artavia" /></label>
                  <div className="form-row">
                    <label>Teléfono<input required placeholder="8888-8888" /></label>
                    <label>Vehículo<input required placeholder="Toyota Corolla 2018" /></label>
                  </div>
                  <label>Servicio<select defaultValue=""><option value="" disabled>Seleccioná una opción</option><option>Electromecánica</option><option>Mecánica general</option><option>Pre-DEKRA</option><option>Cambio de aceite</option><option>Otro diagnóstico</option></select></label>
                  <label>¿Qué está pasando?<textarea required placeholder="Describí el problema, ruido, testigo o servicio que necesitás..." /></label>
                  <button className="button" type="submit">Enviar solicitud →</button>
                </form>
              </>
            ) : (
              <div className="success-state"><span>✓</span><h2>Solicitud recibida</h2><p>El equipo de Jamiro revisará la información para preparar tu cotización.</p><button className="button" onClick={() => { setSent(false); setQuoteOpen(false); }}>Listo</button></div>
            )}
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setCartOpen(false)}>
          <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head"><div><p className="eyebrow"><span /> Tienda Jamiro</p><h2>Tu pedido</h2></div><button onClick={() => setCartOpen(false)}>×</button></div>
            {cartProducts.length ? (
              <>
                <div className="cart-list">
                  {cartProducts.map((product, index) => <div key={`${product.id}-${index}`}><span>{product.icon}</span><div><strong>{product.title}</strong><small>{product.price}</small></div><button onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
                </div>
                <label className="delivery-label">Modalidad<select><option>Instalación en el taller</option><option>Retiro en el taller</option><option>Entrega a domicilio</option></select></label>
                <button className="button checkout-button">Continuar pedido →</button>
              </>
            ) : <div className="empty-cart"><span>◇</span><h3>Tu bolsa está vacía</h3><p>Explorá los servicios y productos disponibles.</p><button className="button button-ghost" onClick={() => setCartOpen(false)}>Seguir explorando</button></div>}
          </aside>
        </div>
      )}
    </main>
  );
}

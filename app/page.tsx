"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "jamiro_token";

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  customerId: string;
  purchasePoints: number;
  referralPoints: number;
  referrals: number;
};

type PointMovement = {
  id: string;
  kind: string;
  points: number;
  amount_colones: number | null;
  description: string;
  created_at: string;
};

const rewards = [
  { points: 250, title: "Diagnóstico preventivo", detail: "Revisión visual y escaneo básico.", available: true },
  { points: 500, title: "Cambio de aceite", detail: "Mano de obra incluida. Aplican condiciones.", available: true },
  { points: 850, title: "Pre-DEKRA completo", detail: "Inspección preventiva de puntos críticos.", available: false },
];

export default function Home() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isRegistration = pathname === "/registro";
  const isServices = pathname === "/servicios";
  const isShop = pathname === "/tienda";
  const isAbout = pathname === "/nosotros";
  const isContact = pathname === "/contacto";
  const isLogin = pathname === "/login";
  const isAccount = pathname === "/mi-cuenta";
  const [cart, setCart] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [movements, setMovements] = useState<PointMovement[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referralExpiry, setReferralExpiry] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          cache: "no-store",
          headers: authHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setProfile(data.customer);
          setMovements(data.movements || []);
          if (data.referral) {
            setReferralCode(data.referral.code);
            setReferralExpiry(data.referral.expiry);
          }
        }
      } finally {
        setSessionLoading(false);
      }
    };
    loadSession();
  }, []);

  const addToCart = (id: number) => {
    setCart((current) => [...current, id]);
    setCartOpen(true);
  };

  const cartProducts = cart.map((id) => products.find((product) => product.id === id)!);

  const registerCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          password: data.get("password"),
          referral: data.get("referral"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos crear la cuenta.");
      localStorage.setItem(TOKEN_KEY, result.token);
      setProfile(result.customer);
      setAuthMessage("Tu cuenta y tarjeta digital ya están activas.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No pudimos crear la cuenta.");
    } finally {
      setAuthLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setAuthError("");
    const response = await fetch(`${API_URL}/api/referrals`, {
      method: "POST",
      headers: authHeaders(),
    });
    const result = await response.json();
    if (!response.ok) {
      setAuthError(result.error || "No pudimos generar el código.");
      return;
    }
    setReferralCode(result.code);
    setReferralExpiry(result.expiry);
    setCopied(false);
  };

  const copyReferralCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard?.writeText(referralCode);
    setCopied(true);
  };

  const loginCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos iniciar sesión.");
      localStorage.setItem(TOKEN_KEY, result.token);
      setProfile(result.customer);
      setAuthMessage("Sesión iniciada correctamente.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No pudimos iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutCustomer = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setProfile(null);
    setMovements([]);
    setReferralCode("");
    setReferralExpiry("");
    setAuthMessage("");
  };

  const totalPoints = useMemo(
    () => (profile?.purchasePoints || 0) + (profile?.referralPoints || 0),
    [profile],
  );

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Taller Automotriz Jamiro, inicio">
          <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
          <span><strong>Taller Automotriz</strong>Jamiro</span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? "×" : "☰"}
        </button>
        <nav id="main-navigation" className={menuOpen ? "nav-open" : ""} aria-label="Navegación principal">
          <Link className={isHome ? "active" : ""} href="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link className={isRegistration ? "active" : ""} href="/registro" onClick={() => setMenuOpen(false)}>Registro</Link>
          <Link className={isServices ? "active" : ""} href="/servicios" onClick={() => setMenuOpen(false)}>Servicios</Link>
          <Link className={isShop ? "active" : ""} href="/tienda" onClick={() => setMenuOpen(false)}>Tienda</Link>
          <Link className={isAbout ? "active" : ""} href="/nosotros" onClick={() => setMenuOpen(false)}>Nosotros</Link>
          <Link className={isContact ? "active" : ""} href="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
        </nav>

        <div className="header-actions">
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label="Ver carrito">
            Carrito <span>{cart.length}</span>
          </button>
          <button className="button button-small" onClick={() => setQuoteOpen(true)}>Cotizar ahora</button>
          <Link className="account-link" href={profile ? "/mi-cuenta" : "/login"}>{profile ? "Mi cuenta" : "Ingresar"}</Link>
        </div>
      </header>

      {isHome && <section className="hero" id="inicio">
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
            <Link className="button button-ghost" href="/tienda">Explorar tienda</Link>
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
        </div>
      </section>}

      {isHome && <section className="metrics" aria-label="Ventajas del taller">
        <div><strong>16 años</strong><span>de experiencia</span></div>
        <div><strong>Atención</strong><span>clara y profesional</span></div>
        <div><strong>Técnicos</strong><span>especializados</span></div>
        <div><strong>Calidad</strong><span>garantizada</span></div>
      </section>}

      {isHome && <section className="section home-directory">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Todo Jamiro</p><h2>Elegí tu próxima parada.</h2></div>
          <p>Cada área tiene ahora su propio espacio para que encontrés lo que necesitás sin recorrer una página interminable.</p>
        </div>
        <div className="directory-grid">
          <Link href="/registro"><span>01</span><h3>Club Jamiro</h3><p>Creá tu tarjeta, consultá puntos y compartí códigos de referido.</p><b>Ir a Registro →</b></Link>
          <Link href="/servicios"><span>02</span><h3>Servicios</h3><p>Conocé el proceso y las soluciones disponibles para tu vehículo.</p><b>Ver servicios →</b></Link>
          <Link href="/tienda"><span>03</span><h3>Tienda</h3><p>Explorá productos y servicios listos para agregar a tu pedido.</p><b>Entrar a la tienda →</b></Link>
          <Link href="/nosotros"><span>04</span><h3>Nosotros</h3><p>Conocé la experiencia que respalda cada trabajo.</p><b>Conocer Jamiro →</b></Link>
          <Link href="/contacto"><span>05</span><h3>Contacto</h3><p>Cotizá, escribinos por WhatsApp o encontrá el taller.</p><b>Hablemos →</b></Link>
        </div>
      </section>}

      {isRegistration && <section className="section loyalty page-section" id="registro">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Club Jamiro</p>
            <h2>Cada visita mueve tu recompensa.</h2>
          </div>
          <p>Registrate gratis, acumulá puntos por tus compras y servicios, e invitá personas para construir una red que también te premie.</p>
        </div>

        <div className="loyalty-layout">
          <div className="registration-panel">
            {!profile ? (
              <>
                <div className="panel-title">
                  <span>01</span>
                  <div><small>Registro gratuito</small><h3>Creá tu cuenta</h3></div>
                </div>
                <form className="registration-form" onSubmit={registerCustomer}>
                  <label>Nombre completo<input name="name" required placeholder="Ej. Carlos Sánchez" /></label>
                  <label>Correo electrónico<input name="email" type="email" required placeholder="correo@ejemplo.com" /></label>
                  <label>WhatsApp<input name="phone" type="tel" required placeholder="+506 8888-8888" /></label>
                  <label>
                    Contraseña
                    <div className="password-field">
                      <input
                        name="password"
                        type={showRegisterPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowRegisterPassword((visible) => !visible)}
                        aria-label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={showRegisterPassword}
                      >
                        {showRegisterPassword ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.1 9 5.1a15 15 0 01-3.1 3.6M6.2 6.2C4.2 7.5 3 9.1 3 9.1S6.5 15 12 15c1 0 2-.2 2.9-.5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>
                  <label>Código de referido <small>Opcional</small><input name="referral" placeholder="Ej. JAMIRO-A7K29Q" /></label>
                  <label className="terms-check"><input type="checkbox" required /><span>Acepto los términos del programa de fidelización.</span></label>
                  {authError && <p className="inline-error">{authError}</p>}
                  <button className="button" type="submit" disabled={authLoading}>{authLoading ? "Creando cuenta..." : "Crear mi tarjeta →"}</button>
                </form>
              </>
            ) : (
              <div className="registration-success">
                <span>✓</span>
                <p className="eyebrow">Cuenta activa</p>
                <h3>¡Bienvenido al Club Jamiro!</h3>
                <p>Tu tarjeta digital ya está vinculada de forma segura a tu correo y WhatsApp.</p>
                <button className="button" type="button" onClick={logoutCustomer}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <article className="loyalty-card" aria-label="Vista previa de tarjeta digital">
            <div className="card-top">
              <img src="/logo-jamiro.png" alt="" />
              <div><small>Cliente frecuente</small><strong>Club Jamiro</strong></div>
              <span>ACTIVA</span>
            </div>
            <div className="customer-data">
              <small>Cliente</small>
              <h3>{profile ? profile.name : "Tu nombre aparecerá aquí"}</h3>
              <p>ID {profile?.customerId || "JAM-2026-0000"}</p>
            </div>
            <div className="points-total"><small>Puntos disponibles</small><strong>{totalPoints}</strong><span>pts</span></div>
            <div className="points-split">
              <div><small>Por compras y servicios</small><strong>{profile?.purchasePoints || 0} pts</strong></div>
              <div><small>Por referidos</small><strong>{profile?.referralPoints || 0} pts</strong></div>
            </div>
            <div className="referral-generator">
              <div>
                <small>Tu código de referido</small>
                <strong>{referralCode || "Generá uno cuando lo necesités"}</strong>
                {referralCode && <span>Vence {new Date(referralExpiry).toLocaleDateString("es-CR")} · Un solo uso</span>}
              </div>
              {!referralCode ? (
                <button onClick={generateReferralCode} disabled={!profile}>{profile ? "Generar código" : "Registrate primero"}</button>
              ) : (
                <div className="referral-actions">
                  <button onClick={copyReferralCode}>{copied ? "Copiado ✓" : "Copiar"}</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Registrate en el Club Jamiro con mi código ${referralCode}. Vence en 3 días.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button onClick={generateReferralCode}>Nuevo</button>
                </div>
              )}
            </div>
            <p className="demo-note">Cada ₡100 pagados y confirmados equivalen a 1 punto.</p>
          </article>
        </div>

        <div className="benefit-strip">
          <div><span>01</span><strong>Comprá o recibí un servicio</strong><p>Sumás puntos personales por cada transacción confirmada.</p></div>
          <div><span>02</span><strong>Invitá con un código</strong><p>Cada código es único, vence en tres días y funciona una sola vez.</p></div>
          <div><span>03</span><strong>Tu red también suma</strong><p>Ganás puntos cuando tus referidos compran o visitan el taller.</p></div>
        </div>
      </section>}

      {isLogin && <section className="section auth-page page-section">
        <div className="auth-copy">
          <p className="eyebrow"><span /> Acceso Club Jamiro</p>
          <h2>Tu vehículo, tus puntos y tu historial en un solo lugar.</h2>
          <p>Ingresá de forma segura para consultar tu tarjeta digital, tus puntos y la actividad registrada por el taller.</p>
          <div className="auth-features">
            <span>✓ Tarjeta digital</span>
            <span>✓ Recompensas</span>
            <span>✓ Historial de servicios</span>
          </div>
        </div>
        <div className="auth-panel">
          <div className="panel-title"><span>→</span><div><small>Cliente registrado</small><h3>Ingresar</h3></div></div>
          <form className="registration-form single-column" onSubmit={loginCustomer}>
            <label>Correo electrónico<input name="email" type="email" required placeholder="correo@ejemplo.com" /></label>
            <label>
              Contraseña
              <div className="password-field">
                <input
                  name="password"
                  type={showLoginPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
                <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowLoginPassword((visible) => !visible)}
                              aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              aria-pressed={showLoginPassword}
                            >
                              {showLoginPassword ? (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.1 9 5.1a15 15 0 01-3.1 3.6M6.2 6.2C4.2 7.5 3 9.1 3 9.1S6.5 15 12 15c1 0 2-.2 2.9-.5" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                                  <circle cx="12" cy="12" r="2.5" />
                                </svg>
                              )}
                            </button>
              </div>
            </label>
            {authError && <p className="inline-error">{authError}</p>}
            <button className="button" type="submit" disabled={authLoading}>{authLoading ? "Ingresando..." : "Ingresar a mi cuenta →"}</button>
          </form>
          {authMessage && <div className="inline-success">{authMessage}<Link href="/mi-cuenta">Abrir mi cuenta →</Link></div>}
          <p className="auth-switch">¿Todavía no sos parte? <Link href="/registro">Crear cuenta gratis</Link></p>
        </div>
      </section>}

      {isAccount && <section className="section account-page page-section">
        {!profile ? (
          <div className="account-empty">
            <p className="eyebrow"><span /> Club Jamiro</p>
            <h2>{sessionLoading ? "Cargando tu cuenta..." : "Primero ingresá a tu cuenta."}</h2>
            <p>{sessionLoading ? "Estamos recuperando tu tarjeta digital." : "Así podremos mostrar tu tarjeta, tus puntos y tu historial."}</p>
            <div><Link className="button" href="/login">Ingresar →</Link><Link className="button button-ghost" href="/registro">Registrarme</Link></div>
          </div>
        ) : (
          <>
            <div className="account-heading">
              <div><p className="eyebrow"><span /> Mi cuenta</p><h2>Hola, {profile.name.split(" ")[0]}.</h2><p>Todo lo importante de tu relación con Jamiro, sin papeles ni vueltas.</p></div>
              <button className="text-button" onClick={logoutCustomer}>Cerrar sesión</button>
            </div>
            <div className="account-grid">
              <article className="loyalty-card account-card">
                <div className="card-top"><img src="/logo-jamiro.png" alt="" /><div><small>Cliente frecuente</small><strong>Club Jamiro</strong></div><span>ACTIVA</span></div>
                <div className="customer-data"><small>Cliente</small><h3>{profile.name}</h3><p>ID {profile.customerId}</p></div>
                <div className="points-total"><small>Saldo total</small><strong>{totalPoints}</strong><span>pts</span></div>
                <div className="points-split"><div><small>Compras y servicios</small><strong>{profile.purchasePoints} pts</strong></div><div><small>Red de referidos</small><strong>{profile.referralPoints} pts</strong></div></div>
              </article>
              <div className="account-summary">
                <article><small>Referidos activos</small><strong>{profile.referrals}</strong><p>Personas registradas con tus códigos.</p></article>
                <article><small>Próxima recompensa</small><strong>{Math.max(0, 850 - totalPoints)} pts</strong><p>Para desbloquear Pre-DEKRA completo.</p></article>
                <article><small>Última visita</small><strong>18 JUL</strong><p>Cambio de aceite premium.</p></article>
              </div>
            </div>

            <div className="account-section">
              <div className="subheading"><div><p className="eyebrow"><span /> Beneficios</p><h3>Recompensas disponibles</h3></div><p>Los puntos se descuentan únicamente cuando el beneficio es confirmado por el taller.</p></div>
              <div className="reward-grid">{rewards.map((reward) => {
                const unlocked = totalPoints >= reward.points;
                return <article className={unlocked ? "reward-card unlocked" : "reward-card"} key={reward.title}><span>{reward.points} pts</span><h4>{reward.title}</h4><p>{reward.detail}</p><button disabled={!unlocked}>{unlocked ? "Canjear beneficio" : `Te faltan ${reward.points - totalPoints} pts`}</button></article>;
              })}</div>
            </div>

            <div className="account-columns">
              <div className="account-section referral-center">
                <p className="eyebrow"><span /> Crecé tu red</p><h3>Invitar a alguien</h3><p>El código vence en tres días y solo puede utilizarse una vez. Podés generar otro cuando el anterior expire o sea utilizado.</p>
                <div className="referral-generator">
                  <div><small>Código activo</small><strong>{referralCode || "Sin código activo"}</strong>{referralCode && <span>Vence {new Date(referralExpiry).toLocaleDateString("es-CR")}</span>}</div>
                  {!referralCode ? <button onClick={generateReferralCode}>Generar código</button> : <div className="referral-actions"><button onClick={copyReferralCode}>{copied ? "Copiado ✓" : "Copiar"}</button><a href={`https://wa.me/?text=${encodeURIComponent(`Registrate en el Club Jamiro con mi código ${referralCode}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a></div>}
                </div>
              </div>
              <div className="account-section">
                <p className="eyebrow"><span /> Actividad</p><h3>Historial reciente</h3>
                <div className="history-list">
                  {movements.length ? movements.map((movement) => (
                    <div key={movement.id}>
                      <span>{new Date(movement.created_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" }).toUpperCase()}</span>
                      <p><strong>{movement.description}</strong><small>{movement.points >= 0 ? "+" : ""}{movement.points} pts</small></p>
                    </div>
                  )) : <p className="empty-history">Tus movimientos aparecerán aquí cuando el taller confirme una compra, servicio o ajuste.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </section>}

      {isServices && <section className="section services page-section" id="servicios">
        <div className="process-inside">
          <div className="section-heading centered">
            <div><p className="eyebrow"><span /> Cómo funciona</p><h2>Así de fácil cuidamos tu vehículo.</h2></div>
          </div>
          <div className="process-grid">
            {[
              ["01", "Elegí", "Seleccioná un servicio, producto o enviá los síntomas del vehículo."],
              ["02", "Cotizá", "Recibí una propuesta clara antes de aprobar cualquier trabajo."],
              ["03", "Agendá", "Coordiná retiro, entrega o instalación según lo que necesités."],
              ["04", "Sumá puntos", "Con cada compra o servicio confirmado crece tu saldo Jamiro."],
            ].map(([number, title, text]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
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
      </section>}

      {isShop && <section className="section shop page-section" id="tienda">
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
      </section>}

      {isAbout && <section className="section about page-section" id="nosotros">
        <div className="about-copy">
          <p className="eyebrow"><span /> Taller Automotriz Jamiro</p>
          <h2>16 años haciendo que la confianza vuelva a la carretera.</h2>
          <p>Experiencia real en electromecánica, mecánica general y mantenimiento automotriz, con atención clara antes, durante y después de cada trabajo.</p>
          <a className="button button-ghost" href="https://www.facebook.com/profile.php?id=100078892144883" target="_blank" rel="noreferrer">Conocenos en Facebook →</a>
        </div>
        <div className="about-stat"><strong>16</strong><span>años de experiencia</span><small>San Carlos, Costa Rica</small></div>
      </section>}

      {isContact && <section className="cta-section page-section" id="contacto">
        <div>
          <p className="eyebrow"><span /> Estamos listos</p>
          <h2>Tu próximo viaje empieza con un vehículo en buenas manos.</h2>
          <div className="contact-details">
            <a href="https://wa.me/50670111090" target="_blank" rel="noreferrer">WhatsApp: +506 7011-1090</a>
            <a href="mailto:automotrizjamirosc@gmail.com">automotrizjamirosc@gmail.com</a>
            <span>150 m del Súper San Juan, San Carlos</span>
          </div>
        </div>
        <a className="button" href="https://wa.me/50670111090" target="_blank" rel="noreferrer">Escribir por WhatsApp →</a>
      </section>}

      <footer>
        <div className="brand footer-brand"><img src="/logo-jamiro.png" alt="" /><span><strong>Taller Automotriz</strong>Jamiro</span></div>
        <div className="footer-contact" aria-label="Información de contacto">
          <p><strong>Teléfono y WhatsApp</strong>+506 7011-1090</p>
          <p><strong>Correo</strong>automotrizjamirosc@gmail.com</p>
          <p><strong>Ubicación</strong>150 m del Súper San Juan, San Carlos</p>
        </div>
        <p className="footer-copyright">© 2026 Taller Automotriz Jamiro</p>
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
            ) : <div className="empty-cart"><span>◇</span><h3>Tu carrito está vacío</h3><p>Explorá los servicios y productos disponibles.</p><button className="button button-ghost" onClick={() => setCartOpen(false)}>Seguir explorando</button></div>}
          </aside>
        </div>
      )}
    </main>
  );
}
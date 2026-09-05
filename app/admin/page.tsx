"use client";


import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import styles from "./admin.module.css";
import AdminWorkshopModule from "./AdminWorkshopModule";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const ADMIN_TOKEN_KEY = "jamiro_admin_token";

type Admin = {
  id: string;
  name: string;
  email: string;
};

type Customer = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  purchasePoints: number;
  referralPoints: number;
  totalPoints: number;
  referralCount?: number;
  createdAt?: string;
};

function adminHeaders(json = false): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function colones(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StaffPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [awardLoading, setAwardLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeModule, setActiveModule] = useState<"points" | "workshop" | "customers">("points");

  const pointsPreview = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed / 100) : 0;
  }, [amount]);

  const filteredCustomers = useMemo(() => {
    const query = customerFilter.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((item) =>
      [item.name, item.email, item.phone, item.customerId]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [customerFilter, customers]);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin-portal/customers`, {
        cache: "no-store",
        headers: adminHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar la lista de clientes.");
      setCustomers(result.customers || []);
    } catch (customersError) {
      setError(customersError instanceof Error ? customersError.message : "No se pudo cargar la lista de clientes.");
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        setSessionLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/admin-portal/me`, {
          cache: "no-store",
          headers: adminHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "La sesiÃ³n no es vÃ¡lida.");
        setAdmin(result.admin);
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } finally {
        setSessionLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoginLoading(true);
    setError("");
    setMessage("");
    const data = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/api/admin-portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar sesiÃ³n.");

      localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      setAdmin(result.admin);
      form.reset();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesiÃ³n.");
    } finally {
      setLoginLoading(false);
    }
  };

  const searchCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchLoading(true);
    setError("");
    setMessage("");
    setCustomer(null);
    setSearchResults([]);
    const data = new FormData(event.currentTarget);
    const query = String(data.get("query") || "").trim();

    try {
      const response = await fetch(
        `${API_URL}/api/staff/customers/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store", headers: adminHeaders() },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se encontrÃ³ el cliente.");

      const customers: Customer[] = result.customers || [];
      if (customers.length === 1) {
        setCustomer(customers[0]);
      } else {
        setSearchResults(customers);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se encontrÃ³ el cliente.");
    } finally {
      setSearchLoading(false);
    }
  };

  const awardPoints = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer) return;

    setAwardLoading(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/api/staff/points`, {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({
          customerId: customer.id,
          amountColones: data.get("amountColones"),
          invoiceNumber: data.get("invoiceNumber"),
          description: data.get("description"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron acreditar los puntos.");

      setCustomer(result.customer);
      setAmount("");
      form.reset();
      setMessage(
        result.notifications?.emailSent
          ? `Listo: se agregaron ${result.points} puntos y el cliente recibiÃ³ el correo.`
          : `Se agregaron ${result.points} puntos. El correo no pudo enviarse; los puntos sÃ­ quedaron guardados.`,
      );
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : "No se pudieron acreditar los puntos.");
    } finally {
      setAwardLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
    setCustomer(null);
    setSearchResults([]);
    setError("");
    setMessage("");
  };

  if (sessionLoading) {
    return <main className={styles.shell}><p className={styles.loading}>Validando accesoâ€¦</p></main>;
  }

  if (!admin) {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard}>
          <Link href="/" className={styles.brand}>
            <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
            <span>Panel administrativo</span>
          </Link>
          <p className={styles.kicker}>Acceso privado</p>
          <h1>Admin Jamiro</h1>
          <p className={styles.intro}>IngresÃ¡ con la cuenta administrativa de Jairo.</p>
          <form onSubmit={login} className={styles.form}>
            <label>Correo del administrador<input name="email" type="email" autoComplete="username" defaultValue="automotrizjamirosc@gmail.com" required /></label>
            <label>
              ContraseÃ±a
              <span style={{ position: "relative", display: "block" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: "3.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "0.85rem",
                    width: "2.25rem",
                    height: "2.25rem",
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "currentColor",
                    display: "grid",
                    placeItems: "center",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9.5 5.2 9.5 8a8.8 8.8 0 01-2.1 3.8M6.2 6.2C3.8 7.8 2.5 10.2 2.5 12c0 2.8 4 8 9.5 8 1.4 0 2.7-.3 3.8-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2.5 12c0-2.8 4-8 9.5-8s9.5 5.2 9.5 8-4 8-9.5 8-9.5-5.2-9.5-8z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button disabled={loginLoading}>{loginLoading ? "Ingresandoâ€¦" : "Ingresar"}</button>
          </form>
          <Link href="/" className={styles.back}>â† Volver al sitio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
          <span>Panel administrativo</span>
        </Link>
        <div className={styles.session}>
          <span><small>SesiÃ³n administrativa</small>{admin.name}</span>
          <button type="button" onClick={logout}>Cerrar sesiÃ³n</button>
        </div>
      </header>

      <nav className={styles.moduleNav} aria-label="MÃ³dulos del portal">
        <button className={activeModule === "points" ? styles.moduleActive : ""} onClick={() => setActiveModule("points")}>Acreditar puntos</button>
        <button className={activeModule === "workshop" ? styles.moduleActive : ""} onClick={() => setActiveModule("workshop")}>Procesos del taller</button>
        <button
          className={activeModule === "customers" ? styles.moduleActive : ""}
          onClick={() => {
            setActiveModule("customers");
            if (customers.length === 0) void loadCustomers();
          }}
        >
          Clientes registrados
        </button>
      </nav>

      {activeModule === "points" ? <section className={styles.content}>
        <div className={styles.heading}>
          <p className={styles.kicker}>Club Jamiro</p>
          <h1>Acreditar puntos</h1>
          <p>BuscÃ¡ al cliente por nombre, correo o telÃ©fono, verificÃ¡ sus datos y registrÃ¡ el monto pagado.</p>
        </div>

        <section className={styles.panel}>
          <div className={styles.step}><span>01</span><div><small>Localizar cuenta</small><h2>Buscar cliente</h2></div></div>
          <form onSubmit={searchCustomer} className={styles.searchForm}>
            <label>
              Nombre, correo o telÃ©fono
              <input
                name="query"
                type="search"
                minLength={2}
                maxLength={120}
                placeholder="Ej. MarÃ­a, cliente@correo.com o 8888-8888"
                required
              />
            </label>
            <button disabled={searchLoading}>{searchLoading ? "Buscandoâ€¦" : "Buscar cliente"}</button>
          </form>
        </section>

        {searchResults.length > 1 && (
          <section className={styles.resultsPanel} aria-labelledby="search-results-title">
            <div>
              <p className={styles.kicker}>Coincidencias encontradas</p>
              <h2 id="search-results-title">ElegÃ­ el cliente correcto</h2>
              <p>Encontramos {searchResults.length} cuentas. VerificÃ¡ el correo y el telÃ©fono antes de continuar.</p>
            </div>
            <div className={styles.resultsList}>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className={styles.resultButton}
                  onClick={() => {
                    setCustomer(result);
                    setSearchResults([]);
                    setError("");
                    setMessage("");
                  }}
                >
                  <strong>{result.name}</strong>
                  <span>{result.email}</span>
                  <span>{result.phone}</span>
                  <small>{result.customerId}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}

        {customer && (
          <div className={styles.grid}>
            <section className={styles.customerCard}>
              <p className={styles.kicker}>Cliente encontrado</p>
              <h2>{customer.name}</h2>
              <dl>
                <div><dt>CÃ³digo</dt><dd>{customer.customerId}</dd></div>
                <div><dt>Correo</dt><dd>{customer.email}</dd></div>
                <div><dt>WhatsApp</dt><dd>{customer.phone}</dd></div>
              </dl>
              <div className={styles.balances}>
                <article><small>Puntos por compras</small><strong>{customer.purchasePoints}</strong></article>
                <article><small>Puntos totales</small><strong>{customer.totalPoints}</strong></article>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.step}><span>02</span><div><small>Registrar pago</small><h2>Sumar puntos</h2></div></div>
              <form onSubmit={awardPoints} className={styles.form}>
                <label>Monto pagado en colones
                  <input
                    name="amountColones"
                    type="number"
                    min="100"
                    max="100000000"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Ej. 25000"
                    required
                  />
                </label>
                <div className={styles.preview}>
                  <span>{amount ? colones(Number(amount)) : "â‚¡0"}</span>
                  <strong>+{pointsPreview} puntos</strong>
                </div>
                <label>NÃºmero de factura <small>(opcional)</small><input name="invoiceNumber" maxLength={100} placeholder="Ej. FAC-1048" /></label>
                <label>DescripciÃ³n<input name="description" defaultValue="Compra o servicio confirmado" minLength={3} maxLength={200} required /></label>
                <button disabled={awardLoading || pointsPreview <= 0}>
                  {awardLoading ? "Guardandoâ€¦" : `Confirmar +${pointsPreview} puntos`}
                </button>
              </form>
            </section>
          </div>
        )}
      </section> : activeModule === "workshop" ? <AdminWorkshopModule /> : (
        <section className={styles.content}>
          <div className={styles.customersHeading}>
            <div className={styles.heading}>
              <p className={styles.kicker}>Club Jamiro</p>
              <h1>Clientes registrados</h1>
              <p>ConsultÃ¡ las cuentas creadas, sus datos de contacto y el saldo actual de puntos.</p>
            </div>
            <div className={styles.customerTotal}>
              <small>Total registrado</small>
              <strong>{customers.length}</strong>
            </div>
          </div>

          <section className={styles.panel}>
            <div className={styles.customerTools}>
              <label>
                Buscar en la lista
                <input
                  type="search"
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                  placeholder="Nombre, correo, telÃ©fono o cÃ³digo"
                />
              </label>
              <button type="button" onClick={loadCustomers} disabled={customersLoading}>
                {customersLoading ? "Actualizandoâ€¦" : "Actualizar lista"}
              </button>
            </div>
          </section>

          {error && <p className={styles.error} role="alert">{error}</p>}

          {!customersLoading && !error && filteredCustomers.length === 0 && (
            <p className={styles.emptyState}>
              {customers.length === 0 ? "TodavÃ­a no hay clientes registrados." : "No hay clientes que coincidan con la bÃºsqueda."}
            </p>
          )}

          {filteredCustomers.length > 0 && (
            <div className={styles.customersTableWrap}>
              <table className={styles.customersTable}>
                <thead><tr><th>Cliente</th><th>Contacto</th><th>CÃ³digo</th><th>Puntos</th><th>Referidos</th><th>Registro</th></tr></thead>
                <tbody>
                  {filteredCustomers.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Cliente"><strong>{item.name}</strong></td>
                      <td data-label="Contacto"><a href={`mailto:${item.email}`}>{item.email}</a><span>{item.phone}</span></td>
                      <td data-label="CÃ³digo"><code>{item.customerId}</code></td>
                      <td data-label="Puntos"><strong className={styles.pointsValue}>{item.totalPoints}</strong><small>{item.purchasePoints} compras Â· {item.referralPoints} referidos</small></td>
                      <td data-label="Referidos">{item.referralCount || 0}</td>
                      <td data-label="Registro">{item.createdAt ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(item.createdAt)) : "â€”"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}


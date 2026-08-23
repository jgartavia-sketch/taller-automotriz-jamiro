"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import styles from "./staff.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const STAFF_TOKEN_KEY = "jamiro_staff_token";

type Staff = {
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
};

function staffHeaders(json = false): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem(STAFF_TOKEN_KEY);
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
  const [staff, setStaff] = useState<Staff | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [awardLoading, setAwardLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const pointsPreview = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed / 100) : 0;
  }, [amount]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(STAFF_TOKEN_KEY);
      if (!token) {
        setSessionLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/staff/me`, {
          cache: "no-store",
          headers: staffHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "La sesión no es válida.");
        setStaff(result.staff);
      } catch {
        localStorage.removeItem(STAFF_TOKEN_KEY);
      } finally {
        setSessionLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_URL}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar sesión.");

      localStorage.setItem(STAFF_TOKEN_KEY, result.token);
      setStaff(result.staff);
      event.currentTarget.reset();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
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
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();

    try {
      const response = await fetch(
        `${API_URL}/api/staff/customers/search?email=${encodeURIComponent(email)}`,
        { cache: "no-store", headers: staffHeaders() },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se encontró el cliente.");
      setCustomer(result.customer);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se encontró el cliente.");
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
        headers: staffHeaders(true),
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
          ? `Listo: se agregaron ${result.points} puntos y el cliente recibió el correo.`
          : `Se agregaron ${result.points} puntos. El correo no pudo enviarse; los puntos sí quedaron guardados.`,
      );
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : "No se pudieron acreditar los puntos.");
    } finally {
      setAwardLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setStaff(null);
    setCustomer(null);
    setError("");
    setMessage("");
  };

  if (sessionLoading) {
    return <main className={styles.shell}><p className={styles.loading}>Validando acceso…</p></main>;
  }

  if (!staff) {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard}>
          <Link href="/" className={styles.brand}>
            <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
            <span>Portal del personal</span>
          </Link>
          <p className={styles.kicker}>Acceso privado</p>
          <h1>Staff Jamiro</h1>
          <p className={styles.intro}>Ingresá con la cuenta individual asignada por el taller.</p>
          <form onSubmit={login} className={styles.form}>
            <label>Correo del empleado<input name="email" type="email" autoComplete="username" required /></label>
            <label>
              Contraseña
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
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
            <button disabled={loginLoading}>{loginLoading ? "Ingresando…" : "Ingresar"}</button>
          </form>
          <Link href="/" className={styles.back}>← Volver al sitio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <img src="/logo-jamiro.png" alt="Taller Automotriz Jamiro" />
          <span>Portal del personal</span>
        </Link>
        <div className={styles.session}>
          <span><small>Sesión activa</small>{staff.name}</span>
          <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.heading}>
          <p className={styles.kicker}>Club Jamiro</p>
          <h1>Acreditar puntos</h1>
          <p>Buscá al cliente por correo, verificá sus datos y registrá el monto pagado.</p>
        </div>

        <section className={styles.panel}>
          <div className={styles.step}><span>01</span><div><small>Localizar cuenta</small><h2>Buscar cliente</h2></div></div>
          <form onSubmit={searchCustomer} className={styles.searchForm}>
            <label>Correo exacto del cliente<input name="email" type="email" placeholder="cliente@correo.com" required /></label>
            <button disabled={searchLoading}>{searchLoading ? "Buscando…" : "Buscar cliente"}</button>
          </form>
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}

        {customer && (
          <div className={styles.grid}>
            <section className={styles.customerCard}>
              <p className={styles.kicker}>Cliente encontrado</p>
              <h2>{customer.name}</h2>
              <dl>
                <div><dt>Código</dt><dd>{customer.customerId}</dd></div>
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
                  <span>{amount ? colones(Number(amount)) : "₡0"}</span>
                  <strong>+{pointsPreview} puntos</strong>
                </div>
                <label>Número de factura <small>(opcional)</small><input name="invoiceNumber" maxLength={100} placeholder="Ej. FAC-1048" /></label>
                <label>Descripción<input name="description" defaultValue="Compra o servicio confirmado" minLength={3} maxLength={200} required /></label>
                <button disabled={awardLoading || pointsPreview <= 0}>
                  {awardLoading ? "Guardando…" : `Confirmar +${pointsPreview} puntos`}
                </button>
              </form>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
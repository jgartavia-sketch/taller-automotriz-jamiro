"use client";

import { useState, type FormEvent } from "react";
import registrationStyles from "./customer-registration.module.css";
import { PASSWORD_REQUIREMENTS, PASSWORD_PATTERN, validateNewPassword } from "./password-policy";
import styles from "./staff/staff.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
type Customer = { id: string; customerId: string; name: string; email: string; phone: string };

export default function CustomerRegistration({ tokenKey }: { tokenKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [results, setResults] = useState<Customer[]>([]);
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(tokenKey) || ""}` });

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const passwordError = validateNewPassword(String(data.get("password") || ""), String(data.get("confirmPassword") || ""));
    if (passwordError) { setError(passwordError); return; }
    setLoading(true); setError(""); setCustomer(null);
    try {
      const response = await fetch(`${API_URL}/api/staff/customers`, {
        method: "POST", headers: headers(),
        body: JSON.stringify(Object.fromEntries(["name", "email", "phone", "password", "confirmPassword"].map((key) => [key, data.get(key)]))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar al cliente.");
      setCustomer(result.customer); form.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "No hay conexión con el servidor."); }
    finally { setLoading(false); }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResults([]); setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/staff/customers/search?q=${encodeURIComponent(String(data.get("query") || ""))}`, { headers: headers(), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo buscar al cliente.");
      setResults(result.customers || []);
    } catch (e) { setError(e instanceof Error ? e.message : "No hay conexión con el servidor."); }
    finally { setLoading(false); }
  }

  return <section className={styles.content}>
    <div className={styles.heading}><h1>Registrar clientes</h1><p>Verificá primero si la persona ya tiene una cuenta.</p></div>
    <section className={styles.panel}><h2>Buscar una cuenta existente</h2><form className={styles.searchForm} onSubmit={search}><label>Nombre, correo o teléfono<input name="query" minLength={2} maxLength={120} required /></label><button disabled={loading}>Buscar</button></form>
      {results.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.email} · {item.phone} · {item.customerId}</p>)}
    </section>
    <section className={styles.panel}><h2>Nueva cuenta</h2><p>La persona debe elegir su contraseña. No la guardés ni la compartás.</p><form className={styles.form} onSubmit={register} autoComplete="off">
      <label>Nombre completo<input name="name" minLength={3} maxLength={100} required /></label>
      <label>Correo electrónico<input name="email" type="email" maxLength={254} required /></label>
      <label>WhatsApp<input name="phone" type="tel" minLength={8} maxLength={30} required /></label>
      <label>Contraseña elegida por el cliente<input name="password" type="password" autoComplete="new-password" pattern={PASSWORD_PATTERN} title={PASSWORD_REQUIREMENTS} aria-describedby="staff-password-help" minLength={8} maxLength={72} required /></label>
      <p id="staff-password-help">{PASSWORD_REQUIREMENTS}</p>
      <label>Confirmar contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
      <label><span className={registrationStyles.consent}><input type="checkbox" required /> El cliente autoriza el registro de sus datos.</span></label>
      <button disabled={loading}>{loading ? "Procesando…" : "Crear cuenta de cliente"}</button>
    </form></section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {customer && <p className={styles.success} role="status">Cuenta creada: {customer.name} · {customer.customerId}. Ya puede ingresar en Mi cuenta con su correo y contraseña.</p>}
  </section>;
}

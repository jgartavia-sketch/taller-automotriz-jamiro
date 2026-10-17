"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./service-tracker.module.css";

const labels: Record<string, string> = { RECEIVED: "Vehículo recibido", DIAGNOSIS: "Diagnóstico", IN_PROGRESS: "En reparación", WAITING_PARTS: "Esperando repuestos", QUALITY_CHECK: "Control de calidad", READY: "Listo para entregar", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
type Photo = { id: string; dataUrl: string; caption?: string };
type Order = { id: string; orderCode: string; status: string; vehicle: { plate: string; brand: string; model: string }; photos?: Photo[]; updates?: { id: string; status: string; note: string; createdAt: string; photos: Photo[] }[] };

export default function ServiceTracker({ apiUrl, tokenKey }: { apiUrl: string; tokenKey: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${apiUrl}/api/workshop/customer/orders`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos cargar tus servicios.");
      setOrders(data.orders || []); setOpen(null); setDetail(null);
    } catch (e) { setError(e instanceof Error ? e.message : "No hay conexión con el servidor."); }
    finally { setLoading(false); }
  }, [apiUrl, tokenKey]);
  useEffect(() => { void load(); }, [load]);
  const toggle = async (order: Order) => {
    if (open === order.id) { setOpen(null); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`${apiUrl}/api/workshop/customer/orders/${order.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey) || ""}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos cargar el detalle.");
      setDetail(data.order); setOpen(order.id);
    } catch (e) { setError(e instanceof Error ? e.message : "No hay conexión con el servidor."); }
    finally { setLoading(false); }
  };
  const active = orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
  const history = orders.filter((order) => ["DELIVERED", "CANCELLED"].includes(order.status));
  function card(order: Order) {
    const expanded = open === order.id && detail?.id === order.id;
    return <article key={order.id} className={styles.card}>
      <button disabled={loading} aria-expanded={expanded} onClick={() => void toggle(order)}><span><small>{order.orderCode}</small><strong>{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</strong></span><b>{labels[order.status]}</b></button>
      {expanded && <div className={styles.body}>
        <div className={styles.gallery}>{detail.photos?.map((photo) => <img key={photo.id} src={photo.dataUrl} alt={photo.caption || "Foto de recepción"} />)}</div>
        <div className={styles.timeline}>{detail.updates?.map((update) => <div key={update.id}><small>{new Date(update.createdAt).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</small><h4>{labels[update.status]}</h4><p>{update.note}</p><div className={styles.gallery}>{update.photos.map((photo) => <img key={photo.id} src={photo.dataUrl} alt="Actualización del servicio" />)}</div></div>)}</div>
      </div>}
    </article>;
  }
  return <section className={styles.tracker}>
    <div className={styles.title}><p>Servicio activo</p><h3>Tu vehículo, paso a paso</h3><button disabled={loading} onClick={() => void load()}>{loading ? "Cargando…" : "Actualizar servicios"}</button></div>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !active.length && <p className={styles.empty}>Cuando tu vehículo ingrese al taller, el proceso aparecerá aquí.</p>}
    {active.map(card)}
    {!!history.length && <details className={styles.history}><summary>Historial de servicios ({history.length})</summary>{history.map(card)}</details>}
  </section>;
}

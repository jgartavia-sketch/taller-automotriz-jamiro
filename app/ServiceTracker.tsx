"use client";
import { useEffect, useState } from "react";
import styles from "./service-tracker.module.css";

const labels: Record<string, string> = { RECEIVED: "En línea de espera", DIAGNOSIS: "En revisión", IN_PROGRESS: "En reparación", WAITING_PARTS: "Esperando repuestos", QUALITY_CHECK: "En prueba", READY: "Listo para recoger", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
type Photo = { id: string; dataUrl: string; caption?: string };
type Order = { id: string; orderCode: string; status: string; vehicle: { plate: string; brand: string; model: string }; photos?: Photo[]; updates?: { id: string; status: string; note: string; createdAt: string; photos: Photo[] }[] };

export default function ServiceTracker({ apiUrl, tokenKey }: { apiUrl: string; tokenKey: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    let disposed = false;
    let first = true;
    const load = async () => {
      if (inFlight || disposed || document.visibilityState === "hidden") return;
      const token = localStorage.getItem(tokenKey);
      if (!token) return;
      inFlight = true;
      if (first) setLoading(true);
      try {
        const options = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" as const, signal: controller.signal };
        const response = await fetch(`${apiUrl}/api/workshop/customer/orders`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No pudimos cargar tus servicios.");
        if (disposed) return;
        setOrders(data.orders || []);
        if (open && (data.orders || []).some((order: Order) => order.id === open)) {
          const detailResponse = await fetch(`${apiUrl}/api/workshop/customer/orders/${open}`, options);
          const detailData = await detailResponse.json();
          if (!detailResponse.ok) throw new Error(detailData.error || "No pudimos cargar el detalle.");
          if (disposed) return;
          setDetail(detailData.order);
        } else {
          setDetail(null);
          if (open) setOpen(null);
        }
        setError("");
      } catch (e) {
        if (!disposed) setError(e instanceof Error ? e.message : "No hay conexión con el servidor.");
      } finally {
        inFlight = false;
        if (!disposed) { setLoading(false); first = false; }
      }
    };
    void load();
    const interval = window.setInterval(() => { void load(); }, 3000);
    const resume = () => { void load(); };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [apiUrl, tokenKey, open, refresh]);
  const toggle = (order: Order) => {
    setDetail(null);
    setOpen(open === order.id ? null : order.id);
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
    <div className={styles.title}><p>Servicio activo</p><h3>Tu vehículo, paso a paso</h3><p role="status">Actualización automática cada 3 segundos.</p><button disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{loading ? "Cargando…" : "Actualizar servicios"}</button></div>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !active.length && <p className={styles.empty}>Cuando tu vehículo ingrese al taller, el proceso aparecerá aquí.</p>}
    {active.map(card)}
    {!!history.length && <details className={styles.history}><summary>Historial de servicios ({history.length})</summary>{history.map(card)}</details>}
  </section>;
}

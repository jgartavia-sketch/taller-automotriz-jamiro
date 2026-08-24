"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./workshop.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "jamiro_staff_token";
const MAX_PHOTOS = 8;
const statusLabels: Record<string, string> = { RECEIVED: "Recibido", DIAGNOSIS: "Diagnóstico", IN_PROGRESS: "En reparación", WAITING_PARTS: "Esperando repuestos", QUALITY_CHECK: "Control de calidad", READY: "Listo para entregar", DELIVERED: "Entregado", CANCELLED: "Cancelado" };

type Customer = { id: string; customerId: string; name: string; email: string; phone: string };
type Photo = { id: string; dataUrl: string; caption?: string };
type Update = { id: string; status: string; note: string; createdAt: string; photos: Photo[]; createdByStaff: { name: string } };
type Order = { id: string; orderCode: string; status: string; mileage: number; fuelLevel: string; reason: string; visibleDamage?: string; receivedItems?: string; estimatedDelivery?: string; createdAt: string; customer: Customer; vehicle: { plate: string; brand: string; model: string; year: string; color: string }; photos: Photo[]; updates: Update[] };

function headers(json = false) {
  const token = localStorage.getItem(TOKEN_KEY);
  return { ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` };
}

async function compressFiles(files: File[]) {
  return Promise.all(files.slice(0, MAX_PHOTOS).map((file) => new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Solo podés agregar imágenes."));
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", .72));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos procesar una imagen.")); };
    image.src = url;
  })));
}

function CameraCapture({ files, onChange, required = false }: { files: File[]; onChange: (files: File[]) => void; required?: boolean }) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    onChange([...files, ...selected].slice(0, MAX_PHOTOS));
    event.target.value = "";
  };

  return <div className={styles.cameraField}>
    <div className={styles.cameraActions}>
      <label className={styles.phoneCameraButton}>Tomar foto<input type="file" accept="image/*" capture="environment" onChange={addFiles}/></label>
      <label className={styles.galleryButton}>Elegir de galería<input type="file" accept="image/*" multiple onChange={addFiles}/></label>
    </div>
    <p className={styles.photoCount}>{files.length} de {MAX_PHOTOS} fotos{required && files.length === 0 ? " · Necesitás al menos una" : ""}</p>
    {previews.length > 0 && <div className={styles.captureGrid}>{previews.map((preview, index) => <figure key={`${preview}-${index}`}><img src={preview} alt={`Foto capturada ${index + 1}`}/><button type="button" onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Eliminar foto ${index + 1}`}>×</button></figure>)}</div>}
  </div>;
}

export default function WorkshopModule() {
  const [view, setView] = useState<"active" | "receive" | "history">("active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [receptionPhotos, setReceptionPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = async () => {
    const response = await fetch(`${API_URL}/api/workshop/staff/orders`, { headers: headers(), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setOrders(result.orders || []);
  };
  useEffect(() => { loadOrders().catch((e) => setError(e.message || "No pudimos cargar los servicios.")); }, []);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${API_URL}/api/staff/customers/search?q=${encodeURIComponent(String(data.get("query") || ""))}`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) return setError(result.error);
    setCustomers(result.customers || []);
  };

  const receive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer) return setError("Primero elegí al cliente.");
    if (receptionPhotos.length === 0) return setError("Tomá o elegí al menos una foto de recepción.");
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true); setError(""); setMessage("");
    try {
      const photos = await compressFiles(receptionPhotos);
      const response = await fetch(`${API_URL}/api/workshop/staff/orders`, {
        method: "POST", headers: headers(true),
        body: JSON.stringify({ customerId: customer.id, plate: data.get("plate"), brand: data.get("brand"), model: data.get("model"), year: data.get("year"), color: data.get("color"), mileage: data.get("mileage"), fuelLevel: data.get("fuelLevel"), reason: data.get("reason"), visibleDamage: data.get("visibleDamage"), receivedItems: data.get("receivedItems"), estimatedDelivery: data.get("estimatedDelivery"), photos }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos recibir el vehículo.");
      form.reset(); setReceptionPhotos([]); setCustomer(null); setCustomers([]);
      setMessage(`Orden ${result.order.orderCode} creada correctamente.`);
      await loadOrders(); setSelected(result.order); setView("active");
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos recibir el vehículo."); }
    finally { setLoading(false); }
  };

  const update = async (event: FormEvent<HTMLFormElement>, updatePhotos: File[]) => {
    event.preventDefault();
    if (!selected) return false;
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true); setError(""); setMessage("");
    try {
      const photos = await compressFiles(updatePhotos);
      const response = await fetch(`${API_URL}/api/workshop/staff/orders/${selected.id}/updates`, { method: "POST", headers: headers(true), body: JSON.stringify({ status: data.get("status"), note: data.get("note"), photos }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos actualizar la orden.");
      setSelected(result.order); form.reset(); setMessage("Actualización publicada en el perfil del cliente.");
      await loadOrders();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos actualizar la orden."); return false; }
    finally { setLoading(false); }
  };

  const visibleOrders = orders.filter((order) => view === "history" ? ["DELIVERED", "CANCELLED"].includes(order.status) : !["DELIVERED", "CANCELLED"].includes(order.status));
  return <section className={styles.module}>
    <div className={styles.toolbar}><button type="button" onClick={() => { setView("active"); setSelected(null); }}>Servicios activos</button><button type="button" onClick={() => { setView("receive"); setSelected(null); }}>Recibir vehículo</button><button type="button" onClick={() => { setView("history"); setSelected(null); }}>Historial</button></div>
    {error && <p className={styles.error}>{error}</p>}{message && <p className={styles.success}>{message}</p>}
    {view === "receive" ? <div className={styles.receiveGrid}>
      <section className={styles.panel}><h2>1. Elegir cliente</h2><form onSubmit={search} className={styles.row}><input name="query" minLength={2} placeholder="Nombre, correo o teléfono" required/><button>Buscar</button></form><div className={styles.customerList}>{customers.map((item) => <button type="button" key={item.id} className={customer?.id === item.id ? styles.selected : ""} onClick={() => setCustomer(item)}><strong>{item.name}</strong><span>{item.email} · {item.phone}</span></button>)}</div></section>
      <section className={styles.panel}><h2>2. Datos de recepción</h2>{customer && <p>Cliente: <strong>{customer.name}</strong></p>}<form onSubmit={receive} className={styles.form}><div className={styles.two}><label>Placa<input name="plate" required/></label><label>Marca<input name="brand" required/></label><label>Modelo<input name="model" required/></label><label>Año<input name="year" inputMode="numeric" pattern="[0-9]{4}" required/></label><label>Color<input name="color" required/></label><label>Kilometraje<input name="mileage" type="number" inputMode="numeric" min="0" required/></label><label>Combustible<select name="fuelLevel" defaultValue="HALF"><option value="EMPTY">Vacío</option><option value="QUARTER">1/4</option><option value="HALF">1/2</option><option value="THREE_QUARTERS">3/4</option><option value="FULL">Lleno</option></select></label><label>Entrega estimada<input name="estimatedDelivery" type="date"/></label></div><label>Motivo de ingreso<textarea name="reason" required/></label><label>Daños visibles<textarea name="visibleDamage"/></label><label>Objetos recibidos<textarea name="receivedItems"/></label><div className={styles.photoLabel}><strong>Fotos de recepción</strong><small>Máximo 8</small></div><CameraCapture files={receptionPhotos} onChange={setReceptionPhotos} required/><button disabled={loading || !customer}>{loading ? "Guardando…" : "Recibir vehículo"}</button></form></section>
    </div> : selected ? <OrderDetail order={selected} onBack={() => setSelected(null)} onUpdate={update} loading={loading}/> : <div><div className={styles.heading}><h1>{view === "history" ? "Historial de servicios" : "Servicios activos"}</h1><span>{visibleOrders.length} órdenes</span></div><div className={styles.orderGrid}>{visibleOrders.map((order) => <button key={order.id} onClick={() => setSelected(order)} className={styles.orderCard}><small>{order.orderCode}</small><strong>{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</strong><span>{order.customer.name}</span><b>{statusLabels[order.status]}</b></button>)}</div></div>}
  </section>;
}

function OrderDetail({ order, onBack, onUpdate, loading }: { order: Order; onBack: () => void; onUpdate: (e: FormEvent<HTMLFormElement>, photos: File[]) => Promise<boolean>; loading: boolean }) {
  const [updatePhotos, setUpdatePhotos] = useState<File[]>([]);
  const submit = async (event: FormEvent<HTMLFormElement>) => { if (await onUpdate(event, updatePhotos)) setUpdatePhotos([]); };
  return <div className={styles.detail}><button className={styles.back} onClick={onBack}>← Volver</button><div className={styles.heading}><div><small>{order.orderCode}</small><h1>{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</h1><p>{order.customer.name} · {order.customer.phone}</p></div><b>{statusLabels[order.status]}</b></div><div className={styles.photoGrid}>{order.photos.map((photo) => <img key={photo.id} src={photo.dataUrl} alt={photo.caption || "Foto de recepción"}/>)}</div><section className={styles.timeline}>{order.updates.map((item) => <article key={item.id}><small>{new Date(item.createdAt).toLocaleString("es-CR")} · {item.createdByStaff.name}</small><h3>{statusLabels[item.status]}</h3><p>{item.note}</p><div className={styles.photoGrid}>{item.photos.map((photo) => <img key={photo.id} src={photo.dataUrl} alt="Actualización del servicio"/>)}</div></article>)}</section>{!["DELIVERED", "CANCELLED"].includes(order.status) && <form onSubmit={submit} className={`${styles.form} ${styles.panel}`}><h2>Nueva actualización</h2><label>Estado<select name="status" defaultValue={order.status}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Actualización para el cliente<textarea name="note" required minLength={3}/></label><div className={styles.photoLabel}><strong>Fotos</strong><small>Opcional, máximo 8</small></div><CameraCapture files={updatePhotos} onChange={setUpdatePhotos}/><button disabled={loading}>{loading ? "Publicando…" : "Publicar actualización"}</button></form>}</div>;
}
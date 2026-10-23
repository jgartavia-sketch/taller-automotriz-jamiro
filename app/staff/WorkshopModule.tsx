"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./workshop.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const MAX_PHOTOS = 8;
const statusLabels: Record<string, string> = { RECEIVED: "En línea de espera", DIAGNOSIS: "En revisión", IN_PROGRESS: "En reparación", WAITING_PARTS: "Esperando repuestos", QUALITY_CHECK: "En prueba", READY: "Listo para recoger", DELIVERED: "Entregado", CANCELLED: "Cancelado" };

type Customer = { id: string; customerId: string; name: string; email: string; phone: string };
type Photo = { id: string; dataUrl: string; caption?: string };
type Update = { id: string; status: string; note: string; createdAt: string; photos: Photo[]; createdByStaff: { name: string } };
type Order = { id: string; orderCode: string; status: string; mileage: number; fuelLevel: string; reason: string; visibleDamage?: string; receivedItems?: string; estimatedDelivery?: string; createdAt: string; customer: Customer; vehicle: { plate: string; brand: string; model: string; year: string; color: string }; photos: Photo[]; updates: Update[] };

function headers(tokenKey: string, json = false) {
  const token = localStorage.getItem(tokenKey);
  return { ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` };
}

async function compressFiles(files: File[]) {
  const photos: string[] = [];
  // Process one image at a time to avoid decoding eight large phone photos at once.
  for (const file of files.slice(0, MAX_PHOTOS)) {
    if (!file.type.startsWith("image/")) throw new Error("Solo podés agregar imágenes.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Cada foto debe pesar como máximo 20 MB. Elegí una imagen más pequeña.");
    photos.push(await new Promise<string>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) throw new Error("No pudimos preparar la foto. Intentá con otra imagen.");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const result = canvas.toDataURL("image/jpeg", .72);
          if (!result.startsWith("data:image/jpeg;") || result.length > 1_500_000) throw new Error("La foto sigue siendo demasiado grande. Elegí una imagen más pequeña.");
          resolve(result);
        } catch (error) { reject(error); }
        finally { URL.revokeObjectURL(url); }
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos procesar una imagen. Probá con una foto JPG o PNG.")); };
      image.src = url;
    }));
  }
  return photos;
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

export default function WorkshopModule({ tokenKey = "jamiro_staff_token" }: { tokenKey?: string }) {
  const [view, setView] = useState<"active" | "receive" | "history">("active");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [receptionPhotos, setReceptionPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error || message) {
      feedbackRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      feedbackRef.current?.focus({ preventScroll: true });
    }
  }, [error, message]);
  const feedback = <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
  </div>;

  const loadOrders = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/workshop/staff/orders?page=${page}&state=${view === "history" ? "history" : "active"}`, { headers: headers(tokenKey), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setOrders(result.orders || []);
    setHasMore(Boolean(result.hasMore));
  }, [page, view, tokenKey]);
  useEffect(() => { loadOrders().catch((e) => setError(e.message || "No pudimos cargar los servicios.")); }, [loadOrders]);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    setCustomers([]); setCustomer(null);
    try {
      const response = await fetch(`${API_URL}/api/staff/customers/search?q=${encodeURIComponent(String(data.get("query") || ""))}`, { headers: headers(tokenKey) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCustomers(result.customers || []);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos buscar al cliente."); }
  };

  const receive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setMessage("");
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement>(":invalid");
      setError(`Revisá el formulario: ${invalid?.closest("label")?.textContent?.trim() || "campos requeridos"}. ${invalid?.validationMessage || ""}`);
      return;
    }
    if (!customer) return setError("Primero elegí al cliente.");
    if (receptionPhotos.length === 0) return setError("Tomá o elegí al menos una foto de recepción.");
    const data = new FormData(form);
    setLoading(true); setError(""); setMessage("");
    try {
      const photos = await compressFiles(receptionPhotos);
      const response = await fetch(`${API_URL}/api/workshop/staff/orders`, {
        method: "POST", headers: headers(tokenKey, true), signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ customerId: customer.id, plate: data.get("plate"), brand: data.get("brand"), model: data.get("model"), year: data.get("year"), color: data.get("color"), mileage: data.get("mileage"), fuelLevel: data.get("fuelLevel"), reason: data.get("reason"), visibleDamage: data.get("visibleDamage"), receivedItems: data.get("receivedItems"), estimatedDelivery: data.get("estimatedDelivery"), photos }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const fields: Record<string, string> = { plate: "placa", brand: "marca", model: "modelo", year: "año", color: "color", mileage: "kilometraje", reason: "motivo de ingreso", photos: "fotos", estimatedDelivery: "entrega estimada" };
        const details = Array.isArray(result?.details) ? result.details.map((issue: { path?: string[] }) => fields[issue.path?.[0] || ""] || "datos del vehículo") : [];
        throw new Error(details.length ? `Revisá estos campos: ${[...new Set(details)].join(", ")}.` : result?.error || `No pudimos recibir el vehículo (HTTP ${response.status}).`);
      }
      if (!result?.order?.id || !result.order.orderCode) throw new Error("El servidor respondió sin una confirmación válida. Buscá la placa en Servicios activos antes de intentar registrar otra vez.");
      form.reset(); setReceptionPhotos([]); setCustomer(null); setCustomers([]);
      setSelected(result.order); setView("active");
      setMessage(`Vehículo ${result.order.vehicle.plate} registrado correctamente para ${result.order.customer.name}. Orden ${result.order.orderCode}.`);
      // The POST is already confirmed. A list refresh must not turn it into a failure.
      void loadOrders().catch(() => setMessage((text) => `${text} La orden está guardada, pero no se pudo actualizar la lista.`));
    } catch (e) {
      const uncertain = e instanceof TypeError || (e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name));
      setError(uncertain ? "No pudimos confirmar la respuesta del servidor. Buscá la placa en Servicios activos antes de volver a registrar, para evitar duplicados." : e instanceof Error ? e.message : "No pudimos recibir el vehículo.");
    }
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
      const response = await fetch(`${API_URL}/api/workshop/staff/orders/${selected.id}/updates`, { method: "POST", headers: headers(tokenKey, true), body: JSON.stringify({ status: data.get("status"), note: data.get("note"), photos }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos actualizar la orden.");
      setSelected(result.order); form.reset(); setMessage("Actualización publicada en el perfil del cliente.");
      void loadOrders().catch(() => setMessage("Actualización guardada. No se pudo refrescar la lista; volvé a Servicios activos."));
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos actualizar la orden."); return false; }
    finally { setLoading(false); }
  };

  const openOrder = async (id: string) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/workshop/staff/orders/${id}`, { headers: headers(tokenKey), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos cargar la orden.");
      setSelected(result.order);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos cargar la orden."); }
    finally { setLoading(false); }
  };
  const visibleOrders = orders.filter((order) => view === "history" ? ["DELIVERED", "CANCELLED"].includes(order.status) : !["DELIVERED", "CANCELLED"].includes(order.status));
  return <section className={styles.module}>
    <div className={styles.toolbar}><button type="button" onClick={() => { setView("active"); setPage(1); setSelected(null); }}>Servicios activos</button><button type="button" onClick={() => { setView("receive"); setSelected(null); }}>Recibir vehículo</button><button type="button" onClick={() => { setView("history"); setPage(1); setSelected(null); }}>Historial</button></div>
    {view !== "receive" && feedback}
    {view === "receive" ? <div className={styles.receiveGrid}>
      <section className={styles.panel}><h2>1. Elegir cliente</h2><form onSubmit={search} className={styles.row}><input name="query" minLength={2} placeholder="Nombre, correo o teléfono" required/><button>Buscar</button></form><div className={styles.customerList}>{customers.map((item) => <button type="button" key={item.id} className={customer?.id === item.id ? styles.selected : ""} onClick={() => setCustomer(item)}><strong>{item.name}</strong><span>{item.email} · {item.phone}</span></button>)}</div></section>
      <section className={styles.panel}><h2>2. Datos de recepción</h2>{customer && <p>Cliente: <strong>{customer.name}</strong></p>}<form onSubmit={receive} className={styles.form} noValidate><div className={styles.two}><label>Placa<input name="plate" minLength={2} maxLength={20} required/></label><label>Marca<input name="brand" minLength={2} maxLength={60} required/></label><label>Modelo<input name="model" maxLength={60} required/></label><label>Año<input name="year" inputMode="numeric" pattern="[0-9]{4}" required/></label><label>Color<input name="color" minLength={2} maxLength={40} required/></label><label>Kilometraje<input name="mileage" type="number" inputMode="numeric" min="0" required/></label><label>Combustible<select name="fuelLevel" defaultValue="HALF"><option value="EMPTY">Vacío</option><option value="QUARTER">1/4</option><option value="HALF">1/2</option><option value="THREE_QUARTERS">3/4</option><option value="FULL">Lleno</option></select></label><label>Entrega estimada<input name="estimatedDelivery" type="date"/></label></div><label>Motivo de ingreso<textarea name="reason" minLength={3} maxLength={1000} required/></label><label>Daños visibles<textarea name="visibleDamage"/></label><label>Objetos recibidos<textarea name="receivedItems"/></label><div className={styles.photoLabel}><strong>Fotos de recepción</strong><small>Máximo 8</small></div><CameraCapture files={receptionPhotos} onChange={setReceptionPhotos} required/>{feedback}{loading && <p role="status">Preparando fotos y guardando el vehículo… Esperá la confirmación.</p>}<button disabled={loading}>{loading ? "Guardando…" : "Recibir vehículo"}</button></form></section>
    </div> : selected ? <OrderDetail key={selected.id} order={selected} onBack={() => setSelected(null)} onUpdate={update} loading={loading}/> : <div><div className={styles.heading}><h1>{view === "history" ? "Historial de servicios" : "Servicios activos"}</h1><span>{visibleOrders.length} órdenes</span></div><div className={styles.orderGrid}>{visibleOrders.map((order) => <button key={order.id} disabled={loading} onClick={() => void openOrder(order.id)} className={styles.orderCard}><small>{order.orderCode}</small><strong>{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</strong><span>{order.customer.name}</span><b>{statusLabels[order.status]}</b></button>)}</div>{visibleOrders.length === 0 && <p>No hay servicios en esta sección.</p>}<div className={styles.toolbar}><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span><button disabled={!hasMore || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>}
  </section>;
}

function OrderDetail({ order, onBack, onUpdate, loading }: { order: Order; onBack: () => void; onUpdate: (e: FormEvent<HTMLFormElement>, photos: File[]) => Promise<boolean>; loading: boolean }) {
  const [updatePhotos, setUpdatePhotos] = useState<File[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const suggestionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (suggesting) suggestionRef.current?.focus(); }, [suggesting]);
  const closed = ["DELIVERED", "CANCELLED"].includes(order.status);
  const actions = [
    { status: "DIAGNOSIS", label: "En revisión", note: "El vehículo está en revisión." },
    { status: "QUALITY_CHECK", label: "En prueba", note: "Estamos realizando las pruebas del vehículo." },
    { status: "READY", label: "Listo para recoger", note: "Tu vehículo está listo para recoger en el taller." },
  ];
  const submit = async (event: FormEvent<HTMLFormElement>) => { if (await onUpdate(event, updatePhotos)) setUpdatePhotos([]); };
  return <div className={styles.detail}><button className={styles.back} onClick={onBack}>← Volver</button><div className={styles.heading}><div><small>{order.orderCode}</small><h1>{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</h1><p>{order.customer.name} · {order.customer.phone}</p></div><b>{statusLabels[order.status]}</b></div><div className={styles.photoGrid}>{order.photos.map((photo) => <img key={photo.id} src={photo.dataUrl} alt={photo.caption || "Foto de recepción"}/>)}</div>{!closed && <section className={styles.panel} aria-label="Cambiar estado del vehículo"><h2>Cambiar estado</h2><div className={styles.statusActions}>{actions.map((action) => <form key={action.status} onSubmit={(event) => { void onUpdate(event, []); }}><input type="hidden" name="status" value={action.status}/><input type="hidden" name="note" value={action.note}/><button type="submit" disabled={loading || order.status === action.status}>{loading ? "Guardando…" : action.label}</button></form>)}<button type="button" disabled={loading} aria-expanded={suggesting} onClick={() => setSuggesting(!suggesting)}>Sugerencias para el cliente</button></div>{suggesting && <form className={styles.form} onSubmit={async (event) => { if (await onUpdate(event, [])) setSuggesting(false); }}><h3>Sugerencias para el cliente</h3><p>Explicá los detalles adicionales que recomendás revisar o reparar. Se guardarán en el perfil del cliente y el vehículo quedará en revisión.</p><input type="hidden" name="status" value="DIAGNOSIS"/><label>Sugerencia<textarea ref={suggestionRef} name="note" required minLength={3} maxLength={1500} placeholder="Sugerimos revisar los inyectores porque…"/></label><button disabled={loading}>{loading ? "Guardando…" : "Publicar sugerencia y volver a revisión"}</button></form>}</section>}<section className={styles.timeline}>{order.updates.map((item) => <article key={item.id}><small>{new Date(item.createdAt).toLocaleString("es-CR")} · {item.createdByStaff.name}</small><h3>{statusLabels[item.status]}</h3><p>{item.note}</p><div className={styles.photoGrid}>{item.photos.map((photo) => <img key={photo.id} src={photo.dataUrl} alt="Actualización del servicio"/>)}</div></article>)}</section>{!["DELIVERED", "CANCELLED"].includes(order.status) && <form onSubmit={submit} className={`${styles.form} ${styles.panel}`}><h2>Nueva actualización</h2><label>Estado<select name="status" defaultValue={order.status}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Actualización para el cliente<textarea name="note" required minLength={3} maxLength={1500}/></label><div className={styles.photoLabel}><strong>Fotos</strong><small>Opcional, máximo 8</small></div><CameraCapture files={updatePhotos} onChange={setUpdatePhotos}/><button disabled={loading}>{loading ? "Publicando…" : "Publicar actualización"}</button></form>}</div>;
}
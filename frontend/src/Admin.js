import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  LogOut, Package, ClipboardList, Settings, Plus, Save, Trash2, X, Check, XCircle,
  ArrowLeft, Upload, GripVertical, Clock,
} from "lucide-react";
import "@/Admin.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "padaria_admin_token";
const money = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CATEGORIES = ["Bolos", "Salgados", "Pães", "Doces", "Lanches"];
const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const STATUS_LIST = ["pendente", "preparando", "pronto", "entregue", "cancelado"];
const STATUS_LABEL = {
  pendente: "Pendente",
  preparando: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const resolveImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("/api/")) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
};

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ----------------------- Login ----------------------- */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Não foi possível entrar. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="admin-login">
    <div className="admin-login-card">
      <Link to="/" className="admin-back-link" data-testid="admin-back-home"><ArrowLeft size={16} /> Voltar à loja</Link>
      <h1>Painel do Administrador</h1>
      <p>Entre com seus dados para gerenciar o cardápio.</p>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} data-testid="admin-email-input" placeholder="seu@email.com" /></label>
        <label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} data-testid="admin-password-input" placeholder="Digite sua senha" /></label>
        {error && <div className="admin-error" data-testid="admin-login-error">{error}</div>}
        <button type="submit" disabled={loading} data-testid="admin-login-submit">{loading ? "Entrando..." : "Entrar"}</button>
      </form>
    </div>
  </div>;
}

/* ----------------------- Image picker button ----------------------- */
function ImageUploadButton({ onUploaded, testId }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = () => inputRef.current?.click();
  const change = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/uploads/image`, fd, {
        headers: { ...authHeaders() },
      });
      onUploaded(data.url);
    } catch (err) {
      const d = err.response?.data?.detail;
      alert(typeof d === "string" ? d : "Falha ao enviar imagem.");
    } finally {
      setBusy(false);
    }
  };
  return <>
    <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={change} data-testid={`${testId}-input`} />
    <button type="button" className="upload-btn" onClick={pick} disabled={busy} data-testid={testId}>
      <Upload size={14} /> {busy ? "Enviando..." : "Enviar foto"}
    </button>
  </>;
}

/* ----------------------- Product row ----------------------- */
function ProductRow({ p, onSaved, onDeleted, dragHandlers }) {
  const [draft, setDraft] = useState(p);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(p);

  useEffect(() => setDraft(p), [p]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.patch(`${API}/products/${p.id}`, {
        name: draft.name, category: draft.category, price: Number(draft.price),
        description: draft.description, image_url: draft.image_url, available: draft.available,
      }, { headers: authHeaders() });
      onSaved(data);
    } catch { alert("Erro ao salvar. Tente novamente."); }
    finally { setSaving(false); }
  };
  const toggle = async () => {
    try {
      const { data } = await axios.patch(`${API}/products/${p.id}`, { available: !p.available }, { headers: authHeaders() });
      onSaved(data);
    } catch { alert("Erro ao alterar disponibilidade."); }
  };
  const remove = async () => {
    if (!window.confirm(`Remover "${p.name}" do cardápio?`)) return;
    try {
      await axios.delete(`${API}/products/${p.id}`, { headers: authHeaders() });
      onDeleted(p.id);
    } catch { alert("Erro ao remover produto."); }
  };

  return <div className={`admin-product ${p.available ? "" : "off"}`} data-testid={`admin-product-${p.id}`} {...dragHandlers}>
    <div className="drag-handle" title="Arraste para reordenar" data-testid={`admin-drag-${p.id}`}><GripVertical size={18} /></div>
    <img src={resolveImageUrl(draft.image_url)} alt={draft.name} className="admin-product-thumb" />
    <div className="admin-product-fields">
      <div className="row">
        <label className="grow">Nome<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} data-testid={`admin-name-${p.id}`} /></label>
        <label>Categoria<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} data-testid={`admin-category-${p.id}`}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select></label>
        <label>Preço (R$)<input type="number" step="0.01" min="0" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} data-testid={`admin-price-${p.id}`} /></label>
      </div>
      <div className="row">
        <label className="grow">Descrição<input value={draft.description || ""} onChange={e => setDraft({ ...draft, description: e.target.value })} data-testid={`admin-description-${p.id}`} /></label>
        <label className="grow">Imagem (URL ou envie foto)
          <div className="image-input">
            <input value={draft.image_url || ""} onChange={e => setDraft({ ...draft, image_url: e.target.value })} data-testid={`admin-image-${p.id}`} placeholder="https://... ou envie foto" />
            <ImageUploadButton testId={`admin-upload-${p.id}`} onUploaded={(url) => setDraft(d => ({ ...d, image_url: url }))} />
          </div>
        </label>
      </div>
    </div>
    <div className="admin-product-actions">
      <button className={`toggle ${p.available ? "on" : "off"}`} onClick={toggle} data-testid={`admin-toggle-${p.id}`}>
        {p.available ? <><Check size={15} /> Disponível</> : <><XCircle size={15} /> Indisponível</>}
      </button>
      <button className="save" disabled={!dirty || saving} onClick={save} data-testid={`admin-save-${p.id}`}><Save size={15} /> {saving ? "Salvando" : "Salvar"}</button>
      <button className="delete" onClick={remove} data-testid={`admin-delete-${p.id}`}><Trash2 size={15} /> Remover</button>
    </div>
  </div>;
}

/* ----------------------- New product modal ----------------------- */
function NewProductModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", category: "Bolos", price: "", description: "", image_url: "", available: true });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/products`, { ...form, price: Number(form.price) }, { headers: authHeaders() });
      onCreated(data);
      onClose();
    } catch { alert("Erro ao criar produto."); }
    finally { setSaving(false); }
  };
  return <div className="admin-modal-backdrop" onClick={onClose}>
    <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={submit} data-testid="admin-new-modal">
      <div className="admin-modal-head"><h2>Novo produto</h2><button type="button" onClick={onClose} className="close-btn" data-testid="admin-new-close"><X size={18} /></button></div>
      <label>Nome<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="new-name" /></label>
      <div className="row">
        <label className="grow">Categoria<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} data-testid="new-category">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select></label>
        <label>Preço (R$)<input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} data-testid="new-price" /></label>
      </div>
      <label>Descrição<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="new-description" placeholder="Ex.: Sabores disponíveis" /></label>
      <label>Imagem
        <div className="image-input">
          <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} data-testid="new-image" placeholder="URL ou envie foto" />
          <ImageUploadButton testId="new-upload" onUploaded={(url) => setForm(f => ({ ...f, image_url: url }))} />
        </div>
      </label>
      {form.image_url && <img src={resolveImageUrl(form.image_url)} alt="preview" className="admin-preview" data-testid="new-preview" />}
      <button type="submit" className="save" disabled={saving} data-testid="new-submit"><Plus size={15} /> {saving ? "Criando..." : "Criar produto"}</button>
    </form>
  </div>;
}

/* ----------------------- Products tab (with drag reorder) ----------------------- */
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const dragFromRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API}/products`); setProducts(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = filter === "Todos" ? products : products.filter(p => p.category === filter);

  const persistOrder = async (list) => {
    try {
      const { data } = await axios.post(`${API}/products/reorder`, { ids: list.map(p => p.id) }, { headers: authHeaders() });
      setProducts(data);
    } catch { alert("Erro ao reordenar. Recarregando..."); load(); }
  };

  const onDragStart = (idx) => () => { dragFromRef.current = idx; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (idx) => (e) => {
    e.preventDefault();
    const from = dragFromRef.current;
    dragFromRef.current = null;
    if (from == null || from === idx || filter !== "Todos") return;
    setProducts(cur => {
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      persistOrder(next);
      return next;
    });
  };

  return <div>
    <div className="admin-toolbar">
      <div className="admin-filters">
        {["Todos", ...CATEGORIES].map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)} data-testid={`admin-filter-${c.toLowerCase()}`}>{c}</button>)}
      </div>
      <button className="add-new" onClick={() => setShowNew(true)} data-testid="admin-new-product-button"><Plus size={16} /> Novo produto</button>
    </div>
    {filter !== "Todos" && <p className="hint" data-testid="reorder-hint">Selecione "Todos" para arrastar e reordenar os produtos.</p>}
    {loading ? <p style={{ padding: 30, color: "#786b63" }}>Carregando...</p> :
      <div className="admin-products">
        {visible.map((p, idx) => <ProductRow key={p.id} p={p}
          onSaved={(u) => setProducts(cur => cur.map(x => x.id === u.id ? u : x))}
          onDeleted={(id) => setProducts(cur => cur.filter(x => x.id !== id))}
          dragHandlers={filter === "Todos" ? {
            draggable: true,
            onDragStart: onDragStart(idx),
            onDragOver,
            onDrop: onDrop(idx),
          } : {}}
        />)}
      </div>}
    {showNew && <NewProductModal onClose={() => setShowNew(false)} onCreated={(p) => setProducts(cur => [...cur, p])} />}
  </div>;
}

/* ----------------------- Orders tab ----------------------- */
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    axios.get(`${API}/orders`, { headers: authHeaders() })
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (order_id, status) => {
    try {
      const { data } = await axios.patch(`${API}/orders/${order_id}`, { status }, { headers: authHeaders() });
      setOrders(cur => cur.map(o => o.order_id === order_id ? data : o));
    } catch { alert("Erro ao atualizar status."); }
  };

  const visible = filter === "todos" ? orders : orders.filter(o => (o.status || "pendente") === filter);

  if (loading) return <p style={{ padding: 30, color: "#786b63" }}>Carregando pedidos...</p>;

  return <div>
    <div className="admin-filters" style={{ marginBottom: 18 }}>
      <button className={filter === "todos" ? "active" : ""} onClick={() => setFilter("todos")} data-testid="order-filter-todos">Todos</button>
      {STATUS_LIST.map(s => <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)} data-testid={`order-filter-${s}`}>{STATUS_LABEL[s]}</button>)}
    </div>
    {visible.length === 0 ? <div className="admin-empty" data-testid="admin-empty-orders"><ClipboardList size={40} /><p>Nenhum pedido {filter !== "todos" ? `com status "${STATUS_LABEL[filter]}"` : "registrado ainda"}.</p></div> :
      <div className="admin-orders">
        {visible.map(o => {
          const st = o.status || "pendente";
          return <div key={o.order_id} className={`admin-order status-${st}`} data-testid={`admin-order-${o.order_id}`}>
            <div className="admin-order-head">
              <div>
                <b>{o.customer_name}</b>
                <small>{o.phone} · {o.fulfillment === "retirada" ? "Retirada" : "Entrega"} · {o.payment}</small>
              </div>
              <div className="admin-order-total">{money(o.total)}<small>{new Date(o.created_at).toLocaleString("pt-BR")}</small></div>
            </div>
            {o.address && <p className="admin-order-address">📍 {o.address}</p>}
            <ul className="admin-order-items">
              {o.items.map((it, idx) => <li key={idx}>{it.quantity}x {it.name} — {money(it.unit_price * it.quantity)}</li>)}
            </ul>
            {o.notes && <p className="admin-order-notes">📝 {o.notes}</p>}
            <div className="admin-order-status-row">
              <span className={`status-pill ${st}`} data-testid={`order-status-${o.order_id}`}>{STATUS_LABEL[st]}</span>
              <label>Alterar status:
                <select value={st} onChange={e => setStatus(o.order_id, e.target.value)} data-testid={`order-status-select-${o.order_id}`}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </label>
            </div>
          </div>;
        })}
      </div>}
  </div>;
}

/* ----------------------- Hours tab ----------------------- */
function HoursTab() {
  const [hours, setHours] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/hours`, { headers: authHeaders() })
      .then(r => setHours(r.data.hours));
  }, []);

  const updateDay = (day, patch) => setHours(cur => ({ ...cur, [day]: { ...cur[day], ...patch } }));

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await axios.put(`${API}/settings/hours`, { hours }, { headers: authHeaders() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  if (!hours) return <p style={{ padding: 30, color: "#786b63" }}>Carregando...</p>;

  return <div className="hours-card" data-testid="hours-panel">
    <div className="hours-head">
      <Clock size={20} />
      <div>
        <h2>Horário de funcionamento</h2>
        <p>Quando a padaria estiver fechada, o site vai avisar o cliente e não aceitará novos pedidos.</p>
      </div>
    </div>
    <div className="hours-list">
      {DAY_LABELS.map((label, i) => {
        const key = String(i);
        const d = hours[key] || { enabled: false, open: "06:00", close: "20:00" };
        return <div className={`hours-row ${d.enabled ? "" : "off"}`} key={key} data-testid={`hours-day-${i}`}>
          <label className="hours-toggle">
            <input type="checkbox" checked={!!d.enabled} onChange={e => updateDay(key, { enabled: e.target.checked })} data-testid={`hours-enabled-${i}`} />
            <span>{label}</span>
          </label>
          <div className="hours-times">
            <label>Abre<input type="time" value={d.open} onChange={e => updateDay(key, { open: e.target.value })} disabled={!d.enabled} data-testid={`hours-open-${i}`} /></label>
            <label>Fecha<input type="time" value={d.close} onChange={e => updateDay(key, { close: e.target.value })} disabled={!d.enabled} data-testid={`hours-close-${i}`} /></label>
          </div>
        </div>;
      })}
    </div>
    <div className="hours-footer">
      {saved && <span className="hours-saved" data-testid="hours-saved">✓ Salvo!</span>}
      <button className="save" onClick={save} disabled={saving} data-testid="hours-save"><Save size={15} /> {saving ? "Salvando..." : "Salvar horários"}</button>
    </div>
  </div>;
}

/* ----------------------- Dashboard ----------------------- */
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("products");
  return <div className="admin-shell">
    <header className="admin-topbar">
      <div><Link to="/" className="brand-link" data-testid="admin-store-link">← Loja</Link><b>Painel · Panificadora Carvalho</b></div>
      <nav className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")} data-testid="admin-tab-products"><Package size={16} /> Produtos</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")} data-testid="admin-tab-orders"><ClipboardList size={16} /> Pedidos</button>
        <button className={tab === "hours" ? "active" : ""} onClick={() => setTab("hours")} data-testid="admin-tab-hours"><Clock size={16} /> Horários</button>
      </nav>
      <button className="admin-logout" onClick={onLogout} data-testid="admin-logout"><LogOut size={16} /> Sair</button>
    </header>
    <main className="admin-main">
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "hours" && <HoursTab />}
    </main>
  </div>;
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOKEN_KEY));
  const [checking, setChecking] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    axios.get(`${API}/auth/me`, { headers: authHeaders() })
      .then(() => setAuthed(true))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setAuthed(false); })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="admin-checking">Verificando sessão...</div>;
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { localStorage.removeItem(TOKEN_KEY); setAuthed(false); }} />;
}

import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { LogOut, Package, ClipboardList, Plus, Save, Trash2, X, Check, XCircle, ArrowLeft } from "lucide-react";
import "@/Admin.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "padaria_admin_token";
const money = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CATEGORIES = ["Bolos", "Salgados", "Pães", "Doces", "Lanches"];

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

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

function ProductRow({ p, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(p);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(p);

  useEffect(() => setDraft(p), [p]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.patch(`${API}/products/${p.id}`, {
        name: draft.name,
        category: draft.category,
        price: Number(draft.price),
        description: draft.description,
        image_url: draft.image_url,
        available: draft.available,
      }, { headers: authHeaders() });
      onSaved(data);
    } catch (e) {
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
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

  return <div className={`admin-product ${p.available ? "" : "off"}`} data-testid={`admin-product-${p.id}`}>
    <img src={draft.image_url} alt={draft.name} className="admin-product-thumb" />
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
        <label className="grow">Imagem (URL)<input value={draft.image_url || ""} onChange={e => setDraft({ ...draft, image_url: e.target.value })} data-testid={`admin-image-${p.id}`} /></label>
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
    } catch (err) {
      alert("Erro ao criar produto.");
    } finally {
      setSaving(false);
    }
  };
  return <div className="admin-modal-backdrop" onClick={onClose}>
    <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={submit} data-testid="admin-new-modal">
      <div className="admin-modal-head">
        <h2>Novo produto</h2>
        <button type="button" onClick={onClose} className="close-btn" data-testid="admin-new-close"><X size={18} /></button>
      </div>
      <label>Nome<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="new-name" /></label>
      <div className="row">
        <label className="grow">Categoria<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} data-testid="new-category">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select></label>
        <label>Preço (R$)<input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} data-testid="new-price" /></label>
      </div>
      <label>Descrição<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="new-description" placeholder="Ex.: Sabores disponíveis" /></label>
      <label>URL da imagem<input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} data-testid="new-image" placeholder="https://..." /></label>
      <button type="submit" className="save" disabled={saving} data-testid="new-submit"><Plus size={15} /> {saving ? "Criando..." : "Criar produto"}</button>
    </form>
  </div>;
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("Todos");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/products`);
      setProducts(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = filter === "Todos" ? products : products.filter(p => p.category === filter);

  return <div>
    <div className="admin-toolbar">
      <div className="admin-filters">
        {["Todos", ...CATEGORIES].map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)} data-testid={`admin-filter-${c.toLowerCase()}`}>{c}</button>)}
      </div>
      <button className="add-new" onClick={() => setShowNew(true)} data-testid="admin-new-product-button"><Plus size={16} /> Novo produto</button>
    </div>
    {loading ? <p style={{ padding: 30, color: "#786b63" }}>Carregando...</p> :
      <div className="admin-products">
        {visible.map(p => <ProductRow key={p.id} p={p}
          onSaved={(u) => setProducts(cur => cur.map(x => x.id === u.id ? u : x))}
          onDeleted={(id) => setProducts(cur => cur.filter(x => x.id !== id))} />)}
      </div>}
    {showNew && <NewProductModal onClose={() => setShowNew(false)} onCreated={(p) => setProducts(cur => [...cur, p])} />}
  </div>;
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`${API}/orders`, { headers: authHeaders() })
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <p style={{ padding: 30, color: "#786b63" }}>Carregando pedidos...</p>;
  if (orders.length === 0) return <div className="admin-empty" data-testid="admin-empty-orders"><ClipboardList size={40} /><p>Nenhum pedido registrado ainda.</p></div>;
  return <div className="admin-orders">
    {orders.map(o => <div key={o.order_id} className="admin-order" data-testid={`admin-order-${o.order_id}`}>
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
    </div>)}
  </div>;
}

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("products");
  return <div className="admin-shell">
    <header className="admin-topbar">
      <div><Link to="/" className="brand-link" data-testid="admin-store-link">← Loja</Link><b>Painel · Panificadora Carvalho</b></div>
      <nav className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")} data-testid="admin-tab-products"><Package size={16} /> Produtos</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")} data-testid="admin-tab-orders"><ClipboardList size={16} /> Pedidos</button>
      </nav>
      <button className="admin-logout" onClick={onLogout} data-testid="admin-logout"><LogOut size={16} /> Sair</button>
    </header>
    <main className="admin-main">
      {tab === "products" ? <ProductsTab /> : <OrdersTab />}
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

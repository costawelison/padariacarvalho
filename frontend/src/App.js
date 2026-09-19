import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "@/App.css";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, Truck, Store, ArrowRight, Check, Search, Clock } from "lucide-react";

const API = "https://padaria-carvalho-api.onrender.com/api";
const logo = "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/mi6urdta_WhatsApp%20Image%202026-09-18%20at%2008.12.49.jpeg";
const categories = ["Todos", "Bolos", "Salgados", "Pães", "Doces", "Lanches"];
const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const initialForm = { name: "", phone: "", fulfillment: "retirada", address: "", payment: "Dinheiro", notes: "" };
const money = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const slug = (s) => s.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
const resolveImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("/api/")) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
};

function ProductCard({ p, onAdd, storeOpen }) {
  const disabled = !p.available || !storeOpen;
  const label = !p.available ? "Indisponível" : !storeOpen ? "Fechado" : "Adicionar";
  return <article className={`product ${!p.available ? "product-off" : ""}`} data-testid={`product-card-${slug(p.name)}`}>
    <div className="product-photo">
      <img src={resolveImageUrl(p.image_url)} alt={`Imagem ilustrativa de ${p.name}`} />
      <span>{p.category}</span>
      {!p.available && <div className="soldout-badge" data-testid={`soldout-${slug(p.name)}`}>Esgotado</div>}
    </div>
    <div className="product-body">
      <h3>{p.name}</h3>
      <p>{p.description}</p>
      <div className="product-bottom">
        <strong>{money(p.price)}</strong>
        <button className="add" data-testid={`add-${slug(p.name)}`} disabled={disabled} onClick={() => !disabled && onAdd(p)}>
          <Plus size={17} />{label}
        </button>
      </div>
    </div>
  </article>;
}

function ClosedBanner({ status }) {
  if (!status) return null;
  const day = Number(status.day);
  const s = status.schedule || {};
  return <div className="closed-banner" data-testid="store-closed-banner">
    <Clock size={18} />
    <div>
      <b>A padaria está fechada agora</b>
      <small>
        {s.enabled ? `Hoje (${DAY_LABELS[day]}) atendemos das ${s.open} às ${s.close}.` : `Hoje (${DAY_LABELS[day]}) estamos fechados.`} Os pedidos poderão ser feitos quando reabrirmos.
      </small>
    </div>
  </div>;
}

function App() {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState("catalog");
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState(null);

  useEffect(() => {
    axios.get(`${API}/products`).then(r => { setProducts(r.data); setLoading(false); }).catch(() => setLoading(false));
    axios.get(`${API}/store/status`).then(r => setStoreStatus(r.data)).catch(() => {});
  }, []);

  const storeOpen = storeStatus?.is_open !== false; // treat undefined as open
  const visible = products.filter(p => (category === "Todos" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  const total = useMemo(() => cart.reduce((s, x) => s + x.price * x.qty, 0), [cart]);

  const add = (p) => setCart(cur => {
    const found = cur.find(x => x.id === p.id);
    return found ? cur.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...cur, { id: p.id, name: p.name, price: p.price, qty: 1 }];
  });
  const change = (id, delta) => setCart(cur => cur.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));

  const sendWhatsApp = async () => {
    if (!storeOpen) {
      window.alert("A padaria está fechada no momento. Faça seu pedido durante o horário de funcionamento.");
      return;
    }
    if (form.fulfillment === "entrega" && !form.address.trim()) {
      window.alert("Informe o endereço para receber seu pedido.");
      return;
    }
    const lines = cart.map(x => `• ${x.qty}x ${x.name} — ${money(x.price * x.qty)}`).join("%0A");
    const fulfillment = form.fulfillment === "retirada" ? "Retirada na padaria" : "Entrega";
    const msg = `Olá! Gostaria de fazer um pedido:%0A%0A${lines}%0A%0ATotal dos produtos: ${money(total)}%0A%0ACliente: ${form.name}%0ATelefone: ${form.phone}%0AForma: ${fulfillment}${form.address ? `%0AEndereço: ${form.address}` : ""}%0APagamento: ${form.payment}%0AObservações: ${form.notes || "Nenhuma"}`;
    try {
      await axios.post(`${API}/orders`, {
        customer_name: form.name, phone: form.phone, fulfillment: form.fulfillment,
        address: form.address || null, payment: form.payment,
        items: cart.map(x => ({ name: x.name, quantity: x.qty, unit_price: x.price })),
        total, notes: form.notes || null,
      });
    } catch (e) {
      if (e.response?.status === 409) {
        window.alert("A padaria acabou de fechar. Tente novamente durante o horário de funcionamento.");
        return;
      }
    }
    window.open(`https://wa.me/5593991552808?text=${msg}`, "_blank");
    setStep("sent");
  };
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return <div className="site">
    <header className="topbar"><div className="top-inner">
      <img className="logo" src={logo} alt="Panificadora Carvalho" data-testid="brand-logo" />
      <div className="brand-copy"><b>Panificadora Carvalho</b><span>O sabor de casa, todos os dias</span></div>
      <button className="cart-button" data-testid="open-cart-button" onClick={() => setStep("cart")}>
        <ShoppingBag size={20} /><span>Meu pedido</span>
        {cart.length > 0 && <i data-testid="cart-count">{cart.reduce((a, x) => a + x.qty, 0)}</i>}
      </button>
    </div></header>

    {!storeOpen && <ClosedBanner status={storeStatus} />}

    {step === "catalog" && <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">FEITO HOJE · COM CARINHO</span>
          <h1>Seu café da manhã começa <em>bem aqui.</em></h1>
          <p>Escolha seus favoritos, monte o pedido e envie tudo pelo WhatsApp. É fácil, rápido e gostoso.</p>
          <button className="hero-action" data-testid="hero-start-button" onClick={() => document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" })}>Ver cardápio <ArrowRight size={18} /></button>
        </div>
        <div className="hero-image">
          <img src={resolveImageUrl(products[0]?.image_url) || logo} alt="Bolos fresquinhos da padaria" />
          <div className="hero-note"><span>★</span><div><b>Fresquinho de verdade</b><small>Produção artesanal todos os dias</small></div></div>
        </div>
      </section>
      <section className="catalog" id="catalogo">
        <div className="section-head">
          <div><span className="eyebrow">CARDÁPIO</span><h2>Escolha seus favoritos</h2></div>
          <label className="search"><Search size={18} /><input data-testid="product-search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto..." /></label>
        </div>
        <nav className="categories" aria-label="Categorias">{categories.map(c => <button key={c} data-testid={`category-${c.toLowerCase()}`} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</nav>
        {loading ? <p data-testid="loading-products" style={{ color: "var(--muted)", padding: "40px 0" }}>Carregando cardápio...</p> :
          <div className="products">{visible.map(p => <ProductCard key={p.id} p={p} onAdd={add} storeOpen={storeOpen} />)}</div>}
      </section>
    </main>}

    {step === "cart" && <section className="flow">
      <button className="back" data-testid="back-to-catalog-button" onClick={() => setStep("catalog")}>← Voltar ao cardápio</button>
      <div className="flow-head"><span className="eyebrow">SEU PEDIDO</span><h1>Confira tudo antes de enviar</h1></div>
      {cart.length === 0 ? <div className="empty" data-testid="empty-cart-message"><ShoppingBag size={42} /><h2>Seu pedido está vazio</h2><button className="hero-action" onClick={() => setStep("catalog")} data-testid="empty-cart-browse-button">Ver cardápio</button></div> :
        <div className="cart-layout"><div className="cart-list">
          {cart.map(x => <div className="cart-row" key={x.id} data-testid={`cart-item-${slug(x.name)}`}>
            <div><b>{x.name}</b><small>{money(x.price)} cada</small></div>
            <div className="qty">
              <button data-testid={`decrease-${slug(x.name)}`} onClick={() => change(x.id, -1)}><Minus size={15} /></button>
              <strong>{x.qty}</strong>
              <button data-testid={`increase-${slug(x.name)}`} onClick={() => change(x.id, 1)}><Plus size={15} /></button>
            </div>
            <b>{money(x.price * x.qty)}</b>
            <button className="remove" onClick={() => change(x.id, -x.qty)} data-testid={`remove-${slug(x.name)}`}><Trash2 size={16} /></button>
          </div>)}
          <div className="total"><span>Total dos produtos</span><strong data-testid="cart-total">{money(total)}</strong></div>
          <button className="continue" data-testid="continue-checkout-button" onClick={() => setStep("checkout")} disabled={!storeOpen}>{storeOpen ? "Continuar" : "Padaria fechada"} <ArrowRight size={18} /></button>
        </div></div>}
    </section>}

    {step === "checkout" && <section className="flow">
      <button className="back" data-testid="back-to-cart-button" onClick={() => setStep("cart")}>← Voltar ao pedido</button>
      <div className="flow-head"><span className="eyebrow">ÚLTIMO PASSO</span><h1>Como podemos preparar?</h1><p>Preencha seus dados. Ao tocar em enviar, o WhatsApp abrirá com seu pedido pronto.</p></div>
      <form className="checkout" onSubmit={e => { e.preventDefault(); sendWhatsApp(); }}>
        <div className="choice-group"><label>Você prefere</label>
          <div className="choices">
            <button type="button" data-testid="fulfillment-pickup" className={form.fulfillment === "retirada" ? "selected" : ""} onClick={() => setForm({ ...form, fulfillment: "retirada" })}><Store size={22} /><b>Retirar na padaria</b><small>Você busca seu pedido</small></button>
            <button type="button" data-testid="fulfillment-delivery" className={form.fulfillment === "entrega" ? "selected" : ""} onClick={() => setForm({ ...form, fulfillment: "entrega" })}><Truck size={22} /><b>Receber em casa</b><small>Combinaremos a entrega</small></button>
          </div>
        </div>
        <div className="form-grid">
          <label>Seu nome<input required name="name" data-testid="customer-name-input" value={form.name} onChange={update} placeholder="Como podemos chamar você?" /></label>
          <label>Seu telefone<input required name="phone" data-testid="customer-phone-input" value={form.phone} onChange={update} placeholder="(93) 99999-9999" /></label>
          <label className={form.fulfillment === "entrega" ? "full" : "full hidden"}>Endereço de entrega<input name="address" data-testid="customer-address-input" value={form.address} onChange={update} placeholder="Rua, número e bairro" /></label>
          <label>Forma de pagamento<select name="payment" data-testid="payment-select" value={form.payment} onChange={update}><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select></label>
          <label>Alguma observação? <span>(opcional)</span><textarea name="notes" data-testid="order-notes-input" value={form.notes} onChange={update} placeholder="Ex.: retirar às 16h, pouco açúcar..." /></label>
        </div>
        <div className="checkout-footer"><div><span>Total dos produtos</span><strong>{money(total)}</strong></div><button className="whatsapp" data-testid="send-whatsapp-button" type="submit" disabled={!storeOpen}><MessageCircle size={20} />{storeOpen ? "Enviar pedido pelo WhatsApp" : "Padaria fechada"}</button></div>
      </form>
    </section>}

    {step === "sent" && <section className="success" data-testid="order-sent-message">
      <div className="success-icon"><Check size={34} /></div>
      <span className="eyebrow">PEDIDO ENCAMINHADO</span>
      <h1>Agora é só conversar com a gente!</h1>
      <p>Seu pedido foi montado no WhatsApp. Envie a mensagem para a Panificadora Carvalho e aguarde nossa confirmação.</p>
      <button className="hero-action" data-testid="new-order-button" onClick={() => { setCart([]); setForm(initialForm); setStep("catalog"); }}>Fazer novo pedido <ArrowRight size={18} /></button>
    </section>}

    <footer>
      <b>Panificadora Carvalho</b>
      <span>Qualidade que você sente no primeiro pedaço.</span>
      <a href="https://wa.me/5593991552808" data-testid="footer-whatsapp-link"><MessageCircle size={16} /> (93) 99155-2808</a>
    </footer>
  </div>;
}
export default App;

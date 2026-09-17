import { useMemo, useState } from "react";
import "@/App.css";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, Truck, Store, ArrowRight, Check, Search } from "lucide-react";

const logo = "https://customer-assets-0z36b82j.emergentagent.net/job_52d80212-dba1-470f-b241-757f3af77736/artifacts/0zo81bqy_WhatsApp%20Image%202026-09-17%20at%2009.06.05.jpeg";
const photos = {
  bolos: "https://images.pexels.com/photos/28729037/pexels-photo-28729037.jpeg?auto=compress&cs=tinysrgb&w=700",
  salgados: "https://images.pexels.com/photos/33938859/pexels-photo-33938859.png?auto=compress&cs=tinysrgb&w=700",
  pao: "https://images.unsplash.com/photo-1609889132708-e31330e6c7a4?auto=format&fit=crop&w=700&q=85",
  doces: "https://customer-assets-0z36b82j.emergentagent.net/job_52d80212-dba1-470f-b241-757f3af77736/artifacts/uchmtbyx_WhatsApp%20Image%202026-09-17%20at%2009.06.06%20%282%29.jpeg",
  lanches: "https://images.pexels.com/photos/13871295/pexels-photo-13871295.jpeg?auto=compress&cs=tinysrgb&w=700",
};
const categories = ["Todos", "Bolos", "Salgados", "Pães", "Doces", "Lanches"];
const initialForm = { name: "", phone: "", fulfillment: "retirada", address: "", payment: "Dinheiro", notes: "" };
const products = [
  ["Bolos", "Bolo caseiro", 9, "Laranja · Formigueiro · Queijo · Mesclado · Chocolate", "bolos"],
  ["Bolos", "Bolo especial", 10, "Milho · Leite · Coco · Amendoim · Abacaxi", "bolos"],
  ["Bolos", "Bolo de fatia", 6, "Chocolate · Cupuaçu · Milho", "bolos"],
  ["Bolos", "Bolo de aniversário", 60, "Por quilo · massa branca ou chocolate", "bolos"],
  ["Bolos", "Bolo no pote", 10, "Maracujá · Cupuaçu · Morango", "bolos"],
  ["Salgados", "Salgado frito", 5, "Carne · Frango · Queijo e presunto · Queijo", "salgados"],
  ["Salgados", "Salgado assado", 5, "Queijo e presunto · Frango · Carne", "salgados"],
  ["Salgados", "Salgado massa de batata", 5, "Queijo e presunto · Salsicha · Queijo", "salgados"],
  ["Salgados", "Salgado de festa", 50, "Centro · Frango · Carne · Queijo e presunto", "salgados"],
  ["Salgados", "Empadinha / mini pizza", 1.5, "Assados", "salgados"],
  ["Pães", "Pão francês e variedades", .75, "Francês · Caseirinho · Tatu · Massa fina · Hambúrguer", "pao"],
  ["Pães", "Pão doce", .75, "Goiabada · Creme · Chocolate · Coco · Rosquinha", "pao"],
  ["Pães", "Pão Vitória / baguete / caseirão", 2, "Escolha sua variedade", "pao"],
  ["Pães", "Pão de forma", 10, "Tradicional", "pao"],
  ["Pães", "Pão integral", 5, "Tradicional", "pao"],
  ["Doces", "Canudo", 60, "Frango · Doce de leite · Chocolate", "doces"],
  ["Doces", "Doces para festa", 70, "Cento · Beijinho · Brigadeiro", "doces"],
  ["Doces", "Cupcake", 1, "Unidade (opção especial R$ 3,00)", "doces"],
  ["Doces", "Pudim", 8, "Pequeno", "doces"],
  ["Lanches", "Lanche natural", 5, "Queijo · Presunto · Requeijão · Alface", "lanches"],
  ["Lanches", "Pão de queijo assado", 1, "Também disponível por R$ 0,50", "salgados"],
  ["Lanches", "Pão de queijo frito / Chipa", 1, "Unidade", "salgados"],
  ["Lanches", "Rosquinha doce", 2, "Chocolate branco · Chocolate", "doces"],
  ["Lanches", "Torta em fatia", 8, "Fatia", "doces"],
];
const money = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ProductCard({ item, onAdd }) {
  const [category, name, price, detail, image] = item;
  return <article className="product" data-testid={`product-card-${name.toLowerCase().replaceAll(" ", "-")}`}>
    <div className="product-photo"><img src={photos[image]} alt={`Imagem ilustrativa de ${name}`} /><span>{category}</span></div>
    <div className="product-body"><h3>{name}</h3><p>{detail}</p><div className="product-bottom"><strong>{money(price)}</strong><button className="add" data-testid={`add-${name.toLowerCase().replaceAll(" ", "-")}`} onClick={() => onAdd(item)}><Plus size={17} />Adicionar</button></div></div>
  </article>;
}

function App() {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState("catalog");
  const [form, setForm] = useState(initialForm);
  const visible = products.filter(p => (category === "Todos" || p[0] === category) && `${p[1]} ${p[3]}`.toLowerCase().includes(query.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, x) => sum + x[0][2] * x[1], 0), [cart]);
  const add = (item) => setCart(current => { const found = current.find(x => x[0][1] === item[1]); return found ? current.map(x => x[0][1] === item[1] ? [x[0], x[1] + 1] : x) : [...current, [item, 1]]; });
  const change = (name, delta) => setCart(current => current.map(x => x[0][1] === name ? [x[0], x[1] + delta] : x).filter(x => x[1] > 0));
  const sendWhatsApp = () => {
    if (form.fulfillment === "entrega" && !form.address.trim()) {
      window.alert("Informe o endereço para receber seu pedido.");
      return;
    }
    const lines = cart.map(([p, q]) => `• ${q}x ${p[1]} — ${money(p[2] * q)}`).join("%0A");
    const fulfillment = form.fulfillment === "retirada" ? "Retirada na padaria" : "Entrega";
    const msg = `Olá! Gostaria de fazer um pedido:%0A%0A${lines}%0A%0ATotal dos produtos: ${money(total)}%0A%0ACliente: ${form.name}%0ATelefone: ${form.phone}%0AForma: ${fulfillment}${form.address ? `%0AEndereço: ${form.address}` : ""}%0APagamento: ${form.payment}%0AObservações: ${form.notes || "Nenhuma"}`;
    window.open(`https://wa.me/5593991552808?text=${msg}`, "_blank");
    setStep("sent");
  };
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return <div className="site">
    <header className="topbar"><div className="top-inner"><img className="logo" src={logo} alt="Panificadora Carvalho" data-testid="brand-logo" /><div className="brand-copy"><b>Panificadora Carvalho</b><span>O sabor de casa, todos os dias</span></div><button className="cart-button" data-testid="open-cart-button" onClick={() => setStep("cart")}><ShoppingBag size={20} /><span>Meu pedido</span>{cart.length > 0 && <i data-testid="cart-count">{cart.reduce((a, x) => a + x[1], 0)}</i>}</button></div></header>
    {step === "catalog" && <main><section className="hero"><div className="hero-copy"><span className="eyebrow">FEITO HOJE · COM CARINHO</span><h1>Seu café da manhã começa <em>bem aqui.</em></h1><p>Escolha seus favoritos, monte o pedido e envie tudo pelo WhatsApp. É fácil, rápido e gostoso.</p><button className="hero-action" data-testid="hero-start-button" onClick={() => document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" })}>Ver cardápio <ArrowRight size={18} /></button></div><div className="hero-image"><img src={photos.bolos} alt="Bolos fresquinhos da padaria" /><div className="hero-note"><span>★</span><div><b>Fresquinho de verdade</b><small>Produção artesanal todos os dias</small></div></div></div></section><section className="catalog" id="catalogo"><div className="section-head"><div><span className="eyebrow">CARDÁPIO</span><h2>Escolha seus favoritos</h2></div><label className="search"><Search size={18} /><input data-testid="product-search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto..." /></label></div><nav className="categories" aria-label="Categorias">{categories.map(c => <button key={c} data-testid={`category-${c.toLowerCase()}`} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</nav><div className="products">{visible.map(p => <ProductCard key={p[1]} item={p} onAdd={add} />)}</div></section></main>}
    {step === "cart" && <section className="flow"><button className="back" data-testid="back-to-catalog-button" onClick={() => setStep("catalog")}>← Voltar ao cardápio</button><div className="flow-head"><span className="eyebrow">SEU PEDIDO</span><h1>Confira tudo antes de enviar</h1></div>{cart.length === 0 ? <div className="empty" data-testid="empty-cart-message"><ShoppingBag size={42} /><h2>Seu pedido está vazio</h2><button className="hero-action" onClick={() => setStep("catalog")} data-testid="empty-cart-browse-button">Ver cardápio</button></div> : <div className="cart-layout"><div className="cart-list">{cart.map(([p, q]) => <div className="cart-row" key={p[1]} data-testid={`cart-item-${p[1].toLowerCase().replaceAll(" ", "-")}`}><div><b>{p[1]}</b><small>{money(p[2])} cada</small></div><div className="qty"><button data-testid={`decrease-${p[1].toLowerCase().replaceAll(" ", "-")}`} onClick={() => change(p[1], -1)}><Minus size={15} /></button><strong>{q}</strong><button data-testid={`increase-${p[1].toLowerCase().replaceAll(" ", "-")}`} onClick={() => change(p[1], 1)}><Plus size={15} /></button></div><b>{money(p[2] * q)}</b><button className="remove" onClick={() => change(p[1], -q)} data-testid={`remove-${p[1].toLowerCase().replaceAll(" ", "-")}`}><Trash2 size={16} /></button></div>)}<div className="total"><span>Total dos produtos</span><strong data-testid="cart-total">{money(total)}</strong></div><button className="continue" data-testid="continue-checkout-button" onClick={() => setStep("checkout")}>Continuar <ArrowRight size={18} /></button></div></div>}</section>}
    {step === "checkout" && <section className="flow"><button className="back" data-testid="back-to-cart-button" onClick={() => setStep("cart")}>← Voltar ao pedido</button><div className="flow-head"><span className="eyebrow">ÚLTIMO PASSO</span><h1>Como podemos preparar?</h1><p>Preencha seus dados. Ao tocar em enviar, o WhatsApp abrirá com seu pedido pronto.</p></div><form className="checkout" onSubmit={e => { e.preventDefault(); sendWhatsApp(); }}><div className="choice-group"><label>Você prefere</label><div className="choices"><button type="button" data-testid="fulfillment-pickup" className={form.fulfillment === "retirada" ? "selected" : ""} onClick={() => setForm({ ...form, fulfillment: "retirada" })}><Store size={22} /><b>Retirar na padaria</b><small>Você busca seu pedido</small></button><button type="button" data-testid="fulfillment-delivery" className={form.fulfillment === "entrega" ? "selected" : ""} onClick={() => setForm({ ...form, fulfillment: "entrega" })}><Truck size={22} /><b>Receber em casa</b><small>Combinaremos a entrega</small></button></div></div><div className="form-grid"><label>Seu nome<input required name="name" data-testid="customer-name-input" value={form.name} onChange={update} placeholder="Como podemos chamar você?" /></label><label>Seu telefone<input required name="phone" data-testid="customer-phone-input" value={form.phone} onChange={update} placeholder="(93) 99999-9999" /></label><label className={form.fulfillment === "entrega" ? "full" : "full hidden"}>Endereço de entrega<input name="address" data-testid="customer-address-input" value={form.address} onChange={update} placeholder="Rua, número e bairro" /></label><label>Forma de pagamento<select name="payment" data-testid="payment-select" value={form.payment} onChange={update}><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select></label><label>Alguma observação? <span>(opcional)</span><textarea name="notes" data-testid="order-notes-input" value={form.notes} onChange={update} placeholder="Ex.: retirar às 16h, pouco açúcar..." /></label></div><div className="checkout-footer"><div><span>Total dos produtos</span><strong>{money(total)}</strong></div><button className="whatsapp" data-testid="send-whatsapp-button" type="submit"><MessageCircle size={20} />Enviar pedido pelo WhatsApp</button></div></form></section>}
    {step === "sent" && <section className="success" data-testid="order-sent-message"><div className="success-icon"><Check size={34} /></div><span className="eyebrow">PEDIDO ENCAMINHADO</span><h1>Agora é só conversar com a gente!</h1><p>Seu pedido foi montado no WhatsApp. Envie a mensagem para a Panificadora Carvalho e aguarde nossa confirmação.</p><button className="hero-action" data-testid="new-order-button" onClick={() => { setCart([]); setForm(initialForm); setStep("catalog"); }}>Fazer novo pedido <ArrowRight size={18} /></button></section>}
    <footer><b>Panificadora Carvalho</b><span>Qualidade que você sente no primeiro pedaço.</span><a href="https://wa.me/5593991552808" data-testid="footer-whatsapp-link"><MessageCircle size={16} /> (93) 99155-2808</a></footer>
  </div>;
}
export default App;
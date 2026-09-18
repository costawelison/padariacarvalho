import { useMemo, useState } from "react";
import "@/App.css";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, Truck, Store, ArrowRight, Check, Search } from "lucide-react";

const logo = "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/mi6urdta_WhatsApp%20Image%202026-09-18%20at%2008.12.49.jpeg";
const photos = {
  bolos: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/ghqodvxd_bolos%20caseiros.png",
  bolosEspeciais: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/pz468eiu_bolos%20especiais.png",
  bolosAniversario: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/xc9ja1jx_bolos%20de%20aniversario.png",
  bolosPote: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/ruvj78yj_bolos%20de%20pote.png",
  salgados: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/1vm3sjs7_salgado%20frito.png",
  salgadoAssado: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/835v4ghe_salgado%20assado.png",
  massaBatata: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6lt01mds_salgado%20massa%20de%20batata.png",
  salgadoFesta: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/rrp2f99m_salgado%20para%20festas.png",
  empadinha: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/x277necx_empadinha%20e%20mini%20pizza.png",
  pao: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/9qr3f7w9_p%C3%A3o%20frances%20e%20variedades.png",
  paoDoce: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/yr5f3kho_p%C3%A3o%20doce.png",
  paoForma: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6715vw4g_p%C3%A3o%20de%20forma.png",
  paoIntegral: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/zwc4zvzk_p%C3%A3o%20integral.png",
  baguete: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/hgt70wg2_baguete.png",
  canudos: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/aznbdhx6_canudos.png",
  docesFesta: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6y1einkr_doces%20para%20festas.png",
  cupcake: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/zsxx3yh0_cupcake.png",
  rosquinhas: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6rpsogij_rosquinhas.png",
  paoQueijoAssado: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/fhzfnov8_p%C3%A3o%20de%20queijo%20assado.png",
  paoQueijoFrito: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/8j919zs9_p%C3%A3o%20de%20queijo%20frito%20e%20chipa.png",
  tortaFatia: "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/nscsk1nd_torta%20em%20fatia.png",
  doces: "https://images.unsplash.com/photo-1711141326113-e6b607fd78ef?auto=format&fit=crop&w=700&q=85",
  lanches: "https://images.pexels.com/photos/36863863/pexels-photo-36863863.jpeg?auto=compress&cs=tinysrgb&w=700",
};
const categories = ["Todos", "Bolos", "Salgados", "Pães", "Doces", "Lanches"];
const initialForm = { name: "", phone: "", fulfillment: "retirada", address: "", payment: "Dinheiro", notes: "" };
const products = [
  ["Bolos", "Bolo caseiro", 9, "Laranja · Formigueiro · Queijo · Mesclado · Chocolate", "bolos"],
  ["Bolos", "Bolo especial", 10, "Milho · Leite · Coco · Amendoim · Abacaxi", "bolosEspeciais"],
  ["Bolos", "Bolo de fatia", 6, "Chocolate · Cupuaçu · Milho", "tortaFatia"],
  ["Bolos", "Bolo de aniversário", 60, "Por quilo · massa branca ou chocolate", "bolosAniversario"],
  ["Bolos", "Bolo no pote", 10, "Maracujá · Cupuaçu · Morango", "bolosPote"],
  ["Salgados", "Salgado frito", 5, "Carne · Frango · Queijo e presunto · Queijo", "salgados"],
  ["Salgados", "Salgado assado", 5, "Queijo e presunto · Frango · Carne", "salgadoAssado"],
  ["Salgados", "Salgado massa de batata", 5, "Queijo e presunto · Salsicha · Queijo", "massaBatata"],
  ["Salgados", "Salgado de festa", 50, "Centro · Frango · Carne · Queijo e presunto", "salgadoFesta"],
  ["Salgados", "Empadinha / mini pizza", 1.5, "Assados", "empadinha"],
  ["Pães", "Pão francês e variedades", .75, "Francês · Caseirinho · Tatu · Massa fina · Hambúrguer", "pao"],
  ["Pães", "Pão doce", .75, "Goiabada · Creme · Chocolate · Coco · Rosquinha", "paoDoce"],
  ["Pães", "Pão Vitória / baguete / caseirão", 2, "Escolha sua variedade", "baguete"],
  ["Pães", "Pão de forma", 10, "Tradicional", "paoForma"],
  ["Pães", "Pão integral", 5, "Tradicional", "paoIntegral"],
  ["Doces", "Canudo", 60, "Frango · Doce de leite · Chocolate", "canudos"],
  ["Doces", "Doces para festa", 70, "Cento · Beijinho · Brigadeiro", "docesFesta"],
  ["Doces", "Cupcake", 1, "Unidade (opção especial R$ 3,00)", "cupcake"],
  ["Doces", "Pudim", 8, "Pequeno", "doces"],
  ["Lanches", "Lanche natural", 5, "Queijo · Presunto · Requeijão · Alface", "lanches"],
  ["Lanches", "Pão de queijo assado", 1, "Também disponível por R$ 0,50", "paoQueijoAssado"],
  ["Lanches", "Pão de queijo frito / Chipa", 1, "Unidade", "paoQueijoFrito"],
  ["Lanches", "Rosquinha doce", 2, "Chocolate branco · Chocolate", "rosquinhas"],
  ["Lanches", "Torta em fatia", 8, "Fatia", "tortaFatia"],
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
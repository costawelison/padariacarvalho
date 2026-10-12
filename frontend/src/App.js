```jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "@/App.css";
import {
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Store,
  ArrowRight,
  Check,
  Search,
  Clock,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const logo =
  "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/mi6urdta_WhatsApp%20Image%202026-09-18%20at%2008.12.49.jpeg";

const categories = [
  "Todos",
  "Bolos",
  "Salgados",
  "Pães",
  "Doces",
  "Lanches",
];

const DAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

const initialForm = {
  name: "",
  phone: "",
  fulfillment: "retirada",
  payment: "Dinheiro",
  notes: "",
};

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("/", "-");

const resolveImageUrl = (url) => {
  if (!url) return "";

  if (url.startsWith("/api/")) {
    return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  }

  return url;
};

function ProductCard({ p, onAdd, storeOpen }) {
  const disabled = !p.available || !storeOpen;

  const label = !p.available
    ? "Indisponível"
    : !storeOpen
      ? "Fechado"
      : "Adicionar";

  return (
    <article
      className={`product ${!p.available ? "product-off" : ""}`}
      data-testid={`product-card-${slug(p.name)}`}
    >
      <div className="product-photo">
        <img
          src={resolveImageUrl(p.image_url)}
          alt={`Imagem ilustrativa de ${p.name}`}
        />

        <span>{p.category}</span>

        {!p.available && (
          <div
            className="soldout-badge"
            data-testid={`soldout-${slug(p.name)}`}
          >
            Esgotado
          </div>
        )}
      </div>

      <div className="product-body">
        <h3>{p.name}</h3>
        <p>{p.description}</p>

        <div className="product-bottom">
          <strong>{money(p.price)}</strong>

          <button
            className="add"
            data-testid={`add-${slug(p.name)}`}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onAdd(p);
            }}
          >
            <Plus size={17} />
            {label}
          </button>
        </div>
      </div>
    </article>
  );
}

function ClosedBanner({ status }) {
  if (!status) return null;

  const day = Number(status.day);
  const schedule = status.schedule || {};

  return (
    <div
      className="closed-banner"
      data-testid="store-closed-banner"
    >
      <Clock size={18} />

      <div>
        <b>A padaria está fechada agora</b>

        <small>
          {schedule.enabled
            ? `Hoje (${DAY_LABELS[day]}) atendemos das ${schedule.open} às ${schedule.close}.`
            : `Hoje (${DAY_LABELS[day]}) estamos fechados.`}{" "}
          Os pedidos poderão ser feitos quando reabrirmos.
        </small>
      </div>
    </div>
  );
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
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/products`)
      .then((response) => {
        setProducts(response.data);
      })
      .catch(() => {
        window.alert(
          "Não foi possível carregar o cardápio. Verifique sua conexão e atualize a página."
        );
      })
      .finally(() => setLoading(false));

    axios
      .get(`${API}/store/status`)
      .then((response) => setStoreStatus(response.data))
      .catch(() => {});
  }, []);

  const storeOpen = storeStatus?.is_open !== false;

  const visible = products.filter((p) => {
    const matchesCategory =
      category === "Todos" || p.category === category;

    const text = `${p.name} ${p.description || ""}`.toLowerCase();

    return matchesCategory && text.includes(query.toLowerCase());
  });

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const add = (product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);

      if (found) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          qty: 1,
        },
      ];
    });
  };

  const change = (id, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, qty: item.qty + delta }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const update = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const sendWhatsApp = async () => {
    if (sending) return;

    if (!storeOpen) {
      window.alert(
        "A padaria está fechada no momento. Faça seu pedido durante o horário de funcionamento."
      );
      return;
    }

    if (cart.length === 0) {
      window.alert("Adicione pelo menos um produto ao pedido.");
      return;
    }

    const customerName = form.name.trim();
    const customerPhone = form.phone.trim();

    if (!customerName || !customerPhone) {
      window.alert("Informe seu nome e telefone para continuar.");
      return;
    }

    const order = {
      customer_name: customerName,
      phone: customerPhone,
      fulfillment: "retirada",
      address: null,
      payment: form.payment,
      items: cart.map((item) => ({
        name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      })),
      total,
      notes: form.notes.trim() || null,
    };

    const lines = cart
      .map(
        (item) =>
          `• ${item.qty}x ${item.name} — ${money(item.price * item.qty)}`
      )
      .join("\n");

    const message = [
      "Olá! Gostaria de fazer um pedido:",
      "",
      lines,
      "",
      `Total dos produtos: ${money(total)}`,
      "",
      `Cliente: ${customerName}`,
      `Telefone: ${customerPhone}`,
      "Forma: Retirada na panificadora",
      `Pagamento: ${form.payment}`,
      `Observações: ${form.notes.trim() || "Nenhuma"}`,
    ].join("\n");

    setSending(true);

    try {
      await axios.post(`${API}/orders`, order);

      const whatsappUrl =
        `https://wa.me/5593991552808?text=${encodeURIComponent(message)}`;

      window.location.href = whatsappUrl;
      setStep("sent");
    } catch (error) {
      if (error.response?.status === 409) {
        window.alert(
          "A padaria acabou de fechar. Tente novamente durante o horário de funcionamento."
        );
      } else {
        window.alert(
          "Não foi possível registrar o pedido. Verifique sua conexão e tente novamente."
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="site">
      <header className="topbar">
        <div className="top-inner">
          <img
            className="logo"
            src={logo}
            alt="Panificadora Carvalho"
            data-testid="brand-logo"
          />

          <div className="brand-copy">
            <b>Panificadora Carvalho</b>
            <span>O sabor de casa, todos os dias</span>
          </div>

          <button
            className="cart-button"
            data-testid="open-cart-button"
            onClick={() => setStep("cart")}
          >
            <ShoppingBag size={20} />
            <span>Meu pedido</span>

            {cart.length > 0 && (
              <i data-testid="cart-count">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </i>
            )}
          </button>
        </div>
      </header>

      {!storeOpen && <ClosedBanner status={storeStatus} />}

      {step === "catalog" && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                FEITO HOJE · COM CARINHO
              </span>

              <h1>
                Seu café da manhã começa <em>bem aqui.</em>
              </h1>

              <p>
                Escolha seus favoritos, monte o pedido e envie tudo pelo
                WhatsApp. É fácil, rápido e gostoso.
              </p>

              <button
                className="hero-action"
                data-testid="hero-start-button"
                onClick={() =>
                  document
                    .getElementById("catalogo")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver cardápio <ArrowRight size={18} />
              </button>
            </div>

            <div className="hero-image">
              <img
                src={resolveImageUrl(products[0]?.image_url) || logo}
                alt="Produtos da Panificadora Carvalho"
              />

              <div className="hero-note">
                <span>★</span>

                <div>
                  <b>Fresquinho de verdade</b>
                  <small>Produção artesanal todos os dias</small>
                </div>
              </div>
            </div>
          </section>

          <section className="catalog" id="catalogo">
            <div className="section-head">
              <div>
                <span className="eyebrow">CARDÁPIO</span>
                <h2>Escolha seus favoritos</h2>
              </div>

              <label className="search">
                <Search size={18} />

                <input
                  data-testid="product-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar produto..."
                />
              </label>
            </div>

            <nav className="categories" aria-label="Categorias">
              {categories.map((item) => (
                <button
                  key={item}
                  data-testid={`category-${item.toLowerCase()}`}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </nav>

            {loading ? (
              <p
                data-testid="loading-products"
                style={{ color: "var(--muted)", padding: "40px 0" }}
              >
                Carregando cardápio...
              </p>
            ) : (
              <div className="products">
                {visible.map((product) => (
                  <ProductCard
                    key={product.id}
                    p={product}
                    onAdd={add}
                    storeOpen={storeOpen}
                  />
                ))}

                {visible.length === 0 && (
                  <p>Nenhum produto encontrado.</p>
                )}
              </div>
            )}
          </section>
        </main>
      )}

      {step === "cart" && (
        <section className="flow">
          <button
            className="back"
            data-testid="back-to-catalog-button"
            onClick={() => setStep("catalog")}
          >
            ← Voltar ao cardápio
          </button>

          <div className="flow-head">
            <span className="eyebrow">SEU PEDIDO</span>
            <h1>Confira tudo antes de enviar</h1>
          </div>

          {cart.length === 0 ? (
            <div className="empty" data-testid="empty-cart-message">
              <ShoppingBag size={42} />
              <h2>Seu pedido está vazio</h2>

              <button
                className="hero-action"
                onClick={() => setStep("catalog")}
                data-testid="empty-cart-browse-button"
              >
                Ver cardápio
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-list">
                {cart.map((item) => (
                  <div
                    className="cart-row"
                    key={item.id}
                    data-testid={`cart-item-${slug(item.name)}`}
                  >
                    <div>
                      <b>{item.name}</b>
                      <small>{money(item.price)} cada</small>
                    </div>

                    <div className="qty">
                      <button
                        data-testid={`decrease-${slug(item.name)}`}
                        onClick={() => change(item.id, -1)}
                      >
                        <Minus size={15} />
                      </button>

                      <strong>{item.qty}</strong>

                      <button
                        data-testid={`increase-${slug(item.name)}`}
                        onClick={() => change(item.id, 1)}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <b>{money(item.price * item.qty)}</b>

                    <button
                      className="remove"
                      onClick={() => change(item.id, -item.qty)}
                      data-testid={`remove-${slug(item.name)}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <div className="total">
                  <span>Total dos produtos</span>
                  <strong data-testid="cart-total">{money(total)}</strong>
                </div>

                <button
                  className="continue"
                  data-testid="continue-checkout-button"
                  onClick={() => setStep("checkout")}
                  disabled={!storeOpen}
                >
                  {storeOpen ? "Continuar" : "Padaria fechada"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === "checkout" && (
        <section className="flow">
          <button
            className="back"
            data-testid="back-to-cart-button"
            onClick={() => setStep("cart")}
          >
            ← Voltar ao pedido
          </button>

          <div className="flow-head">
            <span className="eyebrow">ÚLTIMO PASSO</span>
            <h1>Retire seu pedido na panificadora</h1>
            <p>
              Preencha seus dados. Ao enviar, o pedido será registrado e o
              WhatsApp abrirá com os detalhes.
            </p>
          </div>

          <form
            className="checkout"
            onSubmit={(event) => {
              event.preventDefault();
              sendWhatsApp();
            }}
          >
            <div className="choice-group">
              <label>Modalidade do pedido</label>

              <div className="choices">
                <button
                  type="button"
                  data-testid="fulfillment-pickup"
                  className="selected"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      fulfillment: "retirada",
                    }))
                  }
                >
                  <Store size={22} />
                  <b>Retirar na panificadora</b>
                  <small>Você busca seu pedido</small>
                </button>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Seu nome
                <input
                  required
                  name="name"
                  data-testid="customer-name-input"
                  value={form.name}
                  onChange={update}
                  placeholder="Como podemos chamar você?"
                />
              </label>

              <label>
                Seu telefone
                <input
                  required
                  type="tel"
                  name="phone"
                  data-testid="customer-phone-input"
                  value={form.phone}
                  onChange={update}
                  placeholder="(93) 99999-9999"
                />
              </label>

              <label>
                Forma de pagamento
                <select
                  name="payment"
                  data-testid="payment-select"
                  value={form.payment}
                  onChange={update}
                >
                  <option>Dinheiro</option>
                  <option>Pix</option>
                  <option>Cartão</option>
                </select>
              </label>

              <label>
                Alguma observação? <span>(opcional)</span>
                <textarea
                  name="notes"
                  data-testid="order-notes-input"
                  value={form.notes}
                  onChange={update}
                  placeholder="Ex.: retirar às 16h, pouco açúcar..."
                />
              </label>
            </div>

            <div className="checkout-footer">
              <div>
                <span>Total dos produtos</span>
                <strong>{money(total)}</strong>
              </div>

              <button
                className="whatsapp"
                data-testid="send-whatsapp-button"
                type="submit"
                disabled={!storeOpen || sending}
              >
                <MessageCircle size={20} />

                {!storeOpen
                  ? "Padaria fechada"
                  : sending
                    ? "Registrando pedido..."
                    : "Enviar pedido pelo WhatsApp"}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === "sent" && (
        <section className="success" data-testid="order-sent-message">
          <div className="success-icon">
            <Check size={34} />
          </div>

          <span className="eyebrow">PEDIDO ENCAMINHADO</span>

          <h1>Agora é só conversar com a gente!</h1>

          <p>
            Seu pedido foi registrado e o WhatsApp foi aberto com os detalhes.
            Envie a mensagem para a Panificadora Carvalho e aguarde nossa
            confirmação.
          </p>

          <button
            className="hero-action"
            data-testid="new-order-button"
            onClick={() => {
              setCart([]);
              setForm(initialForm);
              setStep("catalog");
            }}
          >
            Fazer novo pedido <ArrowRight size={18} />
          </button>
        </section>
      )}

      <footer>
        <b>Panificadora Carvalho</b>
        <span>Qualidade que você sente no primeiro pedaço.</span>

        <a
          href="https://wa.me/5593991552808"
          data-testid="footer-whatsapp-link"
        >
          <MessageCircle size={16} /> (93) 99155-2808
        </a>
      </footer>
    </div>
  );
}

export default App;
```

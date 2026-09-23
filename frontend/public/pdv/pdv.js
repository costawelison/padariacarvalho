const API = "https://padaria-carvalho-api.onrender.com/api";
const TOKEN_KEY = "padaria_admin_token";

const state = {
  products: [],
  cart: [],
  category: "Todos",
  search: "",
  token: localStorage.getItem(TOKEN_KEY) || "",
  store: null,
  sales: [],
  payment: "Dinheiro"
};

const money = n =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));

const headers = () =>
  state.token
    ? { Authorization: `Bearer ${state.token}` }
    : {};

const cartTotal = () =>
  state.cart.reduce((s, i) => s + i.price * i.qty, 0);

const cartCount = () =>
  state.cart.reduce((s, i) => s + i.qty, 0);

function renderLogin(error = "") {
  document.getElementById("app").innerHTML = `
    <div class="login-wrap">
      <div class="login-card">

        <div class="logo-title">
          <div class="mark">🥖</div>
          <div>
            <h2>PDV</h2>
            <p>Panificadora Carvalho</p>
          </div>
        </div>

        <label>E-mail</label>
        <input
          id="loginEmail"
          type="email"
          placeholder="E-mail do administrador"
        >

        <label>Senha</label>
        <input
          id="loginPassword"
          type="password"
          placeholder="Senha"
        >

        ${
          error
            ? `<div class="error">${esc(error)}</div>`
            : ""
        }

        <button class="primary" id="loginBtn">
          Entrar no PDV
        </button>

      </div>
    </div>
  `;

  document.getElementById("loginBtn").onclick = login;

  document.getElementById("loginPassword").onkeydown = e => {
    if (e.key === "Enter") login();
  };
}

async function login() {
  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const d = await r.json();

    if (!r.ok) {
      throw new Error(
        d.detail || "E-mail ou senha inválidos"
      );
    }

    state.token = d.token;

    localStorage.setItem(
      TOKEN_KEY,
      state.token
    );

    await init();

  } catch (e) {
    renderLogin(e.message);
  }
}

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, {
    headers: headers()
  });

  if (r.status === 401) {
    logout();
    throw new Error("Sessão expirada");
  }

  const d = await r.json();

  if (!r.ok) {
    throw new Error(
      d.detail || "Erro na API"
    );
  }

  return d;
}

async function apiSend(path, method, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers()
    },
    body: JSON.stringify(body)
  });

  if (r.status === 401) {
    logout();
    throw new Error("Sessão expirada");
  }

  const d = await r.json();

  if (!r.ok) {
    throw new Error(
      d.detail || "Erro na API"
    );
  }

  return d;
}

async function init() {
  try {
    await apiGet("/auth/me");

    [
      state.products,
      state.store
    ] = await Promise.all([
      apiGet("/products"),
      apiGet("/store/status")
    ]);

    try {
      state.sales = await apiGet("/orders");
    } catch (_) {
      state.sales = [];
    }

    render();

  } catch (e) {
    renderLogin(
      state.token ? e.message : ""
    );
  }
}

function logout() {
  state.token = "";

  localStorage.removeItem(
    TOKEN_KEY
  );

  renderLogin();
}

function categories() {
  return [
    "Todos",
    ...new Set(
      state.products.map(p => p.category)
    )
  ];
}

function filtered() {
  const q =
    state.search.toLowerCase().trim();

  return state.products.filter(p =>
    (
      state.category === "Todos" ||
      p.category === state.category
    ) &&
    (
      !q ||
      p.name.toLowerCase().includes(q) ||
      String(
        p.description || ""
      )
        .toLowerCase()
        .includes(q)
    ) &&
    p.available
  );
}

function add(p) {
  const x = state.cart.find(
    i => i.id === p.id
  );

  if (x) {
    x.qty++;
  } else {
    state.cart.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      qty: 1
    });
  }

  render();
}

function changeQty(id, d) {
  const x = state.cart.find(
    i => i.id === id
  );

  if (!x) return;

  x.qty += d;

  if (x.qty <= 0) {
    state.cart =
      state.cart.filter(
        i => i.id !== id
      );
  }

  render();
}

function render() {
  document.getElementById("app").innerHTML = `
    <div class="pdv">

      <header class="topbar">

        <div class="brand">
          <div class="brand-mark">🥖</div>
          <span>
            Panificadora Carvalho • PDV
          </span>
        </div>

        <div class="top-actions">

          <span
            class="status ${
              state.store?.is_open
                ? "open"
                : "closed"
            }"
          >
            ${
              state.store?.is_open
                ? "● Loja aberta"
                : "● Loja fechada"
            }
          </span>

          <button id="refreshBtn">
            Atualizar
          </button>

          <button id="logoutBtn">
            Sair
          </button>

        </div>

      </header>

      <div class="workspace">

        <main class="catalog">

          <div class="toolbar">
            <input
              class="search"
              id="search"
              placeholder="🔎 Buscar produto..."
              value="${esc(state.search)}"
            >
          </div>

          <div class="categories">

            ${categories()
              .map(c => `
                <button
                  class="cat ${
                    c === state.category
                      ? "active"
                      : ""
                  }"
                  data-cat="${esc(c)}"
                >
                  ${esc(c)}
                </button>
              `)
              .join("")}

          </div>

          <div class="products">

            ${
              filtered()
                .map(p => `
                  <article class="product">

                    <h3>
                      ${esc(p.name)}
                    </h3>

                    <p>
                      ${esc(
                        p.description || ""
                      )}
                    </p>

                    <div class="price">
                      ${money(p.price)}
                    </div>

                    <button
                      data-add="${p.id}"
                    >
                      Adicionar
                    </button>

                  </article>
                `)
                .join("")
              ||
              `
                <div class="empty">
                  Nenhum produto encontrado.
                </div>
              `
            }

          </div>

        </main>

        <aside class="cart-panel">

          <div class="cart-head">
            <h2>Pedido atual</h2>
            <strong>
              ${cartCount()} item(ns)
            </strong>
          </div>

          <div class="cart-items">

            ${
              state.cart.length
                ? state.cart
                    .map(i => `
                      <div class="cart-item">

                        <div>

                          <div class="cart-name">
                            ${esc(i.name)}
                          </div>

                          <div class="cart-sub">
                            ${money(i.price)} cada
                          </div>

                          <div class="qty">

                            <button
                              data-minus="${i.id}"
                            >
                              −
                            </button>

                            <b>${i.qty}</b>

                            <button
                              data-plus="${i.id}"
                            >
                              +
                            </button>

                          </div>

                        </div>

                        <div style="text-align:right">

                          <b>
                            ${money(
                              i.price * i.qty
                            )}
                          </b>

                          <br>

                          <button
                            class="remove"
                            data-remove="${i.id}"
                          >
                            remover
                          </button>

                        </div>

                      </div>
                    `)
                    .join("")
                : `
                    <div class="empty">
                      Seu pedido está vazio.
                      <br>
                      Toque em um produto
                      para adicionar.
                    </div>
                  `
            }

          </div>

          <div class="cart-foot">

            <div class="total">
              <span>Total</span>
              <span>
                ${money(cartTotal())}
              </span>
            </div>

            <button
              class="checkout"
              id="checkout"
              ${state.cart.length ? "" : "disabled"}
            >
              Finalizar venda
            </button>

            <div class="quick">

              <button id="clearCart">
                Limpar
              </button>

              <button id="salesBtn">
                Vendas de hoje
              </button>

            </div>

          </div>

        </aside>

      </div>

    </div>
  `;

  document.getElementById(
    "logoutBtn"
  ).onclick = logout;

  document.getElementById(
    "refreshBtn"
  ).onclick = async () => {

    state.products =
      await apiGet("/products");

    state.store =
      await apiGet("/store/status");

    try {
      state.sales =
        await apiGet("/orders");
    } catch (_) {}

    render();
  };

  document.getElementById(
    "search"
  ).oninput = e => {
    state.search =
      e.target.value;

    render();
  };

  document
    .querySelectorAll("[data-cat]")
    .forEach(b => {
      b.onclick = () => {
        state.category =
          b.dataset.cat;

        render();
      };
    });

  document
    .querySelectorAll("[data-add]")
    .forEach(b => {
      b.onclick = () => {
        add(
          state.products.find(
            p => p.id === b.dataset.add
          )
        );
      };
    });

  document
    .querySelectorAll("[data-minus]")
    .forEach(b => {
      b.onclick = () =>
        changeQty(
          b.dataset.minus,
          -1
        );
    });

  document
    .querySelectorAll("[data-plus]")
    .forEach(b => {
      b.onclick = () =>
        changeQty(
          b.dataset.plus,
          1
        );
    });

  document
    .querySelectorAll("[data-remove]")
    .forEach(b => {
      b.onclick = () => {
        state.cart =
          state.cart.filter(
            i => i.id !== b.dataset.remove
          );

        render();
      };
    });

  document.getElementById(
    "clearCart"
  ).onclick = () => {
    state.cart = [];
    render();
  };

  document.getElementById(
    "checkout"
  ).onclick = openCheckout;

  document.getElementById(
    "salesBtn"
  ).onclick = openSales;
}

function modal(html) {
  const e =
    document.createElement("div");

  e.className = "modal-back";

  e.innerHTML = `
    <div class="modal">
      ${html}
    </div>
  `;

  document.body.appendChild(e);

  return e;
}

function openCheckout() {

  const m = modal(`
    <div class="modal-head">

      <div>
        <h2>Finalizar venda</h2>

        <p>
          Total:
          <b>
            ${money(cartTotal())}
          </b>
        </p>
      </div>

      <button class="close">
        ×
      </button>

    </div>

    <div class="form-grid">

      <label>
        Cliente (opcional)
        <input
          id="client"
          placeholder="Nome do cliente"
        >
      </label>

      <label>
        Telefone (opcional)
        <input
          id="phone"
          placeholder="(93) 99999-9999"
        >
      </label>

      <label class="full">
        Observação

        <textarea
          id="notes"
          rows="2"
          placeholder="Observação da venda"
        ></textarea>

      </label>

      <div class="full">

        <b>
          Forma de pagamento
        </b>

        <div class="payment">

          ${
            ["Dinheiro", "Pix", "Cartão"]
              .map(p => `
                <button
                  class="${
                    p === state.payment
                      ? "active"
                      : ""
                  }"
                  data-pay="${p}"
                >
                  ${p}
                </button>
              `)
              .join("")
          }

        </div>

      </div>

      <div
        id="cashArea"
        class="full"
      ></div>

    </div>

    <button
      class="primary"
      id="confirmSale"
    >
      Confirmar venda
    </button>
  `);

  m.querySelector(
    ".close"
  ).onclick = () => m.remove();

  m.querySelectorAll(
    "[data-pay]"
  ).forEach(b => {

    b.onclick = () => {

      state.payment =
        b.dataset.pay;

      m.remove();

      openCheckout();
    };

  });

  const ca =
    m.querySelector("#cashArea");

  if (state.payment === "Dinheiro") {

    ca.innerHTML = `
      <div class="change">

        <label>
          Valor recebido

          <input
            id="received"
            type="number"
            min="${cartTotal()}"
            step="0.01"
            placeholder="${cartTotal().toFixed(2)}"
          >

        </label>

        <div style="margin-top:8px">
          Troco:
          <b id="change">
            R$ 0,00
          </b>
        </div>

      </div>
    `;

    m.querySelector(
      "#received"
    ).oninput = e => {

      m.querySelector(
        "#change"
      ).textContent = money(
        Math.max(
          0,
          Number(e.target.value) -
          cartTotal()
        )
      );

    };
  }

  m.querySelector(
    "#confirmSale"
  ).onclick = async () => {

    const received =
      Number(
        m.querySelector(
          "#received"
        )?.value || 0
      );

    if (
      state.payment === "Dinheiro" &&
      received < cartTotal()
    ) {
      alert(
        "Informe um valor recebido igual ou maior que o total."
      );
      return;
    }

    const order = {
      customer_name:
        m.querySelector(
          "#client"
        ).value.trim() ||
        "Cliente balcão",

      phone:
        m.querySelector(
          "#phone"
        ).value.trim() ||
        "PDV",

      fulfillment: "retirada",

      address: null,

      payment:
        state.payment,

      items:
        state.cart.map(i => ({
          name: i.name,
          quantity: i.qty,
          unit_price: i.price
        })),

      total: cartTotal(),

      notes:
        m.querySelector(
          "#notes"
        ).value.trim() ||
        null
    };

    try {

      await apiSend(
        "/orders",
        "POST",
        order
      );

      const total =
        cartTotal();

      const troco =
        state.payment === "Dinheiro"
          ? Math.max(
              0,
              received - total
            )
          : 0;

      state.cart = [];

      state.payment =
        "Dinheiro";

      m.remove();

      alert(
        `Venda registrada com sucesso!
Total: ${money(total)}${
          troco
            ? `\nTroco: ${money(troco)}`
            : ""
        }`
      );

      try {
        state.sales =
          await apiGet("/orders");
      } catch (_) {}

      render();

    } catch (e) {

      alert(e.message);

    }
  };
}

function openSales() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const sales =
    state.sales.filter(
      o =>
        (o.created_at || "")
          .slice(0, 10) === today &&
        o.status !== "cancelado"
    );

  const total =
    sales.reduce(
      (s, o) =>
        s + Number(o.total || 0),
      0
    );

  const m = modal(`

    <div class="modal-head">

      <div>

        <h2>
          Vendas de hoje
        </h2>

        <p>
          Total:
          <b>${money(total)}</b>
          • ${sales.length} venda(s)
        </p>

      </div>

      <button class="close">
        ×
      </button>

    </div>

    <div class="sales">

      ${
        sales.length
          ? sales
              .slice(0, 50)
              .map(o => `
                <div class="sale-row">

                  <span>
                    #${esc(
                      (o.order_id || "")
                        .slice(-6)
                    )}
                    •
                    ${esc(
                      o.payment || ""
                    )}
                  </span>

                  <b>
                    ${money(o.total)}
                  </b>

                </div>
              `)
              .join("")
          : `
            <div class="empty">
              Nenhuma venda registrada hoje.
            </div>
          `
      }

    </div>
  `);

  m.querySelector(
    ".close"
  ).onclick = () => m.remove();
}

if (state.token) {
  init();
} else {
  renderLogin();
}

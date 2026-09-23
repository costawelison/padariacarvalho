let carrinho = [];

const produtos = [
    {
        id: 1,
        nome: "Pão Francês",
        preco: 0.75,
        categoria: "Pães"
    },
    {
        id: 2,
        nome: "Pão de Hambúrguer",
        preco: 2.50,
        categoria: "Pães"
    },
    {
        id: 3,
        nome: "Pão de Forma",
        preco: 8.00,
        categoria: "Pães"
    },
    {
        id: 4,
        nome: "Pão Integral",
        preco: 9.00,
        categoria: "Pães"
    },
    {
        id: 5,
        nome: "Pão Doce",
        preco: 2.50,
        categoria: "Pães"
    },
    {
        id: 6,
        nome: "Baguete",
        preco: 6.00,
        categoria: "Pães"
    },
    {
        id: 7,
        nome: "Pão de Queijo",
        preco: 2.00,
        categoria: "Salgados"
    },
    {
        id: 8,
        nome: "Coxinha",
        preco: 6.00,
        categoria: "Salgados"
    },
    {
        id: 9,
        nome: "Torta Salgada",
        preco: 8.00,
        categoria: "Salgados"
    },
    {
        id: 10,
        nome: "Cupcake",
        preco: 6.00,
        categoria: "Doces"
    },
    {
        id: 11,
        nome: "Pudim",
        preco: 7.00,
        categoria: "Doces"
    },
    {
        id: 12,
        nome: "Rosquinha",
        preco: 4.00,
        categoria: "Doces"
    }
];

function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function mostrarProdutos(categoria = "Todos") {

    const lista = document.getElementById("listaProdutos");

    if (!lista) return;

    lista.innerHTML = "";

    const filtrados = categoria === "Todos"
        ? produtos
        : produtos.filter(p => p.categoria === categoria);

    filtrados.forEach(produto => {

        const div = document.createElement("div");

        div.className = "produto";

        div.innerHTML = `
            <h3>${produto.nome}</h3>

            <div class="preco">
                ${formatarPreco(produto.preco)}
            </div>

            <button onclick="adicionarCarrinho(${produto.id})">
                + Adicionar
            </button>
        `;

        lista.appendChild(div);
    });
}

function adicionarCarrinho(id) {

    const produto = produtos.find(p => p.id === id);

    if (!produto) return;

    const item = carrinho.find(p => p.id === id);

    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({
            ...produto,
            quantidade: 1
        });
    }

    atualizarCarrinho();
}

function aumentar(id) {

    const item = carrinho.find(p => p.id === id);

    if (item) {
        item.quantidade++;
    }

    atualizarCarrinho();
}

function diminuir(id) {

    const item = carrinho.find(p => p.id === id);

    if (!item) return;

    item.quantidade--;

    if (item.quantidade <= 0) {
        carrinho = carrinho.filter(p => p.id !== id);
    }

    atualizarCarrinho();
}

function remover(id) {

    carrinho = carrinho.filter(p => p.id !== id);

    atualizarCarrinho();
}

function atualizarCarrinho() {

    const lista = document.getElementById("itensCarrinho");
    const totalElemento = document.getElementById("total");

    if (!lista) return;

    lista.innerHTML = "";

    let total = 0;

    carrinho.forEach(item => {

        const subtotal = item.preco * item.quantidade;

        total += subtotal;

        const div = document.createElement("div");

        div.className = "item-carrinho";

        div.innerHTML = `
            <div class="item-info">

                <strong>${item.nome}</strong>

                <small>
                    ${formatarPreco(item.preco)}
                </small>

                <div class="quantidade">

                    <button onclick="diminuir(${item.id})">
                        −
                    </button>

                    <span>${item.quantidade}</span>

                    <button onclick="aumentar(${item.id})">
                        +
                    </button>

                </div>

            </div>

            <div>
                <strong>${formatarPreco(subtotal)}</strong>

                <div
                    class="remover"
                    onclick="remover(${item.id})"
                >
                    Remover
                </div>
            </div>
        `;

        lista.appendChild(div);
    });

    if (totalElemento) {
        totalElemento.textContent = formatarPreco(total);
    }
}

function limparCarrinho() {

    carrinho = [];

    atualizarCarrinho();
}

function finalizarVenda() {

    if (carrinho.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    let mensagem = "VENDA - PADARIA CARVALHO\n\n";

    carrinho.forEach(item => {

        mensagem +=
            `${item.quantidade}x ${item.nome} - ${formatarPreco(item.preco * item.quantidade)}\n`;
    });

    const total = carrinho.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0
    );

    mensagem += `\nTOTAL: ${formatarPreco(total)}`;

    alert(mensagem);
}

function filtrarCategoria(categoria) {

    document
        .querySelectorAll(".categorias button")
        .forEach(btn => btn.classList.remove("ativo"));

    const botao = document.querySelector(
        `[data-categoria="${categoria}"]`
    );

    if (botao) {
        botao.classList.add("ativo");
    }

    mostrarProdutos(categoria);
}

document.addEventListener("DOMContentLoaded", () => {

    mostrarProdutos();

    atualizarCarrinho();

});

/* ========================================
   PDV - PADARIA CARVALHO
   Sistema principal
======================================== */

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
        nome: "Pão Doce",
        preco: 2.50,
        categoria: "Pães"
    },
    {
        id: 4,
        nome: "Pão Baguete",
        preco: 6.00,
        categoria: "Pães"
    },
    {
        id: 5,
        nome: "Pão de Forma",
        preco: 8.00,
        categoria: "Pães"
    },
    {
        id: 6,
        nome: "Pão Integral",
        preco: 9.00,
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
        nome: "Chipa",
        preco: 3.00,
        categoria: "Salgados"
    },
    {
        id: 9,
        nome: "Coxinha",
        preco: 6.00,
        categoria: "Salgados"
    },
    {
        id: 10,
        nome: "Torta Salgada",
        preco: 8.00,
        categoria: "Salgados"
    },
    {
        id: 11,
        nome: "Torta de Pão de Forma",
        preco: 8.00,
        categoria: "Salgados"
    },
    {
        id: 12,
        nome: "Canudo - Frango",
        preco: 5.00,
        categoria: "Salgados"
    },
    {
        id: 13,
        nome: "Canudo - Doce de Leite",
        preco: 5.00,
        categoria: "Doces"
    },
    {
        id: 14,
        nome: "Canudo - Chocolate",
        preco: 5.00,
        categoria: "Doces"
    },
    {
        id: 15,
        nome: "Cupcake",
        preco: 6.00,
        categoria: "Doces"
    },
    {
        id: 16,
        nome: "Pudim",
        preco: 7.00,
        categoria: "Doces"
    },
    {
        id: 17,
        nome: "Rosquinha",
        preco: 4.00,
        categoria: "Doces"
    }
];


/* ========================================
   ESTADO DO SISTEMA
======================================== */

let carrinho = [];

let categoriaAtual = "Todos";


/* ========================================
   FORMATAÇÃO DE MOEDA
======================================== */

function moeda(valor) {

    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

}


/* ========================================
   INICIALIZAÇÃO
======================================== */

document.addEventListener("DOMContentLoaded", function () {

    iniciarPDV();

});


function iniciarPDV() {

    const app = document.getElementById("app");

    if (!app) return;

    renderizarInterface();

    renderizarProdutos();

    atualizarCarrinho();

}


/* ========================================
   INTERFACE
======================================== */

function renderizarInterface() {

    const app = document.getElementById("app");

    app.innerHTML = `

        <header class="topbar">

            <div>

                <h1>🥖 Padaria Carvalho</h1>

                <small>Sistema de Ponto de Venda</small>

            </div>

            <div>

                <strong>PDV</strong>

            </div>

        </header>


        <main class="pdv">


            <section class="catalogo">


                <div class="catalogo-header">

                    <h2>Produtos</h2>

                    <input
                        type="search"
                        id="pesquisa"
                        class="search"
                        placeholder="🔎 Buscar produto..."
                    >

                </div>


                <div
                    id="categorias"
                    class="categorias"
                ></div>


                <div
                    id="produtos"
                    class="produtos"
                ></div>


            </section>



            <aside class="carrinho">


                <div class="carrinho-header">

                    <h2>🛒 Venda</h2>

                    <span
                        id="contador"
                        class="contador"
                    >
                        0
                    </span>

                </div>


                <div
                    id="itensCarrinho"
                    class="itens-carrinho"
                ></div>


                <div class="resumo">

                    <div class="resumo-linha">

                        <span>Subtotal</span>

                        <strong id="subtotal">
                            R$ 0,00
                        </strong>

                    </div>


                    <div class="resumo-total">

                        <span>Total</span>

                        <span id="total">
                            R$ 0,00
                        </span>

                    </div>


                    <button
                        class="btn-finalizar"
                        id="finalizar"
                    >
                        FINALIZAR VENDA
                    </button>


                    <button
                        class="btn-limpar"
                        id="limpar"
                    >
                        LIMPAR VENDA
                    </button>

                </div>


            </aside>


        </main>

    `;


    criarCategorias();


    document
        .getElementById("pesquisa")
        .addEventListener("input", pesquisarProduto);


    document
        .getElementById("limpar")
        .addEventListener("click", limparCarrinho);


    document
        .getElementById("finalizar")
        .addEventListener("click", finalizarVenda);

}


/* ========================================
   CATEGORIAS
======================================== */

function criarCategorias() {

    const container =
        document.getElementById("categorias");

    if (!container) return;


    const categorias = [
        "Todos",
        ...new Set(
            produtos.map(produto => produto.categoria)
        )
    ];


    container.innerHTML = "";


    categorias.forEach(categoria => {

        const botao = document.createElement("button");

        botao.textContent = categoria;

        if (categoria === categoriaAtual) {
            botao.classList.add("ativo");
        }


        botao.addEventListener("click", function () {

            categoriaAtual = categoria;

            document
                .querySelectorAll(".categorias button")
                .forEach(btn => {
                    btn.classList.remove("ativo");
                });


            botao.classList.add("ativo");

            renderizarProdutos();

        });


        container.appendChild(botao);

    });

}


/* ========================================
   PRODUTOS
======================================== */

function renderizarProdutos(lista = null) {

    const container =
        document.getElementById("produtos");

    if (!container) return;


    let listaProdutos = lista;


    if (!listaProdutos) {

        if (categoriaAtual === "Todos") {

            listaProdutos = produtos;

        } else {

            listaProdutos =
                produtos.filter(
                    produto =>
                        produto.categoria === categoriaAtual
                );

        }

    }


    container.innerHTML = "";


    if (listaProdutos.length === 0) {

        container.innerHTML = `
            <div class="carrinho-vazio">
                Nenhum produto encontrado.
            </div>
        `;

        return;
    }


    listaProdutos.forEach(produto => {

        const card =
            document.createElement("article");

        card.className = "produto";


        card.innerHTML = `

            <div class="produto-imagem"
                 style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:45px;
                 "
            >
                ${iconeProduto(produto.categoria)}
            </div>


            <h3>${produto.nome}</h3>


            <p>
                ${produto.categoria}
            </p>


            <div class="preco">
                ${moeda(produto.preco)}
            </div>


            <button
                class="btn-adicionar"
                data-id="${produto.id}"
            >
                + Adicionar
            </button>

        `;


        card
            .querySelector(".btn-adicionar")
            .addEventListener("click", function () {

                adicionarAoCarrinho(produto.id);

            });


        container.appendChild(card);

    });

}


/* ========================================
   ÍCONES DOS PRODUTOS
======================================== */

function iconeProduto(categoria) {

    if (categoria === "Pães") {
        return "🥖";
    }

    if (categoria === "Salgados") {
        return "🥟";
    }

    if (categoria === "Doces") {
        return "🍰";
    }

    return "🛍️";

}


/* ========================================
   PESQUISA
======================================== */

function pesquisarProduto(event) {

    const termo =
        event.target.value
            .toLowerCase()
            .trim();


    if (!termo) {

        renderizarProdutos();

        return;
    }


    const resultado =
        produtos.filter(produto => {

            return (
                produto.nome
                    .toLowerCase()
                    .includes(termo)
                ||
                produto.categoria
                    .toLowerCase()
                    .includes(termo)
            );

        });


    renderizarProdutos(resultado);

}


/* ========================================
   ADICIONAR AO CARRINHO
======================================== */

function adicionarAoCarrinho(id) {

    const produto =
        produtos.find(
            produto => produto.id === id
        );


    if (!produto) return;


    const item =
        carrinho.find(
            item => item.id === id
        );


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


/* ========================================
   ATUALIZAR CARRINHO
======================================== */

function atualizarCarrinho() {

    const container =
        document.getElementById("itensCarrinho");


    const subtotalElemento =
        document.getElementById("subtotal");


    const totalElemento =
        document.getElementById("total");


    const contador =
        document.getElementById("contador");


    if (!container) return;


    container.innerHTML = "";


    let total = 0;

    let quantidadeTotal = 0;


    if (carrinho.length === 0) {

        container.innerHTML = `

            <div class="carrinho-vazio">

                <div class="icone">
                    🛒
                </div>

                <p>
                    Nenhum produto adicionado.
                </p>

            </div>

        `;

    }


    carrinho.forEach(item => {

        const subtotal =
            item.preco * item.quantidade;


        total += subtotal;

        quantidadeTotal += item.quantidade;


        const elemento =
            document.createElement("div");


        elemento.className =
            "item-carrinho";


        elemento.innerHTML = `

            <div>

                <div class="item-nome">
                    ${item.nome}
                </div>


                <div class="item-preco">
                    ${moeda(item.preco)} cada
                </div>


                <div class="item-controles">

                    <button
                        data-acao="diminuir"
                    >
                        −
                    </button>


                    <span class="item-quantidade">
                        ${item.quantidade}
                    </span>


                    <button
                        data-acao="aumentar"
                    >
                        +
                    </button>

                </div>


                <button
                    class="btn-remover"
                    data-acao="remover"
                >
                    Remover
                </button>

            </div>


            <div class="item-subtotal">

                ${moeda(subtotal)}

            </div>

        `;


        elemento
            .querySelector('[data-acao="diminuir"]')
            .addEventListener(
                "click",
                () => diminuirQuantidade(item.id)
            );


        elemento
            .querySelector('[data-acao="aumentar"]')
            .addEventListener(
                "click",
                () => aumentarQuantidade(item.id)
            );


        elemento
            .querySelector('[data-acao="remover"]')
            .addEventListener(
                "click",
                () => removerDoCarrinho(item.id)
            );


        container.appendChild(elemento);

    });


    subtotalElemento.textContent =
        moeda(total);


    totalElemento.textContent =
        moeda(total);


    contador.textContent =
        quantidadeTotal;

}


/* ========================================
   AUMENTAR QUANTIDADE
======================================== */

function aumentarQuantidade(id) {

    const item =
        carrinho.find(
            item => item.id === id
        );


    if (!item) return;


    item.quantidade++;


    atualizarCarrinho();

}


/* ========================================
   DIMINUIR QUANTIDADE
======================================== */

function diminuirQuantidade(id) {

    const item =
        carrinho.find(
            item => item.id === id
        );


    if (!item) return;


    item.quantidade--;


    if (item.quantidade <= 0) {

        carrinho =
            carrinho.filter(
                item => item.id !== id
            );

    }


    atualizarCarrinho();

}


/* ========================================
   REMOVER
======================================== */

function removerDoCarrinho(id) {

    carrinho =
        carrinho.filter(
            item => item.id !== id
        );


    atualizarCarrinho();

}


/* ========================================
   LIMPAR
======================================== */

function limparCarrinho() {

    if (carrinho.length === 0) return;


    const confirmar =
        confirm(
            "Deseja limpar a venda atual?"
        );


    if (!confirmar) return;


    carrinho = [];


    atualizarCarrinho();

}


/* ========================================
   FINALIZAR VENDA
======================================== */

function finalizarVenda() {

    if (carrinho.length === 0) {

        alert(
            "Adicione pelo menos um produto à venda."
        );

        return;
    }


    let mensagem =
        "RESUMO DA VENDA\n\n";


    carrinho.forEach(item => {

        mensagem +=
            `${item.quantidade}x ${item.nome} - ${moeda(item.preco * item.quantidade)}\n`;

    });


    const total =
        carrinho.reduce(
            (soma, item) =>
                soma + item.preco * item.quantidade,
            0
        );


    mensagem +=
        `\nTOTAL: ${moeda(total)}`;


    alert(mensagem);

}

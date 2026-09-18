# PRD — Sistema de Pedidos da Panificadora Carvalho

## Problema original
Criar um site simples de pedidos para uma padaria, fácil de usar por pessoas com pouca experiência em internet, usando o cardápio, preços, logo e fotos enviados pela proprietária.

## Personas
- Clientes da vizinhança que querem pedir pães, bolos, salgados, doces e lanches pelo celular.
- Pessoas que preferem confirmar o pedido diretamente pelo WhatsApp.
- Equipe da Panificadora Carvalho que recebe e confirma os pedidos.

## Requisitos principais (estáticos)
- Catálogo organizado por categorias e opções legíveis.
- Preços exibidos em reais, priorizando os preços das fotos quando divergentes.
- Busca, filtros e controles simples de quantidade.
- Carrinho com resumo e total dos produtos.
- Escolha entre retirada e entrega.
- Nome, telefone, endereço quando entrega, pagamento e observações.
- Mensagem completa do pedido encaminhada para WhatsApp da padaria.
- Layout responsivo, acessível e simples no celular.
- API para registrar pedidos sem expor identificadores MongoDB.

## Decisões de arquitetura
- Frontend React com estado local para catálogo, carrinho e checkout.
- Backend FastAPI com endpoint POST `/api/orders` para persistência futura/operacional.
- MongoDB usando exclusivamente `MONGO_URL` e `DB_NAME` já configurados.
- WhatsApp via handoff real para `wa.me/5593991552808`.
- Imagens enviadas pelo cliente para a marca e imagens de produto adequadas para o catálogo.

## Implementado — 17/09/2026
- Catálogo completo com 24 itens legíveis, categorias, busca e imagens.
- Carrinho com adicionar, remover, aumentar/diminuir quantidade e total.
- Checkout com retirada/entrega, validação de endereço, pagamento e observações.
- Mensagem de WhatsApp com itens, quantidades, total e dados do cliente.
- Tela de confirmação e novo pedido com formulário limpo.
- API FastAPI de pedidos e validação de payload.
- Testes finais de backend, frontend, mobile e fluxo WhatsApp passaram.
- Atualização visual: logo oficial aplicada no cabeçalho e imagens de pães, doces e lanches alinhadas às descrições dos produtos.
- Atualização visual — 18/09/2026: nova logo enviada pela proprietária aplicada no cabeçalho; referências da internet selecionadas para bolos, salgados, pães, doces e lanches.

## Backlog priorizado
### P0 — próximo passo
- Confirmar com a proprietária os itens e preços que ficaram ambíguos no material original.
- Adicionar horário de funcionamento e instruções de taxa/área de entrega.

### P1
- Painel simples para a equipe visualizar pedidos recebidos.
- Campo de data e horário desejados para retirada ou entrega.
- Fotos próprias dos principais produtos, substituindo imagens ilustrativas.

### P2
- Destaques de ofertas do dia.
- Compartilhamento do cardápio e dos favoritos.
- Histórico local de pedidos recentes para repetir uma compra.
# Balcão — J&C Variedades

PDV desktop offline para loja de eletrônicos. Substitui o controle por planilha manual.

## Funcionalidades

- **PDV** — busca de produto com autocomplete (fuzzy search), carrinho, desconto, formas de pagamento (dinheiro, pix, cartão), registro rápido de produto na hora da venda
- **Produtos** — cadastro, edição, exclusão e controle de estoque
- **Histórico** — vendas por data com detalhamento de itens, edição e exclusão
- **Relatório** — comparativo diário com breakdown por forma de pagamento
- **Estatísticas** — gráfico por dia da semana, ranking, top 10 produtos, filtro por período
- **Lista de compras** — itens com quantidade, sugestões automáticas de reposição, exportação em PDF
- **Início** — saldo inicial do dia, mensagens personalizadas por dia da semana

## Tecnologias

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
# Windows (.exe)
npm run build:win
```
# balcao

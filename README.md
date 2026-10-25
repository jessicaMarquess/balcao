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

## Importar planilhas antigas

Em **Restaurar**, selecione um arquivo `.ods` de `arquivos_testes`:

- **Movimento Loja**: confira os registros e pagamentos na prévia e informe a data completa. Cada linha vira uma venda histórica; o estoque atual não é alterado, inclusive ao editar ou excluir essa venda. Produtos novos ficam com estoque 0; preços e estoques existentes são preservados.
- **Agenda Financeira**: selecione os produtos da aba **Lista de Compras** e confira as quantidades. Categorias e anotações aparecem na prévia para revisão e começam desmarcadas. As demais abas não são importadas.
- O modelo de movimento vazio não contém registros e exibe uma mensagem.

Os valores nas colunas de categorias sugerem dinheiro; PIX e cartão usam suas colunas, e descrições com crédito/débito sugerem a forma correspondente. Revise essas sugestões antes de confirmar. O saldo inicial existente na data é preservado. O mesmo arquivo não pode ser importado novamente, mesmo que seja renomeado. Arquivos modificados são considerados novos: não importe versões sobrepostas.

A importação é transacional: se ocorrer erro, nenhuma linha é gravada. Backups `.db` continuam disponíveis no seletor e mantêm a função de substituir o banco.

Para testar a importação dos nove arquivos em um banco temporário, sem usar o banco da aplicação:

```bash
npm run test:importacao
```

A leitura ODS usa [SheetJS da distribuição oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

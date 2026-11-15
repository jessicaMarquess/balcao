# Balcão — J&C Variedades

PDV desktop offline para loja de eletrônicos. Substitui o controle por planilha manual.

## Funcionalidades

- **PDV** — busca de produto com autocomplete (fuzzy search), carrinho, desconto, formas de pagamento (dinheiro, pix, cartão), registro rápido de produto na hora da venda
- **Produtos** — cadastro, edição, exclusão e controle de estoque
- **Histórico** — vendas por data com detalhamento de itens, edição e exclusão
- **Relatório** — comparativo diário, dias da semana, ranking de produtos e formas de pagamento; filtros de dias, mês e ano
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

## Temas no mesmo aplicativo

O mesmo código inclui o tema roxo da Cleide e o tema Paysandu do Jander.
A distribuição tem instaladores próprios: Windows para a Cleide e macOS para o Jander.
Escolha em **Tema da loja**, na tela inicial ou no rodapé do menu lateral.
A preferência fica salva neste computador e pode ser alterada sem reiniciar.
A troca é visual: não muda nem separa produtos, vendas ou o banco de dados.

## Build

```bash
# Em um ambiente Windows (.exe), com as dependências instaladas nele
npm ci
npm run build:win
```

```bash
# Em um Mac, com as dependências instaladas nele
npm ci
npm run build:mac
```

O build de macOS gera dois DMGs, identificados no nome: `x64` para Macs Intel
e `arm64` para Macs com Apple Silicon. A assinatura/notarização Apple ainda
não está configurada, e os instaladores precisam ser validados nos sistemas de destino.

## Atualização para quem já usa a versão 1

- **Windows (Cleide):** feche o Balcão e abra o novo instalador `.exe`. Aguarde o aplicativo abrir novamente.
- **Mac (Jander):** feche o Balcão, abra o `.dmg` correspondente ao Mac e arraste o aplicativo para Aplicativos. Confirme a substituição da versão anterior e abra o Balcão.

Em ambos, use o mesmo usuário do computador e mantenha o nome e a identidade do aplicativo.
O histórico é reutilizado automaticamente. Na primeira abertura de uma nova versão,
o app cria e verifica um backup do SQLite antes de executar migrações.
As cópias ficam na subpasta `backups` dos dados do aplicativo, sem intervenção do usuário.
Se o backup falhar, a migração não é executada. Migrações são transacionais.

A atualização automática pela internet ainda não está configurada: o endereço em
`publish.url` é um exemplo. A versão 1 precisa receber este primeiro instalador manualmente.

Para validar a proteção do banco: `npm run test:backup`.

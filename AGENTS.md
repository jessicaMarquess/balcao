# Balcão — instruções para agentes

## Stack

- Electron 39 com electron-vite
- React 19 e TypeScript 5
- SQLite com better-sqlite3
- Tailwind CSS 4
- Aplicação desktop offline

## Verificação obrigatória

Depois de alterações no código, execute:

- `npm run lint`
- `npm run typecheck`
- `npm run build` quando a alteração afetar empacotamento ou integração

## Electron

- Manter `contextIsolation` habilitado.
- Não expor `ipcRenderer` diretamente ao renderer.
- Expor somente operações específicas pelo `contextBridge`.
- Validar dados recebidos em cada handler IPC.
- Usar `ipcMain.handle` e `ipcRenderer.invoke` para request/response.
- Usar `node:path` para caminhos multiplataforma.
- Não alterar sandbox ou políticas de navegação sem avaliar segurança.
- Manter código nativo e acesso ao SQLite no processo main.

## TypeScript

- Preservar o modo estrito.
- Não introduzir `any`; usar `unknown` e validação quando necessário.
- Definir contratos explícitos para IPC, entidades e propriedades React.
- Validar em runtime entradas externas e dados atravessando IPC.
- Preferir unions literais a enums quando forem suficientes.

## SQLite

- Usar prepared statements e parâmetros vinculados.
- Manter `foreign_keys = ON` e WAL.
- Agrupar escritas relacionadas em transações.
- Criar índices com base nas consultas reais.
- Não usar `SELECT *` quando apenas algumas colunas forem necessárias.
- Usar `AUTOINCREMENT` somente quando a não reutilização de IDs for requisito.

## React e Tailwind

- Seguir Tailwind CSS v4 e a configuração existente com `@tailwindcss/vite`.
- Reutilizar componentes e tokens CSS existentes.
- Usar `clsx`, `cva` e `tailwind-merge` para variantes.
- Manter HTML semântico, foco visível e navegação por teclado.
- Implementar layouts mobile-first quando aplicável.

## Escopo

- Preserve alterações existentes do usuário.
- Não altere schema sem uma migração compatível com bancos existentes.
- Não execute operações destrutivas sobre banco, backups ou histórico Git.
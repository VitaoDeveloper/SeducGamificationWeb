import { setupServer } from 'msw/node'

/**
 * Servidor msw compartilhado por todos os testes.
 *
 * Nasce sem handlers de propósito: a API responde 404 para qualquer requisição
 * que não tenha sido declarada, e cada etapa (02 em diante) acrescenta os seus
 * em `server.use(...)`, dentro do próprio `*.spec.tsx` que precisa deles. Um
 * handler declarado aqui valeria para toda a suíte, e um teste esqueceria de
 * desligar o mock do anterior.
 *
 * Quem dá a volta no array de handlers é o `resetHandlers` em `setup.ts`.
 */
export const server = setupServer()

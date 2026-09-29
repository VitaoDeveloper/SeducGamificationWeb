import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { limparSessao } from '../lib/sessao'
import { server } from './server'

/*
 * Configuração comum a todos os testes. O que mora aqui é o que é verdade em
 * qualquer suíte; o que é de um teste só fica no próprio arquivo.
 *
 * A limpeza do DOM não está nesta lista porque não precisa estar: com
 * `globals: true` no `vitest.config.ts`, o Testing Library desmonta sozinho o
 * que cada teste renderizou.
 */

beforeAll(() => {
  /*
   * `error` e não `bypass`: uma requisição sem handler é quase sempre um teste
   * que esqueceu de mockar a API, e o sintoma disso (uma tela que resolve "de
   * graça") aparece longe da causa. Deixar o msw reclamar é mais barato.
   */
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  /*
   * A guarda de sessão (`src/lib/sessao.ts`) guarda o token numa variável de
   * módulo, que sobrevive de um teste para o outro dentro do mesmo arquivo. Sem
   * esta limpeza, o teste de login deixa a sessão aberta e o seguinte começa
   * logado. Os dois lugares são limpos: `limparSessao` cuida da memória e
   * `localStorage.clear` cobre o que sobrou de um teste que importou o módulo
   * depois de um `vi.resetModules()`.
   */
  limparSessao()
  localStorage.clear()
})

import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth'

/**
 * Renderiza uma tela dentro dos dois provedores que a sessão exige.
 *
 * `MemoryRouter`, e não o `BrowserRouter` do `App`: o que interessa num teste é a
 * tela em que a pessoa caiu, não a barra de endereço, e o histórico em memória
 * não deixa rastro no jsdom. O `AuthProvider` vem junto porque é ele quem sabe
 * se há sessão — testar uma tela de autenticação por fora do provider testaria o
 * mock, não o código.
 */
export function renderComSessao(ui: ReactElement, rotaInicial = '/'): RenderResult {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )
}

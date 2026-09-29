import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components'
import { AuthProvider } from '../features/auth'

/**
 * Renderiza uma tela dentro dos provedores que a aplicação tem.
 *
 * `MemoryRouter`, e não o `BrowserRouter` do `App`: o que interessa num teste é
 * a tela em que a pessoa caiu, não a barra de endereço, e o histórico em memória
 * não deixa rastro no jsdom. O `AuthProvider` vem junto porque é ele quem sabe
 * se há sessão — testar uma tela de autenticação por fora do provider testaria o
 * mock, não o código — e o `ToastProvider` porque, a partir da Etapa 03, as
 * telas de listagem notificam sucesso e erro por ele.
 */
export function renderComSessao(ui: ReactElement, rotaInicial = '/'): RenderResult {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[rotaInicial]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </ToastProvider>,
  )
}

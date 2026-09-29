import { screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { TOKEN_DE_TESTE } from '../test/handlers'
import { renderComSessao } from '../test/render'
import { gravarSessao, TIPO_USUARIO } from '../lib/sessao'
import { ROTA_LOGIN } from '../features/auth'
import { ProtectedRoute } from './ProtectedRoute'

/** Lê o caminho e o `state` do router, para conferir redirecionamento e rota de retorno. */
function Local() {
  const { pathname, state } = useLocation()
  return <p data-testid="local">{`${pathname} ${JSON.stringify(state)}`}</p>
}

function renderizarComBarreira(rotaInicial: string) {
  return renderComSessao(
    <>
      <Local />
      <Routes>
        <Route path={ROTA_LOGIN} element={<p>tela de login</p>} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <p>conteúdo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>,
    rotaInicial,
  )
}

describe('ProtectedRoute', () => {
  it('leva para o login quando não há sessão', () => {
    renderizarComBarreira('/salas')

    expect(screen.getByText('tela de login')).toBeInTheDocument()
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
  })

  it('guarda em state a rota que a pessoa tentava abrir', () => {
    renderizarComBarreira('/salas')

    // É o que permite devolver a pessoa para onde ela ia, depois de entrar.
    expect(screen.getByTestId('local')).toHaveTextContent('/login {"de":"/salas"}')
  })

  it('mostra os filhos quando há sessão', () => {
    gravarSessao({
      token: TOKEN_DE_TESTE,
      usuario: { id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
    })

    renderizarComBarreira('/salas')

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument()
  })
})

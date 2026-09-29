import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { SENHA_DE_TESTE, TOKEN_DE_TESTE, loginAceito, loginRecusado } from '../../test/handlers'
import { server } from '../../test/server'
import { TIPO_USUARIO } from '../../lib/sessao'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'

/*
 * Chaves de escrita da guarda de sessão (`src/lib/sessao.ts`), repetidas aqui
 * de propósito: o que estes testes garantem é justamente que a sessão sobrevive
 * a um refresh, e sobreviver depende de sair nestas chaves exatas.
 */
const CHAVE_TOKEN = 'seduc-gamification:token'
const CHAVE_USUARIO = 'seduc-gamification:usuario'

/**
 * Tela mínima que expõe o contexto: mostra quem está autenticado, aciona o login
 * pelo mesmo caminho que a `LoginPage` usa e guarda o erro que a tela receberia.
 */
function Painel() {
  const { usuario, login, logout } = useAuth()
  const [erro, setErro] = useState('sem erro')

  return (
    <>
      <p data-testid="usuario">
        {usuario ? `${usuario.tipo} ${usuario.codigoMatricula}` : 'deslogado'}
      </p>
      <p data-testid="erro">{erro}</p>
      <button
        onClick={() => {
          login('26001', SENHA_DE_TESTE).catch((falha: unknown) => {
            setErro(falha instanceof Error ? falha.message : 'falhou')
          })
        }}
      >
        entrar
      </button>
      <button onClick={logout}>sair</button>
    </>
  )
}

/** Monta o painel dentro da sessão, com `/login` reconhecido como destino. */
function renderizarPainel() {
  return render(
    <MemoryRouter initialEntries={['/salas']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route path="*" element={<Painel />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthProvider', () => {
  it('guarda a sessão em memória e no localStorage depois de um login válido', async () => {
    server.use(...loginAceito({ tipo: TIPO_USUARIO.PROFESSOR, id: 'prof-7' }))
    const pessoa = userEvent.setup()
    renderizarPainel()

    await pessoa.click(screen.getByRole('button', { name: 'entrar' }))

    expect(await screen.findByTestId('usuario')).toHaveTextContent('PROFESSOR 26001')
    expect(JSON.parse(localStorage.getItem(CHAVE_USUARIO) ?? '{}')).toEqual({
      id: 'prof-7',
      tipo: TIPO_USUARIO.PROFESSOR,
      codigoMatricula: '26001',
    })
    expect(localStorage.getItem(CHAVE_TOKEN)).toBe(TOKEN_DE_TESTE)
  })

  it('propaga o erro e não guarda nada quando a API recusa as credenciais', async () => {
    server.use(loginRecusado())
    const pessoa = userEvent.setup()
    renderizarPainel()

    await pessoa.click(screen.getByRole('button', { name: 'entrar' }))

    // A falha precisa chegar à tela para virar mensagem: o provider não a engole
    // nem deixa uma sessão pela metade.
    expect(await screen.findByTestId('erro')).toHaveTextContent('401')
    expect(screen.getByTestId('usuario')).toHaveTextContent('deslogado')
    expect(localStorage.getItem(CHAVE_TOKEN)).toBeNull()
    expect(localStorage.getItem(CHAVE_USUARIO)).toBeNull()
  })

  it('logout limpa a sessão e leva para o login', async () => {
    server.use(...loginAceito())
    const pessoa = userEvent.setup()
    renderizarPainel()

    await pessoa.click(screen.getByRole('button', { name: 'entrar' }))
    await screen.findByTestId('usuario')

    await pessoa.click(screen.getByRole('button', { name: 'sair' }))

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_TOKEN)).toBeNull()
    expect(localStorage.getItem(CHAVE_USUARIO)).toBeNull()
  })

  it('restaura a sessão do localStorage ao montar', async () => {
    localStorage.setItem(CHAVE_TOKEN, 'token-de-ontem')
    localStorage.setItem(
      CHAVE_USUARIO,
      JSON.stringify({ id: 'aluno-9', tipo: TIPO_USUARIO.ALUNO, codigoMatricula: '26009' }),
    )

    /*
     * A guarda lê o `localStorage` no instante em que o módulo carrega, e não a
     * cada leitura. Como o `AuthProvider` deste arquivo já está importado desde
     * o topo, a gravação acima viria tarde demais: o registro precisa ser
     * descartado para que o provider e o contexto sejam carregados de novo, já
     * com a sessão do dia anterior em mãos.
     */
    vi.resetModules()
    const { AuthProvider: AuthProviderRecem } = await import('./AuthProvider')
    const { useAuth: useAuthRecem } = await import('./auth-context')

    function Sonda() {
      const { usuario } = useAuthRecem()
      return <p data-testid="usuario">{usuario?.codigoMatricula ?? 'deslogado'}</p>
    }

    render(
      <MemoryRouter>
        <AuthProviderRecem>
          <Sonda />
        </AuthProviderRecem>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('usuario')).toHaveTextContent('26009')
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { API, SENHA_DE_TESTE, TOKEN_DE_TESTE, loginAceito, loginRecusado } from '../../test/handlers'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { TIPO_USUARIO } from '../../lib/sessao'
import { ROTA_EM_BREVE, ROTA_LOGIN, ROTA_SALAS } from './rotas'
import { LoginPage } from './LoginPage'

/*
 * O destino da tela inicial de cada perfil é uma tela real da aplicação, mas com
 * o conteúdo substituído por uma marca: o que estes testes afirmam é para onde a
 * pessoa foi levada, e o texto da tela de salas é assunto da Etapa 03.
 */
function renderizarLogin() {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_LOGIN} element={<LoginPage />} />
      <Route path={ROTA_SALAS} element={<p>tela das salas</p>} />
      <Route path={ROTA_EM_BREVE} element={<p>tela do aluno</p>} />
    </Routes>,
    ROTA_LOGIN,
  )
}

/**
 * Preenche e envia o formulário.
 *
 * Os campos são digitados só quando têm conteúdo: `userEvent.type` com string
 * vazia é um erro da biblioteca, e a intenção aqui é "deixar em branco", que o
 * teclado não consegue representar.
 */
async function preencherFormulario(
  pessoa: UserEvent,
  codigoMatricula = '26001',
  senha = SENHA_DE_TESTE,
) {
  if (codigoMatricula) {
    await pessoa.type(screen.getByLabelText(/código de matrícula/i), codigoMatricula)
  }
  if (senha) {
    await pessoa.type(screen.getByLabelText(/^senha/i), senha)
  }
  await pessoa.click(screen.getByRole('button', { name: /entrar/i }))
}

describe('LoginPage', () => {
  it('leva o professor para /salas quando a API aceita as credenciais', async () => {
    server.use(...loginAceito({ tipo: TIPO_USUARIO.PROFESSOR }))
    const pessoa = userEvent.setup()
    renderizarLogin()

    await preencherFormulario(pessoa)

    expect(await screen.findByText('tela das salas')).toBeInTheDocument()
  })

  it('leva o aluno para a área em construção, e não para /salas', async () => {
    server.use(...loginAceito({ tipo: TIPO_USUARIO.ALUNO, id: 'aluno-3' }))
    const pessoa = userEvent.setup()
    renderizarLogin()

    await preencherFormulario(pessoa)

    expect(await screen.findByText('tela do aluno')).toBeInTheDocument()
    expect(screen.queryByText('tela das salas')).not.toBeInTheDocument()
  })

  it('mostra a mensagem da API e não navega quando as credenciais são recusadas', async () => {
    server.use(loginRecusado())
    const pessoa = userEvent.setup()
    renderizarLogin()

    await preencherFormulario(pessoa, '26001', 'senha-errada')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Código de matrícula ou senha inválidos.',
    )
    // Segue na tela de login, com o formulário inteiro: nada de tela em branco.
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/código de matrícula/i)).toBeInTheDocument()
  })

  it('recusa o envio sem chamar a API quando falta o código de matrícula', async () => {
    // Endpoint que só conta as chamadas: sem ele, "não navegou" não provaria
    // que a barreira foi local, e sim que a resposta não chegou ainda.
    const chamada = vi.fn(() => HttpResponse.json({ accessToken: TOKEN_DE_TESTE }))
    server.use(http.post(`${API}/auth/login`, chamada))
    const pessoa = userEvent.setup()
    renderizarLogin()

    await preencherFormulario(pessoa, '', SENHA_DE_TESTE)

    expect(await screen.findByText('Informe o código de matrícula.')).toBeInTheDocument()
    expect(chamada).not.toHaveBeenCalled()
  })
})

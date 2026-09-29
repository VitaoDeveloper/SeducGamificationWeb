import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { API, TOKEN_DE_TESTE, trocarSenhaRecusada } from '../../test/handlers'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, lerToken, TIPO_USUARIO } from '../../lib/sessao'
import { TrocarSenhaPage } from './TrocarSenhaPage'

function renderizarTrocaDeSenha() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: { id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
  })
  return renderComSessao(<TrocarSenhaPage />, '/conta/senha')
}

/**
 * Endpoint de troca de senha que só conta as chamadas.
 *
 * Existe para os casos em que a validação local tem de barrar antes: a prova de
 * que a API não foi chamada é `not.toHaveBeenCalled()`, e não a ausência de
 * mensagem de erro na tela — essa apareceria igual nos dois caminhos.
 */
function espionarTrocaDeSenha() {
  const chamada = vi.fn(() => new HttpResponse(null, { status: 200 }))
  server.use(http.post(`${API}/auth/trocar-senha`, chamada))
  return chamada
}

/** Preenche e envia o formulário; campo em branco é simplesmente não digitado. */
async function preencher(
  pessoa: UserEvent,
  senhaAtual: string,
  novaSenha: string,
  confirmacao: string,
) {
  if (senhaAtual) await pessoa.type(screen.getByLabelText(/senha atual/i), senhaAtual)
  if (novaSenha) await pessoa.type(screen.getByLabelText(/^nova senha/i), novaSenha)
  if (confirmacao) await pessoa.type(screen.getByLabelText(/confirmar nova senha/i), confirmacao)
  await pessoa.click(screen.getByRole('button', { name: /alterar senha/i }))
}

describe('TrocarSenhaPage', () => {
  it('não chama a API quando a confirmação não bate com a nova senha', async () => {
    const chamada = espionarTrocaDeSenha()
    const pessoa = userEvent.setup()
    renderizarTrocaDeSenha()

    await preencher(pessoa, 'senha-correta', 'nova-senha-1', 'nova-senha-2')

    expect(await screen.findByText('As senhas não são iguais.')).toBeInTheDocument()
    expect(chamada).not.toHaveBeenCalled()
  })

  it('não chama a API quando a confirmação está vazia', async () => {
    const chamada = espionarTrocaDeSenha()
    const pessoa = userEvent.setup()
    renderizarTrocaDeSenha()

    await preencher(pessoa, 'senha-correta', 'nova-senha-1', '')

    expect(await screen.findByText('Repita a nova senha.')).toBeInTheDocument()
    expect(chamada).not.toHaveBeenCalled()
  })

  it('não chama a API quando falta a senha atual', async () => {
    const chamada = espionarTrocaDeSenha()
    const pessoa = userEvent.setup()
    renderizarTrocaDeSenha()

    await preencher(pessoa, '', 'nova-senha-1', 'nova-senha-1')

    expect(await screen.findByText('Informe a senha atual.')).toBeInTheDocument()
    expect(chamada).not.toHaveBeenCalled()
  })

  it('confirma a troca quando a API aceita', async () => {
    let corpo: unknown
    server.use(
      http.post(`${API}/auth/trocar-senha`, async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 200 })
      }),
    )
    const pessoa = userEvent.setup()
    renderizarTrocaDeSenha()

    await preencher(pessoa, 'senha-correta', 'nova-senha-1', 'nova-senha-1')

    expect(
      await screen.findByText('Senha alterada. Da próxima vez, entre com a nova.'),
    ).toBeInTheDocument()
    // A confirmação só não mente porque a senha antiga e a nova foram enviadas.
    expect(corpo).toEqual({ senhaAtual: 'senha-correta', novaSenha: 'nova-senha-1' })
    // Campos limpos, para a pessoa não reenviar a troca sem querer.
    expect(screen.getByLabelText(/senha atual/i)).toHaveValue('')
  })

  it('mostra o erro sem derrubar a sessão quando a senha atual está errada', async () => {
    server.use(trocarSenhaRecusada())
    const pessoa = userEvent.setup()
    renderizarTrocaDeSenha()

    await preencher(pessoa, 'senha-errada', 'nova-senha-1', 'nova-senha-1')

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument()
    // A pessoa continua logada e pode corrigir o campo sem perder a sessão.
    expect(lerToken()).toBe(TOKEN_DE_TESTE)
  })
})

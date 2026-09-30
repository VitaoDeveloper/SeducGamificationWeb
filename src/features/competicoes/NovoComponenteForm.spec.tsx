import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, componentePontuacao } from '../../test/handlers'
import type { ComponenteCurricular } from '../salas/salas.tipos'
import { NovoComponenteForm } from './NovoComponenteForm'

const MATEMATICA: ComponenteCurricular = { id: 'mat-1', nome: 'Matemática', lecionamentoId: 'lec-1' }
const PORTUGUES: ComponenteCurricular = { id: 'mat-2', nome: 'Português', lecionamentoId: 'lec-1' }

const LECCIONAMENTO = [MATEMATICA, PORTUGUES]

/** Um `POST` que registra o corpo e devolve o componente, para os testes de envio. */
function postQueRegistra(corpos: unknown[], resposta: unknown = null) {
  return http.post(`${API}/bimestres/:id/componentes-pontuacao`, async ({ request }) => {
    corpos.push(await request.json())

    return HttpResponse.json(
      resposta ??
        componentePontuacao({ id: 'cp-1', nome: 'Prova bimestral', pesoPercentual: 40 }),
      { status: 201 },
    )
  })
}

describe('NovoComponenteForm', () => {
  it('exige matéria, nome e peso antes de chamar a API', async () => {
    const corpos: unknown[] = []
    server.use(postQueRegistra(corpos))

    const pessoa = userEvent.setup()
    renderComSessao(
      <NovoComponenteForm
        bimestreId="b1"
        componentesCurriculares={LECCIONAMENTO}
        onCriado={vi.fn()}
      />,
    )

    await pessoa.click(screen.getByRole('button', { name: 'Criar componente' }))

    expect(await screen.findByText('Escolha a matéria do componente.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome do componente.')).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it.each([
    ['zero', '0', 'O peso precisa ser maior que zero.'],
    ['acima de cem', '150', 'O peso não pode passar de 100%.'],
    ['em três casas', '12.345', 'O peso aceita no máximo 2 casas decimais.'],
  ])('recusa peso %s no campo, sem enviar', async (_caso, peso, mensagem) => {
    const corpos: unknown[] = []
    server.use(postQueRegistra(corpos))

    const pessoa = userEvent.setup()
    renderComSessao(
      <NovoComponenteForm
        bimestreId="b1"
        componentesCurriculares={LECCIONAMENTO}
        onCriado={vi.fn()}
      />,
    )

    await pessoa.selectOptions(screen.getByLabelText(/^matéria/i), 'mat-1')
    await pessoa.type(screen.getByLabelText(/^componente/i), 'Prova bimestral')
    await pessoa.type(screen.getByLabelText(/^peso/i), peso)
    await pessoa.click(screen.getByRole('button', { name: 'Criar componente' }))

    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it('envia o peso como número e devolve o componente criado', async () => {
    const corpos: unknown[] = []
    server.use(
      postQueRegistra(
        corpos,
        componentePontuacao({
          id: 'cp-1',
          nome: 'Prova bimestral',
          pesoPercentual: 40,
          componenteCurricularId: 'mat-1',
        }),
      ),
    )

    const onCriado = vi.fn()
    const pessoa = userEvent.setup()

    renderComSessao(
      <NovoComponenteForm
        bimestreId="b1"
        componentesCurriculares={LECCIONAMENTO}
        onCriado={onCriado}
      />,
    )

    await pessoa.selectOptions(screen.getByLabelText(/^matéria/i), 'mat-1')
    await pessoa.type(screen.getByLabelText(/^componente/i), 'Prova bimestral')
    await pessoa.type(screen.getByLabelText(/^peso/i), '40')
    await pessoa.click(screen.getByRole('button', { name: 'Criar componente' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toEqual({
      componenteCurricularId: 'mat-1',
      nome: 'Prova bimestral',
      pesoPercentual: 40,
    })
    await waitFor(() => expect(onCriado).toHaveBeenCalledTimes(1))
    expect(onCriado.mock.calls[0]?.[0]).toMatchObject({ id: 'cp-1', pesoPercentual: 40 })

    // O formulário volta a ficar disponível para o próximo componente, e não
    // trava no "Criando…" depois que deu certo.
    expect(screen.getByRole('button', { name: 'Criar componente' })).toBeEnabled()
    expect(screen.getByLabelText(/^componente/i)).toHaveValue('')
  })

  it('mostra o erro da API quando a soma da matéria estoura o limite', async () => {
    server.use(
      http.post(`${API}/bimestres/:id/componentes-pontuacao`, () =>
        HttpResponse.json(
          { statusCode: 400, message: 'A soma dos pesos da matéria ultrapassa 100%.' },
          { status: 400 },
        ),
      ),
    )

    const onCriado = vi.fn()
    const pessoa = userEvent.setup()

    renderComSessao(
      <NovoComponenteForm
        bimestreId="b1"
        componentesCurriculares={LECCIONAMENTO}
        onCriado={onCriado}
      />,
    )

    await pessoa.selectOptions(screen.getByLabelText(/^matéria/i), 'mat-1')
    await pessoa.type(screen.getByLabelText(/^componente/i), 'Prova bimestral')
    await pessoa.type(screen.getByLabelText(/^peso/i), '80')
    await pessoa.click(screen.getByRole('button', { name: 'Criar componente' }))

    expect(
      await screen.findByText('A soma dos pesos da matéria ultrapassa 100%.'),
    ).toBeInTheDocument()
    expect(onCriado).not.toHaveBeenCalled()
    // O botão volta a aceitar clique: sem isso, um erro deixaria o formulário
    // travado para sempre depois da primeira recusa.
    expect(screen.getByRole('button', { name: 'Criar componente' })).toBeEnabled()
  })

  it('avisa que não há matéria cadastrada e não deixa criar', () => {
    renderComSessao(
      <NovoComponenteForm bimestreId="b1" componentesCurriculares={[]} onCriado={vi.fn()} />,
    )

    expect(screen.getByRole('option', { name: 'Nenhuma matéria no lecionamento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar componente' })).toBeDisabled()
  })
})
